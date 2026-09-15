import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

/**
 * Overlay 091. Both attachment panels are upstream components.
 *
 * With the pilot lease's sixteen governing documents: the sender's panel let
 * every URL run out past its edge (`truncate` on an inline <a> does nothing),
 * neither list scrolled so the last entries fell below the screen, the signer's
 * panel cut every label to one line — seven Declaration amendments share their
 * first forty characters — and the signing sidebar's trigger said "Attachments"
 * with no count, the one hint that there was anything to open.
 */

// Class order is Biome's to decide; what matters is that both classes are on one element.
const scrolls = (source: string) =>
  [...source.matchAll(/className="([^"]*)"/g)].some(
    ([, classes]) => /\bmax-h-\[[^\]]+\]/.test(classes) && /\boverflow-y-auto\b/.test(classes),
  );

const read = (path: string) =>
  readFileSync(new URL(`../../../apps/remix/app/components/general/${path}`, import.meta.url), 'utf8');

describe("the sender's attachments panel", () => {
  const source = read('document/document-attachments-popover.tsx');

  it('truncates a long URL inside the panel', () => {
    expect(
      [...source.matchAll(/className="([^"]*)"/g)].some(
        ([, classes]) => /\bblock\b/.test(classes) && /\btruncate\b/.test(classes),
      ),
    ).toBe(true);
  });

  it('scrolls a long list', () => {
    expect(scrolls(source)).toBe(true);
  });
});

describe("the signer's attachments panel", () => {
  const source = read('document-signing/document-signing-attachments-popover.tsx');
  const view = read('document-signing/document-signing-page-view-v2.tsx');

  it('shows each name in full and scrolls a long list', () => {
    expect(source).toMatch(/break-words/);
    expect(scrolls(source)).toBe(true);
  });

  it('tells the signer how many there are', () => {
    expect(source).toMatch(/typeof trigger === 'function'/);
    expect(view).toMatch(/trigger=\{\(count\)/);
  });
});
