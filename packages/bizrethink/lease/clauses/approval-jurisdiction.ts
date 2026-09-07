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
 * that; if the answer is no it changes in exactly two places in this file and
 * nowhere else — `admissionBlocks`, which decides whether an approval may be
 * RECORDED, and `PORTABLE_APPROVAL_TRAVELS`, which decides whether one already
 * recorded COUNTS in another state.
 *
 * This file also owns what the tiers are CALLED. The labels sit beside the
 * rule that uses them because both pages need them and a second copy would
 * drift.
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

/**
 * The jurisdiction a lease is drafted to when its property does not say.
 *
 * FAIL-OPEN, AND NAMED SO THAT IS VISIBLE. A property in a state the library
 * holds no clauses for gets Florida's — the radon disclosure, the §83.49
 * deposit sections, the lot. Failing closed would leave that landlord with a
 * builder that assembles nothing and no way forward, so the default stays; what
 * changes is that it is one named constant rather than three hand-written
 * `?? 'US-FL'` fallbacks, and a test pins what it is.
 */
export const DEFAULT_LEASE_JURISDICTION: ClauseJurisdiction = 'US-FL';

/**
 * Whose law a lease over this property is drafted to.
 *
 * The rule is "the state the property is in", and it was written out by hand in
 * three files — `renderInputForMatter`, the lease page's `interviewFor` call,
 * and, missing entirely, the validate path. Three copies of a fallback is how
 * one of them ends up defaulting differently, and the symptom is a lease whose
 * QUESTIONS come from one state and whose CLAUSES come from another.
 */
export const jurisdictionForProperty = (state: string | null | undefined): ClauseJurisdiction =>
  normaliseJurisdiction(state ?? null) ?? DEFAULT_LEASE_JURISDICTION;

/**
 * What each tier is called, in the adjectival form both readers need.
 *
 * ONE MAP, and it is the reason this lives here rather than in either page. The
 * same four values have to name the law a clause depends on inside a sentence
 * (`admissionBlocks`) and head a group of clauses in two UIs. A second map
 * would be a map that drifts, and the drift would be silent — the two would
 * simply start calling the same tier different things on different pages.
 */
const NAMES: Record<ClauseJurisdiction, string> = {
  generic: "no state's",
  US: 'federal',
  'US-FL': 'Florida',
  'US-NC': 'North Carolina',
};

/**
 * The tier of law a clause depends on, as a reader should see it.
 *
 * NEVER THE RAW TOKEN, and never "generic" or "portable" either. Those are the
 * library's filing system — they describe where we keep the clause. A reviewer
 * is deciding whether their admission covers it, and the fact that decides that
 * is what the clause DEPENDS ON: no state's law, federal law, or Florida's.
 *
 * `Clause.jurisdiction` is typed `string`, so an unrecognised value is
 * reachable in principle. `clause-jurisdictions.test.ts` pins every clause to
 * one of the four, so in practice it is a library defect — and a defect should
 * reach a reviewer as a word, not as jargon they cannot interpret.
 */
export const jurisdictionLabel = (jurisdiction: string): string => {
  const name = NAMES[jurisdiction as ClauseJurisdiction];

  if (name === undefined) {
    return 'Unclassified';
  }

  return `${name.charAt(0).toUpperCase()}${name.slice(1)} law`;
};

/**
 * The bare name, for a sentence that already supplies the noun — "a Florida
 * lease", "the Florida clause library".
 *
 * Same map, so it cannot drift from the label. Callers pass a state; `generic`
 * and `US` reach it only through a mistake, and answer honestly if they do.
 */
export const jurisdictionName = (jurisdiction: string): string => jurisdictionLabel(jurisdiction).replace(/ law$/, '');

/**
 * The order the tiers are shown in, everywhere they are shown.
 *
 * Most specific first. The clauses that turn on the reader's own state are the
 * ones only their admission covers, and they are where an hour of review is
 * worth most; the portable tier is the largest and the least contingent, so it
 * reads last.
 */
export const JURISDICTION_TIERS: ClauseJurisdiction[] = ['US-FL', 'US-NC', 'US', 'generic'];

/**
 * Whether a portable-tier approval carries to a state other than the one the
 * approving attorney is admitted in.
 *
 * THIS CONSTANT IS THE OPEN QUESTION, and it is here so it is one line.
 * Counsel has been asked whether an attorney admitted in Florida can approve a
 * clause that turns on no state's law for use in a North Carolina lease. Until
 * that comes back the permissive reading is the one that matches how the
 * library is actually built — `libraryFor` gives every state the same 36
 * portable clauses, and the alternative is 36 approvals per state for text no
 * state's law touches.
 *
 * Flip it to `false` and portable approvals stop travelling. Nothing else
 * changes, which is the whole point of it being a constant rather than a
 * condition spread across two pages.
 */
const PORTABLE_APPROVAL_TRAVELS = true;

/**
 * The tiers that are in EVERY state's library: no state's law is involved, or
 * federal law is.
 *
 * Exported and read by `libraryFor`, so the set of tiers that travel is defined
 * once. It was defined twice for a day — here and in `library.ts` — which is
 * the drift this file exists to prevent, one level down.
 */
export const PORTABLE_TIERS: ReadonlySet<string> = new Set<ClauseJurisdiction>(['generic', 'US']);

/**
 * Does this recorded approval count for a lease in this jurisdiction?
 *
 * `admissionBlocks` is asked BEFORE an approval is written: may this attorney
 * sign off on this clause at all. This is asked AFTER, of a row that already
 * exists: the clause's tier and the bar were both stored on it, so either
 * answer is computable and the only thing missing is counsel's.
 *
 * Both fields are nullable because they were added to an existing table. An
 * approval that recorded neither cannot be checked against anything, so it
 * covers nothing — fail-closed, matching `isApprovalCurrent`, which treats an
 * unattributed approval as no approval.
 */
export const coversJurisdiction = (
  approval: { clauseJurisdiction: string | null; barJurisdiction: string | null },
  jurisdiction: ClauseJurisdiction,
): boolean => {
  if (approval.clauseJurisdiction === null || approval.barJurisdiction === null) {
    return false;
  }

  if (PORTABLE_TIERS.has(approval.clauseJurisdiction)) {
    return PORTABLE_APPROVAL_TRAVELS || approval.barJurisdiction === jurisdiction;
  }

  /*
    A state clause. `admissionBlocks` already required the attorney to be
    admitted where the clause applies, so this is asking the narrower question:
    the approval covers that state and says nothing about any other.
  */
  return approval.clauseJurisdiction === jurisdiction;
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
