import { describe, expect, it } from 'vitest';
import { agreementDigest, containsClauseText, readAgreementBody } from '../documents';
import { INSTRUMENTS, MCA_INSTRUMENTS } from '../instruments';
import { ALL_MCA_CLAUSES, libraryFor } from '../library';

/**
 * A clause body is a copy of words a merchant or a partner actually signs. The
 * copy is worth nothing on its own.
 *
 * This is the same argument `mca/provenance/source-text.ts` makes about
 * statutes, pointed at our own documents instead. There the risk is a regulator
 * amending a rule under a spec that still quotes the old wording; here it is
 * the reverse direction and just as quiet — somebody edits the .docx in
 * `lombard-contracts`, re-renders, republishes, and the clause library goes on
 * asserting the superseded sentence with a verification date beside it.
 *
 * So every body and every heading is re-found in the vendored document on every
 * run, and the document itself is pinned by digest. Neither check is a
 * judgement about whether the clause is any good. Both are the precondition for
 * such a judgement being about the right words.
 */
describe('every clause body is still in the document it was taken from', () => {
  it.each(
    MCA_INSTRUMENTS.filter((id) => INSTRUMENTS[id].bodiesVerifiedAt !== null),
  )('%s: the vendored document is unchanged', (id) => {
    const instrument = INSTRUMENTS[id];

    expect(agreementDigest(instrument.sourceDocument)).toBe(instrument.sourceDigest);
  });

  it.each(ALL_MCA_CLAUSES.map((clause) => [clause.slug, clause] as const))('%s', (_slug, clause) => {
    const body = readAgreementBody(INSTRUMENTS[clause.instrument].sourceDocument);

    expect(containsClauseText(body, clause.heading)).toBe(true);
    expect(containsClauseText(body, clause.body)).toBe(true);
  });

  /**
   * The number the document prints, checked beside the heading rather than
   * instead of it.
   *
   * REVIEW-01's finding loci name `§A.5 Clawback Provision`; the shipped v2
   * document numbers that clause A.4, because the fixes that review produced
   * removed a section above it. A clause therefore cannot be identified by its
   * number alone across time, and this asserts only that the number and the
   * heading are adjacent in the document TODAY.
   */
  it.each(
    ALL_MCA_CLAUSES.map((clause) => [clause.slug, clause] as const),
  )('%s prints its number beside its heading', (_slug, clause) => {
    const body = readAgreementBody(INSTRUMENTS[clause.instrument].sourceDocument);

    expect(containsClauseText(body, `${clause.number} ${clause.heading}`)).toBe(true);
  });

  it('every instrument that has clauses has a vendored document', () => {
    for (const id of MCA_INSTRUMENTS) {
      if (libraryFor(id).length > 0) {
        expect(INSTRUMENTS[id].bodiesVerifiedAt).not.toBeNull();
        expect(() => readAgreementBody(INSTRUMENTS[id].sourceDocument)).not.toThrow();
      }
    }
  });
});
