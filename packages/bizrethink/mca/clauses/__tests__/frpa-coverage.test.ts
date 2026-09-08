import { describe, expect, it } from 'vitest';

import { documentLines, linesNotAccountedFor } from '../documents';
import { FRPA_LOCUS_EXCLUSIONS, FRPA_NON_CLAUSE } from '../frpa';

import { libraryFor } from '../library';
import { LOMBARD, resolveClauses } from '../parties';

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

  it('leaves no line unaccounted for', () => {
    expect(linesNotAccountedFor(file, resolveClauses(clauses, LOMBARD), FRPA_NON_CLAUSE)).toEqual([]);
  });

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

  it('holds 101 clauses: 87 the document numbers, 14 it does not', () => {
    expect(clauses).toHaveLength(101);
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
   * `6.1.1`–`6.1.15` are enumerated limbs under one lead-in — "Each of the
   * following constitutes an Event of Default hereunder:" — and a limb approved
   * in isolation from its lead-in means nothing. They live inside §6.1's body,
   * which is why the count is 87 and not the 90 Phase 0 reports.
   */
  it('keeps the Events of Default limbs inside §6.1', () => {
    const events = clauses.find((clause) => clause.number === '6.1');

    expect(events?.body).toContain('6.1.4');
    expect(events?.body).toContain('6.1.15');
    expect(clauses.some((clause) => clause.number === '6.1.4')).toBe(false);
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
