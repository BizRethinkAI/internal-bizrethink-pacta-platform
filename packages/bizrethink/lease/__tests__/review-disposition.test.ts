import { describe, expect, it } from 'vitest';

import {
  applyDisposition,
  hashAnswers,
  isReviewUsable,
  REVIEW_LINK_TTL_DAYS,
  sendBlockers,
} from '../review/disposition';
import type { LeaseReview, ReviewComment } from '../review/types';

/**
 * The review loop's rules, which are the whole design decision.
 *
 * An unresolved comment that does not block is exactly the silence this repo
 * keeps being bitten by, so an ATTORNEY's comment blocks the send until it has
 * been given a disposition. But accept-or-change alone would let a stylistic
 * note halt a lease and make the reviewer a bottleneck rather than a reviewer,
 * so dismissal must be available — with a written reason, recorded.
 *
 * A TENANT's comment never blocks. A tenant comment is a negotiating position,
 * not a defect report; blocking on it would hand the counterparty a veto over
 * the landlord's own document.
 */

const now = new Date('2026-09-01T12:00:00Z');

const comment = (over: Partial<ReviewComment> = {}): ReviewComment => ({
  id: 'cmt_1',
  reviewId: 'rev_1',
  clauseSlug: 'deposit.statutory-notice',
  body: 'This should cite the 2026 amendment.',
  authorName: 'A. Reviewer',
  disposition: 'pending',
  dispositionReason: null,
  dispositionedAt: null,
  ...over,
});

const review = (over: Partial<LeaseReview> = {}): LeaseReview => ({
  id: 'rev_1',
  matterId: 'mat_1',
  audience: 'attorney',
  status: 'open',
  expiresAt: new Date('2026-09-10T12:00:00Z'),
  answersHash: 'abc',
  ...over,
});

describe('applyDisposition', () => {
  it('accepts a comment', () => {
    const result = applyDisposition({ comment: comment(), disposition: 'accepted', reason: null, now });

    expect(result.ok).toBe(true);
    expect(result.ok && result.comment.disposition).toBe('accepted');
    expect(result.ok && result.comment.dispositionedAt).toEqual(now);
  });

  it('requires a written reason to dismiss', () => {
    // Dismissal is allowed precisely so a reviewer cannot become a bottleneck.
    // The reason is what makes that safe — it is the evidence of why a lease
    // went out over an attorney's note.
    const result = applyDisposition({ comment: comment(), disposition: 'dismissed', reason: null, now });

    expect(result.ok).toBe(false);
    expect(!result.ok && result.error).toMatch(/reason/i);
  });

  it('rejects a reason that is only whitespace', () => {
    const result = applyDisposition({ comment: comment(), disposition: 'dismissed', reason: '   ', now });

    expect(result.ok).toBe(false);
  });

  it('rejects a reason too short to be evidence of anything', () => {
    const result = applyDisposition({ comment: comment(), disposition: 'dismissed', reason: 'no', now });

    expect(result.ok).toBe(false);
  });

  it('dismisses with a real reason, and keeps it', () => {
    const reason = 'The 2026 amendment applies only to commercial tenancies.';
    const result = applyDisposition({ comment: comment(), disposition: 'dismissed', reason, now });

    expect(result.ok).toBe(true);
    expect(result.ok && result.comment.dispositionReason).toBe(reason);
  });

  it('trims the stored reason but judges length on the trimmed text', () => {
    const result = applyDisposition({
      comment: comment(),
      disposition: 'dismissed',
      reason: '  Superseded by clause 14.  ',
      now,
    });

    expect(result.ok && result.comment.dispositionReason).toBe('Superseded by clause 14.');
  });

  it('will not re-dispose a comment that was already dispositioned', () => {
    // Append-only. A dismissal reason that can be edited afterwards is not
    // evidence of anything.
    const already = comment({ disposition: 'dismissed', dispositionReason: 'x', dispositionedAt: now });
    const result = applyDisposition({ comment: already, disposition: 'accepted', reason: null, now });

    expect(result.ok).toBe(false);
    expect(!result.ok && result.error).toMatch(/already/i);
  });

  it('refuses to set a comment back to pending', () => {
    const result = applyDisposition({ comment: comment(), disposition: 'pending', reason: null, now });

    expect(result.ok).toBe(false);
  });
});

describe('sendBlockers', () => {
  it('blocks while an attorney comment is undispositioned', () => {
    const blockers = sendBlockers({ reviews: [review()], comments: [comment()], now });

    expect(blockers).toHaveLength(1);
    expect(blockers[0]).toMatch(/attorney/i);
  });

  it('stops blocking once every attorney comment has a disposition', () => {
    const done = comment({ disposition: 'dismissed', dispositionReason: 'Covered elsewhere.', dispositionedAt: now });

    expect(sendBlockers({ reviews: [review()], comments: [done], now })).toEqual([]);
  });

  it('never blocks on a tenant comment', () => {
    // A tenant comment is a negotiating position, not a defect report.
    const tenantReview = review({ id: 'rev_2', audience: 'tenant' });
    const tenantComment = comment({ id: 'cmt_2', reviewId: 'rev_2' });

    expect(sendBlockers({ reviews: [tenantReview], comments: [tenantComment], now })).toEqual([]);
  });

  it('blocks on the attorney comment even when a tenant comment is also open', () => {
    const reviews = [review(), review({ id: 'rev_2', audience: 'tenant' })];
    const comments = [comment(), comment({ id: 'cmt_2', reviewId: 'rev_2' })];

    expect(sendBlockers({ reviews, comments, now })).toHaveLength(1);
  });

  it('ignores a comment whose review does not exist rather than crashing', () => {
    // Defensive: an orphaned comment must not silently become non-blocking OR
    // crash the send. It is reported as its own problem.
    const orphan = comment({ id: 'cmt_9', reviewId: 'rev_missing' });
    const blockers = sendBlockers({ reviews: [], comments: [orphan], now });

    expect(blockers.join(' ')).toMatch(/cmt_9|unknown review/i);
  });

  it('says how many are outstanding, not just that something is', () => {
    const comments = [comment(), comment({ id: 'cmt_2' }), comment({ id: 'cmt_3' })];

    expect(sendBlockers({ reviews: [review()], comments, now }).join(' ')).toMatch(/3/);
  });
});

describe('isReviewUsable', () => {
  it('accepts an open, unexpired review', () => {
    expect(isReviewUsable(review(), now)).toBe(true);
  });

  it('refuses an expired link', () => {
    expect(isReviewUsable(review({ expiresAt: new Date('2026-08-01T00:00:00Z') }), now)).toBe(false);
  });

  it('refuses a review already returned — the link dies on submission', () => {
    expect(isReviewUsable(review({ status: 'returned' }), now)).toBe(false);
  });

  it('refuses a closed review', () => {
    expect(isReviewUsable(review({ status: 'closed' }), now)).toBe(false);
  });

  it('treats a null expiry as non-expiring, for a review closed by hand', () => {
    expect(isReviewUsable(review({ expiresAt: null }), now)).toBe(true);
  });

  it('expires in days, not forever', () => {
    expect(REVIEW_LINK_TTL_DAYS).toBe(14);
  });
});

describe('hashAnswers', () => {
  it('is stable across key order, so a re-save does not look like an edit', () => {
    expect(hashAnswers({ b: 2, a: 1 })).toBe(hashAnswers({ a: 1, b: 2 }));
  });

  it('changes when an answer changes', () => {
    expect(hashAnswers({ rent: 6800 })).not.toBe(hashAnswers({ rent: 6900 }));
  });

  it('distinguishes a missing answer from a zero one', () => {
    // The held-versus-collected split is exactly this distinction; a hash that
    // conflated them would call a material edit "no change".
    expect(hashAnswers({ deposit: null })).not.toBe(hashAnswers({ deposit: 0 }));
  });

  it('hashes nested structures, not just the top level', () => {
    expect(hashAnswers({ m: { rent: 1 } })).not.toBe(hashAnswers({ m: { rent: 2 } }));
  });
});
