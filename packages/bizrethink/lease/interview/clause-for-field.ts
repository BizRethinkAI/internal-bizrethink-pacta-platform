import type { SelectedClause } from '../engine/select-clauses';

/**
 * Which clause an answer ends up in.
 *
 * The interview asks sixty questions and never says what any of them becomes.
 * A landlord types 75 into "what do you charge if the tenant refuses access"
 * and has no way to know it lands in 8.7 Administrative Charges — so the
 * question reads as a form field rather than as a term they are drafting.
 *
 * The mapping already exists implicitly: every clause declares the variables
 * its body interpolates. This just reads it the other way round.
 *
 * The NUMBER is per-lease, because numbering is derived from what survives
 * selection — a clause dropped earlier renumbers everything after it. So this
 * takes the selected clauses rather than the whole library, and a field whose
 * clause is not selected has no reference to show.
 */

export type ClauseReference = {
  /** Derived at selection, e.g. '8.7'. */
  number: string;
  heading: string;
};

/**
 * Field name to the clause that uses it.
 *
 * FIRST WINS, deliberately. A handful of variables appear in more than one
 * clause — `tenantNames` is in the recital and the occupancy clause — and
 * naming every one of them would be noise where naming the first is a useful
 * pointer. Selection order is document order, so the first is the earliest
 * place the answer appears.
 */
export const clauseIndexForFields = (selected: SelectedClause[]): Map<string, ClauseReference> => {
  const index = new Map<string, ClauseReference>();

  for (const clause of selected) {
    for (const variable of clause.variables) {
      if (!index.has(variable.name)) {
        index.set(variable.name, { number: clause.number, heading: clause.heading });
      }
    }
  }

  return index;
};
