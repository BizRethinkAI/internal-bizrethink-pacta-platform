import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

/**
 * A FAILED MIGRATION MUST STOP THE BOOT.
 *
 * Found by review of the deploy path (2026-09-18), not by a failure. Upstream's
 * `docker/start.sh` runs `prisma migrate deploy` and then starts the server
 * regardless of the result, and the script has no `set -e`. So a migration that
 * fails leaves the app serving against the OLD schema, `/api/health` answers
 * 200, and Coolify records a successful deployment.
 *
 * **A deploy whose only failure mode reports itself as a success is worse than
 * one that fails.**
 *
 * It had never bitten because every migration before this batch was additive
 * with a default and could not realistically fail.
 * `20260918010000_mca_template_names_its_entity` adds two NOT NULL columns with
 * no default, which fails against any table holding rows — the first migration
 * in this repository that can.
 *
 * Postgres DDL is transactional, so a failed migration rolls back and destroys
 * nothing. What the guard adds is refusing to serve from a schema we never
 * reached.
 */
describe('docker/start.sh — a failed migration stops the boot', () => {
  const script = readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), '../../../docker/start.sh'), 'utf8');

  const lines = script.split('\n');
  const migrateIndex = lines.findIndex(
    (line) => line.includes('prisma migrate deploy') && !line.trimStart().startsWith('#'),
  );
  const launchIndex = lines.findIndex(
    (line) => line.includes('build/server/main.js') && !line.trimStart().startsWith('#'),
  );

  it('runs migrations before starting the server', () => {
    expect(migrateIndex, 'expected a non-comment `prisma migrate deploy` line').toBeGreaterThan(-1);
    expect(launchIndex, 'expected a non-comment server launch line').toBeGreaterThan(migrateIndex);
  });

  /**
   * Either shape is fine — what matters is that the failure is not ignored.
   * Asserted as "the step is guarded" rather than pinned to one spelling, so a
   * later rewrite to `set -e` or `&&` still passes on its merits.
   */
  it('does not ignore the migration failing', () => {
    const migrateLine = lines[migrateIndex] ?? '';
    const guardsInline = /^\s*(if\s+!|.*\|\|)/.test(migrateLine) || /&&/.test(migrateLine);
    const guardsGlobally = /^\s*set\s+-[a-z]*e/m.test(lines.slice(0, migrateIndex).join('\n'));

    expect(
      guardsInline || guardsGlobally,
      'docker/start.sh must stop when `prisma migrate deploy` fails — otherwise the server boots against the old schema and the deploy reports success',
    ).toBe(true);
  });

  /**
   * The point of the guard is the non-zero exit. Without it Coolify has no way
   * to tell a broken deploy from a good one.
   */
  it('exits non-zero rather than continuing', () => {
    const betweenMigrateAndLaunch = lines.slice(migrateIndex, launchIndex).join('\n');
    const globallyGuarded = /^\s*set\s+-[a-z]*e/m.test(lines.slice(0, migrateIndex).join('\n'));

    expect(
      /exit\s+[1-9]/.test(betweenMigrateAndLaunch) || globallyGuarded,
      'a failed migration must exit non-zero so the deployment is recorded as failed',
    ).toBe(true);
  });
});
