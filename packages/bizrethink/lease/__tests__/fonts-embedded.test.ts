import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { PICANA_FACTS, PICANA_MONEY, PICANA_VALUES } from '../matters/picana-ln';
import { renderLeaseForReview } from '../render/render-lease';

/**
 * The fonts must be IN the file, not named by it.
 *
 * A standard-14 face is referenced rather than carried, so every viewer
 * substitutes its own metrics and a signed lease is not guaranteed to render as
 * it was signed. PDF/A rejects such a file outright, which is awkward for a
 * platform doing cryptographic signing with long-term validation.
 *
 * This fails if someone reverts a family to a standard-14 name, or adds a style
 * whose family was never registered — both of which render perfectly well
 * locally and silently produce a document that is not self-contained.
 */

const renderPdf = async () =>
  Buffer.from(
    await renderLeaseForReview({
      facts: PICANA_FACTS,
      money: PICANA_MONEY,
      values: PICANA_VALUES,
      parties: [
        { name: 'Shwet Prabhat', role: 'landlord' },
        { name: 'Harsha Setty', role: 'tenant' },
      ],
      propertyAddress: '29090 Picana Lane, Wesley Chapel, FL 33543',
    }),
  ).toString('latin1');

describe('the rendered lease', () => {
  it('carries its typefaces rather than naming them', async () => {
    const pdf = await renderPdf();

    /*
      A subset font is written as `/ABCDEF+FamilyName`. The six-letter tag is
      what proves the bytes are in the file — a referenced standard-14 face has
      no tag because there is nothing to tag.
    */
    for (const family of ['Tinos', 'SourceSans3']) {
      expect(pdf, `${family} is not embedded`).toMatch(new RegExp(`/[A-Z]{6}\\+${family}`));
    }
  });

  it('does not fall back to a standard-14 serif', async () => {
    const pdf = await renderPdf();

    /*
      Deliberately not asserted for Helvetica. react-pdf emits one unembedded
      Helvetica reference that no style in this repo asks for — a fallback
      inside the library itself. It is a real loose end, but pinning it here
      would fail this test for a reason nobody could act on.
    */
    expect(pdf).not.toMatch(/\/BaseFont\s*\/Times-(Roman|Italic|Bold)/);
  });
});

/*
  THE TEST ABOVE PASSED WHILE PRODUCTION WAS BROKEN.

  The fonts were first registered from a path resolved with `import.meta.url`.
  Locally that path exists, so every test went green. In the container it does
  not: the bundler rewrites `import.meta.url` to the bundle's own directory, and
  the runtime image contains no `packages/bizrethink` at all. Every lease PDF
  returned 500 with ENOENT.

  No test that renders can catch that, because the thing that differs is the
  filesystem the renderer is standing on. So this asserts the renderer never
  asks the filesystem anything — which is the property that actually holds
  across environments.
*/
describe('the renderer', () => {
  /*
    Comments stripped first: this file's own note explaining the bug names
    `import.meta.url`, and a guard that its own rationale trips is a guard
    nobody can keep.
  */
  const source = readFileSync(new URL('../render/lease-document.ts', import.meta.url), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/.*$/gm, '');

  it('resolves no path at runtime, because the container has a different one', () => {
    expect(source, 'import.meta.url is rewritten by the bundler and points into the build output').not.toMatch(
      /import\.meta\.url/,
    );
    expect(source, 'the runtime image does not ship packages/bizrethink, so no font file can be read').not.toMatch(
      /readFileSync|fileURLToPath/,
    );
  });

  it('registers every face from bytes', () => {
    const registrations = source.match(/Font\.register\(/g) ?? [];
    expect(registrations.length).toBe(4);
    expect(source).toMatch(/src: TINOS_REGULAR/);
    expect(source).toMatch(/src: SANS_SEMIBOLD/);
  });
});
