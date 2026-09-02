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
/** Placeholders from every document, as the envelope will see them. */
let allPlaceholders: Awaited<ReturnType<typeof extractPlaceholdersFromPDF>>;

beforeAll(async () => {
  result = await renderLease({
    facts: PICANA_FACTS,
    money: PICANA_MONEY,
    values: PICANA_VALUES,
    parties: PICANA_PARTIES,
    propertyAddress: '29090 Picana Lane, Wesley Chapel, Florida 33543',
  });

  allPlaceholders = (
    await Promise.all(result.rendered.map(async (doc) => await extractPlaceholdersFromPDF(doc.pdf)))
  ).flat();
}, 90_000);

describe('the document renders', () => {
  it('produces a separate PDF per document', () => {
    // Not one merged file. Fla. Stat. §83.512 requires the flood disclosure to
    // be a separate written disclosure, and an addendum is its own instrument.
    expect(result.rendered).toHaveLength(5);

    for (const doc of result.rendered) {
      expect(doc.pdf.subarray(0, 5).toString()).toBe('%PDF-');
      expect(doc.pdf.length).toBeGreaterThan(1_000);
    }
  });

  it('makes the lease the largest document and the first', () => {
    expect(result.rendered[0].key).toBe('lease');
    expect(result.rendered[0].pdf.length).toBeGreaterThan(result.rendered[4].pdf.length);
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
    const emitted = result.documents.flatMap((doc) =>
      buildSignatureBlocks({
        parties: PICANA_PARTIES,
        documentKey: doc.key,
        withInitials: doc.withInitials,
      })
        .flatMap((block) => block.signers)
        .flatMap((signer) => signer.placeholders)
        .map((placeholder) => placeholder.token),
    );

    /*
      SET EQUALITY, NOT A COUNT — and the difference is a real signing defect.

      This compared lengths. A token that WRAPS across two rendered lines is
      still found by the extractor: `@libpdf/core` joins page lines with "\n"
      when it builds its search text, `[^}]` in the placeholder regex matches a
      newline, and the bbox becomes the union of both lines. So a wrapped token
      still counts as one, still parses as SIGNATURE/r1, and overlay 034 still
      forces it to 160x44 — every assertion in this file passed while the
      widget sat several points off where it belonged.

      Comparing the STRINGS catches it: a wrapped match carries a newline where
      the emitted token has a space, so the two sets differ.

      This is currently latent, because the signature blocks are set one token
      per line with the full measure available. It stops being latent the
      moment they are laid out in columns.
    */
    expect(new Set(allPlaceholders.map((p) => p.placeholder))).toEqual(new Set(emitted));
  });

  /*
    And nothing may reach the extractor carrying a line break, whatever the
    set comparison above happens to cover.
  */
  it('never wraps a token across two lines', () => {
    for (const placeholder of allPlaceholders) {
      expect(placeholder.placeholder, `wrapped: ${JSON.stringify(placeholder.placeholder)}`).not.toMatch(/[\r\n]/);
    }
  });

  it('gives every party a signature on every document', async () => {
    const signatures = allPlaceholders.filter((p) => p.fieldAndMeta.type === FieldType.SIGNATURE);

    expect(signatures).toHaveLength(PICANA_PARTIES.length * result.documents.length);
  });

  it('sizes every signature widget from its meta rather than its text', async () => {
    for (const signature of allPlaceholders.filter((p) => p.fieldAndMeta.type === FieldType.SIGNATURE)) {
      expect(signature.width).toBe(160);
      expect(signature.height).toBe(44);
    }
  });

  it('numbers recipients r1 to r4 and no further', async () => {
    const recipients = new Set(allPlaceholders.map((p) => p.recipient.toLowerCase()));

    expect([...recipients].sort()).toEqual(['r1', 'r2', 'r3', 'r4']);
  });
});

describe('nothing overlaps', () => {
  it('leaves every field a clear box on every page', async () => {
    // The Phase 0 finding, asserted against the real document rather than a
    // three-page fixture: a sized signature widget grows ~16.5pt in each
    // direction and will overprint its neighbours unless the renderer reserves
    // the leading.
    const overlaps: string[] = [];

    // Per document: page numbers restart in each file, so pooling them would
    // compare fields that are not on the same physical page.
    for (const doc of result.rendered) {
      const extracted = await extractPlaceholdersFromPDF(doc.pdf);

      for (const page of new Set(extracted.map((p) => p.page))) {
        const onPage = extracted.filter((p) => p.page === page);

        for (let i = 0; i < onPage.length; i++) {
          for (let j = i + 1; j < onPage.length; j++) {
            const a = onPage[i];
            const b = onPage[j];

            const separated =
              a.x + a.width <= b.x || b.x + b.width <= a.x || a.y + a.height <= b.y || b.y + b.height <= a.y;

            if (!separated) {
              overlaps.push(`${doc.key} p${page}: ${a.placeholder} overlaps ${b.placeholder}`);
            }
          }
        }
      }
    }

    expect(overlaps).toEqual([]);
  });

  it('keeps every field inside its page', async () => {
    for (const p of allPlaceholders) {
      expect(p.x).toBeGreaterThanOrEqual(0);
      expect(p.y).toBeGreaterThanOrEqual(0);
      expect(p.x + p.width).toBeLessThanOrEqual(p.pageWidth + 1);
      expect(p.y + p.height).toBeLessThanOrEqual(p.pageHeight + 1);
    }
  });
});

/**
 * The particulars block cannot contradict the document beneath it.
 *
 * A summary on the face of an instrument is a SECOND statement of facts the
 * clauses already state — and a lease saying $0.00 in one place and $6,300 in
 * another is the precise defect this product was built to prevent. The Zillow
 * lease did exactly that.
 *
 * The protection is structural: the key terms are derived from `money` and the
 * same derived values the clauses interpolate, never from a second set of
 * answers. This asserts that the structure holds, because "cannot drift" is a
 * claim, and an unasserted claim is how the last one got in.
 */
describe('the key terms and the clauses agree', () => {
  // `result` is filled in beforeAll, so these read it inside each test.
  const lease = () => result.documents.find((doc) => doc.key === 'lease');
  const terms = () => lease()?.keyTerms ?? [];

  it('states the deal on the face of the lease', () => {
    expect(terms().length).toBeGreaterThan(0);
    expect(terms().map((t) => t.label)).toContain('Rent');
  });

  it('shows the rent the rent clause charges', () => {
    const shown = terms().find((t) => t.label === 'Rent')?.value ?? '';
    const bodyText = (lease()?.clauses ?? []).map((c) => c.text).join('\n');
    const monthly = PICANA_MONEY.rent.monthlyUsd;

    expect(monthly).not.toBeNull();
    // The same figure, formatted the same way the clause formats it.
    expect(shown).toContain(
      new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(monthly)),
    );
    expect(bodyText).toContain(
      new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(monthly)),
    );
  });

  it('shows the deposit the deposit clause holds', () => {
    const shown = terms().find((t) => t.label === 'Security deposit')?.value ?? '';
    const held = PICANA_MONEY.deposit.securityUsd;

    expect(shown).toBe(new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(held)));
  });

  /*
    It RESTATES, it does not replace. A fact that lives only in the particulars
    is a fact that has only been described — the term and the rent have to stay
    operative clauses.
  */
  it('does not remove the term or the rent from the operative clauses', () => {
    const headings = (lease()?.clauses ?? []).map((c) => c.clause.heading);

    expect(headings).toContain('Term');
    expect(headings).toContain('Rent');
  });

  /*
    The particulars belong to the LEASE. An addendum restating the deal would be
    a third statement of it, in a document that is not the agreement.
  */
  it('appears on the lease alone', () => {
    for (const doc of result.documents.filter((d) => d.key !== 'lease')) {
      expect(doc.keyTerms ?? [], doc.key).toHaveLength(0);
    }
  });
});
