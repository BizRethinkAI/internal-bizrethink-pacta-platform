import { describe, expect, it } from 'vitest';

import { leaseState } from './lease-state';

/**
 * What a landlord wants to know at a glance.
 *
 * The Leases list rendered `matter.status` raw, so the badge read "draft",
 * "sent", "executed" — the column values, shown to the person paying for the
 * product. Worse, it could not say the one thing that is true most of the time
 * a lease is interesting: that somebody is READING it. "In review" is not a
 * matter status at all; it is an open review link, which lives in another
 * table.
 *
 * So this is a derivation, not a lookup, and the order it resolves in is the
 * whole design: a lease that has gone out for signature is out for signature
 * even if a review link is still open, because what happens next is a
 * signature, not a comment.
 */

describe('leaseState', () => {
  it('reads drafting until something has been done to it', () => {
    expect(leaseState({ status: 'draft', openReviews: 0 }).label).toBe('Drafting');
  });

  it('says when it is ready to go out', () => {
    expect(leaseState({ status: 'ready', openReviews: 0 }).label).toBe('Ready to send');
  });

  /*
    The state the old badge could not express, and the one a landlord checks
    for. An open link means somebody can be reading it right now.
  */
  it('says when somebody is reading it', () => {
    expect(leaseState({ status: 'draft', openReviews: 1 }).label).toBe('In review');
    expect(leaseState({ status: 'ready', openReviews: 2 }).label).toBe('In review');
  });

  it('reports signature and completion from the matter, not from links', () => {
    expect(leaseState({ status: 'sent', openReviews: 0 }).label).toBe('Out for signature');
    expect(leaseState({ status: 'executed', openReviews: 0 }).label).toBe('Signed');
  });

  /*
    ORDER IS THE DESIGN. A review link left open when the lease has already
    gone for signature must not drag the row backwards — what happens next is
    a signature. Same for a signed lease: it is done, whatever links exist.
  */
  it('does not go backwards when a link was left open', () => {
    expect(leaseState({ status: 'sent', openReviews: 3 }).label).toBe('Out for signature');
    expect(leaseState({ status: 'executed', openReviews: 3 }).label).toBe('Signed');
  });

  it('keeps an abandoned lease abandoned', () => {
    expect(leaseState({ status: 'abandoned', openReviews: 4 }).label).toBe('Abandoned');
  });

  /*
    An unknown value is a schema change nobody updated this for. Showing it
    raw is better than inventing a label or throwing on a list page — the
    landlord sees something odd and can say so.
  */
  it('shows an unrecognised status rather than guessing or throwing', () => {
    expect(leaseState({ status: 'quantum', openReviews: 0 }).label).toBe('quantum');
  });

  /*
    Only three tones. Every list-page badge that has ever had five ends up
    with the reader unable to tell which two mattered.
  */
  it('marks only the states that need attention or celebration', () => {
    expect(leaseState({ status: 'draft', openReviews: 1 }).tone).toBe('active');
    expect(leaseState({ status: 'sent', openReviews: 0 }).tone).toBe('active');
    expect(leaseState({ status: 'executed', openReviews: 0 }).tone).toBe('done');
    expect(leaseState({ status: 'draft', openReviews: 0 }).tone).toBe('quiet');
    expect(leaseState({ status: 'abandoned', openReviews: 0 }).tone).toBe('quiet');
  });
});
