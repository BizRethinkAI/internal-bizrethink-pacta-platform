import { AppError, AppErrorCode } from '@documenso/lib/errors/app-error';

import { assertPublishable } from '../../provenance/types';
import { approvalBlocks, approvedMcaClause, type McaClauseApproval } from '../clauses/approval';
import type { McaContent } from '../clauses/types';
import type { McaJurisdiction } from '../jurisdictions';
import type { ReviewFinding } from '../clauses/examination';

export type McaPublishRefusal = { slug: string; reason: string };

export type McaPublishablePackage = {
  items: { slug: string; content: McaContent }[];
  /**
   * Approvals by slug, **as a Map**.
   *
   * A plain object answers for its prototype: `approvals['constructor']` would
   * return a function, and a truthy non-approval is precisely the shape that
   * gets past a gate. `usStateCode` shipped that bug in #283 and a review found
   * it. A Map has no prototype keys, so the class of mistake is absent rather
   * than guarded against.
   */
  approvals: Map<string, McaClauseApproval>;
  /** Anything the draft says is outstanding. Each one refuses on its own. */
  blockers: { kind: string; detail: string }[];
  missing: { binding: string }[];
  outstandingFindings: ReviewFinding[];
  /** False when the review register could not be read. Refuses; see below. */
  evidenceAvailable: boolean;
  unansweredCounselFindings: number;
  admission?: McaJurisdiction | null;
};

/**
 * Why this package may not be PUBLISHED as a template, clause by clause.
 *
 * THE CONTROL POINT IS PUBLICATION, NOT SENDING, and getting that wrong is easy:
 * a funder's platform sends by calling `POST /api/v2/template/use` against a
 * template that already exists in its team, and no MCA code is anywhere in that
 * path. By the time a deal is being sent it is far too late for this gate to
 * matter. ADR 0016 says it plainly: *"An internal, unapproved MCA recipe must
 * not become a sendable upstream template merely because the provider interview
 * was completed."*
 *
 * Publication is the irreversible step — it hands text to a distribution path
 * Pacta's MCA code does not control — so it is the step that must refuse.
 *
 * ADR 0020 §3.2 requires merchant-bound output to fail closed on
 * `assertPublishable`. This is that gate, and it is built while NOTHING in the
 * library is approved — so it ships shut, and on the day approvals exist it is
 * already the thing standing in the way rather than something to be added once
 * there is pressure to publish.
 *
 * **It inverts `assertPublishable`'s default, deliberately.** That function
 * returns early on anything not `published`, which is right for a report and
 * wrong for a gate: an unapproved clause would pass a check that only asks
 * whether published text is sound. Here every clause must be provably
 * publishable, and silence is never consent.
 *
 * Every unknown refuses. An unreadable review register, a missing approval, an
 * approval that no longer matches the words — each is a refusal rather than a
 * reason to proceed, because the cost of a wrong "yes" is a merchant signing
 * text no attorney approved.
 */
export const mcaPublicationRefusals = (input: McaPublishablePackage): McaPublishRefusal[] => {
  const refusals: McaPublishRefusal[] = [];

  for (const blocker of input.blockers) {
    refusals.push({ slug: 'package', reason: `outstanding ${blocker.kind}: ${blocker.detail}` });
  }

  for (const entry of input.missing) {
    refusals.push({ slug: 'package', reason: `required input not supplied: ${entry.binding}` });
  }

  for (const { slug, content } of input.items) {
    const approval = input.approvals.get(slug) ?? null;
    const approved = approvedMcaClause(content, approval);

    if (approved.status !== 'published') {
      refusals.push({
        slug,
        reason: approval
          ? 'the approval on file does not match the words in this package'
          : 'no current attorney approval',
      });
      continue;
    }

    const problems = assertPublishable(approved);

    if (problems.length) {
      refusals.push({ slug, reason: problems.join('; ') });
      continue;
    }

    const held = approvalBlocks(approved, {
      admission: input.admission ?? approval?.barJurisdiction ?? null,
      outstanding: input.outstandingFindings,
      evidenceAvailable: input.evidenceAvailable,
      unansweredCounselFindings: input.unansweredCounselFindings,
    });

    if (held) {
      refusals.push({ slug, reason: held });
    }
  }

  return refusals;
};

/**
 * The same question, asked where a caller cannot ignore the answer.
 *
 * A gate that returns a list is a gate somebody forgets to read.
 *
 * NOTHING CALLS THIS YET, and it is written before its caller on purpose —
 * ADR 0020 §3.2, so the gate is not written later, under pressure, by whoever
 * wants to publish. The template publication path WILL call it; the workspace
 * will call `mcaPublicationRefusals` instead, to show the list while a funder
 * is still deciding. Neither exists today.
 */
export const assertMcaPackagePublishable = (input: McaPublishablePackage): void => {
  if (!input.items.length) {
    throw new AppError(AppErrorCode.INVALID_REQUEST, {
      message: 'This package has no content, and an empty package is not a publishable one.',
    });
  }

  const refusals = mcaPublicationRefusals(input);

  if (refusals.length) {
    throw new AppError(AppErrorCode.INVALID_REQUEST, {
      message: `This package cannot be published as a template: ${refusals.length} refusal(s), starting with ${refusals[0].slug} — ${refusals[0].reason}.`,
    });
  }
};
