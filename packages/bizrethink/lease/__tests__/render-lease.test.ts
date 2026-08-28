import { extractPlaceholdersFromPDF } from '@documenso/lib/server-only/pdf/auto-place-fields';
import { FieldType } from '@prisma/client';
import { beforeAll, describe, expect, it } from 'vitest';

import { PICANA_FACTS, PICANA_MONEY, PICANA_PARTIES, PICANA_VALUES } from '../matters/picana-ln';
import type { RenderLeaseResult } from '../render/render-lease';
import { renderLease } from '../render/render-lease';
import { buildSignatureBlocks } from '../render/signature-blocks';

/**
 * The end-to-end test: a real lease for 29090 Picana Ln, rendered to PDF and
 * handed back to the same upstream extractor that will position the signing
 * fields in production.
 *
 * This is the only test that proves the whole chain works together. Everything
 * else asserts a part.
 */

let result: RenderLeaseResult;
let pdf: Buffer;

beforeAll(async () => {
  result = await renderLease({
    facts: PICANA_FACTS,
    money: PICANA_MONEY,
    values: PICANA_VALUES,
    parties: PICANA_PARTIES,
    propertyAddress: '29090 Picana Lane, Wesley Chapel, Florida 33543',
  });

  pdf = result.pdf;
}, 60_000);

describe('the document renders', () => {
  it('produces a PDF of a plausible size', () => {
    expect(pdf.subarray(0, 5).toString()).toBe('%PDF-');
    expect(pdf.length).toBeGreaterThan(10_000);
  });

  it('produces the lease plus its addenda and the standalone disclosure', () => {
    expect(result.documents.map((d) => d.key)).toEqual([
      'lease',
      'addendum:pets.addendum',
      'addendum:termination.early-election',
      'addendum:rules.house-rules',
      'disclosure:disclosure.flood',
    ]);
  });

  it('leaves outstanding only what the landlord alone can answer', () => {
    /*
      A raw {{token}} in a lease going out for signature is a defect, so the
      renderer reports every unfilled variable and the caller must refuse to
      send while any remain.

      These three are outstanding by design. Fla. Stat. §83.512 asks the
      landlord to state their own knowledge — whether flooding has damaged the
      unit during their ownership, whether a flood claim has been filed, and
      whether flood assistance including FEMA has been received. Defaulting
      them to "no" would put an unverified statement of fact into a statutory
      disclosure, so they stay empty until answered.

      Asserted exactly rather than loosely: a fourth gap appearing, or one of
      these being quietly filled with a guess, both fail this test.
    */
    expect(result.missing).toEqual([
      'disclosure.flood: landlordKnowsOfFlooding',
      'disclosure.flood: landlordFiledFloodClaim',
      'disclosure.flood: landlordReceivedFloodAssistance',
    ]);
  });

  it('marks the document as not ready to send while anything is outstanding', () => {
    expect(result.readyToSend).toBe(false);
  });
});

describe('every placeholder survives into the PDF', () => {
  it('extracts exactly the tokens the signature blocks emitted', async () => {
    /*
      The property that matters. A token the extractor cannot find is skipped
      SILENTLY — no error, just a signing field that never gets created and a
      lease with nowhere to sign. Counting emitted against extracted is what
      turns that silence into a failing test.
    */
    const emitted = result.documents.reduce(
      (total, doc) =>
        total +
        buildSignatureBlocks({
          parties: PICANA_PARTIES,
          documentKey: doc.key,
          withInitials: doc.withInitials,
        })
          .flatMap((block) => block.signers)
          .flatMap((signer) => signer.placeholders).length,
      0,
    );

    const extracted = await extractPlaceholdersFromPDF(pdf);

    expect(extracted).toHaveLength(emitted);
  });

  it('gives every party a signature on every document', async () => {
    const extracted = await extractPlaceholdersFromPDF(pdf);
    const signatures = extracted.filter((p) => p.fieldAndMeta.type === FieldType.SIGNATURE);

    expect(signatures).toHaveLength(PICANA_PARTIES.length * result.documents.length);
  });

  it('sizes every signature widget from its meta rather than its text', async () => {
    const extracted = await extractPlaceholdersFromPDF(pdf);

    for (const signature of extracted.filter((p) => p.fieldAndMeta.type === FieldType.SIGNATURE)) {
      expect(signature.width).toBe(160);
      expect(signature.height).toBe(44);
    }
  });

  it('numbers recipients r1 to r4 and no further', async () => {
    const extracted = await extractPlaceholdersFromPDF(pdf);
    const recipients = new Set(extracted.map((p) => p.recipient.toLowerCase()));

    expect([...recipients].sort()).toEqual(['r1', 'r2', 'r3', 'r4']);
  });
});

describe('nothing overlaps', () => {
  it('leaves every field a clear box on every page', async () => {
    // The Phase 0 finding, asserted against the real document rather than a
    // three-page fixture: a sized signature widget grows ~16.5pt in each
    // direction and will overprint its neighbours unless the renderer reserves
    // the leading.
    const extracted = await extractPlaceholdersFromPDF(pdf);
    const overlaps: string[] = [];

    for (const page of new Set(extracted.map((p) => p.page))) {
      const onPage = extracted.filter((p) => p.page === page);

      for (let i = 0; i < onPage.length; i++) {
        for (let j = i + 1; j < onPage.length; j++) {
          const a = onPage[i];
          const b = onPage[j];

          const separated =
            a.x + a.width <= b.x || b.x + b.width <= a.x || a.y + a.height <= b.y || b.y + b.height <= a.y;

          if (!separated) {
            overlaps.push(`p${page}: ${a.placeholder} overlaps ${b.placeholder}`);
          }
        }
      }
    }

    expect(overlaps).toEqual([]);
  });

  it('keeps every field inside its page', async () => {
    const extracted = await extractPlaceholdersFromPDF(pdf);

    for (const p of extracted) {
      expect(p.x).toBeGreaterThanOrEqual(0);
      expect(p.y).toBeGreaterThanOrEqual(0);
      expect(p.x + p.width).toBeLessThanOrEqual(p.pageWidth + 1);
      expect(p.y + p.height).toBeLessThanOrEqual(p.pageHeight + 1);
    }
  });
});
