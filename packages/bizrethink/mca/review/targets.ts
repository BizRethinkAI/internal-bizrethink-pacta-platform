import { AppError, AppErrorCode } from '@documenso/lib/errors/app-error';
import type { McaReviewPackage } from './package-schema';
import { reviewItemLabel } from './presentation';

export type ReviewTarget = { id: string; label: string; reviewUnit: boolean };

export const reviewTargets = (snapshot: McaReviewPackage): ReviewTarget[] => [
  { id: 'package', label: 'Whole package', reviewUnit: false },
  ...snapshot.documents.flatMap((document) => [
    { id: `document:${document.id}`, label: document.title, reviewUnit: true },
    ...document.sections.flatMap((section) =>
      section.items.map((item) => ({
        id: `content:${item.slug}`,
        label: `${document.title} · ${reviewItemLabel(item)}`,
        reviewUnit: false,
      })),
    ),
  ]),
  ...snapshot.requirements.map((requirement) => ({
    id: `requirement:${requirement.slug}`,
    label: `${requirement.jurisdictionName} · ${requirement.citation}`,
    reviewUnit: true,
  })),
  ...(snapshot.kind === 'provider'
    ? snapshot.externalDocuments.map((document) => ({
        id: `processor:${document.id}`,
        label: `${document.processor} · ${document.title} (${document.version})`,
        reviewUnit: true,
      }))
    : []),
];

export const validateFindingTargets = (snapshot: McaReviewPackage, targetIds: string[]) => {
  const allowed = new Set(reviewTargets(snapshot).map((target) => target.id));
  if (
    targetIds.length === 0 ||
    targetIds.length > 50 ||
    new Set(targetIds).size !== targetIds.length ||
    targetIds.some((target) => !allowed.has(target))
  ) {
    throw new AppError(AppErrorCode.INVALID_REQUEST, { message: 'Select distinct targets from this saved package.' });
  }
  return targetIds;
};

export const reviewCompletionBlockers = (
  snapshot: McaReviewPackage,
  reviewedTargetIds: string[],
  unanswered: number,
): string[] => {
  const blockers: string[] = [];
  if (reviewTargets(snapshot).some((target) => target.reviewUnit && !reviewedTargetIds.includes(target.id))) {
    blockers.push('Some review units have not been marked reviewed.');
  }
  if (unanswered > 0) {
    blockers.push('There are unanswered findings.');
  }
  if (snapshot.kind === 'provider' && snapshot.externalDocuments.some((document) => !document.content?.trim())) {
    blockers.push('The controlled processor form is missing.');
  }
  return blockers;
};
