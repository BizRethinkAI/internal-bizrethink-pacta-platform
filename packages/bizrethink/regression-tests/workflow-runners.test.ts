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
