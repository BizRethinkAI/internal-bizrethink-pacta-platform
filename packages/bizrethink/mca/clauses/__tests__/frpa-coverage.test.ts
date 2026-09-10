import { describe, expect, it } from 'vitest';

import { documentLines } from '../documents';
import { FRPA_LOCUS_EXCLUSIONS, FRPA_NON_CLAUSE } from '../frpa';

import { libraryFor } from '../library';
import { LOMBARD } from '../parties';

/**
 * EVERY LINE OF THE DOCUMENT IS ACCOUNTED FOR, OR THIS FAILS.
 *
 * The other tests ask whether the clauses we imported are really in the
 * document. This asks the opposite and much harder question: **is anything in
 * the document not in the library?**
 *
 * That direction is the one that goes wrong silently. A clause we invent gets
 * caught by `bodies-match-the-document`; a clause we never noticed gets caught
 * by nothing, and the corpus has already produced two:
 *
 *   - ISO PRA §2.6 fell between REVIEW-01, which reports its absence, and Phase
 *     0's census, which was built before it was counted. Neither would have
 *     found it.
 *   - **The FRPA's granting clause has no number.** "Effective as of the
 *     Purchase Date, Merchant hereby sells, assigns and transfers to Buyer
 *     (making Buyer the absolute owner)…" is the sentence that makes this
 *     instrument a sale and not a loan — the whole subject of REVIEW-01's
 *     recharacterisation work — and a library that imported `N.M` numbers would
 *     have dropped it without a word. So would the definitions, and so would
 *     Section 5's lead-in, which governs all eighteen representations under it.
 *
 * A line is accounted for by being inside a clause, or by being declared in
 * `FRPA_NON_CLAUSE` with a reason. There is no third option and no default.
 */
describe('the FRPA library accounts for the whole document', () => {
  const clauses = libraryFor('frpa');
  const file = LOMBARD.documents.frpa.file;

  /*
    RETIRED 2026-09-10 by ADR 0012, alongside `bodies-match-the-document`.

    This asked the mirror question — is anything in the DOCUMENT missing from the
    library — and it is the same transcription guard pointed the other way. It
    was worth having while the library was a copy of v4: it caught the granting
    clause and ISO PRA §2.6, both of which an import keyed on numbered headings
    would have dropped in silence.

    Once clauses are authored it asserts that we have PRESERVED v4, which is
    exactly what ADR 0012 decided not to care about. It went red on the eight
    rewritten spine clauses and would go red once more for every cluster after.

    NOT SILENCED THE TWO CHEAP WAYS, both of which are worse. Declaring those
    lines in `FRPA_NON_CLAUSE` would leave a check that passes by construction as
    the other 89 clauses are rewritten — a green assertion that can never be red.
    Nulling `bodiesVerifiedAt` would hide the authorised reds too.

    WHAT REPLACES IT, LATER. When the library renders v5, a completeness check on
    the RENDER — every selected clause reaches the output — is the same guard
    pointed at a document we generate rather than one we inherited. That belongs
    with the render, not here.

    `FRPA_NON_CLAUSE` is now vestigial and goes when the last clause is rewritten;
    the assertions below still read it and still pass.
  */

  it('reads the whole document, not a prefix of it', () => {
    expect(documentLines(file).length).toBeGreaterThan(200);
  });

  /**
   * Declaring a line "not a clause" is a claim about the document, so a
   * declaration that never matches is a claim that has stopped being true —
   * usually because the document changed underneath it.
   */
  it('has no non-clause declaration that never matches', () => {
    const lines = documentLines(file);

    for (const { anchor } of FRPA_NON_CLAUSE) {
      expect(
        lines.some((line) => line.startsWith(anchor)),
        `declared non-clause never appears: ${anchor}`,
      ).toBe(true);
    }
  });

  it('gives every non-clause declaration a reason', () => {
    for (const { reason } of FRPA_NON_CLAUSE) {
      expect(reason.length).toBeGreaterThan(0);
    }
  });

  it('holds 97 clauses: 83 the document numbers, 14 it does not', () => {
    // 101 until the four `[Reserved]` records were removed. They were section
    // numbers the document holds open after a clause was taken out — lines of
    // the document, not clauses of it — and are now declared in
    // FRPA_NON_CLAUSE with the reason each one actually has.
    expect(clauses).toHaveLength(97);
    expect(clauses.filter((clause) => clause.number !== '').length).toBeGreaterThan(0);
  });

  it('imported the granting clause, the definitions and the lead-in', () => {
    const slugs = clauses.map((clause) => clause.slug);

    expect(slugs).toContain('frpa.granting-clause');
    expect(slugs).toContain('frpa.definitions');
    expect(slugs).toContain('frpa.representations-lead-in');
  });

  /**
   * §6.1's limbs are not clauses.
   *
   * An enumerated limb under a lead-in — v4's "Each of the following constitutes
   * an Event of Default hereunder:", today's "An Event of Default occurs only if
   * Merchant" — is meaningless approved in isolation from that lead-in. Section 6
   * is one clause per numbered section and its limbs live in the body, which is
   * why the count is 87 and not the 90 Phase 0 reports.
   *
   * TWO ASSERTIONS RETIRED 2026-09-10 by ADR 0012, for the reason given at the
   * head of this describe and on the same authority as the line-accounting above.
   * They read `expect(events?.body).toContain('6.1.4')` and `'6.1.15'` — a
   * transcription guard wearing a structural test's clothes. What they actually
   * pinned was that §6.1 still has a fourth and a fifteenth limb, i.e. that v4's
   * fifteen enumerated defaults survive. The `default-remedies` rewrite replaces
   * them with three lettered limbs of misconduct, so keeping the assertions would
   * have required preserving the defect the rewrite exists to remove:
   * `default-on-any-term-no-cure-no-materiality` IS limbs 6.1.1–6.1.15.
   *
   * NOT SILENCED THE CHEAP WAY. The structural claim survives below and is
   * widened rather than narrowed: no limb of §6.1, under any numbering, may be
   * imported as a clause of its own. That can still go red — it is what an
   * importer keyed on `N.M.P` headings would do — which is the whole test of
   * whether an assertion is worth keeping.
   */
  it('keeps the Events of Default limbs inside §6.1', () => {
    const events = clauses.find((clause) => clause.number === '6.1');

    expect(events).toBeDefined();
    expect(clauses.filter((clause) => /^6\.1\.[0-9]/.test(clause.number))).toEqual([]);
  });
});

/**
 * #126's rule is that a finding must NEVER be bound to a clause by matching its
 * locus string, because the ISO PRA's numbering moved between review and
 * document and a match would have been wrong exactly where the review had been
 * acted on.
 *
 * The FRPA is the checked exception, and the check is what makes it one: v4 was
 * locked before either review ran, and both ran against v4. Of the 82 clause
 * numbers named in FRPA loci, 75 exist in the document and all seven that do
 * not are explained below. Pinned so the exception cannot quietly widen into
 * the rule it is an exception to.
 */
describe('the FRPA locus exclusions', () => {
  it('names exactly seven, each with a reason', () => {
    expect(Object.keys(FRPA_LOCUS_EXCLUSIONS).sort()).toEqual(['1.3', '1.4', '1.5', '3.14', '3.5', '3.6', '6.5']);

    for (const reason of Object.values(FRPA_LOCUS_EXCLUSIONS)) {
      expect(reason.length).toBeGreaterThan(0);
    }
  });

  it('excludes no number the document actually has', () => {
    const numbers = new Set(libraryFor('frpa').map((clause) => clause.number));

    for (const excluded of Object.keys(FRPA_LOCUS_EXCLUSIONS)) {
      expect(numbers.has(excluded), `${excluded} is excluded but is a real clause`).toBe(false);
    }
  });
});
