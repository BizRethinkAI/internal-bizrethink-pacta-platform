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

  /*
    The warp-* ban below catches the label this fork actually got burned by.
    It does not catch the general case: ANY runner label with no runner behind
    it leaves the job `queued` forever, and a required check that never reports
    blocks the PR on a verdict that never arrives — indistinguishable from a
    slow run.

    A larger runner is provisioned by NAME at the organisation level, so a typo
    in `runs-on` is exactly that failure. This allowlist is the cheap guard: a
    label not on it fails here, in two seconds, instead of hanging CI.

    Adding a runner? Provision it on the org first, then add the label here.
  */
  const KNOWN_RUNNERS = new Set([
    'ubuntu-latest', // GitHub standard, 2 cores
    'ubuntu-4core', // org larger runner, provisioned 2026-08-30
  ]);

  it.each(workflowFiles)('%s only uses runner labels that exist', (file) => {
    const content = readFileSync(resolve(workflowsDir, file), 'utf8');

    const labels = [...content.matchAll(/runs-on:\s*([^\s#]+)/g)]
      .map((match) => match[1].trim())
      // Expressions are resolved at run time and cannot be checked here.
      .filter((label) => !label.startsWith('${{'));

    const unknown = [...new Set(labels)].filter((label) => !KNOWN_RUNNERS.has(label));

    expect(
      unknown,
      `${file} runs on ${unknown.join(', ')}, which is not a runner this organisation has ` +
        'provisioned. A label with no runner behind it leaves the job queued forever, and a ' +
        'required check that never reports blocks the pull request on a verdict that never ' +
        'arrives. Provision it on the org, then add it to KNOWN_RUNNERS.',
    ).toEqual([]);
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

    /*
      Scoped to the SHARD job. Read as "the first timeout-minutes in the file"
      this silently began measuring the build job when that was added ahead of
      the matrix — a guard about the suite's cap, quietly asserting something
      about a three-minute build instead.
    */
    const shardJob = content.slice(content.indexOf('e2e_tests:'));
    const match = shardJob.match(/timeout-minutes:\s*(\d+)/);

    expect(match, 'the E2E shard job declares no timeout-minutes; it would inherit the 360 min default').not.toBeNull();

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

  it('keeps the required-check name on a job that always reports', () => {
    const content = readFileSync(workflowPath, 'utf8');

    /*
      Two ways sharding can silently darken the gate, both guarded here.

      1. The required check is named "E2E Tests" in the protect-main ruleset.
         Sharding moved the real work into a matrix job named "E2E Shard N",
         so a separate gate job has to carry the required name. Rename it and
         the required check never reports — the PR waits forever.

      2. `if: always()` on that gate. Without it, GitHub skips the gate when
         any shard fails, and a SKIPPED required check reports no status at
         all rather than a failure. A red suite would leave the PR blocked on
         a verdict that never arrives, which looks identical to a slow run.
    */
    expect(
      /name:\s*'E2E Tests'/.test(content),
      'No job is named "E2E Tests". That is the required check in the protect-main ruleset; ' +
        'without a job carrying it, the check never reports and every PR blocks indefinitely.',
    ).toBe(true);

    const gate = content.slice(content.indexOf('e2e_gate:'));

    expect(
      /if:\s*always\(\)/.test(gate),
      'The E2E gate job must be `if: always()`. Otherwise a failing shard skips it, and a ' +
        'skipped required check reports NO STATUS rather than a failure — the PR blocks ' +
        'forever instead of going red.',
    ).toBe(true);

    // Contains, not equals: the gate also depends on the build job, and a
    // future job may join it. What matters is that the matrix is in there.
    expect(
      /needs:\s*\[[^\]]*\be2e_tests\b[^\]]*\]/.test(gate),
      'The gate must depend on the shard matrix, or it reports success without waiting for ' + 'any test to run.',
    ).toBe(true);
  });

  it('builds the app once and shares it, rather than once per shard', () => {
    /*
      Measured 2026-08-30: a shard spent 6.7 minutes on setup to run 2 minutes
      of tests, and `npm run build` was 3.6 of those — repeated in all eight
      shards for the identical artifact. Adding shards therefore bought wall
      clock by adding setup, which is the trap Playwright's own sharding
      guidance describes.

      This asserts the fix cannot silently regress: exactly one build, and the
      shards fetching it.
    */
    const content = readFileSync(workflowPath, 'utf8');

    const builds = content.match(/npm run build -- --filter=@documenso\/remix/g) ?? [];

    expect(
      builds.length,
      `The app is built ${builds.length} times in this workflow. It must be built once in a ` +
        'separate job and downloaded by the shards; a build per shard is 3.6 minutes of ' +
        'identical work multiplied by the shard count.',
    ).toBe(1);

    expect(
      /uses:\s*actions\/download-artifact/.test(content),
      'No shard downloads the shared build. Without it the shards have no app to serve.',
    ).toBe(true);

    expect(
      /uses:\s*actions\/upload-artifact[\s\S]{0,200}name:\s*remix-build/.test(content),
      'Nothing uploads the shared build artifact the shards expect.',
    ).toBe(true);
  });

  it('shards the suite rather than running it serially on one runner', () => {
    const content = readFileSync(workflowPath, 'utf8');

    const shardMatch = content.match(/shard:\s*\[([\d,\s]+)\]/);

    expect(
      shardMatch,
      'The shard matrix is gone. playwright.config.ts derives workers from `cores / 2`, so on ' +
        'a 2-core ubuntu-latest runner the suite runs with ONE worker and takes ~59 minutes. ' +
        'Sharding is what replaces the parallelism the runner cannot provide.',
    ).not.toBeNull();

    const shards = shardMatch?.[1].split(',').length ?? 0;

    expect(shards, 'Expected more than one shard.').toBeGreaterThan(1);

    expect(
      new RegExp(`--shard=\\$\\{\\{ matrix.shard \\}\\}/${shards}`).test(content),
      `The matrix declares ${shards} shards but the --shard argument does not divide by ${shards}. ` +
        'A mismatch silently runs only part of the suite while reporting green.',
    ).toBe(true);
  });
});
