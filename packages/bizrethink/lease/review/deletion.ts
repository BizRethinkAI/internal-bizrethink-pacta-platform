import type { ReviewStatus } from './types';

/**
 * When a review link may be destroyed, and how an open is described.
 *
 * WHY DELETION IS NARROW. A revoked link is not clutter; it is a record that
 * this document went to this person on this date, pinned to the answer set as
 * it then stood. A landlord who is later told "you never sent me the lease" has
 * that row and nothing else. Comments hang off it too, so a plain delete would
 * take a reviewer's feedback with it.
 *
 * So deletion is refused wherever the row still carries evidence — anything the
 * reviewer did, or anything they said — and permitted only in the genuinely
 * empty case: a revoked link nobody opened and nobody commented on. That is
 * also the only case a landlord actually wants gone. The four duplicate links
 * on the Picana matter, minted seconds apart by a double submit, are exactly it.
 *
 * The clutter that is NOT solved by deleting is solved by hiding: revoked rows
 * collapse behind a disclosure, so the list shows the live link and says how
 * many spent ones sit behind it.
 */
export type DeletableReview = {
  status: ReviewStatus;
  /** Null until the token URL is fetched for the first time. */
  firstOpenedAt: Date | null;
  returnedAt: Date | null;
};

export const deletionBlockers = (review: DeletableReview, commentCount: number): string[] => {
  const blockers: string[] = [];

  if (review.status === 'open') {
    blockers.push('This link is still live. Revoke it first.');
  }

  if (review.firstOpenedAt !== null) {
    blockers.push('The reviewer opened this link, so it is the record that they received the lease.');
  }

  if (review.status === 'returned' || review.returnedAt !== null) {
    blockers.push('This review was returned. Deleting it would remove what the reviewer sent back.');
  }

  if (commentCount > 0) {
    blockers.push(
      `This review carries ${commentCount} comment${commentCount === 1 ? '' : 's'}, which would be deleted with it.`,
    );
  }

  return blockers;
};

/**
 * What to show a landlord about whether the link has been opened.
 *
 * DELIBERATELY NOT "READ" OR "REVIEWED". This records that the URL was FETCHED.
 * Mail scanners and link previewers fetch links, and a landlord who is told the
 * tenant "read" the lease will rely on it. Opened is what we know; opened is
 * what it says.
 */
export const describeOpened = (firstOpenedAt: Date | null, openCount: number): string => {
  if (firstOpenedAt === null) {
    return 'Not opened yet';
  }

  const when = firstOpenedAt.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return openCount > 1 ? `Opened ${when}, ${openCount} times since` : `Opened ${when}`;
};
