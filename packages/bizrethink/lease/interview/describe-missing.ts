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
  /**
   * The landlord asked the TENANT this, and the tenant has not answered yet.
   *
   * It still blocks — a lease cannot go out with a raw token in it — but it is
   * not a question the landlord skipped, and a red list that does not
   * distinguish the two sends them looking for work they have already done.
   */
  awaitingTenant: boolean;
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

export const describeMissing = (missing: string[], delegatedFields: string[] = []): MissingAnswer[] => {
  const delegated = new Set(delegatedFields);

  return missing.map((raw) => {
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
        awaitingTenant: false,
      };
    }

    return {
      question: field.label,
      stepTitle: field.stepTitle,
      stepId: field.stepId,
      raw,
      awaitingTenant: delegated.has(variable),
    };
  });
};

/** De-duplicated: one variable can be required by several clauses at once. */
export const describeMissingUnique = (missing: string[], delegatedFields: string[] = []): MissingAnswer[] => {
  const seen = new Set<string>();

  return describeMissing(missing, delegatedFields).filter((entry) => {
    const key = variableOf(entry.raw);

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);

    return true;
  });
};

export const allFieldNames = (): string[] => allFields(FL_INTERVIEW).map((field) => field.name);

/**
 * Questions put to the tenant that have not come back.
 *
 * Separate from `missing` on purpose. `missing` reports what the DOCUMENT
 * needs, so a delegated question appears there only when it also happens to be
 * a required clause variable — `permittedPets` is, `authorisedOccupants` is
 * not. Blank occupants is a lawful answer that selects a different clause, so
 * it can never block; but a landlord who asked and never heard back should not
 * have to discover that from the rendered lease.
 *
 * Reported, never blocking.
 */
export const outstandingDelegations = (delegatedFields: string[], values: Record<string, unknown>): MissingAnswer[] =>
  delegatedFields
    .filter((name) => String(values[name] ?? '').trim() === '')
    .map((name) => ({ name, field: FIELD_INDEX.get(name) }))
    .filter(
      (entry): entry is { name: string; field: NonNullable<ReturnType<typeof FIELD_INDEX.get>> } =>
        entry.field !== undefined,
    )
    .map(({ name, field }) => ({
      question: field.label,
      stepTitle: field.stepTitle,
      stepId: field.stepId,
      raw: name,
      awaitingTenant: true,
    }));
