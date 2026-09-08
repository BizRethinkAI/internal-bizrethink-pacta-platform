import { describe, expect, it } from 'vitest';

import { approvalBlocks, counselFindingsHold } from '../approval';
import { libraryFor } from '../library';

/**
 * A finding counsel records through a review link blocks approval of that
 * clause until somebody answers it.
 *
 * WHY THIS RULE EXISTS AT ALL, GIVEN THE PAGE USED TO REFUSE TO COLLECT
 * FINDINGS. It refused for a stated reason: MCA findings from the two
 * adversarial document reviews live in `lombard-contracts` manifests, and a
 * second Pacta-side register of the same findings would drift from the first.
 * That argument holds for the reviews it was written about and does not reach
 * this case. Counsel's findings are not a second copy of anything — they arrive
 * only through a review link, they are attributable to the named reviewer on
 * that link, and no manifest has ever held one. There is one register per
 * origin, and the page says which origin each finding came from.
 *
 * WHAT WOULD MAKE IT DECORATIVE. The lease shipped this whole mechanism once
 * with nothing calling it — `approve` never consulted a finding, so a clause
 * with an unanswered defect report could be approved with no obstacle at all,
 * and CI was green because every unit was tested in isolation. A textarea that
 * stores a lawyer's objection somewhere nothing reads is worse than no textarea,
 * because it looks like it worked. This is the rule that makes it load-bearing;
 * `mca/review/__tests__/findings-wiring.test.ts` is what asserts it is plugged
 * in.
 */
describe('an unanswered counsel finding holds the clause', () => {
  const clause = libraryFor('frpa')[0];

  it('does not hold a clause nobody has objected to', () => {
    expect(counselFindingsHold(0)).toBeNull();
  });

  it('holds the clause while one is unanswered', () => {
    const held = counselFindingsHold(1);

    expect(held).not.toBeNull();
    expect(held).toMatch(/finding/i);
  });

  /**
   * Singular and plural, because a blocker that reads "1 findings" is a blocker
   * the reader trusts slightly less, and this one is read at the moment
   * somebody is being told they cannot do the thing they came to do.
   */
  it('counts in words that agree with the number', () => {
    expect(counselFindingsHold(1)).toMatch(/a finding/);
    expect(counselFindingsHold(3)).toMatch(/3 findings/);
  });

  /**
   * It has to say where the answer is written, for the same reason the vendored
   * register's blocker names the manifest: a refusal that does not say what
   * would clear it is a dead end rather than a gate.
   */
  it('says where the finding is answered', () => {
    expect(counselFindingsHold(2)).toMatch(/admin\/mca/);
  });

  /**
   * ORDER. `approvalBlocks` already argues its own: the admission is a fact
   * about the person and reading a finding will not fix it, so it comes first.
   * Between the two kinds of finding, counsel's comes first because it is the
   * faster loop — answering it is a form on `/admin/mca`, while clearing a
   * vendored one means editing a manifest in another repository and
   * re-vendoring the register. Surfacing the slower fix first would send
   * somebody on the long errand while the short one was still open.
   */
  it('reports the admission before either kind of finding', () => {
    const blocked = approvalBlocks(clause, {
      admission: null,
      outstanding: [],
      evidenceAvailable: true,
      unansweredCounselFindings: 2,
    });

    expect(blocked).toMatch(/admitted|admission|bar/i);
    expect(blocked).not.toMatch(/admin\/mca/);
  });

  it('reports a counsel finding before a vendored one', () => {
    const blocked = approvalBlocks(clause, {
      admission: 'US-NY',
      outstanding: [
        {
          id: 'REVIEW-99',
          finding: 'something the earlier register still holds',
          status: 'survived',
          disposition: 'open',
        } as never,
      ],
      evidenceAvailable: true,
      unansweredCounselFindings: 1,
    });

    expect(blocked).toMatch(/admin\/mca/);
    expect(blocked).not.toMatch(/REVIEW-99/);
  });

  /**
   * THE DEFAULT IS TO BLOCK NOTHING, and that is deliberate rather than lazy.
   * `unansweredCounselFindings` is optional so that a caller which cannot count
   * them — a test, a pure-rule consumer — behaves exactly as it did before this
   * field existed. The caller that matters is asserted separately, in the
   * wiring test, precisely because an optional field is the shape a mechanism
   * takes when it silently stops being called.
   */
  it('treats an uncounted caller as it did before the field existed', () => {
    expect(approvalBlocks(clause, { admission: 'US-NY', outstanding: [], evidenceAvailable: true })).toBeNull();
  });
});
