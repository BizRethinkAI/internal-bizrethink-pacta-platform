import type { ClauseJurisdiction } from './approval-jurisdiction';
import { JURISDICTION_TIERS, PORTABLE_TIERS } from './approval-jurisdiction';
import type { Clause } from './types';
import { FL_LIBRARY, FL_SECTION_ORDER } from './us-fl';
import { NC_LIBRARY } from './us-nc';

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
 * `ALL_CLAUSES` is now genuinely all of them: Florida's 64 — which still
 * includes the 36 that depend on no state's law at all, because that is simply
 * where they were written — plus North Carolina's 17. The `us-fl` module's name
 * remains wrong about the portable clauses inside it, and that is what the
 * folder move would fix. It is still a comment rather than a rewrite, and it is
 * now the ONLY thing the folder move would buy, because the split it was meant
 * to enable has been delivered by the filter below.
 */
export const ALL_CLAUSES: Clause[] = [...FL_LIBRARY, ...NC_LIBRARY];

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
