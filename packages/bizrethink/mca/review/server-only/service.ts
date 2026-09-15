import { AppError, AppErrorCode } from '@documenso/lib/errors/app-error';
import { prefixedId } from '@documenso/lib/universal/id';
import { prisma } from '@documenso/prisma';
import { MCA_REVIEW_LINK_TTL_DAYS } from '../link';
import {
  buildLibraryReviewPackage,
  changedReviewDocuments,
  readReviewPackage,
  reviewPackageFingerprint,
  reviewRequirements,
} from '../package';

const unavailable = () => new AppError(AppErrorCode.NOT_FOUND, { message: 'This review link is no longer active.' });
const usable = <T extends { status: string; expiresAt: Date }>(row: T | null): T => {
  if (!row || row.status !== 'open' || row.expiresAt <= new Date()) {
    throw unavailable();
  }
  return row;
};

export const shareLibraryPackage = (input: {
  reviewerName: string;
  reviewerEmail: string;
  contact: string;
  userId: number;
}) => {
  const snapshot = buildLibraryReviewPackage({ contact: input.contact });
  return prisma.bizrethinkMcaPackageReview.create({
    data: {
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

const publicFinding = {
  id: true,
  targetIds: true,
  body: true,
  authorName: true,
  createdAt: true,
  answer: true,
  answeredAt: true,
} as const;

export const openPackageReview = async (token: string) => {
  const row = usable(await prisma.bizrethinkMcaPackageReview.findUnique({ where: { token } }));
  const snapshot = readReviewPackage(row.snapshot, row.fingerprint);
  const findings = await prisma.bizrethinkMcaPackageFinding.findMany({
    where: { reviewId: row.id },
    orderBy: { createdAt: 'asc' },
    select: publicFinding,
  });
  return {
    snapshot,
    fingerprint: row.fingerprint,
    reviewerName: row.reviewerName,
    expiresAt: row.expiresAt,
    changedDocuments: changedReviewDocuments(snapshot),
    requirementsChanged: JSON.stringify(snapshot.requirements) !== JSON.stringify(reviewRequirements()),
    findings,
  };
};

export const recordPackageFinding = async (input: { token: string; targetIds: string[]; body: string }) =>
  prisma.$transaction(async (tx) => {
    const row = usable(await tx.bizrethinkMcaPackageReview.findUnique({ where: { token: input.token } }));
    const snapshot = readReviewPackage(row.snapshot, row.fingerprint);
    const allowed = new Set(
      snapshot.documents.flatMap((document) =>
        document.sections.flatMap((section) => section.items.map((item) => `content:${item.slug}`)),
      ),
    );
    if (input.targetIds.length !== 1 || !allowed.has(input.targetIds[0])) {
      throw new AppError(AppErrorCode.INVALID_REQUEST, { message: 'Select a content target in this saved package.' });
    }
    // Lock the same row revocation changes, then recheck the live capability before writing.
    const locked = await tx.bizrethinkMcaPackageReview.updateMany({
      where: { id: row.id, status: 'open', expiresAt: { gt: new Date() } },
      data: { updatedAt: new Date() },
    });
    if (locked.count !== 1) {
      throw unavailable();
    }
    return tx.bizrethinkMcaPackageFinding.create({
      data: {
        id: prefixedId('mca_package_finding', 16),
        reviewId: row.id,
        targetIds: input.targetIds,
        packageFingerprint: row.fingerprint,
        body: input.body,
        authorName: row.reviewerName,
        authorEmail: row.reviewerEmail,
      },
      select: publicFinding,
    });
  });
