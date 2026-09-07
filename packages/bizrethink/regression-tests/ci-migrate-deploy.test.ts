import { readdirSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';
import { parseDocument } from 'yaml';

/**
 * Regression guard for the shared-database incident (2026-09-06).
 *
 * The E2E job runs on a self-hosted runner, and `dx:up` brings postgres up on
 * a NAMED VOLUME, so the database survives between jobs and between branches.
 * `concurrency` is keyed on `github.ref`, so two branches run there at once.
 *
 * With `prisma migrate dev` that combination is fatal. `migrate dev` is an
 * interactive AUTHORING command: it compares the database against the
 * migrations folder and, on any difference, asks to reset. In CI there is
 * nobody to ask, so it exits 130 and the job dies before a single test runs.
 *
 * What happened: PR #111 carried `20260906230000_library_review_jurisdiction`
 * and applied it to the shared database. Every branch that ran afterwards
 * without that migration in its tree saw drift and was killed. Three runs
 * lost, and the failure looked like a fault in each innocent branch.
 *
 * Two properties keep it fixed, and both are asserted here because either one
 * alone leaves the incident possible:
 *
 *   - `migrate deploy`, which applies pending migrations and never resets.
 *     Alone, this stops the crash but leaves one schema accumulating every
 *     branch's columns forever.
 *   - a run-scoped database, so concurrent branches cannot see each other's
 *     schema at all.
 */
const workflow = readFileSync(
  resolve(dirname(fileURLToPath(import.meta.url)), '../../../.github/workflows/e2e-tests.yml'),
  'utf8',
);

/**
 * The workflow with every comment line removed.
 *
 * The first draft of this file matched the raw text and failed on its own
 * documentation: the comments explaining WHY `migrate dev` is forbidden have
 * to name it. A comment naming the banned command is harmless; a `run:` line
 * invoking it is the incident. Assert against what executes.
 */
const executable = workflow
  .split('\n')
  .filter((line) => !/^\s*#/.test(line))
  .join('\n');

describe('e2e-tests.yml — migrations must be applied unattended', () => {
  it('never runs prisma migrate dev', () => {
    // Matches the npm script and a direct invocation. `migrate deploy`
    // contains neither.
    expect(executable).not.toMatch(/prisma:migrate-dev|migrate\s+dev/);
  });

  it('runs migrate deploy instead', () => {
    expect(executable).toContain('prisma:migrate-deploy');
  });

  it('uses a database scoped to the run', () => {
    // run_id is unique per run; run_attempt separates re-runs of the same one.
    expect(executable).toMatch(/RUN_DB:\s*documenso_run_\$\{\{\s*github\.run_id/);
    expect(executable).toContain('github.run_attempt');
  });

  it('points the Playwright step at that same database', () => {
    // The step overrides NEXT_PRIVATE_DATABASE_URL to add connection_limit.
    // If that override keeps the literal name, the browser drives an app on a
    // different database from the one the migrations were applied to — and
    // the suite fails in a way that looks like a product bug.
    const override = executable.match(/NEXT_PRIVATE_DATABASE_URL: '[^']+'/g) ?? [];

    expect(override.length).toBeGreaterThan(0);

    for (const line of override) {
      expect(line).toContain('${{ env.RUN_DB }}');
      expect(line).not.toMatch(/54320\/documenso\?/);
    }
  });

  it('drops the run database even when the suite fails', () => {
    // Without this a per-run database is a disk leak on a self-hosted runner:
    // a new problem in place of the one being fixed.
    expect(executable).toContain('Drop the run database');
    expect(executable).toMatch(/Drop the run database[\s\S]{0,120}if:\s*always\(\)/);
  });
});

/**
 * Found while writing the fix above, and the more dangerous half of it.
 *
 * The job already had an `env:` block. The first attempt added a SECOND one
 * for RUN_DB. YAML permits duplicate keys and most parsers silently keep the
 * last, so the file validated locally — `yaml.safe_load` returned a dict and
 * reported no problem — while GitHub rejected it outright.
 *
 * What that looks like is the point. An invalid workflow does not fail a
 * check: it produces NO CHECKS AT ALL, and the run is listed under the raw
 * filename instead of the workflow name. The PR showed nine green checks
 * where it should have shown eleven, and the E2E gate was simply absent.
 * Absent reads as "did not need to run", which is the same silent-gate shape
 * as a cancelled run.
 *
 * Applies to every workflow, not just this one.
 */
describe('.github/workflows — no duplicate keys', () => {
  const dir = resolve(dirname(fileURLToPath(import.meta.url)), '../../../.github/workflows');
  const files = readdirSync(dir).filter((f) => f.endsWith('.yml') || f.endsWith('.yaml'));

  it('has workflows to check', () => {
    expect(files.length).toBeGreaterThan(0);
  });

  it.each(files)('%s parses with no duplicated key', (file) => {
    // parseDocument collects errors rather than throwing on the first, and
    // unlike a plain load it reports duplicates instead of silently resolving
    // them. That difference is the whole reason this test exists.
    const doc = parseDocument(readFileSync(resolve(dir, file), 'utf8'), {
      uniqueKeys: true,
    });

    expect(doc.errors.map((e) => e.message)).toEqual([]);
  });
});
