import { beforeEach, describe, expect, it, vi } from 'vitest';
import { compileMcaTemplate } from '../../templates/compile';
import { providerFixture } from '../../templates/profile.fixture';

const mocks = vi.hoisted(() => ({
  access: vi.fn(),
  preview: vi.fn(),
  feature: vi.fn(),
  db: {
    bizrethinkMcaPackageReview: { create: vi.fn(), findMany: vi.fn(), updateMany: vi.fn() },
    bizrethinkMcaPackageFinding: { updateMany: vi.fn() },
  },
}));
vi.mock('@documenso/prisma', () => ({ prisma: mocks.db }));
vi.mock('../../templates/server-only/service', () => ({
  assertMcaTeamAccess: mocks.access,
  previewMcaTemplate: mocks.preview,
  MCA_DRAFT_FEATURE: 'mca-clause-draft-rendering',
}));
vi.mock('../../../server-only/feature-access', () => ({ getFeatureAccess: mocks.feature }));

import {
  answerProviderFinding,
  listProviderReviews,
  revokeProviderReview,
  shareProviderReview,
} from '../server-only/provider-service';

describe('provider counsel invitations are isolated by team and revision', () => {
  const input = { userId: 12, teamId: 17, id: 'template-a', version: 2 };
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.access.mockResolvedValue({ id: 17, organisationId: 'org-a' });
    mocks.preview.mockResolvedValue({ ...compileMcaTemplate(providerFixture()), version: 2, templateId: 'template-a' });
    mocks.feature.mockResolvedValue(true);
    mocks.db.bizrethinkMcaPackageReview.findMany.mockResolvedValue([]);
    mocks.db.bizrethinkMcaPackageReview.create.mockImplementation(({ data }) => Promise.resolve(data));
    mocks.db.bizrethinkMcaPackageFinding.updateMany.mockResolvedValue({ count: 1 });
    mocks.db.bizrethinkMcaPackageReview.updateMany.mockResolvedValue({ count: 1 });
  });
  it('requires manager authorization and a current draft preview before freezing the selected revision', async () => {
    await shareProviderReview({
      ...input,
      reviewerName: 'Counsel',
      reviewerEmail: 'counsel@example.test',
      contact: 'Review desk',
      processorText: 'Processor terms',
    });
    expect(mocks.access).toHaveBeenCalledWith({ teamId: 17, userId: 12, write: true });
    expect(mocks.preview).toHaveBeenCalledWith(input);
    expect(mocks.db.bizrethinkMcaPackageReview.create.mock.calls[0][0].data).toMatchObject({
      teamId: 17,
      organisationId: 'org-a',
      templateId: 'template-a',
      templateVersion: 2,
      snapshot: { kind: 'provider', provider: { templateId: 'template-a', revision: 2 } },
    });
  });
  it('refuses inaccessible teams, disabled draft access and stale source before sharing', async () => {
    mocks.access.mockRejectedValueOnce(new Error('No team access'));
    await expect(listProviderReviews(input)).rejects.toThrow();
    mocks.feature.mockResolvedValueOnce(false);
    await expect(listProviderReviews(input)).rejects.toThrow();
    mocks.preview.mockRejectedValueOnce(new Error('Source changed'));
    await expect(
      shareProviderReview({
        ...input,
        reviewerName: 'Counsel',
        reviewerEmail: 'counsel@example.test',
        contact: 'Review desk',
        processorText: null,
      }),
    ).rejects.toThrow();
    expect(mocks.db.bizrethinkMcaPackageReview.create).not.toHaveBeenCalled();
  });
  it('constrains management reads and writes by authorized team, organization, template and revision', async () => {
    await listProviderReviews(input);
    expect(mocks.db.bizrethinkMcaPackageReview.findMany.mock.calls[0][0].where).toEqual({
      kind: 'provider',
      teamId: 17,
      organisationId: 'org-a',
      templateId: 'template-a',
      templateVersion: 2,
    });
    await answerProviderFinding({ ...input, findingId: 'foreign-finding', answer: 'Response' });
    expect(mocks.db.bizrethinkMcaPackageFinding.updateMany.mock.calls[0][0].where.review).toEqual({
      kind: 'provider',
      teamId: 17,
      organisationId: 'org-a',
      templateId: 'template-a',
      templateVersion: 2,
    });
    await revokeProviderReview({ ...input, reviewId: 'foreign-review' });
    expect(mocks.db.bizrethinkMcaPackageReview.updateMany.mock.calls[0][0].where).toMatchObject({
      id: 'foreign-review',
      teamId: 17,
      organisationId: 'org-a',
      templateId: 'template-a',
      templateVersion: 2,
    });
  });
});
