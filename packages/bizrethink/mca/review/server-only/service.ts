import { AppError, AppErrorCode } from '@documenso/lib/errors/app-error';
import { prefixedId } from '@documenso/lib/universal/id';
import { prisma } from '@documenso/prisma';
import type { BizrethinkMcaPackageReview, Prisma } from '@prisma/client';
import { ZMcaEntity } from '../../entities/entity';
import { producedInstrumentOf } from '../../publish/recipient-contract';
import { compileMcaTemplate } from '../../templates/compile';
import { MCA_REVIEW_LINK_TTL_DAYS } from '../link';
import {
  buildLibraryReviewPackage,
  changedReviewDocuments,
  readReviewPackage,
  reviewPackageFingerprint,
  reviewRequirements,
} from '../package';
import type { McaReviewPackage } from '../package-schema';
import { reviewCompletionBlockers, reviewTargets, validateFindingTargets } from '../targets';

const unavailable = () => new AppError(AppErrorCode.NOT_FOUND, { message: 'This review link is no longer active.' });
const usable = <T extends { kind: string; status: string; expiresAt: Date }>(row: T | null): T => {
  if (!row || row.status !== 'open' || row.expiresAt <= new Date()) {
    throw unavailable();
  }
  return row;
};

const readStoredReviewPackage = (row: Pick<BizrethinkMcaPackageReview, 'kind' | 'snapshot' | 'fingerprint'>) => {
  const snapshot = readReviewPackage(row.snapshot, row.fingerprint);
  if (row.kind !== snapshot.kind) {
    throw unavailable();
  }
  return snapshot;
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
      kind: 'library',
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

export const inspectPackageReview = async (where: Prisma.BizrethinkMcaPackageReviewWhereInput) => {
  const row = await prisma.bizrethinkMcaPackageReview.findFirst({ where });
  if (!row) {
    throw unavailable();
  }
  return {
    snapshot: readStoredReviewPackage(row),
    reviewerName: row.reviewerName,
    expiresAt: row.expiresAt,
  };
};

export const openPackageReview = async (token: string) => {
  const row = usable(await prisma.bizrethinkMcaPackageReview.findUnique({ where: { token } }));
  const snapshot = readStoredReviewPackage(row);
  const providerState = await providerSnapshotState(prisma, row, snapshot);
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
    requirementsChanged:
      JSON.stringify(snapshot.requirements) !==
      JSON.stringify(
        reviewRequirements().filter(
          (requirement) =>
            snapshot.kind === 'library' || snapshot.requirements.some((saved) => saved.slug === requirement.slug),
        ),
      ),
    ...providerState,
    reviewedTargetIds: row.reviewedTargetIds ?? [],
    completedAt: row.completedAt ?? null,
    completionBlockers: reviewCompletionBlockers(
      snapshot,
      row.reviewedTargetIds ?? [],
      findings.filter((finding) => !finding.answeredAt).length,
    ),
    findings,
  };
};

const providerSnapshotState = async (
  tx: Prisma.TransactionClient,
  row: BizrethinkMcaPackageReview,
  snapshot: McaReviewPackage,
) => {
  if (snapshot.kind === 'library') {
    if (row.teamId != null) {
      throw unavailable();
    }
    return { providerRevisionCurrent: true, providerSourcesCurrent: true };
  }
  if (
    row.teamId == null ||
    !row.organisationId ||
    row.templateId !== snapshot.provider.templateId ||
    row.templateVersion !== snapshot.provider.revision
  ) {
    throw unavailable();
  }
  const template = await tx.bizrethinkMcaTemplate.findFirst({
    where: { id: row.templateId, teamId: row.teamId, organisationId: row.organisationId },
    select: {
      currentRevision: true,
      // ADR 0026: recompiling to test freshness needs the document this
      // template is, or the comparison is against something else entirely.
      instrument: true,
      revisions: { where: { version: row.templateVersion }, select: { entity: true, fingerprint: true }, take: 1 },
    },
  });
  const revision = template?.revisions[0];
  if (!template || !revision || revision.fingerprint !== snapshot.provider.templateFingerprint) {
    throw unavailable();
  }
  const parsed = ZMcaEntity.safeParse(revision.entity);
  let providerSourcesCurrent = false;
  if (parsed.success) {
    try {
      providerSourcesCurrent =
        compileMcaTemplate(parsed.data, producedInstrumentOf(template.instrument, row.templateId)).fingerprint ===
        revision.fingerprint;
    } catch {
      // Saved text remains available even when current selection rules no longer accept this entity.
      providerSourcesCurrent = false;
    }
  }
  return { providerRevisionCurrent: template.currentRevision === row.templateVersion, providerSourcesCurrent };
};

const withReviewWrite = <T>(
  token: string,
  work: (tx: Prisma.TransactionClient, row: BizrethinkMcaPackageReview, snapshot: McaReviewPackage) => Promise<T>,
) =>
  prisma.$transaction(async (tx) => {
    // Lock the same row revocation changes, then recheck the live capability before writing.
    const locked = await tx.bizrethinkMcaPackageReview.updateMany({
      where: { token, status: 'open', expiresAt: { gt: new Date() } },
      data: { updatedAt: new Date() },
    });
    if (locked.count !== 1) {
      throw unavailable();
    }
    const row = usable(await tx.bizrethinkMcaPackageReview.findUnique({ where: { token } }));
    const snapshot = readStoredReviewPackage(row);
    await providerSnapshotState(tx, row, snapshot);
    return work(tx, row, snapshot);
  });

export const recordPackageFinding = (input: { token: string; targetIds: string[]; body: string }) =>
  withReviewWrite(input.token, async (tx, row, snapshot) => {
    validateFindingTargets(snapshot, input.targetIds);
    await tx.bizrethinkMcaPackageReview.updateMany({ where: { id: row.id }, data: { completedAt: null } });
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

export const markPackageReviewUnit = (input: { token: string; targetId: string; reviewed: boolean }) =>
  withReviewWrite(input.token, async (tx, row, snapshot) => {
    if (!reviewTargets(snapshot).some((target) => target.reviewUnit && target.id === input.targetId)) {
      throw new AppError(AppErrorCode.INVALID_REQUEST, { message: 'Select a review unit in this saved package.' });
    }
    const reviewed = new Set(row.reviewedTargetIds ?? []);
    if (input.reviewed) {
      reviewed.add(input.targetId);
    } else {
      reviewed.delete(input.targetId);
    }
    await tx.bizrethinkMcaPackageReview.updateMany({
      where: { id: row.id },
      data: { reviewedTargetIds: [...reviewed], completedAt: null },
    });
    return { recorded: true };
  });

export const completePackageReview = (token: string) =>
  withReviewWrite(token, async (tx, row, snapshot) => {
    const findings = await tx.bizrethinkMcaPackageFinding.findMany({
      where: { reviewId: row.id, answeredAt: null },
      select: { answeredAt: true },
    });
    const blockers = reviewCompletionBlockers(snapshot, row.reviewedTargetIds ?? [], findings.length);
    if (blockers.length > 0) {
      throw new AppError(AppErrorCode.INVALID_REQUEST, { message: blockers.join(' ') });
    }
    await tx.bizrethinkMcaPackageReview.updateMany({ where: { id: row.id }, data: { completedAt: new Date() } });
    return { completed: true };
  });
