/**
 * What a lease row says to the landlord.
 *
 * The Leases list rendered `matter.status` raw — "draft", "sent", "executed",
 * the column values, shown to the person paying for the product. And it could
 * not say the thing that is true most of the time a lease is interesting: that
 * somebody is READING it. "In review" is not a matter status; it is an open
 * review link, which lives in another table.
 *
 * So this derives rather than looks up, and the order it resolves in is the
 * design.
 */

export type LeaseStateInput = {
  /** `BizrethinkLeaseMatter.status` — draft | ready | sent | executed | abandoned. */
  status: string;
  /** Review links still open on this matter. */
  openReviews: number;
};

export type LeaseState = {
  label: string;
  /**
   * Three tones, not five.
   *
   * `active` is "something is happening and it is not yours to do", `done` is
   * finished, `quiet` is everything else. A list page with a colour per status
   * teaches the reader that colour means nothing.
   */
  tone: 'quiet' | 'active' | 'done';
};

export const leaseState = ({ status, openReviews }: LeaseStateInput): LeaseState => {
  /*
    TERMINAL STATES FIRST, and that ordering is load-bearing. A review link
    left open after the lease went out for signature must not drag the row
    backwards to "In review" — what happens next is a signature, not a comment.
    Same for a signed lease: it is done, whatever links still exist.
  */
  if (status === 'executed') {
    return { label: 'Signed', tone: 'done' };
  }

  if (status === 'abandoned') {
    return { label: 'Abandoned', tone: 'quiet' };
  }

  if (status === 'sent') {
    return { label: 'Out for signature', tone: 'active' };
  }

  // The state the old badge could not express, and the one a landlord checks
  // for: somebody may be reading it right now.
  if (openReviews > 0) {
    return { label: 'In review', tone: 'active' };
  }

  if (status === 'ready') {
    return { label: 'Ready to send', tone: 'quiet' };
  }

  if (status === 'draft') {
    return { label: 'Drafting', tone: 'quiet' };
  }

  /*
    A status this does not know is a schema change nobody updated this for.
    Show it raw: better that the landlord sees something odd and says so than
    that a list page throws, or that an invented label hides the drift.
  */
  return { label: status, tone: 'quiet' };
};
