import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { isReviewUsable } from '../review/disposition';

const review = (over: Partial<Parameters<typeof isReviewUsable>[0]> = {}) =>
  ({
    id: 'lease_review_x',
    matterId: 'm1',
    audience: 'tenant',
    token: 'lrv_x',
    status: 'open',
    reviewerName: 'A Tenant',
    reviewerEmail: 'tenant@example.test',
    answersHash: 'h',
    expiresAt: new Date('2099-01-01'),
    returnedAt: null,
    ...over,
  }) as Parameters<typeof isReviewUsable>[0];

/*
  REVOKING A LINK.

  A review link was mintable and never retractable. `review.create` issues a
  fresh token every time, so a landlord who edited the lease could always send a
  NEW link — but the old one stayed live until its expiry, months away, with no
  way to kill it. Wrong recipient, changed terms, a deal that falls through:
  nothing in the product could take a link back.

  Revoking is a status change rather than a delete. The row carries the
  reviewer, the issue date and any comments already returned, and that history
  is worth more than the tidiness of removing it — a deleted review would also
  orphan its comments.
*/
describe('a revoked link stops working', () => {
  const now = new Date('2026-09-02');

  it('is usable while open and unexpired', () => {
    expect(isReviewUsable(review(), now)).toBe(true);
  });

  it('is not usable once closed', () => {
    expect(isReviewUsable(review({ status: 'closed' }), now)).toBe(false);
  });

  it('stays unusable even with an expiry far in the future', () => {
    // Revocation must beat the expiry date, not wait for it.
    expect(isReviewUsable(review({ status: 'closed', expiresAt: new Date('2099-01-01') }), now)).toBe(false);
  });
});

describe('the router exposes revoke', () => {
  const router = readFileSync(new URL('../../server-only/trpc/lease-builder-router.ts', import.meta.url), 'utf8');

  it('has a revoke mutation', () => {
    expect(router).toMatch(/revoke:\s*authenticatedProcedure/);
  });

  it("loads the matter first, so it cannot revoke another org's review", () => {
    const body = router.slice(router.indexOf('revoke: authenticatedProcedure'));

    expect(body.slice(0, 2400)).toMatch(/loadMatter/);
  });

  it('closes rather than deletes, so returned comments survive', () => {
    const body = router.slice(router.indexOf('revoke: authenticatedProcedure'));

    expect(body.slice(0, 2400)).toMatch(/status:\s*'closed'/);
    expect(body.slice(0, 2400)).not.toMatch(/\.delete\(/);
  });
});

describe('the panel offers revoke on a live link', () => {
  const panel = readFileSync(
    new URL('../../../../apps/remix/app/components/general/lease/review-panel.tsx', import.meta.url),
    'utf8',
  );

  it('renders a revoke control', () => {
    expect(panel).toMatch(/Revoke/);
  });

  /*
    Two open reviews for the same person rendered as two identical cards —
    same name, same email, same expiry, same Copy link button — distinguished
    only by list order. Copying the wrong one sends a reviewer the stale lease.
  */
  it('marks which link is the current one', () => {
    expect(panel).toMatch(/Current link|Superseded/);
  });
});
