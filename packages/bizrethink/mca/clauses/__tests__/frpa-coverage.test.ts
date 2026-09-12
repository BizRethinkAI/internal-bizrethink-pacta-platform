// ADR 0011 adds the existing funding grid and separates the existing interest paragraph: FRPA 108, corpus 211.
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

  it('holds 108 records, including the funding grid and independently citable interest', () => {
    // 101 until the four `[Reserved]` records were removed. They were section
    // numbers the document holds open after a clause was taken out — lines of
    // the document, not clauses of it — and are now declared in
    // FRPA_NON_CLAUSE with the reason each one actually has.
    //
    // 97 until `renewal-positions` split §4.15 and §8.2 on 2026-09-10. Neither
    // split adds a SECTION: `concurrentPositions` chooses between two §4.15s and
    // `renewalModel` between two §8.2s, so every assembled document still holds
    // one of each. What moved is the number of RECORDS the library keeps, which
    // is what this counts. The alternative was `includeWhen` gating a whole
    // clause on a fact that decides one limb of it, which deleted the
    // multi-position rule instead of replacing it — see `frpa/enrollment.ts`
    // §4.15 and `frpa/miscellaneous.ts` §8.2.
    //
    // 99 records for 97 sections until `miscellaneous` added §7.25 on
    // 2026-09-10. That one DOES add a section, and deliberately: 7 TAC
    // §86.310(d) requires the OCCC complaint notice to appear in a Texas
    // contract "as a separate section or otherwise conspicuously set out from
    // surrounding written material", so it cannot share §7.24's number and
    // cannot be a paragraph inside it. It is gated on `recipientStates`
    // including US-TX and is an addition rather than an alternative — the §7.21
    // shape, not the §4.15 shape — so a non-Texas document simply does not have
    // it. Neither is it a section of `Lombard_FRPA_v4`, which is why this count
    // moved and the non-clause register did not.
    //
    // 100 records for 98 sections until 2026-09-11, when the owner's decisions
    // on full recourse and on arbitration added five. Four are the
    // `full-performance` halves of §§9.2, 9.4, 9.5 and 9.6 — exhaustive pairs in
    // the §4.15 shape, so they add RECORDS and no sections, and every assembled
    // document still holds one of each. The fifth is `frpa.arbitration-7-26`,
    // which DOES add a section: the value `disputeResolution: 'arbitration'`
    // selected no merchant-facing clause at all, and an arbitration agreement
    // cannot share a number with the courts clauses it replaces.
    //
    // 105 records for 99 sections until 2026-09-11, when §6.1 became an
    // exhaustive pair. `frpa.full-performance-events-of-default-6-1` carries the
    // same number 6.1 and is selected by `guarantyScope: 'full-performance'`
    // where the record beside it is selected by every other value, so this adds
    // a RECORD and no section and every assembled document still holds one §6.1.
    // The §4.15 shape again, and for the same reason: the ungated §6.1 decided
    // the guaranty for every template from inside Section 6.
    expect(clauses).toHaveLength(108);
    expect(clauses.filter((clause) => !clause.unnumberedReason).length).toBeGreaterThan(0);
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
    const events = clauses.find((clause) => clause.slug === 'frpa.events-of-default-6-1');

    expect(events).toBeDefined();
    // Limbs remain inside their parent; numbering.test also rejects nested stored numbers.
    expect(events?.body).toMatch(/\(a\)[\s\S]*\(b\)[\s\S]*\(c\)/);
    expect(clauses.filter((clause) => /^frpa\.(?:full-performance-)?events-of-default-6-1-/.test(clause.slug))).toEqual(
      [],
    );
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
    // These loci belong to the historical source, never the new selected document.
    const numbers = new Set(
      documentLines(LOMBARD.documents.frpa.file).flatMap((line) => line.match(/^(\d+\.\d+)\s/)?.[1] ?? []),
    );
    expect(numbers.has('6.1')).toBe(true);

    for (const excluded of Object.keys(FRPA_LOCUS_EXCLUSIONS)) {
      expect(numbers.has(excluded), `${excluded} is excluded but is a real clause`).toBe(false);
    }
  });
});
