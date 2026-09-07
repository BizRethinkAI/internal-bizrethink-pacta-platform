import { describe, expect, it } from 'vitest';

import { FINDINGS_BY_ID, findingsFor, REVIEWS } from '../examination';
import { ALL_MCA_CLAUSES } from '../library';

/**
 * The rule this file enforces is the one Phase 0 wrote down and nothing could
 * check: *"Anything in this column enters as draft, never as library."*
 *
 * The column was the 47 clauses no review had examined, and the danger Phase 0
 * named is that a clause library seeded from unexamined text **launders that
 * text into apparent authority**. A clause sitting in a library page under a
 * heading and a citation reads as considered. Nothing about the file it lives
 * in says whether anybody read it.
 *
 * So `examinedBy` is required and may not be empty, and the reviews it names
 * are vendored rather than asserted. What that buys is narrow and worth stating
 * exactly: it proves a finding id is a finding that was really raised, in a
 * review that really ran, against a document. It does not prove the finding
 * says what the clause claims, and it cannot — the argument lives in
 * `lombard-contracts` and is not reproduced here.
 */
describe('no clause enters the library unexamined', () => {
  it.each(
    ALL_MCA_CLAUSES.map((clause) => [clause.slug, clause] as const),
  )('%s names at least one review that read it', (_slug, clause) => {
    expect(clause.examinedBy.length).toBeGreaterThan(0);

    for (const examination of clause.examinedBy) {
      expect(REVIEWS.map((review) => review.review)).toContain(examination.review);
    }
  });

  it.each(
    ALL_MCA_CLAUSES.map((clause) => [clause.slug, clause] as const),
  )('%s only names findings that exist', (_slug, clause) => {
    for (const examination of clause.examinedBy) {
      for (const id of examination.findings) {
        const finding = FINDINGS_BY_ID.get(id);

        expect(finding, `${clause.slug} names a finding that is not in the register: ${id}`).toBeDefined();
        expect(finding?.review).toBe(examination.review);
      }
    }
  });

  /**
   * A refuted finding is a fact about the clause too, and a different one: it
   * was raised and did not survive. Recording it is honest; recording it
   * silently as though it stood is not, so the register carries the status and
   * this asserts a clause cannot claim a refuted finding without the register
   * agreeing.
   */
  it('the register knows which findings were refuted', () => {
    const refuted = [...FINDINGS_BY_ID.values()].filter((finding) => finding.status === 'refuted');

    expect(refuted.length).toBeGreaterThan(0);
  });

  it('the register holds both reviews and every finding is reachable by id', () => {
    expect(REVIEWS.map((review) => review.review)).toEqual(['REVIEW-01', 'REVIEW-02']);

    const total = REVIEWS.reduce((sum, review) => sum + review.findings.length, 0);

    expect(FINDINGS_BY_ID.size).toBe(total);
  });

  /**
   * `findingsFor` is how a review page shows an attorney what has already been
   * said about a clause. It resolves ids through the register rather than
   * letting a clause carry its own prose copy of a finding, because two copies
   * of a finding drift and the one in the clause file is the one nobody
   * re-reads.
   */
  it('resolves a clause to its findings', () => {
    const withFindings = ALL_MCA_CLAUSES.filter((clause) =>
      clause.examinedBy.some((examination) => examination.findings.length > 0),
    );

    expect(withFindings.length).toBeGreaterThan(0);

    for (const clause of withFindings) {
      expect(findingsFor(clause).length).toBeGreaterThan(0);
    }
  });
});
