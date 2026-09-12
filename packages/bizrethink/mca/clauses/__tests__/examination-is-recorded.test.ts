import { describe, expect, it } from 'vitest';

import { AMBIGUOUS_FINDING_IDS, FINDINGS_BY_ID, findingsFor, REVIEWS } from '../examination';
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
        const found = FINDINGS_BY_ID.get(id) ?? [];

        expect(found.length, `${clause.slug} names a finding that is not in the register: ${id}`).toBeGreaterThan(0);
        expect(found.some((finding) => finding.review === examination.review)).toBe(true);
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
  it('the register knows which findings were refuted, and why', () => {
    const refuted = [...FINDINGS_BY_ID.values()].flat().filter((finding) => finding.status === 'refuted');

    expect(refuted.length).toBe(5);

    // A refuted finding carries `why` and carries no severity or route, because
    // it was withdrawn and genuinely has neither. Padding the shape would print
    // an empty severity beside it and read as missing data.
    for (const finding of refuted) {
      expect(finding.why).toBeDefined();
      expect(finding.severity).toBeUndefined();
      expect(finding.decides).toBeUndefined();
    }
  });

  it('the register holds both reviews and every finding is reachable by id', () => {
    expect(REVIEWS.map((review) => review.review)).toEqual(['REVIEW-01', 'REVIEW-02']);

    const total = REVIEWS.reduce((sum, review) => sum + review.findings.length, 0);

    expect([...FINDINGS_BY_ID.values()].flat().length).toBe(total);
  });

  /**
   * A finding id is not unique, and the test that assumed it was is how that
   * was found.
   *
   * REVIEW-01 gives `frpa-cross-reference-titles-wrong` to two findings — one
   * against the Florida, Georgia and Kansas disclosures, one against Louisiana,
   * Missouri, Texas and Utah. Same defect, different documents, same name.
   *
   * Pinned rather than tolerated. A map keyed by id would have kept one and
   * dropped the other in silence; this asserts the exact set, so a
   * regeneration that introduces a second collision fails here instead of
   * quietly hiding a finding from whoever is reading the clause that cites it.
   */
  it('names the one id the reviews use twice, and no other', () => {
    expect(AMBIGUOUS_FINDING_IDS).toEqual(['frpa-cross-reference-titles-wrong']);
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

/**
 * The shape of what the first instrument actually brought in.
 *
 * Asserted rather than described, because the numbers are the whole claim this
 * import makes and prose about them rots. If a later change quietly stops a
 * clause citing a finding, or cites one that was refuted, this is what says so.
 */
describe('the ISO Partner Referral Agreement, as imported', () => {
  const clauses = ALL_MCA_CLAUSES.filter((clause) => clause.instrument === 'iso-pra');

  it('is all twenty-eight of its clauses', () => {
    // Twenty-four numbered, plus the parties paragraph, two WHEREAS recitals
    // and the consideration sentence — none of them numbered, and all four
    // invisible to the import that keyed on numbered headings.
    expect(clauses).toHaveLength(28);
  });

  /**
   * REVIEW-01 read twenty-one of them. The three it did not — A.2 *When
   * Commission Is Earned*, A.6 *Sole Compensation* and 1.6 *Representatives* —
   * are the ones Phase 0's appendix listed as unexamined for this document, and
   * REVIEW-02 is where they were finally read.
   *
   * §2.6 is the fourth and it is not in either census: it did not exist when
   * REVIEW-01 ran (that review's `iso-no-952-transmission-or-evidence-clause`
   * reports its absence), and Phase 0's appendix was built before it was
   * counted. REVIEW-02 read it in passing, against 1.6.
   */
  it('names REVIEW-02 for exactly the four clauses REVIEW-01 did not read', () => {
    const reviewedByTwoOnly = clauses
      .filter((clause) => clause.examinedBy.every((examination) => examination.review === 'REVIEW-02'))
      .map((clause) => clause.slug)
      .sort();

    expect(reviewedByTwoOnly).toEqual([
      'iso-pra.commercial-financing-disclosures-california-and-new-york',
      'iso-pra.representatives',
      'iso-pra.sole-compensation',
      'iso-pra.when-commission-is-earned',
    ]);
  });

  it('cites seventeen distinct findings, none of them refuted', () => {
    const cited = new Set(clauses.flatMap((clause) => clause.examinedBy).flatMap((e) => e.findings));

    expect(cited.size).toBe(17);

    for (const finding of clauses.flatMap((clause) => findingsFor(clause))) {
      expect(finding.status, `${finding.id} was refuted but is cited as a finding`).toBe('survived');
    }
  });

  /**
   * Four REVIEW-01 findings mentioning this agreement are attached to no clause
   * of it, and that is deliberate: two are against the signature block and the
   * section headings, one is against the FRPA's §7.21, and one against a row of
   * the California disclosure. None is about a clause here.
   *
   * Pinned so that "every finding has a home" never gets adopted as a tidiness
   * goal — it would put a finding in front of a reviewer reading a clause it is
   * not about, which is how findings start being ignored.
   */
  it('leaves the four document-level findings unattached', () => {
    const cited = new Set(clauses.flatMap((clause) => clause.examinedBy).flatMap((e) => e.findings));

    for (const id of [
      'iso-signature-dates-share-effective-date-field',
      'iso-inconsistent-section-numbering',
      'iso-channel-vs-never-cold-call',
      'ca-broker-row-contradicts-frpa-and-iso',
    ]) {
      expect(FINDINGS_BY_ID.has(id), `${id} is missing from the register`).toBe(true);
      expect(cited.has(id)).toBe(false);
    }
  });
});
