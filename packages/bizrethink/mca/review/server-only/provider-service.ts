import { AppError, AppErrorCode } from '@documenso/lib/errors/app-error';
import { prefixedId } from '@documenso/lib/universal/id';
import { prisma } from '@documenso/prisma';
import { getFeatureAccess } from '../../../server-only/feature-access';
import { assertMcaTeamAccess, MCA_DRAFT_FEATURE, previewMcaTemplate } from '../../templates/server-only/service';
import { MCA_REVIEW_LINK_TTL_DAYS } from '../link';
import { reviewPackageFingerprint } from '../package';
import { buildProviderReviewPackage } from '../provider-package';

type ProviderReviewScope = { userId: number; teamId: number; id: string; version: number };
export const providerReviewScope = async (input: ProviderReviewScope, write = false) => {
  const team = await assertMcaTeamAccess({ teamId: input.teamId, userId: input.userId, write });
  if (
    !(await getFeatureAccess({ feature: MCA_DRAFT_FEATURE, organisationId: team.organisationId, userId: input.userId }))
  ) {
    throw new AppError(AppErrorCode.FORBIDDEN, { message: 'Internal draft review access is required.' });
  }
  return { teamId: team.id, organisationId: team.organisationId, templateId: input.id, templateVersion: input.version };
};

export const shareProviderReview = async (
  input: ProviderReviewScope & {
    reviewerName: string;
    reviewerEmail: string;
    contact: string;
    processorText: string | null;
  },
) => {
  const scope = await providerReviewScope(input, true);
  const compiled = await previewMcaTemplate({
    userId: input.userId,
    teamId: input.teamId,
    id: input.id,
    version: input.version,
  });
  const snapshot = buildProviderReviewPackage({
    compiled,
    templateId: input.id,
    revision: input.version,
    contact: input.contact,
    processorText: input.processorText,
  });
  return prisma.bizrethinkMcaPackageReview.create({
    data: {
      ...scope,
      id: prefixedId('mca_package_review', 16),
      token: prefixedId('mcpr', 32),
      reviewerName: input.reviewerName,
      reviewerEmail: input.reviewerEmail,
      snapshot,
      fingerprint: reviewPackageFingerprint(snapshot),
      createdByUserId: input.userId,
      expiresAt: new Date(Date.now() + MCA_REVIEW_LINK_TTL_DAYS * 86400000),
    },
    select: { id: true, token: true, expiresAt: true },
  });
};

export const listProviderReviews = async (input: ProviderReviewScope) => {
  const scope = await providerReviewScope(input);
  return prisma.bizrethinkMcaPackageReview.findMany({
    where: scope,
    orderBy: { createdAt: 'desc' },
    take: 100,
    select: {
      id: true,
      token: true,
      reviewerName: true,
      status: true,
      expiresAt: true,
      completedAt: true,
      reviewedTargetIds: true,
      findings: {
        orderBy: { createdAt: 'asc' },
        select: { id: true, targetIds: true, body: true, authorName: true, answer: true, answeredAt: true },
      },
    },
  });
};

export const answerProviderFinding = async (input: ProviderReviewScope & { findingId: string; answer: string }) => {
  const scope = await providerReviewScope(input, true);
  const result = await prisma.bizrethinkMcaPackageFinding.updateMany({
    where: { id: input.findingId, answeredAt: null, review: scope },
    data: { answer: input.answer, answeredAt: new Date(), answeredByUserId: input.userId },
  });
  if (result.count !== 1) {
    throw new AppError(AppErrorCode.NOT_FOUND, { message: 'This finding is unavailable or already answered.' });
  }
  return { answered: true };
};

export const revokeProviderReview = async (input: ProviderReviewScope & { reviewId: string }) => {
  const scope = await providerReviewScope(input, true);
  await prisma.bizrethinkMcaPackageReview.updateMany({
    where: { ...scope, id: input.reviewId, status: 'open' },
    data: { status: 'closed' },
  });
  return { revoked: true };
};
