/**
 * Sending a lease out to be read before it is signed.
 *
 * One mechanism, two audiences, and they are governed differently on purpose:
 *
 *   ATTORNEY — reviewing for defects. Their comments BLOCK the send until each
 *   has been given a disposition. An unresolved defect note that does not block
 *   is precisely the silence this repo keeps being bitten by.
 *
 *   TENANT — reviewing their own tenancy. Their comments NEVER block. A tenant
 *   comment is a negotiating position, not a defect report, and blocking on it
 *   would hand the counterparty a veto over the landlord's own document.
 *
 * A third flow, attorney review of the CLAUSE LIBRARY rather than one lease,
 * is deliberately not modelled here. It is a durable per-clause sign-off
 * writing `reviewedBy` / `verbatimVerifiedAt` / `status`, and it is what
 * eventually lets a lease reach a third party at all.
 */

export type ReviewAudience = 'attorney' | 'tenant';

/** `open` — link live. `returned` — reviewer submitted. `closed` — ended by the landlord. */
export type ReviewStatus = 'open' | 'returned' | 'closed';

/**
 * What was decided about one comment.
 *
 * `edited` is distinct from `accepted`: the landlord changed something, but not
 * the thing that was asked for. Collapsing the two would lose the fact that a
 * reviewer's specific request was not what happened.
 */
export type Disposition = 'pending' | 'accepted' | 'edited' | 'dismissed';

export type LeaseReview = {
  id: string;
  matterId: string;
  audience: ReviewAudience;
  status: ReviewStatus;
  /** Null means non-expiring — only for a review the landlord closes by hand. */
  expiresAt: Date | null;
  /**
   * The answer set as it stood when the link was issued.
   *
   * Pinned so a reviewer who returns after an edit can be shown what changed.
   * Without it, "I already reviewed this" silently stops being true the moment
   * a clause moves.
   */
  answersHash: string;
};

export type ReviewComment = {
  id: string;
  reviewId: string;
  /** Null when the comment is about the document as a whole. */
  clauseSlug: string | null;
  body: string;
  authorName: string;
  disposition: Disposition;
  /** Required to dismiss. This is the record that outlives the decision. */
  dispositionReason: string | null;
  dispositionedAt: Date | null;
};
