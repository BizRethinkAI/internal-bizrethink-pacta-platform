import { allFields, FL_INTERVIEW } from './steps';

/**
 * Turning `"rent.late-fee-flat: graceDays"` into something a landlord can act on.
 *
 * The review panel printed `missing` verbatim: a clause slug, a colon, and a
 * variable name, in monospace. That is the renderer's own vocabulary. A
 * landlord looking at `parties.recital: effectiveDate` cannot tell which
 * question they skipped, which step it is on, or — in that particular case —
 * that it was not a question at all and no answer of theirs would ever clear
 * it.
 *
 * So: the QUESTION, and where to go and answer it. Where no step asks for the
 * variable, say that plainly rather than sending someone hunting for a
 * question that does not exist.
 */

export type MissingAnswer = {
  /** The interview question, or the raw variable where nothing asks for it. */
  question: string;
  /** Step title, for "go here and fix it". Null where nothing asks for it. */
  stepTitle: string | null;
  stepId: string | null;
  /** Kept so the raw form is still recoverable when reporting a bug. */
  raw: string;
};

const FIELD_INDEX = new Map(
  FL_INTERVIEW.flatMap((step) =>
    step.fields.map((field) => [field.name, { label: field.label, stepId: step.id, stepTitle: step.title }] as const),
  ),
);

/*
  Same shape the renderer emits: `slug: variableName`, or a bare variable name
  if a caller ever pushes one. Splitting on the LAST colon-space, because a
  slug cannot contain one but this is cheap insurance either way.
*/
const variableOf = (entry: string): string => {
  const at = entry.lastIndexOf(': ');

  return at === -1 ? entry.trim() : entry.slice(at + 2).trim();
};

export const describeMissing = (missing: string[]): MissingAnswer[] =>
  missing.map((raw) => {
    const variable = variableOf(raw);
    const field = FIELD_INDEX.get(variable);

    if (!field) {
      /*
        Not a question anybody skipped. Either the variable is meant to be
        derived and nothing derives it, or a clause declares a variable no step
        asks for — both are defects in the builder rather than gaps in the
        answers, and the landlord needs to be told that rather than left
        searching.
      */
      return {
        question: `${variable} — no question asks for this. Nothing you enter will clear it; it needs fixing in the lease builder.`,
        stepTitle: null,
        stepId: null,
        raw,
      };
    }

    return { question: field.label, stepTitle: field.stepTitle, stepId: field.stepId, raw };
  });

/** De-duplicated: one variable can be required by several clauses at once. */
export const describeMissingUnique = (missing: string[]): MissingAnswer[] => {
  const seen = new Set<string>();

  return describeMissing(missing).filter((entry) => {
    const key = variableOf(entry.raw);

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);

    return true;
  });
};

export const allFieldNames = (): string[] => allFields(FL_INTERVIEW).map((field) => field.name);
