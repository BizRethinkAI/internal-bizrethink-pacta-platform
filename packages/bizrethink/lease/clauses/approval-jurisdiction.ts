/**
 * Which clauses an attorney's admission covers.
 *
 * `BizrethinkClauseApproval` recorded a bar NUMBER and never which bar, so
 * nothing could have objected to a Florida attorney approving a North Carolina
 * clause. With a second state next that stops being hypothetical, and with zero
 * approvals recorded today this is a field addition rather than a migration —
 * which is the whole reason it goes first.
 *
 * THE PERMISSIVE READING OF THE GENERIC TIER IS DELIBERATE AND PROVISIONAL.
 * Federal and generic clauses depend on no single state's law, so any US
 * admission is treated as covering them. Counsel has been asked to confirm
 * that; if the answer is no, it changes in `admissionBlocks` and nowhere else.
 */

/**
 * Jurisdictions the library can hold clauses for.
 *
 * `generic` is not a place. It is the tier for clauses that depend on no
 * jurisdiction's law at all — the boundary rule, expressed as a value.
 */
export type ClauseJurisdiction = 'generic' | 'US' | 'US-FL' | 'US-NC';

/*
  Typed by a landlord on an attorney's behalf, so it arrives however they wrote
  it: "FL", "Florida", "us-fl". The stored value has to equal the clause's own
  `jurisdiction` exactly, or the comparison never fires and the guard is
  decorative.
*/
const ADMISSIONS: Record<string, ClauseJurisdiction> = {
  fl: 'US-FL',
  'us-fl': 'US-FL',
  florida: 'US-FL',
  nc: 'US-NC',
  'us-nc': 'US-NC',
  'north carolina': 'US-NC',
};

/**
 * Turn what a human wrote into a jurisdiction the library recognises.
 *
 * Serves two callers with the same problem. A landlord types an attorney's
 * admission on their behalf — "FL", "Florida", "us-fl". A property row stores a
 * two-letter state. Both have to equal a clause's own `jurisdiction` exactly or
 * the comparison silently never fires.
 */
export const normaliseJurisdiction = (input: string | null): ClauseJurisdiction | null => {
  if (input === null) {
    return null;
  }

  return ADMISSIONS[input.trim().toLowerCase()] ?? null;
};

const NAMES: Record<ClauseJurisdiction, string> = {
  generic: 'no particular jurisdiction',
  US: 'federal law',
  'US-FL': 'Florida',
  'US-NC': 'North Carolina',
};

/**
 * Why this admission may not approve this clause, or null if it may.
 *
 * Returns a sentence rather than a boolean because the caller shows it to
 * whoever is recording the approval, and "blocked" without a reason is the kind
 * of guard people route around.
 */
export const admissionBlocks = (
  clauseJurisdiction: string,
  barJurisdiction: ClauseJurisdiction | null,
): string | null => {
  if (barJurisdiction === null) {
    return 'Record the jurisdiction the approving attorney is admitted in. An approval that does not say which bar cannot be checked against the clause it approves.';
  }

  /*
    No single state's law is involved, so any US admission covers it. Asked of
    counsel; permissive until answered.
  */
  if (clauseJurisdiction === 'generic' || clauseJurisdiction === 'US') {
    return null;
  }

  if (clauseJurisdiction === barJurisdiction) {
    return null;
  }

  const clauseName = NAMES[clauseJurisdiction as ClauseJurisdiction] ?? clauseJurisdiction;
  const barName = NAMES[barJurisdiction] ?? barJurisdiction;

  return `This clause is ${clauseName} law, and the approving attorney is admitted in ${barName}.`;
};
