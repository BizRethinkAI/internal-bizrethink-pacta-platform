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
  /*
    NO PROCESSOR FORM BLOCKER HERE ANY MORE, and its absence is deliberate.

    This asked a counsel review of a TEMPLATE to carry the processor's split
    funding letter. ADR 0026 §6 removed the processor from templates entirely:
    the letter is the processor's, supplied fixed and used exactly as given
    (ADR 0019), and the caller picks the processor-specific template when it
    creates that envelope.

    The obligation did not disappear — it moved out of this gate's reach. A
    processor form still needs its own review before it is used; what it no
    longer is, is a condition on publishing a document that never contained it.
    Left as a comment rather than deleted silently, because a gate that quietly
    stops applying looks identical to one that was never needed.
  */
  return blockers;
};
