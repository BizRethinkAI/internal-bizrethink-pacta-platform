import type { ClauseVariable } from '../clauses/types';

/**
 * Substitute answer values into clause text.
 *
 * Two constraints shape this.
 *
 * A missing value must never render as a blank. A gap where a repair threshold
 * should be reads as a finished lease that simply has no threshold; the raw
 * `{{repairThresholdUsd}}` token reads as obviously unfinished. So the token
 * stays and the name is reported, and the caller refuses to send.
 *
 * Signature placeholders share the `{{...}}` syntax but are not clause
 * variables — upstream's auto-placer reads them out of the finished PDF to
 * position the signing fields. If interpolation consumed one, the lease would
 * go out with nowhere to sign and nothing would error. They are matched by
 * their comma and recipient (`{{SIGNATURE, r1, ...}}`) and left alone.
 */

export type InterpolationValue = string | number | boolean | null | undefined;

export type InterpolateClauseOptions = {
  body: string;
  variables: ClauseVariable[];
  values: Record<string, InterpolationValue>;
  /**
   * Names the landlord handed to the tenant to answer.
   *
   * The rule above holds for everything the landlord can answer themselves. It
   * inverts for these: the landlord is never going to fill one in, and the
   * tenant is exactly who reads the PDF. `{{permittedPets}}` in the Pet
   * Addendum of a document sent to the person being asked about their pets
   * reads as a broken template, not a question.
   */
  delegated?: string[];
};

export type InterpolationResult = {
  text: string;
  /** Declared, required, and without a usable value. */
  missing: string[];
};

const usd = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

/** `2026-10-01` -> `1 October 2026`. Parsed by hand to avoid a timezone shift. */
const formatDate = (iso: string): string => {
  const [year, month, day] = iso.split('-').map(Number);

  return `${day} ${MONTHS[month - 1]} ${year}`;
};

const format = (value: InterpolationValue, type: ClauseVariable['type']): string => {
  if (type === 'usd') {
    return usd.format(Number(value));
  }

  if (type === 'date') {
    return formatDate(String(value));
  }

  return String(value);
};

/**
 * Zero is a value. `$0.00 due at execution` is the whole point of the
 * held-versus-collected split, so it must not be treated as absent.
 */
const isMissing = (value: InterpolationValue): boolean => value === undefined || value === null || value === '';

/**
 * What an unanswered delegated field reads as.
 *
 * Bracketed and named, so it is legible as a blank awaiting an answer and
 * cannot be mistaken for a term of the lease.
 */
const DELEGATED_PLACEHOLDER = '[to be completed by Tenant]';

export const interpolateClause = ({
  body,
  variables,
  values,
  delegated = [],
}: InterpolateClauseOptions): InterpolationResult => {
  const delegatedNames = new Set(delegated);
  const missing: string[] = [];
  let text = body;

  for (const variable of variables) {
    const value = values[variable.name];

    if (isMissing(value)) {
      if (variable.required) {
        missing.push(variable.name);
      }

      /*
        Still missing, still refused at the send gate — only the rendering
        changes. Making it legible must not make the lease look answerable.
      */
      if (delegatedNames.has(variable.name)) {
        text = text.split(`{{${variable.name}}}`).join(DELEGATED_PLACEHOLDER);
        continue;
      }

      // Otherwise the token stays: the landlord can answer it, and a raw token
      // is the signal that they have not.
      continue;
    }

    text = text.split(`{{${variable.name}}}`).join(format(value, variable.type));
  }

  return { text, missing };
};
