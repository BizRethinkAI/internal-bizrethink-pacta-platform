import type { InterviewField, InterviewStep } from './steps';
import { allFields, DERIVED_VALUES, FL_INTERVIEW } from './steps';

/**
 * Letting the tenant fill in the things only the tenant knows.
 *
 * The names of their children, the breed and weight of their dog, where they
 * live before moving in. A landlord filling these is guessing, and then
 * correcting them over email. The lease already goes to the tenant for review,
 * so it can carry the questions with it.
 *
 * THIS IS THE MOST DANGEROUS SURFACE IN THE FEATURE. It is an unauthenticated
 * endpoint, reached with a link, writing into a document destined for
 * signature. If it accepted whatever keys it was handed, whoever held the link
 * could set the rent.
 *
 * Three rules, and the first is the one that matters:
 *
 *   1. THE FIELD DEFINITIONS ARE THE AUTHORITY. What may be delegated is
 *      computed here from `tenantCanAnswer`, never taken from input and never
 *      trusted from the stored list. Client input SELECTS from that set; it
 *      cannot extend it.
 *   2. A money field can never be delegated, whatever it declares.
 *   3. Nor can a field a statute constrains — the answer has legal consequence
 *      and is the landlord's to give.
 *
 * Rules 2 and 3 are enforced here rather than left to whoever edits the
 * interview, and asserted over the whole interview by test.
 */

/** Longest answer accepted, so a link cannot be used to stuff a document. */
const MAX_ANSWER_LENGTH = 2000;

const isDelegable = (field: InterviewField): boolean => {
  if (field.tenantCanAnswer !== true) {
    return false;
  }

  // Structural refusals. A field declaring itself delegable does not make it so.
  if (field.target === 'money' || field.statute !== undefined) {
    return false;
  }

  return !DERIVED_VALUES.includes(field.name);
};

export const delegableFieldNames = (interview: InterviewStep[]): string[] =>
  allFields(interview)
    .filter(isDelegable)
    .map((field) => field.name);

/**
 * The fields to render on the tenant's review page, in interview order.
 *
 * Filtered against the definitions rather than rendered from the stored list,
 * so a stored list that is wrong — corrupted, hand-edited, written by an older
 * version — cannot put a rent box in front of a tenant.
 */
export const tenantFieldsFor = (interview: InterviewStep[], delegated: string[]): InterviewField[] => {
  const asked = new Set(delegated);

  return allFields(interview).filter((field) => isDelegable(field) && asked.has(field.name));
};

export type ApplyTenantAnswersOptions = {
  values: Record<string, unknown>;
  /** What the landlord chose to ask. Still checked against the definitions. */
  delegated: string[];
  /** What came back over the wire. Untrusted. */
  submitted: Record<string, unknown>;
};

export const applyTenantAnswers = ({
  values,
  delegated,
  submitted,
}: ApplyTenantAnswersOptions): Record<string, unknown> => {
  /*
    Computed from the real interview definition, never from an argument. A
    caller cannot widen the allowlist by passing a different interview.
  */
  const allowed = new Set(tenantFieldsFor(FL_INTERVIEW, delegated).map((field) => field.name));

  const next = { ...values };

  for (const [key, raw] of Object.entries(submitted)) {
    if (!allowed.has(key)) {
      continue;
    }

    // Only strings. Coercing an object or a number here is how a shape nobody
    // expected ends up interpolated into a lease.
    if (typeof raw !== 'string') {
      continue;
    }

    const trimmed = raw.trim().slice(0, MAX_ANSWER_LENGTH);

    next[key] = trimmed === '' ? null : trimmed;
  }

  return next;
};
