import { AppErrorCode } from '@documenso/lib/errors/app-error';
import { logger } from '@documenso/lib/utils/logger';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { permissionContext } from '../../regression-tests/document-permission-fixture';
import { leaseBuilderRouter } from '../../server-only/trpc/lease-builder-router';

const { db, tx } = vi.hoisted(() => {
  const tables = () => ({
    bizrethinkLeaseReview: { findUnique: vi.fn(), findFirst: vi.fn(), update: vi.fn(), updateMany: vi.fn() },
    bizrethinkLeaseMatter: {
      findUnique: vi.fn(),
      findUniqueOrThrow: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    bizrethinkReviewComment: { createMany: vi.fn() },
  });
  return {
    db: { ...tables(), organisation: { findFirst: vi.fn(), findMany: vi.fn() }, $transaction: vi.fn() },
    tx: tables(),
  };
});
vi.mock('@documenso/prisma', () => ({ prisma: db }));
vi.mock('../../server-only/feature-access', () => ({ canAccessLeaseBuilder: vi.fn(async () => true) }));
vi.mock('../server-only/property-context', () => ({ loadPropertyContext: vi.fn(async () => ({})) }));
vi.mock('../server-only/create-envelope-from-matter', () => ({ createEnvelopeFromMatter: vi.fn() }));
vi.mock('../server-only/draft-clause', () => ({ draftClause: vi.fn() }));
vi.mock('../render/render-lease', () => ({ buildLeaseDocuments: vi.fn() }));

const now = new Date('2026-09-15T00:00:00Z');
const reviewFixture = () => ({
  id: 'review_a',
  token: 'synthetic_review_token',
  matterId: 'matter_a',
  audience: 'tenant',
  status: 'open',
  reviewerName: 'Synthetic tenant',
  expiresAt: new Date(now.getTime() + 60_000),
  answersHash: 'unchanged',
  returnedAt: null as Date | null,
});
const matterFixture = () => ({
  id: 'matter_a',
  organisationId: 'org_a',
  propertyId: 'property_a',
  status: 'draft',
  envelopeId: null as string | null,
  updatedAt: now,
  delegatedFields: ['authorisedOccupants'],
  values: { authorisedOccupants: 'Before', landlord: 'Owner' },
});
let review: ReturnType<typeof reviewFixture>;
let matter: ReturnType<typeof matterFixture>;
let comments: unknown[];
const input = () => ({
  token: review.token,
  comments: [{ clauseSlug: null, body: 'Synthetic review response' }],
  answers: { authorisedOccupants: 'After', monthlyRentUsd: 1, landlord: 'Untrusted' },
});
const caller = () => leaseBuilderRouter.createCaller(permissionContext());

beforeEach(() => {
  vi.resetAllMocks();
  vi.useFakeTimers();
  vi.setSystemTime(now);
  logger.level = 'silent';
  review = reviewFixture();
  matter = matterFixture();
  comments = [];
  db.organisation.findFirst.mockResolvedValue({ id: 'org_a' });
  db.organisation.findMany.mockResolvedValue([{ id: 'org_a' }]);
  // Separate root/transaction delegates expose writes escaping the transaction.
  for (const client of [db, tx]) {
    client.bizrethinkLeaseReview.findUnique.mockImplementation(async () => structuredClone(review));
    client.bizrethinkLeaseReview.findFirst.mockImplementation(async () => structuredClone(review));
    client.bizrethinkLeaseReview.update.mockImplementation(async ({ data }) => Object.assign(review, data));
    client.bizrethinkLeaseReview.updateMany.mockImplementation(async ({ data }) => {
      Object.assign(review, data);
      return { count: 1 };
    });
    client.bizrethinkLeaseMatter.findFirst.mockImplementation(async () => structuredClone(matter));
    client.bizrethinkLeaseMatter.findUnique.mockImplementation(async () => structuredClone(matter));
    client.bizrethinkLeaseMatter.findUniqueOrThrow.mockImplementation(async () => structuredClone(matter));
    client.bizrethinkLeaseMatter.update.mockImplementation(async ({ data }) => Object.assign(matter, data));
    client.bizrethinkLeaseMatter.updateMany.mockImplementation(async ({ data }) => {
      if (matter.status !== 'draft' || matter.envelopeId !== null) {
        return { count: 0 };
      }
      Object.assign(matter, data);
      return { count: 1 };
    });
    client.bizrethinkReviewComment.createMany.mockImplementation(async ({ data }) => {
      comments.push(...data);
      return { count: data.length };
    });
  }
  db.$transaction.mockImplementation(async (operation) => {
    if (typeof operation !== 'function') {
      return Promise.all(operation);
    }
    const before = structuredClone({ review, matter, comments });
    try {
      return await operation(tx);
    } catch (error) {
      ({ review, matter, comments } = before);
      throw error;
    }
  });
});
afterEach(() => vi.useRealTimers());

describe('A-22 lease review submission is one atomic operation', () => {
  it('rejects a lost open-link claim before writing answers or comments', async () => {
    for (const client of [db, tx]) {
      client.bizrethinkLeaseReview.updateMany.mockResolvedValue({ count: 0 });
    }
    await expect(caller().review.submit(input())).rejects.toMatchObject({ cause: { code: AppErrorCode.NOT_FOUND } });
    expect(comments).toEqual([]);
    expect(matter.values.authorisedOccupants).toBe('Before');
  });

  it('commits only delegated tenant answers, comments and the returned status through the transaction', async () => {
    await expect(caller().review.submit(input())).resolves.toEqual({ submitted: true, commentCount: 1 });
    expect(matter.values).toEqual({ authorisedOccupants: 'After', landlord: 'Owner' });
    expect(comments).toEqual([expect.objectContaining({ reviewId: review.id, authorName: review.reviewerName })]);
    expect(review.status).toBe('returned');
    expect(review.returnedAt).toEqual(now);
    expect(db.bizrethinkLeaseMatter.update).not.toHaveBeenCalled();
    expect(db.bizrethinkReviewComment.createMany).not.toHaveBeenCalled();
    expect(db.bizrethinkLeaseReview.updateMany).not.toHaveBeenCalled();
  });

  it('rolls back the link and tenant answers when the comment write fails', async () => {
    for (const client of [db, tx]) {
      client.bizrethinkReviewComment.createMany.mockRejectedValue(new Error('Synthetic write failure'));
    }
    await expect(caller().review.submit(input())).rejects.toThrow('Synthetic write failure');
    // The original handler wrote these before even starting its transaction.
    expect(matter.values.authorisedOccupants).toBe('Before');
    expect(review.status).toBe('open');
    expect(review.returnedAt).toBeNull();
    expect(comments).toEqual([]);
  });

  it('rechecks expiry after waiting for the claim', async () => {
    for (const client of [db, tx]) {
      client.bizrethinkLeaseReview.updateMany.mockImplementation(async () => {
        vi.setSystemTime(new Date(now.getTime() + 120_000));
        return { count: 1 };
      });
    }
    await expect(caller().review.submit(input())).rejects.toMatchObject({ cause: { code: AppErrorCode.NOT_FOUND } });
    expect(matter.values.authorisedOccupants).toBe('Before');
    expect(comments).toEqual([]);
  });

  it.each([
    'sent',
    'executed',
    'abandoned',
    'ready',
  ])('rejects a %s matter without consuming the review', async (status) => {
    matter.status = status;
    await expect(caller().review.submit(input())).rejects.toMatchObject({ cause: { code: AppErrorCode.NOT_FOUND } });
    expect(review.status).toBe('open');
    expect(comments).toEqual([]);
    expect(matter.values.authorisedOccupants).toBe('Before');
  });

  it('rejects a matter already linked to an envelope even if its status says draft', async () => {
    matter.envelopeId = 'envelope_existing';
    await expect(caller().review.submit(input())).rejects.toMatchObject({ cause: { code: AppErrorCode.NOT_FOUND } });
    expect(comments).toEqual([]);
  });

  it('never accepts tenant answers through an attorney review', async () => {
    review.audience = 'attorney';
    await expect(caller().review.submit(input())).resolves.toEqual({ submitted: true, commentCount: 1 });
    expect(matter.values.authorisedOccupants).toBe('Before');
    expect(review.status).toBe('returned');
  });

  it.each(['returned', 'closed'])('rejects a %s review before effects', async (status) => {
    review.status = status;
    await expect(caller().review.submit(input())).rejects.toMatchObject({ cause: { code: AppErrorCode.NOT_FOUND } });
    expect(comments).toEqual([]);
  });

  it('does not let a losing revoke overwrite an already-returned review', async () => {
    db.bizrethinkLeaseReview.updateMany.mockResolvedValue({ count: 0 });
    await expect(caller().review.revoke({ matterId: matter.id, reviewId: review.id })).rejects.toMatchObject({
      cause: { code: AppErrorCode.INVALID_REQUEST },
    });
    expect(db.bizrethinkLeaseReview.update).not.toHaveBeenCalled();
  });
});
