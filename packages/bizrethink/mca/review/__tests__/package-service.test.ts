import { beforeEach, describe, expect, it, vi } from 'vitest';

const db = vi.hoisted(() => ({
  bizrethinkMcaPackageReview: { findUnique: vi.fn(), updateMany: vi.fn(), create: vi.fn() },
  bizrethinkMcaPackageFinding: { create: vi.fn(), findMany: vi.fn() },
  $transaction: vi.fn(),
}));
vi.mock('@documenso/prisma', () => ({ prisma: db }));

import { buildLibraryReviewPackage, reviewPackageFingerprint } from '../package';
import { openPackageReview, recordPackageFinding } from '../server-only/service';

describe('package bearer scope and saved findings', () => {
  const snapshot = buildLibraryReviewPackage({ contact: 'Legal operations' });
  const row = {
    id: 'review-a',
    token: 'mcpr_a',
    status: 'open',
    expiresAt: new Date('2099-01-01'),
    reviewerName: 'Review counsel',
    reviewerEmail: 'private@example.test',
    createdByUserId: 999,
    snapshot,
    fingerprint: reviewPackageFingerprint(snapshot),
  };
  beforeEach(() => {
    vi.clearAllMocks();
    db.bizrethinkMcaPackageReview.findUnique.mockResolvedValue(row);
    db.bizrethinkMcaPackageReview.updateMany.mockResolvedValue({ count: 1 });
    db.bizrethinkMcaPackageFinding.findMany.mockResolvedValue([]);
    db.bizrethinkMcaPackageFinding.create.mockImplementation(({ data }) => Promise.resolve(data));
    db.$transaction.mockImplementation((work) => work(db));
  });
  it('returns the saved neutral package without private account or reviewer email fields', async () => {
    const result = await openPackageReview('mcpr_a');
    expect(result.snapshot).toEqual(snapshot);
    expect(JSON.stringify(result)).not.toMatch(/private@example|createdByUserId/);
    expect(db.bizrethinkMcaPackageReview.findUnique).toHaveBeenCalledWith({ where: { token: 'mcpr_a' } });
    expect(db.bizrethinkMcaPackageFinding.findMany.mock.calls[0][0].where).toEqual({ reviewId: 'review-a' });
  });
  it.each([
    null,
    { ...row, status: 'closed' },
    { ...row, expiresAt: new Date('2000-01-01') },
  ])('refuses unavailable links before returning content', async (unavailable) => {
    db.bizrethinkMcaPackageReview.findUnique.mockResolvedValue(unavailable);
    await expect(openPackageReview('mcpr_a')).rejects.toThrow('This review link is no longer active.');
    expect(db.bizrethinkMcaPackageFinding.findMany).not.toHaveBeenCalled();
  });
  it('rejects forged targets and binds an accepted finding to the exact saved package and named recipient', async () => {
    await expect(
      recordPackageFinding({ token: 'mcpr_a', targetIds: ['content:outside'], body: 'Review this.' }),
    ).rejects.toThrow(/target/i);
    expect(db.bizrethinkMcaPackageFinding.create).not.toHaveBeenCalled();
    const targetIds = ['content:frpa.holdback-explainer'];
    await recordPackageFinding({ token: 'mcpr_a', targetIds, body: 'Review the payment methodology.' });
    expect(db.bizrethinkMcaPackageFinding.create.mock.calls[0][0].data).toMatchObject({
      reviewId: row.id,
      targetIds,
      packageFingerprint: row.fingerprint,
      authorName: row.reviewerName,
      authorEmail: row.reviewerEmail,
    });
  });
  it('refuses a finding if revocation wins the write race', async () => {
    db.bizrethinkMcaPackageReview.updateMany.mockResolvedValue({ count: 0 });
    await expect(
      recordPackageFinding({ token: 'mcpr_a', targetIds: ['content:frpa.holdback-explainer'], body: 'Concern' }),
    ).rejects.toThrow(/no longer active/);
    expect(db.bizrethinkMcaPackageFinding.create).not.toHaveBeenCalled();
  });
});
