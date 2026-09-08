import { describe, expect, it } from 'vitest';

import { DISPOSITIONS, FINDINGS_BY_ID, findingsFor, outstandingFindingsFor } from '../examination';
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
   * REVIEW-02 HAS NO MANIFEST, AND THAT IS RECORDED RATHER THAN GUESSED.
   *
   * REVIEW-01's dispositions are machine-readable and authoritative. REVIEW-02's
   * live in the prose of `change-notes/16-review-02-document-defects.md`, which
   * says 23 of its 48 findings were fixed but does not say which in a form
   * anything can read. So every REVIEW-02 finding is `unrecorded`: not open, not
   * implemented — unknown, which is the honest answer and a worse one than
   * either.
   */
  it('marks every REVIEW-02 finding unrecorded, because that review has no manifest', () => {
    const reviewTwo = [...FINDINGS_BY_ID.values()].flat().filter((finding) => finding.review === 'REVIEW-02');

    expect(reviewTwo.length).toBeGreaterThan(0);

    for (const finding of reviewTwo) {
      expect(finding.disposition).toBe('unrecorded');
    }
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
   * `unrecorded` is 45 of the remaining 58 and will fall sharply once
   * lombard-contracts PR #9 lands REVIEW-02's manifest — at which point this
   * expectation changes, and should, because the number will finally mean
   * "genuinely outstanding" rather than "nobody wrote it down".
   */
  it('reports the real backlog across the whole library', () => {
    const distinct = new Set(ALL_MCA_CLAUSES.flatMap((clause) => findingsFor(clause)).map((f) => f.id));
    const stillOpen = new Set(ALL_MCA_CLAUSES.flatMap((clause) => outstandingFindingsFor(clause)).map((f) => f.id));

    expect(distinct.size).toBe(124);
    expect(stillOpen.size).toBe(58);
    expect(distinct.size - stillOpen.size).toBe(66);
  });
});
