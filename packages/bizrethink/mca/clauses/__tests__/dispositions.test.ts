import { describe, expect, it } from 'vitest';

import { DISPOSITIONS, FINDINGS_BY_ID, findingsFor, outstandingFindingsFor, REVIEWS } from '../examination';
import { ALL_MCA_CLAUSES } from '../library';

/**
 * A finding that has been FIXED is not outstanding, and the library said it was.
 *
 * `outstandingFindingsFor` shipped in #126 filtering on `status === 'survived'`
 * alone — surviving refutation, which asks whether the finding was RIGHT. It
 * never asked whether anybody had since acted on it. Those are different
 * questions and the second one has an authoritative answer nobody had read:
 * `REVIEW-01-manifest.json` records a disposition for all 210 of that review's
 * findings, of which **173 are `implemented`** and 32 are `open`.
 *
 * Measured against the clauses already merged: 44 findings are cited, and 23 of
 * them are implemented. The library was reporting more than twice the real
 * backlog, in the direction that makes a corpus look worse than it is — which
 * is the direction that gets a mechanism ignored.
 *
 * FRPA §6.5 is the sharpest case. Eight REVIEW-01 findings name it, including
 * `liquidated-damages-plus-actual-costs` and `remedy-stack-exceeds-the-debt`.
 * The section was DELETED outright by option (a) of the review's own fix. The
 * findings are closed, the section is gone, and a library reporting them as
 * live would be pointing an attorney at text that does not exist.
 */
describe('a finding that was acted on is not outstanding', () => {
  it('carries a disposition for every REVIEW-01 finding', () => {
    const reviewOne = [...FINDINGS_BY_ID.values()].flat().filter((finding) => finding.review === 'REVIEW-01');

    for (const finding of reviewOne) {
      expect(DISPOSITIONS, `${finding.id} has no disposition`).toContain(finding.disposition);
    }
  });

  /**
   * A refuted finding has no disposition, and should not: nobody acts on a
   * finding that was withdrawn. The manifest agrees — all four of REVIEW-01's
   * refuted findings are absent from it.
   */
  it('gives a refuted finding no disposition', () => {
    const refuted = [...FINDINGS_BY_ID.values()].flat().filter((finding) => finding.status === 'refuted');

    for (const finding of refuted) {
      expect(finding.disposition).toBe('unrecorded');
    }
  });

  /**
   * BOTH REVIEWS NOW CARRY DISPOSITIONS, AND THIS TEST USED TO ASSERT THE
   * OPPOSITE.
   *
   * It read: "marks every REVIEW-02 finding unrecorded, because that review has
   * no manifest." That was true and was the point — REVIEW-02's dispositions
   * lived only in the prose of `change-notes/16-review-02-document-defects.md`,
   * so nothing could tell a fixed finding from a live one and all 48 counted as
   * outstanding.
   *
   * `lombard-contracts` PR #9 gave that review a manifest, derived from the
   * records that already existed. The assertion is inverted rather than
   * deleted, because the thing worth pinning now is that the gap is CLOSED.
   *
   * `unrecorded` stays in the vocabulary and is not dead: it is what a finding
   * gets when its manifest does not name it, which is still true of the refuted
   * ones in both reviews, and it is where the next review to arrive without a
   * manifest will land — on an honest answer rather than a default that looks
   * like one.
   */
  it('reads a disposition for both reviews, from a named manifest each', () => {
    expect(REVIEWS.map((review) => review.manifest)).toEqual(['REVIEW-01-manifest.json', 'REVIEW-02-manifest.json']);

    for (const review of REVIEWS) {
      expect(review.manifestSha256).toMatch(/^[0-9a-f]{64}$/);
    }

    const reviewTwo = [...FINDINGS_BY_ID.values()].flat().filter((finding) => finding.review === 'REVIEW-02');

    expect(reviewTwo.filter((finding) => finding.disposition === 'implemented').length).toBe(21);
    expect(reviewTwo.filter((finding) => finding.disposition === 'open').length).toBe(24);
    expect(reviewTwo.filter((finding) => finding.disposition === 'handoff').length).toBe(3);
  });

  /**
   * The three REVIEW-02 findings marked `handoff` are the owner decisions that
   * became BUILDER FACTS rather than document edits — `usesDbaName`,
   * `guarantorCount`, and the entity that contracts with ISO partners. They are
   * outstanding, and they are outstanding HERE: the clause library is what owes
   * them, not `lombard-contracts`.
   */
  it('keeps the three builder-fact handoffs outstanding', () => {
    const handoffs = [...FINDINGS_BY_ID.values()]
      .flat()
      .filter((finding) => finding.disposition === 'handoff' && finding.review === 'REVIEW-02')
      .map((finding) => finding.id)
      .sort();

    expect(handoffs).toEqual([
      'frpa-4-9-authorises-ucc-filings-under-a-dba-the-repository-does-not-record',
      'frpa-9-5-refers-to-guarantors-the-form-cannot-collect',
      'iso-a1-commission-out-of-a-fee-the-company-may-not-collect',
    ]);
  });

  it('counts REVIEW-01 the way the manifest does', () => {
    const byDisposition = [...FINDINGS_BY_ID.values()]
      .flat()
      .filter((finding) => finding.review === 'REVIEW-01')
      .reduce<Record<string, number>>((acc, finding) => {
        acc[finding.disposition] = (acc[finding.disposition] ?? 0) + 1;

        return acc;
      }, {});

    // 205 REVIEW-01 entries: 201 that survived, carrying the manifest's
    // status, plus the 4 refuted ones, which carry none.
    expect(byDisposition.implemented).toBe(166);
    expect(byDisposition.open).toBe(31);
    expect(byDisposition.handoff).toBe(2);
    expect(byDisposition.unrecorded).toBe(4);
  });

  /**
   * The correction itself. An implemented finding is dropped from the
   * outstanding list; a refuted one already was; an `unrecorded` one is KEPT,
   * because unknown is not the same as done and the safe reading of unknown is
   * that somebody still has to look.
   */
  it('drops implemented findings from the outstanding list, and keeps unknown ones', () => {
    const cited = ALL_MCA_CLAUSES.flatMap((clause) => findingsFor(clause));
    const outstanding = ALL_MCA_CLAUSES.flatMap((clause) => outstandingFindingsFor(clause));

    expect(cited.length).toBeGreaterThan(outstanding.length);

    for (const finding of outstanding) {
      expect(finding.status).toBe('survived');
      expect(['open', 'handoff', 'unrecorded']).toContain(finding.disposition);
    }
  });

  /**
   * The size of the correction, on the whole library.
   *
   * These two numbers move with every import, and that is fine — what they pin
   * is the GAP between them, which is the defect this file exists to describe.
   * Of 124 findings cited across 177 clauses, 66 are disposed of: 65
   * `implemented` and 1 `rejected` by the owner. Reporting all 124 as live work
   * is what the library did before #129.
   *
   * IT FELL FROM 58 TO 39 WHEN REVIEW-02 GOT ITS MANIFEST. Before
   * lombard-contracts PR #9, 45 of the 58 were `unrecorded` — counted as
   * outstanding because unknown is not done. Nineteen of those turned out to be
   * fixed. The number now means "genuinely outstanding" rather than "nobody
   * wrote it down", which is the whole difference between a backlog and a
   * guess.
   */
  it('reports the real backlog across the whole library', () => {
    const distinct = new Set(ALL_MCA_CLAUSES.flatMap((clause) => findingsFor(clause)).map((f) => f.id));
    const stillOpen = new Set(ALL_MCA_CLAUSES.flatMap((clause) => outstandingFindingsFor(clause)).map((f) => f.id));

    expect(distinct.size).toBe(136);
    expect(stillOpen.size).toBe(43);
    expect(distinct.size - stillOpen.size).toBe(93);
  });
});
