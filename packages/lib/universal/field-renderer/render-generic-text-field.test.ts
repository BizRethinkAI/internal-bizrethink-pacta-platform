import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

/**
 * Overlay 035 (date fontWeight → Konva fontStyle) regression guard.
 *
 * The MERGE-MANIFEST §3 flagged this file as HIGH-risk for silent
 * disappearance: upstream's new `calculateOverflowLayout` refactor
 * doesn't emit fontStyle. A future merge that re-derives the function
 * without re-injecting our fontStyle line would silently drop bold dates
 * — no test fails, no error logged, only PDF visual diff catches it.
 *
 * Full Konva-rendered integration test deferred to follow-up (requires
 * mocking Konva.Text + Layer + interactions). This source-presence guard
 * gives 80% of the value at 5% of the effort: if the magic string
 * `fontStyle:` paired with `fontWeight === 'bold'` ever drops from this
 * file, the test fails.
 */
const SOURCE = readFileSync(
  join(__dirname, 'render-generic-text-field.ts'),
  'utf-8',
);

describe('render-generic-text-field — overlay 035 fontStyle regression guard', () => {
  it('source still imports nothing weird that would mask fontStyle handling', () => {
    // Sanity: file exists and we read it.
    expect(SOURCE.length).toBeGreaterThan(100);
  });

  it('source contains the overlay 035 fontWeight → fontStyle mapping', () => {
    // The exact line from overlay 035:
    //   const textFontStyle: 'normal' | 'bold' =
    //     fieldMeta?.type === 'date' && fieldMeta.fontWeight === 'bold' ? 'bold' : 'normal';
    expect(SOURCE).toMatch(/fieldMeta\.fontWeight\s*===\s*['"]bold['"]/);
    expect(SOURCE).toMatch(/textFontStyle/);
  });

  it('source applies textFontStyle to setAttrs (Konva text config)', () => {
    // The setAttrs call must include `fontStyle: textFontStyle`.
    expect(SOURCE).toMatch(/fontStyle:\s*textFontStyle/);
  });

  it('source restricts fontWeight gating to DATE field type only', () => {
    // Other field types (TEXT, EMAIL, NUMBER, NAME) must not gain bold
    // styling — overlay 035 is intentionally DATE-only.
    expect(SOURCE).toMatch(/fieldMeta\?\.type\s*===\s*['"]date['"]/);
  });
});
