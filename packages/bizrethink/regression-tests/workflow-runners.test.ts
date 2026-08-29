import { readdirSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

/**
 * Regression guard for the stuck-E2E-gate incident (2026-08-13).
 *
 * Upstream Documenso runs its Playwright suite on WarpBuild runners
 * (`runs-on: warp-ubuntu-2204-x64-8x`). This fork has no WarpBuild runner
 * integration, so any job with a `warp-*` label sits `queued` forever and
 * never reports a result — silently disabling the E2E regression gate
 * (overlay 061 repointed e2e-tests.yml to `ubuntu-latest`).
 *
 * GitHub-hosted runner labels only. If an upstream sync reintroduces a
 * `warp-*` runner, this test fails so the gate never goes dark again.
 */
describe('.github/workflows — runners must be GitHub-hosted', () => {
  const workflowsDir = resolve(dirname(fileURLToPath(import.meta.url)), '../../../.github/workflows');

  const workflowFiles = readdirSync(workflowsDir).filter((f) => f.endsWith('.yml') || f.endsWith('.yaml'));

  it('has workflow files to check', () => {
    expect(workflowFiles.length).toBeGreaterThan(0);
  });

  it.each(workflowFiles)('%s uses no WarpBuild (warp-*) runner label', (file) => {
    const content = readFileSync(resolve(workflowsDir, file), 'utf8');
    const warpRunners = content
      .split('\n')
      .filter((line) => /runs-on:\s*.*\bwarp-/.test(line))
      .map((line) => line.trim());

    expect(
      warpRunners,
      `${file} references a WarpBuild runner this fork has no integration for; jobs will hang queued. Use ubuntu-latest.`,
    ).toEqual([]);
  });
});

/**
 * Regression guard for the E2E-cap incident (2026-08-13, second occurrence).
 *
 * The curated suite took 51 min on the green baseline against a 60 min job cap
 * — 9 min of headroom. The 142-commit upstream sync added enough new tests to
 * blow through it, and the job was killed mid-run by GitHub's cap. A cancelled
 * job reports neither pass nor fail, so the gate goes dark exactly like the
 * warp-runner incident above.
 *
 * The fork's runner is a 2-core `ubuntu-latest`, not upstream's 8-core
 * WarpBuild box, so our wall-clock will always exceed upstream's. The cap must
 * leave real headroom above the observed runtime.
 */
describe('.github/workflows/e2e-tests.yml — job cap must leave headroom', () => {
  const workflowPath = resolve(dirname(fileURLToPath(import.meta.url)), '../../../.github/workflows/e2e-tests.yml');

  const MINIMUM_TIMEOUT_MINUTES = 90;

  it(`sets timeout-minutes >= ${MINIMUM_TIMEOUT_MINUTES} so the suite can finish`, () => {
    const content = readFileSync(workflowPath, 'utf8');

    const match = content.match(/timeout-minutes:\s*(\d+)/);

    expect(match, 'e2e-tests.yml declares no timeout-minutes; it would inherit the 360 min default').not.toBeNull();

    expect(
      Number(match?.[1]),
      `E2E job cap is too tight. The suite ran 51 min on the 2026-08-13 baseline and the ` +
        `upstream sync pushed it past a 60 min cap, killing the job mid-run and reporting ` +
        `neither pass nor fail. Keep at least ${MINIMUM_TIMEOUT_MINUTES} min of room.`,
    ).toBeGreaterThanOrEqual(MINIMUM_TIMEOUT_MINUTES);
  });

  it('streams turbo task logs so a stalled run is diagnosable', () => {
    const content = readFileSync(workflowPath, 'utf8');

    expect(
      /TURBO_LOG_ORDER:\s*stream/.test(content),
      'Without TURBO_LOG_ORDER=stream, turbo buffers task output and discards it when the job ' +
        'is killed — the 2026-08-13 cancelled run produced 53 min of total silence, making ' +
        '"slow" and "hung" indistinguishable.',
    ).toBe(true);
  });

  it('still reports a status on a docs-only PR instead of being skipped', () => {
    const content = readFileSync(workflowPath, 'utf8');

    /*
      The docs-only optimisation gates the expensive STEPS, never the job.

      `E2E Tests` is a required check. A job skipped by a workflow-level
      `paths` filter reports nothing at all — not a pass, not a failure — so
      the PR waits forever for a status that never arrives. That is the same
      silent-gate failure as the cancelled runs above, reached a different way.

      If someone ever "simplifies" this into an `on: pull_request: paths:`
      filter, this test is what stops it.
    */
    expect(
      /^on:\s*\n(?:\s+\w+:\s*\n(?:\s+branches:.*\n(?:\s+-.*\n|\s+\[.*\]\n)?)?)+/m.test(content) &&
        !/^\s+paths(-ignore)?:/m.test(content),
      'e2e-tests.yml must not use a workflow-level paths filter: E2E Tests is a required ' +
        'check, and a skipped job reports no status, blocking the PR indefinitely. Gate the ' +
        'steps with `if: steps.scope.outputs.code` instead.',
    ).toBe(true);

    expect(
      /id:\s*scope/.test(content) && /steps\.scope\.outputs\.code/.test(content),
      'The docs-only detection step (id: scope) is missing. Without it every documentation ' +
        'PR runs ~59 minutes of Playwright, which is the friction that trains people to ' +
        'bypass required checks.',
    ).toBe(true);
  });
});
