import { describe, expect, it } from 'vitest';
import { checkFormConformity } from '../prescribed/conformity';
import { CA_LEASE_FINANCING } from '../prescribed/forms/ca-lease-financing';
import { NY_LEASE_FINANCING } from '../prescribed/forms/ny-lease-financing';
import caRendered from './ca-lease-rows.fixture.json';
import nyRendered from './ny-lease-rows.fixture.json';

/*
  Lombard's shipped lease financing disclosures, checked against 10 CCR §915 and
  23 NYCRR §600.14 as transcribed in the specs.

  THE FIXTURES ARE NOT PRODUCED BY THE USUAL EXTRACTOR, and the reason is worth
  recording because it is itself a finding.
  `lombard-contracts/pipeline/extract_disclosure_rows.py` drops any row whose
  first cell is empty or reads "term" — `if label.lower() in ('', 'term',
  'amount'): continue` — which is right for the offer summaries and wrong here.
  §915(a)(7) prescribes a row labelled "Term", and §915(a)(8) combines the first
  column of the seventh and eighth rows so the eighth row's first cell is empty.
  Run against a lease disclosure that script returns six rows from an eight-row
  table. These fixtures come from a variant that keeps both; the fix belongs in
  lombard-contracts and has not been made from here.
*/

describe('Lombard_CA_Lease_Disclosure_v1 against 10 CCR §915', () => {
  const divergences = checkFormConformity(CA_LEASE_FINANCING, caRendered);

  it('reproduces every prescribed sentence exactly', () => {
    expect(divergences.filter((d) => d.kind === 'verbatim')).toEqual([]);
  });

  it('has the eight rows §915(a)(1) prescribes', () => {
    expect(divergences.filter((d) => d.kind === 'row-count')).toEqual([]);
  });

  it('carries no unauthorised words, and nothing in the Term row’s third column', () => {
    expect(divergences.filter((d) => d.kind === 'unauthorised-addition')).toEqual([]);
  });

  /*
    THE OTHER DIVERGENCE, STATED AT THE WEIGHT IT ACTUALLY CARRIES.

    §915(a)(8): "In the first column, the seventh and eighth rows shall be
    COMBINED and shall include the following language: 'Prepayment'." The DOCX
    contains no `vMerge` element at all — the eighth row simply has an empty
    first cell — so as a document the two cells are not combined.

    WHAT A READER SEES IS VERY NEARLY WHAT §915 ASKS FOR, THOUGH, and saying so
    is the difference between a finding and an overclaim. The lease table has no
    borders at all (no `tblBorders`, no `tcBorders`), so the eighth row's first
    column prints as blank space under the word "Prepayment", which is what a
    combined cell would look like. The divergence is structural rather than
    visual: it is in the file, not on the page.

    The comparison that gives it any weight at all is the sibling
    `Lombard_CA_Disclosure_v1`, which is a bordered grid and DOES merge, with two
    `vMerge` elements for exactly this pair of rows under §914(a)(9). The lease
    forms were built by a different generator and did not carry the merge across.

    PINNED RATHER THAN ASSERTED AWAY. It is reported to the owner at that
    weight; what this test does is make sure it cannot quietly grow into two.
  */
  it('does not combine the Prepayment cell the way §915(a)(8) requires', () => {
    const labels = divergences.filter((d) => d.kind === 'label');

    expect(labels).toHaveLength(1);
    expect(labels[0]?.row).toBe(7);
    expect(labels[0]?.detail).toContain('"Prepayment"');
    expect(labels[0]?.detail).toContain('form has ""');
  });
});

describe('Lombard_NY_Lease_Disclosure_v1 against 23 NYCRR §600.14', () => {
  const divergences = checkFormConformity(NY_LEASE_FINANCING, nyRendered);

  it('has the ten rows §600.14(a) prescribes', () => {
    expect(divergences.filter((d) => d.kind === 'row-count')).toEqual([]);
  });

  it('carries no unauthorised words, and nothing in the Term row’s third column', () => {
    expect(divergences.filter((d) => d.kind === 'unauthorised-addition')).toEqual([]);
  });

  // The same uncombined Prepayment cell as California. Same regulation
  // language, §600.14(h), same absence of `vMerge`, same document generator.
  it('does not combine the Prepayment cell the way §600.14(h) requires', () => {
    const labels = divergences.filter((d) => d.kind === 'label');

    expect(labels).toHaveLength(1);
    expect(labels[0]?.row).toBe(7);
  });

  /*
    THE SECOND DIVERGENCE, AND IT IS THE ONE THAT MATTERS.

    §600.14(c)(3) prescribes: "APR incorporates the amount and timing of the
    funding you receive, finance charges you pay, AND the periodic payments you
    make, and the anticipated cost …". The document says "… finance charges you
    pay, the periodic payments you make, and the anticipated cost …" — New
    York's noun inside California's sentence structure, because §915(a)(3)(C)
    reads "fees you pay, the periodic payments you make" with no conjunction
    there.

    This is the same failure as templates 104/105 and in the same direction: one
    state's phrasing surviving inside the other state's document, in a row
    §600.14(c) opens with "shall include only the following information". It was
    found by writing the spec, not by reading the form — the form reads
    perfectly well.

    REPORTED AND HANDED BACK, NOT FIXED HERE. Editing `lombard-contracts` to
    correct it is the main session's call, and the sentence is New York's to
    prescribe rather than ours to draft.
  */
  it('drops a word from §600.14(c)(3)’s prescribed APR sentence', () => {
    const verbatim = divergences.filter((d) => d.kind === 'verbatim');

    expect(verbatim).toHaveLength(1);
    expect(verbatim[0]?.row).toBe(1);
    expect(verbatim[0]?.detail).toContain('finance charges you pay, and the periodic payments you make');
  });

  /*
    The mirror assertion, so the finding is stated as a difference between the
    two regulations and not as a typo. Correct the conjunction and the New York
    row conforms; leave it and it does not — and California's row, with the same
    conjunction removed, is correct.
  */
  it('conforms once the missing conjunction is restored', () => {
    const corrected = nyRendered.map((row, i) =>
      i === 1 ? { ...row, content: row.content.replace('you pay, the periodic', 'you pay, and the periodic') } : row,
    );

    expect(checkFormConformity(NY_LEASE_FINANCING, corrected).filter((d) => d.kind === 'verbatim')).toEqual([]);
  });
});

/*
  The two lease tables are not one table with different strings, any more than
  §914 and §600.6 are. Asserted rather than commented, for the reason
  `near-identical-states.test.ts` gives: a sweep that edits "the lease
  disclosures" as a set is wrong by construction for these two.
*/
describe('California and New York prescribe different lease tables', () => {
  it('differ in row count, in labels and in wording', () => {
    expect(CA_LEASE_FINANCING.rows).toHaveLength(8);
    expect(NY_LEASE_FINANCING.rows).toHaveLength(10);

    expect(NY_LEASE_FINANCING.rows.map((r) => r.label)).toContain('Avoidable Fees and Charges');
    expect(CA_LEASE_FINANCING.rows.map((r) => r.label)).not.toContain('Avoidable Fees and Charges');

    // §915(a)(2)(C) ends the funding sentence with a full stop; §600.14(b)(3)(i)
    // ends it with a colon. One character, and it is prescribed.
    expect(CA_LEASE_FINANCING.rows[0]?.verbatim).toMatch(/will provide\.$/);
    expect(NY_LEASE_FINANCING.rows[0]?.verbatim).toMatch(/will provide:$/);

    // §600.14(j)(2) inserts "then"; §915(a)(10)(B) does not.
    expect(NY_LEASE_FINANCING.rows[7]?.verbatim).toContain('term, then you will not');
    expect(CA_LEASE_FINANCING.rows[7]?.verbatim).toContain('term, you will not');
  });

  it('cannot borrow each other’s APR sentence', () => {
    const ca = CA_LEASE_FINANCING.rows[1]?.verbatim ?? '';
    const ny = NY_LEASE_FINANCING.rows[1]?.verbatim ?? '';

    expect(ca).toContain('fees you pay, the periodic payments you make');
    expect(ca).not.toContain('finance charges you pay');
    expect(ny).toContain('finance charges you pay, and the periodic payments you make');
    expect(ny).not.toContain('fees you pay,');
  });
});
