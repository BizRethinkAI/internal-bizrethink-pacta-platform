import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

/**
 * Overlay 038 (compact 2-line audit-log row) regression guard.
 *
 * MERGE-MANIFEST §3 flagged this file: the overlay rewrites the entire
 * `renderRow` function with a custom 2-line layout (~12 events/page vs
 * upstream's ~3). A future merge that reverts the rewrite would silently
 * inflate sealed-PDF audit log page counts — no functional break, just
 * UX regression that smoke testing wouldn't easily catch.
 *
 * Full pdf-lib integration test deferred (would require canvas + page
 * rendering harness). Source-presence guard catches the "merge silently
 * reverted renderRow" failure mode.
 */
const SOURCE = readFileSync(
  join(__dirname, 'render-audit-logs.ts'),
  'utf-8',
);

describe('render-audit-logs — overlay 038 compact-row regression guard', () => {
  it('source contains the overlay 038 marker comment', () => {
    expect(SOURCE).toMatch(/overlay 038/);
  });

  it('source documents the compact 2-line layout intent', () => {
    expect(SOURCE).toMatch(/compact 2-line/);
  });

  it('source still defines renderRow (the entry point overlay 038 rewrites)', () => {
    // Don't pin the exact signature — just that the function name persists
    // so this file can still be patched/diffed predictably.
    expect(SOURCE).toMatch(/renderRow\b/);
  });
});
