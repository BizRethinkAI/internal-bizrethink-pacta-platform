import { describe, expect, it } from 'vitest';
import type { McaJurisdiction } from '../jurisdictions';
import { CT_DISCLOSURE } from '../prescribed/forms/ct-disclosure';
import { VA_DISCLOSURE } from '../prescribed/forms/va-disclosure';
import type { PrescribedForm } from '../prescribed/types';
import { containsPrescribedText, normalisedDigest, readSourceText } from '../provenance/source-text';
import { CT_VA_OBLIGATIONS, VENDORED_STATUTES } from '../statutes/ct-va-obligations';

/*
  CLOSING THE CT/VA GAP — the one the README has carried since the package was
  built: "Two states where we hold the form but not the statute."

  Until 2026-09-07 every claim this package made about Connecticut's Act and
  Virginia's Code came from the Department of Banking's guidance document, which
  is the Department's CHARACTERISATION of the Act rather than the Act — and from
  a note in MCA-CLAUSE-LIBRARY-PHASE0.md for Virginia, which had no primary text
  at all. Both statutes are now vendored from their official publishers, and
  every one of those claims is a verbatim quotation checked against them here.

  WHY THIS FILE RATHER THAN A COMMENT. A quotation in a doc comment is exactly
  as trustworthy as a paraphrase: nothing re-executes it. These are data, they
  are re-matched against the vendored bytes on every run, and when Connecticut
  amends the Act the digest breaks and a human has to read it again. That is the
  same discipline `provenance-honesty.test.ts` applies to the prescribed forms,
  applied to the obligations AROUND them.
*/

describe('the vendored statutes are the ones the obligations were read from', () => {
  it.each(
    VENDORED_STATUTES.map((s) => [s.sourceFile, s] as const),
  )('%s still hashes to what was recorded', (_file, statute) => {
    expect(normalisedDigest(readSourceText(statute.sourceFile))).toBe(statute.sourceDigest);
  });

  it('records where each came from, so the fetch can be repeated', () => {
    for (const statute of VENDORED_STATUTES) {
      expect(statute.retrievedFrom).toMatch(/^https:\/\//);
      expect(statute.retrievedOn).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(statute.publisher).not.toBe('');
    }
  });
});

describe('every obligation is a verbatim quotation from the vendored Act', () => {
  it.each(CT_VA_OBLIGATIONS.map((o) => [o.id, o] as const))('%s', (_id, obligation) => {
    expect(containsPrescribedText(readSourceText(obligation.sourceFile), obligation.text)).toBe(true);
  });
});

/*
  A NEGATIVE CONTROL, because a containment check that has never failed is not
  yet a check. Connecticut's prejudgment-remedy ban and Virginia's
  confession-of-judgment ban are DIFFERENT prohibitions and the two are commonly
  conflated — the Connecticut guidance says nothing about confessions of
  judgment, and Virginia's Code says nothing about prejudgment remedies. If
  either sentence could be found in the other state's file, the checks above
  would be worthless.
*/
describe('neither state’s prohibition is in the other state’s Act', () => {
  const ct = CT_VA_OBLIGATIONS.find((o) => o.id === 'ct-no-prejudgment-remedy-waiver');
  const va = CT_VA_OBLIGATIONS.find((o) => o.id === 'va-no-confession-of-judgment');

  it('Connecticut’s prejudgment-remedy ban is not in the Virginia Code', () => {
    expect(containsPrescribedText(readSourceText('VA-Code-6.2-2228-2238.txt'), ct?.text ?? '')).toBe(false);
  });

  it('Virginia’s confession-of-judgment ban is not in the Connecticut Act', () => {
    expect(containsPrescribedText(readSourceText('CT-CGS-36a-861-872.txt'), va?.text ?? '')).toBe(false);
  });

  it('and Connecticut’s Act does not prohibit confessions of judgment at all', () => {
    expect(readSourceText('CT-CGS-36a-861-872.txt').toLowerCase()).not.toContain('confession');
  });
});

/*
  The statutory items, and whether the prescribed form has a home for each.

  This is the check the Georgia and Texas forms needed and lacked: both
  faithfully implemented specs derived from secondary summaries. Connecticut's
  §36a-863 lists ten items and Virginia's §6.2-2231 lists nine, and until now
  nothing connected either list to the rows of the form we send. Where an
  obligation names a row, that row must exist — spelled as the spec spells it.
*/
describe('every statutory disclosure item has a home on the form', () => {
  const rowsOf: Partial<Record<McaJurisdiction, PrescribedForm>> = {
    'US-CT': CT_DISCLOSURE,
    'US-VA': VA_DISCLOSURE,
  };

  it.each(
    CT_VA_OBLIGATIONS.filter((o) => o.satisfiedBy !== null).map((o) => [o.id, o] as const),
  )('%s lands on a row the form actually has', (_id, obligation) => {
    const form = rowsOf[obligation.jurisdiction];

    // Not a formality: an obligation is only meaningful against the form it
    // was read alongside, and a jurisdiction with no form here is a bug in
    // the data rather than a row to skip.
    expect(form).toBeDefined();
    expect(form?.rows.map((r) => r.label)).toContain(obligation.satisfiedBy);
  });

  it('covers every numbered item of §36a-863 and of §6.2-2231', () => {
    const ct = CT_VA_OBLIGATIONS.filter((o) => o.citation.startsWith('Conn. Gen. Stat. §36a-863('));
    const va = CT_VA_OBLIGATIONS.filter((o) => o.citation.startsWith('Va. Code §6.2-2231('));

    expect(ct).toHaveLength(10);
    expect(va).toHaveLength(9);
  });
});

/*
  The obligations that are NOT about the form, kept visible for the same reason
  `instanceCoverage` names the blockers an envelope could not detect: this
  package checks documents, and three of these live in the contract, in the
  sending process and in an annual fee. Nothing here enforces any of them, and
  saying so is the point of the field.
*/
describe('what the statutes require that this package cannot check', () => {
  it('names them rather than leaving them implied', () => {
    const elsewhere = CT_VA_OBLIGATIONS.filter((o) => o.bearsOn !== 'the form').map((o) => o.id);

    expect(elsewhere).toEqual([
      'ct-signature-required',
      'ct-no-prejudgment-remedy-waiver',
      'ct-offer-not-revocable-for-three-days',
      'ct-registration',
      'ct-penalties',
      'va-signature-required',
      'va-venue-in-the-commonwealth',
      'va-arbitration-forum',
      'va-no-confession-of-judgment',
      'va-noncompliant-provision-unenforceable',
      'va-registration',
      'va-attorney-general-enforcement',
    ]);
  });

  /*
    A fourth category that is about the form and still unchecked: three
    obligations bear on the disclosure without landing on any row of it.
    §36a-866 and §6.2-2233 govern what may appear ALONGSIDE the prescribed
    disclosure rather than inside it, and §36a-867 governs which form may be
    used at all. `satisfiedBy: null` on a 'the form' obligation is the marker,
    and it means the same thing every other null in this package means —
    a human has to look.
  */
  it('and names the form obligations that no row can discharge', () => {
    const unrowed = CT_VA_OBLIGATIONS.filter((o) => o.bearsOn === 'the form' && o.satisfiedBy === null).map(
      (o) => o.id,
    );

    expect(unrowed).toEqual([
      'ct-scope-sales-based-under-250k',
      'ct-format-prescribed-by-the-commissioner',
      'ct-additional-information-outside-the-disclosure',
      'ct-other-state-form-reciprocity',
      'va-scope-sales-based',
      'va-additional-information-outside-the-disclosure',
    ]);
  });
});
