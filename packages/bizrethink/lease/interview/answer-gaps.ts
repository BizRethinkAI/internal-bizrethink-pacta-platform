import type { MissingAnswer } from './describe-missing';
import type { InterviewAnswers, InterviewField, InterviewStep } from './steps';
import { visibleSteps } from './steps';

/**
 * Two gaps the document cannot see.
 *
 * The send gate counted unfilled clause VARIABLES, because that is what a
 * renderer can report. A question that only SELECTS a clause leaves no hole in
 * the text when it goes unanswered: the unanswered yes/no reads as "no" and a
 * complete, wrong clause renders. That is how the 2026-09-15 pilot lease named
 * two occupants while the tenant's answer listing three more sat unused — the
 * occupants question had been added after the lease was started, and nothing
 * noticed it had never been asked.
 */

/** Money answers are nested by group; facts and values are flat. */
const answerFor = (answers: InterviewAnswers, field: InterviewField): unknown => {
  if (field.target === 'fact') {
    return (answers.facts as Record<string, unknown>)[field.name];
  }

  if (field.target === 'money') {
    const groups = Object.values(answers.money as Record<string, unknown>).filter(
      (group): group is Record<string, unknown> => typeof group === 'object' && group !== null,
    );

    return groups.find((group) => field.name in group)?.[field.name];
  }

  return answers.values[field.name];
};

/** `false` and `0` are answers. Only nothing at all is not. */
const isUnanswered = (value: unknown) => value === null || value === undefined || String(value).trim() === '';

/**
 * An answer worth telling someone about if it goes unused: words somebody
 * typed, or a "yes". A stored `false` or a number is as often a seeded default
 * as a statement — on the pilot lease a sale-notice period sat behind a "no" —
 * and a warning that fires on defaults is one people learn to ignore.
 */
const isSubstantive = (value: unknown) => value === true || (typeof value === 'string' && value.trim() !== '');

const shownFields = (steps: InterviewStep[], answers: InterviewAnswers) =>
  visibleSteps(steps, answers).flatMap((step) =>
    step.fields
      .filter((field) => field.showWhen === undefined || field.showWhen(answers))
      .map((field) => ({ field, step })),
  );

/**
 * Required questions, on screen, with no answer — as bare field names, the
 * shape `describeMissing` already turns into the question and its step.
 *
 * Only what is SHOWN: a question behind a "no" elsewhere, or on a step that
 * does not apply, is not one anybody skipped.
 *
 * `steps` has no default, on purpose: it must be `interviewFor` the property's
 * state. Florida's full list includes North Carolina's questions, and on the
 * pilot lease a Florida default reported seven NC questions as unanswered.
 */
export const unansweredRequired = (answers: InterviewAnswers, steps: InterviewStep[]): string[] =>
  shownFields(steps, answers)
    .filter(({ field }) => field.required === true && isUnanswered(answerFor(answers, field)))
    .map(({ field }) => field.name);

/**
 * Answers the lease will not use, because the question is not shown.
 *
 * Reported, not blocking: a landlord who answered "yes", typed names, then
 * changed their mind has a stale value that is rightly ignored. But it must be
 * SAID — the pilot lease's version of this was a tenant's answer, and nobody
 * was told it had gone nowhere.
 */
export const ignoredAnswers = (answers: InterviewAnswers, steps: InterviewStep[]): MissingAnswer[] => {
  const shown = new Set(shownFields(steps, answers).map(({ field }) => field.name));

  return steps.flatMap((step) =>
    step.fields
      .filter((field) => !shown.has(field.name) && isSubstantive(answerFor(answers, field)))
      .map((field) => ({
        question: field.label,
        stepTitle: step.title,
        stepId: step.id,
        raw: field.name,
        awaitingTenant: false,
      })),
  );
};
