import type { ClauseJurisdiction } from './approval-jurisdiction';
import { JURISDICTION_TIERS, PORTABLE_TIERS } from './approval-jurisdiction';
import type { Clause } from './types';
import { FL_LIBRARY, FL_SECTION_ORDER } from './us-fl';

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

/*
  Which tiers travel is defined in `approval-jurisdiction.ts`, beside the rule
  that asks whether an APPROVAL of one travels. Two sets naming the same two
  strings is how the filter and the approval check start disagreeing.
*/
export const libraryFor = (jurisdiction: ClauseJurisdiction): Clause[] =>
  ALL_CLAUSES.filter((clause) => PORTABLE_TIERS.has(clause.jurisdiction) || clause.jurisdiction === jurisdiction);

/**
 * The library in the order a reviewer should read it.
 *
 * BOTH REVIEW PAGES RENDERED IN MODULE-CONCATENATION ORDER — the order
 * `FL_CLAUSE_MODULES` happens to be spread in, which is neither document order
 * nor any other order a reader could name. That was tolerable while the list
 * was flat and undifferentiated. It is not tolerable now that the list is
 * grouped, because a group whose members arrive in an arbitrary order reads as
 * a bug in the grouping.
 *
 * Two keys, and both are borrowed rather than invented:
 *
 *   - tier, in `JURISDICTION_TIERS`, so the top-level grouping has one order
 *     wherever it is shown;
 *   - then `FL_SECTION_ORDER` and `sortKey`, which is exactly what
 *     `selectClauses` sorts a real lease by. A reviewer reading the library
 *     and a tenant reading the lease see clauses in the same sequence.
 *
 * A clause naming a section outside the order sorts last rather than throwing.
 * `selectClauses` throws on that, correctly — it cannot place the clause in a
 * document. Here there is no document, and a review page that renders nothing
 * because one clause is misfiled would hide the other sixty-three.
 */
export const inReviewOrder = (clauses: Clause[]): Clause[] => {
  const tier = (clause: Clause) => {
    const index = JURISDICTION_TIERS.indexOf(clause.jurisdiction as ClauseJurisdiction);

    return index === -1 ? JURISDICTION_TIERS.length : index;
  };

  const section = (clause: Clause) => {
    const index = FL_SECTION_ORDER.indexOf(clause.section as (typeof FL_SECTION_ORDER)[number]);

    return index === -1 ? FL_SECTION_ORDER.length : index;
  };

  return [...clauses].sort(
    (a, b) => tier(a) - tier(b) || section(a) - section(b) || a.sortKey - b.sortKey || a.slug.localeCompare(b.slug),
  );
};
