import { beforeEach, describe, expect, it, vi } from 'vitest';

const db = vi.hoisted(() => ({
  bizrethinkMcaPackageReview: { findUnique: vi.fn(), updateMany: vi.fn(), create: vi.fn() },
  bizrethinkMcaPackageFinding: { create: vi.fn(), findMany: vi.fn() },
  bizrethinkMcaTemplate: { findFirst: vi.fn() },
  $transaction: vi.fn(),
}));
vi.mock('@documenso/prisma', () => ({ prisma: db }));

import { compileMcaTemplate } from '../../templates/compile';
import { providerFixture } from '../../templates/profile.fixture';
import { buildLibraryReviewPackage, reviewPackageFingerprint } from '../package';
import { buildProviderReviewPackage } from '../provider-package';
import {
  completePackageReview,
  markPackageReviewUnit,
  openPackageReview,
  recordPackageFinding,
} from '../server-only/service';
import { reviewTargets } from '../targets';

describe('package bearer scope and saved findings', () => {
  const snapshot = buildLibraryReviewPackage({ contact: 'Legal operations' });
  const row = {
    kind: 'library',
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
    { ...row, kind: 'provider' },
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

  it('persists explicit progress and refuses completion while any unit or finding remains', async () => {
    await expect(completePackageReview('mcpr_a')).rejects.toThrow(/marked reviewed/);
    await expect(
      markPackageReviewUnit({ token: 'mcpr_a', targetId: 'content:frpa.holdback-explainer', reviewed: true }),
    ).rejects.toThrow(/review unit/i);
    await markPackageReviewUnit({ token: 'mcpr_a', targetId: 'document:frpa', reviewed: true });
    expect(db.bizrethinkMcaPackageReview.updateMany.mock.calls.at(-1)?.[0].data).toMatchObject({
      reviewedTargetIds: ['document:frpa'],
      completedAt: null,
    });
    const reviewedTargetIds = reviewTargets(snapshot)
      .filter((target) => target.reviewUnit)
      .map((target) => target.id);
    db.bizrethinkMcaPackageReview.findUnique.mockResolvedValue({ ...row, reviewedTargetIds });
    db.bizrethinkMcaPackageFinding.findMany.mockResolvedValue([{ answeredAt: null }]);
    await expect(completePackageReview('mcpr_a')).rejects.toThrow(/unanswered findings/);
    db.bizrethinkMcaPackageFinding.findMany.mockResolvedValue([]);
    await completePackageReview('mcpr_a');
    expect(db.bizrethinkMcaPackageReview.updateMany.mock.calls.at(-1)?.[0].data.completedAt).toBeInstanceOf(Date);
    await recordPackageFinding({
      token: 'mcpr_a',
      targetIds: ['package', 'requirement:va-disclosure'],
      body: 'New holistic concern',
    });
    expect(db.bizrethinkMcaPackageReview.updateMany.mock.calls.at(-1)?.[0].data).toMatchObject({ completedAt: null });
  });

  it('binds public provider access to the saved team and revision and reports a superseding revision without replacing text', async () => {
    const profile = providerFixture();
    const compiled = compileMcaTemplate(profile);
    const provider = buildProviderReviewPackage({
      compiled,
      templateId: 'template-a',
      revision: 1,
      contact: 'Provider review desk',
      processorText: 'Controlled text',
    });
    db.bizrethinkMcaPackageReview.findUnique.mockResolvedValue({
      ...row,
      snapshot: provider,
      kind: 'provider',
      fingerprint: reviewPackageFingerprint(provider),
      teamId: 17,
      organisationId: 'org-a',
      templateId: 'template-a',
      templateVersion: 1,
    });
    db.bizrethinkMcaTemplate.findFirst.mockResolvedValue(null);
    await expect(openPackageReview('mcpr_a')).rejects.toThrow(/no longer active/);
    expect(db.bizrethinkMcaPackageFinding.findMany).not.toHaveBeenCalled();
    expect(db.bizrethinkMcaTemplate.findFirst.mock.calls[0][0].where).toEqual({
      id: 'template-a',
      teamId: 17,
      organisationId: 'org-a',
    });
    db.bizrethinkMcaTemplate.findFirst.mockResolvedValue({
      currentRevision: 2,
      revisions: [{ profile, fingerprint: compiled.fingerprint }],
    });
    const result = await openPackageReview('mcpr_a');
    expect(result.providerRevisionCurrent).toBe(false);
    expect(result.providerSourcesCurrent).toBe(true);
    expect(result.changedDocuments).toEqual([]);
    expect(result.requirementsChanged).toBe(false);
    expect(result.snapshot).toEqual(provider);
  });
});
