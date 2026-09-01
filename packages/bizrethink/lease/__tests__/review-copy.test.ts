import { extractPlaceholdersFromPDF } from '@documenso/lib/server-only/pdf/auto-place-fields';
import { describe, expect, it } from 'vitest';

import { PICANA_FACTS, PICANA_MONEY, PICANA_PARTIES, PICANA_VALUES } from '../matters/picana-ln';
import { renderLease, renderLeaseForReview } from '../render/render-lease';

/**
 * What a reviewer is shown must be what gets signed.
 *
 * `buildLeaseDocuments` emits the lease PLUS one document per addendum and per
 * standalone disclosure — the pet addendum, the house rules, the electronic
 * notice addendum, the flood disclosure, the lead-paint disclosure — and
 * `createEnvelopeFromMatter` uploads every one of them.
 *
 * Both the landlord's preview and the reviewer's copy did
 * `rendered.find((doc) => doc.key === 'lease')` and returned that alone. So the
 * attorney read one document and the signers received up to seven, including
 * the two Florida requires to be separate instruments. A review of a document
 * that is not the document being signed is worse than no review: it produces a
 * record of approval that was never given.
 *
 * ONE FILE FOR READING, MANY FOR SIGNING. The separateness is legally
 * load-bearing at signing time — §83.512 requires the flood disclosure to be a
 * separate written disclosure, and an addendum is its own instrument with its
 * own signature block — so the ENVELOPE still gets distinct documents. This is
 * only how they are read.
 */

const input = {
  facts: PICANA_FACTS,
  money: PICANA_MONEY,
  values: PICANA_VALUES,
  parties: PICANA_PARTIES,
  propertyAddress: '29090 Picana Ln, Wesley Chapel, FL 33543',
  customClauses: [],
};

describe('the reviewer copy', () => {
  it('is a valid PDF', async () => {
    const pdf = await renderLeaseForReview(input);

    expect(pdf.subarray(0, 5).toString()).toBe('%PDF-');
  });

  /*
    The load-bearing assertion. Every signature placeholder that exists across
    the separate documents must be present in the one a reviewer reads —
    otherwise a signature block exists that nobody reviewing ever saw.
  */
  it('carries every placeholder from every document that will be signed', async () => {
    const { rendered } = await renderLease(input);

    const perDocument = await Promise.all(rendered.map(async (doc) => await extractPlaceholdersFromPDF(doc.pdf)));
    const expected = new Set(perDocument.flat().map((p) => p.placeholder));

    const combined = await extractPlaceholdersFromPDF(await renderLeaseForReview(input));
    const actual = new Set(combined.map((p) => p.placeholder));

    expect(expected.size).toBeGreaterThan(0);

    for (const placeholder of expected) {
      expect(actual, `missing from the reviewer copy: ${placeholder}`).toContain(placeholder);
    }
  });

  it('is more than the lease alone, since the lease alone is what was wrong', async () => {
    const { rendered } = await renderLease(input);
    const lease = rendered.find((doc) => doc.key === 'lease');

    expect(rendered.length).toBeGreaterThan(1);
    expect((await renderLeaseForReview(input)).length).toBeGreaterThan(lease?.pdf.length ?? 0);
  });
});
