import { createHash } from 'node:crypto';

import type { Disposition, LeaseReview, ReviewComment } from './types';

/**
 * The rules of the review loop, as pure functions.
 *
 * Everything here is decided without touching the database so it can be
 * asserted directly — these are the rules that determine whether a real lease
 * goes to real signers, and they are the last thing that should live only
 * inside a tRPC handler.
 */

/**
 * How long a review link lives.
 *
 * Long enough that a lawyer can get to it next week, short enough that a
 * forgotten link is not an indefinite door into an unsigned lease. The link
 * also dies the moment the reviewer submits, which is the more common ending.
 */
export const REVIEW_LINK_TTL_DAYS = 14;

/**
 * Short enough not to be a chore, long enough not to be "n/a".
 *
 * A dismissal reason is the evidence of why a lease was sent over an
 * attorney's note. A one-character reason is not evidence.
 */
const MINIMUM_REASON_LENGTH = 8;

export type ApplyDispositionOptions = {
  comment: ReviewComment;
  disposition: Disposition;
  reason: string | null;
  now: Date;
};

export type ApplyDispositionResult = { ok: true; comment: ReviewComment } | { ok: false; error: string };

/**
 * Decide one comment, once.
 *
 * APPEND-ONLY BY DESIGN. A comment that has already been dispositioned cannot
 * be dispositioned again — a dismissal reason that can be edited afterwards is
 * not evidence of anything, and the entire value of the record is that it was
 * written at the time and could not be revised once the lease went out.
 */
export const applyDisposition = ({
  comment,
  disposition,
  reason,
  now,
}: ApplyDispositionOptions): ApplyDispositionResult => {
  if (comment.disposition !== 'pending') {
    return {
      ok: false,
      error: `This comment was already ${comment.disposition}. Dispositions are recorded once and cannot be revised.`,
    };
  }

  if (disposition === 'pending') {
    return { ok: false, error: 'A comment cannot be set back to pending.' };
  }

  const trimmed = (reason ?? '').trim();

  if (disposition === 'dismissed' && trimmed.length < MINIMUM_REASON_LENGTH) {
    return {
      ok: false,
      error:
        'Dismissing a comment requires a written reason. It is recorded with the lease and is the evidence of why the comment was not acted on.',
    };
  }

  return {
    ok: true,
    comment: {
      ...comment,
      disposition,
      // Kept on any disposition, not only dismissal: "accepted, and here is
      // what I changed" is worth as much to a later reader.
      dispositionReason: trimmed === '' ? null : trimmed,
      dispositionedAt: now,
    },
  };
};

export type SendBlockersOptions = {
  reviews: LeaseReview[];
  comments: ReviewComment[];
  now: Date;
  /**
   * The answers as they stand NOW, hashed the same way `answersHash` was when
   * each review was issued.
   *
   * Optional so a caller that cannot compute it falls back to the previous
   * behaviour rather than silently reporting "nothing is blocking".
   */
  answersHash?: string;
};

/**
 * Everything standing between this lease and its signers, from the review loop
 * alone. Empty means the review loop is not what is holding it up.
 */
export const sendBlockers = ({ reviews, comments, answersHash }: SendBlockersOptions): string[] => {
  const byId = new Map(reviews.map((review) => [review.id, review]));
  const blockers: string[] = [];

  const orphaned = comments.filter((comment) => !byId.has(comment.reviewId));

  /*
    An orphaned comment must neither crash the send nor quietly become
    non-blocking. Silently ignoring it would make deleting a review a way to
    erase an attorney's outstanding objection.
  */
  if (orphaned.length > 0) {
    blockers.push(
      `${orphaned.length} comment(s) belong to an unknown review and cannot be resolved: ${orphaned
        .map((comment) => comment.id)
        .join(', ')}.`,
    );
  }

  const outstanding = comments.filter((comment) => {
    const review = byId.get(comment.reviewId);

    return review?.audience === 'attorney' && comment.disposition === 'pending';
  });

  if (outstanding.length > 0) {
    blockers.push(
      `${outstanding.length} attorney comment(s) have no disposition yet. Accept, edit, or dismiss each one before sending.`,
    );
  }

  /*
    A DISPOSITIONED REVIEW IS NOT A PERMANENT CLEARANCE.

    Without this, the loop had an obvious hole: send it to the attorney, take
    her comments, disposition each one, then change the rent — and the send is
    clear, with her review recorded against a document that no longer exists.
    Every check above is about the comments; none was about the lease.

    Only an ATTORNEY review blocks, and only one that came back ('returned'). A tenant's
    read is not an approval, and a review still out is already covered by the
    pending-comment rule.
  */
  if (answersHash !== undefined) {
    const stale = reviews.filter(
      (review) => review.audience === 'attorney' && review.status === 'returned' && review.answersHash !== answersHash,
    );

    if (stale.length > 0) {
      blockers.push(
        `The lease has changed since ${stale.length === 1 ? 'the attorney review' : `${stale.length} attorney reviews`} came back. Send a fresh review, or restore the answers that were reviewed.`,
      );
    }
  }

  return blockers;
};

/** Can this link still be opened? */
export const isReviewUsable = (review: LeaseReview, now: Date): boolean => {
  if (review.status !== 'open') {
    return false;
  }

  if (review.expiresAt !== null && review.expiresAt.getTime() <= now.getTime()) {
    return false;
  }

  return true;
};

/**
 * A stable fingerprint of an answer set.
 *
 * Key order must not matter — the same answers re-saved would otherwise look
 * like an edit and tell a reviewer the lease changed when it did not. But
 * `null` and `0` must stay distinguishable: the held-versus-collected deposit
 * split is exactly that distinction, and a hash that conflated them would
 * report a material change as "no change".
 */
export const hashAnswers = (answers: unknown): string =>
  createHash('sha256').update(stableStringify(answers)).digest('hex');

const stableStringify = (value: unknown): string => {
  if (value === null) {
    return 'null';
  }

  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(',')}]`;
  }

  if (typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, v]) => v !== undefined)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));

    return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${stableStringify(v)}`).join(',')}}`;
  }

  return JSON.stringify(value) ?? 'null';
};
