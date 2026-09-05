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
