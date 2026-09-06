import type { ClauseJurisdiction } from './approval-jurisdiction';
import type { Clause } from './types';
import { FL_LIBRARY } from './us-fl';

/**
 * The clauses that apply in one jurisdiction.
 *
 * A lease for state X assembles `generic` + `US` + `US-X`. Nothing from any
 * other state can reach it, whatever a caller imports by mistake — which is the
 * property that makes a second state safe to add rather than a second copy of
 * the library to maintain.
 *
 * WHY THIS AND NOT A DIRECTORY MOVE. The plan called for splitting the clause
 * files into per-jurisdiction folders first. Measured, that is five mixed files
 * rewritten and 39 import sites updated, for no behaviour change — while the
 * thing North Carolina genuinely cannot be built without is this filter. The
 * folders buy readability and can follow at any time; this buys capability.
 *
 * `ALL_CLAUSES` still comes out of the `us-fl` module because that is where
 * every clause currently lives, including the 35 that depend on no state's law
 * at all. That naming is now wrong and is exactly what the folder move would
 * fix — a comment rather than a rewrite, until it is worth the churn.
 */
export const ALL_CLAUSES: Clause[] = FL_LIBRARY;

/**
 * Clauses that travel: no jurisdiction's law is involved, or federal law is,
 * which applies everywhere.
 */
const PORTABLE: ReadonlySet<string> = new Set(['generic', 'US']);

export const libraryFor = (jurisdiction: ClauseJurisdiction): Clause[] =>
  ALL_CLAUSES.filter((clause) => PORTABLE.has(clause.jurisdiction) || clause.jurisdiction === jurisdiction);
