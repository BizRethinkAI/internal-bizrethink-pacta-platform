import { mcaLibraryFingerprint } from '../clauses/approval';
import type { McaInstrument } from '../clauses/instruments';
import type { McaClause } from '../clauses/types';

/**
 * Sending an agreement out to be read by counsel, who has no account.
 *
 * WHAT ADR 0009 ASKED FOR, AND WHAT IT DID NOT. It named "generalise the review
 * link" as work, because `BizrethinkLibraryReview` is generic in shape — token,
 * reviewer, status, and a fingerprint of exactly which clauses in exactly which
 * words were sent — and lease-bound in two places. This module is the second of
 * those two generalised: the rules that decide whether a link may be opened and
 * whether the words moved under the reader, with the lease-shaped hole filled
 * by an agreement instead of a lease.
 *
 * THE FIRST PLACE — THE `jurisdiction` COLUMN — IS NOT GENERALISED BY WIDENING
 * IT, AND THAT IS THE DECISION IN THIS FILE.
 *
 * A lease review link is scoped by a `ClauseJurisdiction`, because a lease is
 * one document whose contents a state decides. An MCA deal is a SET of
 * documents, and the axis that decides what goes on a link is which AGREEMENT
 * it covers. `mca/jurisdictions.ts` argues at length that folding a second
 * thing into `McaJurisdiction` destroys the property that makes adding a
 * twelfth state safe, and the mirror image holds here: putting an
 * `McaInstrument` in a column named `jurisdiction` would make that column a
 * statement about which document is being assembled, dressed as a statement
 * about which law applies. So the scope field on the MCA review row is called
 * `instrument` and is typed as one.
 *
 * WHY THE ROW IS NOT THE LEASE'S ROW EITHER. `BizrethinkLibraryReview.token` is
 * globally unique and `clauseLibrary.openLibrary` resolves a token and NOTHING
 * else — no discriminator, no scope check. An MCA link stored in that table
 * would open the lease library. Sharing the table therefore means editing every
 * lease query in the same change, in a file another session is working in.
 * That trade is recorded in the PR rather than taken quietly; what a merge
 * would need is a `library` discriminator on the table AND on each of those
 * queries, and this model is shaped so that merge is a data migration.
 */

/** `open` — link live. `closed` — revoked by staff. There is no delete. */
export type McaReviewStatus = 'open' | 'closed';

export type McaLibraryReview = {
  id: string;
  token: string;
  status: McaReviewStatus;
  reviewerName: string;
  reviewerEmail: string;
  /** WHICH AGREEMENT went out on this link. Never a jurisdiction — see above. */
  instrument: McaInstrument;
  /**
   * Which clauses existed, and in what words, when the link was issued.
   *
   * Of the SCOPED agreement, not the whole library. A link pinned to all of it
   * would report "the agreement has changed" the moment a clause in a document
   * the reviewer never saw moved — a warning they cannot act on, which is the
   * fastest way to teach somebody to ignore warnings.
   */
  libraryFingerprint: string;
  /** Null means non-expiring — only for a link staff close by hand. */
  expiresAt: Date | null;
};

/**
 * How long a review link lives.
 *
 * Long enough that a lawyer can get to it next week, short enough that a
 * forgotten link is not an indefinite door into unreviewed contract text. Same
 * number as the lease link, and deliberately its own constant: the two are
 * equal today for the same reason rather than by reference, and either can move
 * without moving the other.
 */
export const MCA_REVIEW_LINK_TTL_DAYS = 14;

/** Can this link still be opened? */
export const isMcaReviewUsable = (review: McaLibraryReview, now: Date): boolean => {
  if (review.status !== 'open') {
    return false;
  }

  if (review.expiresAt !== null && review.expiresAt.getTime() <= now.getTime()) {
    return false;
  }

  return true;
};

/**
 * Have the words moved since the link was sent?
 *
 * The reviewer is told rather than left to discover that what they are reading
 * is not what was meant to be sent. Compared against the same scoped list the
 * link pinned.
 */
export const reviewIsStale = (review: McaLibraryReview, clauses: McaClause[]): boolean =>
  review.libraryFingerprint !== mcaLibraryFingerprint(clauses);
