import { MCA_INSTRUMENTS, type McaInstrument } from './instruments';
import { ISO_PRA_LIBRARY, ISO_PRA_SECTION_ORDER } from './iso-pra';
import type { McaClause } from './types';

/**
 * Every clause of every negotiated agreement, and the only sanctioned way to
 * ask for one instrument's worth of them.
 *
 * WHY A FILTER RATHER THAN A DIRECTORY PER INSTRUMENT AND A DIRECT IMPORT.
 * `jurisdictions.ts` makes this argument about disclosures and it carries over
 * unchanged: the California form shipped to production carrying New York's
 * phrasing, and it survived a human reading both regulations side by side. The
 * failure was not inattention, it was that a caller could reach the wrong text
 * at all. The instruments here are more confusable than the states, not less —
 * the Equipment Lease and the Subscription have IDENTICAL clause numbering — so
 * a caller that imports `EQUIPMENT_LEASE_LIBRARY` directly is in exactly the
 * position that shipped the defect.
 */
export const ALL_MCA_CLAUSES: McaClause[] = [...ISO_PRA_LIBRARY];

/**
 * The clauses published in one agreement.
 *
 * EXACT MEMBERSHIP, NO PORTABLE TIER. The lease library unions a `generic` and
 * a `US` tier into every jurisdiction, because 36 of its clauses depend on no
 * state's law. There is no equivalent here and inventing one would be a
 * mistake: a clause that reads identically in two agreements is not "portable",
 * it is one clause published in both, which `instruments` says directly. The
 * distinction matters because a portable tier leaks by construction — anything
 * placed in it reaches every document — whereas naming both instruments is a
 * decision somebody made about those two documents.
 */
export const libraryFor = (instrument: McaInstrument): McaClause[] =>
  ALL_MCA_CLAUSES.filter((clause) => clause.instruments.includes(instrument));

/**
 * Section order, per instrument.
 *
 * Kept as a map rather than one flat list because the agreements do not share
 * a section vocabulary — the ISO PRA has `commission` and `referral-duties`,
 * the FRPA will have `purchase` and `reconciliation` — and a single list would
 * have to be a union of every document's sections in an order no document
 * follows.
 */
const SECTION_ORDER: Partial<Record<McaInstrument, readonly string[]>> = {
  'iso-pra': ISO_PRA_SECTION_ORDER,
};

/**
 * The library in the order a reviewer should read it.
 *
 * Three keys: the instrument, in the order `MCA_INSTRUMENTS` declares; then that
 * instrument's section order; then `sortKey`. The lease library's
 * `inReviewOrder` gives the reason for having one at all — both of its review
 * pages rendered in module-concatenation order, which is neither document order
 * nor any other order a reader could name, and a grouped list whose members
 * arrive arbitrarily reads as a bug in the grouping.
 *
 * A clause naming a section outside its instrument's order sorts last rather
 * than throwing. There is no document being assembled here, and a review page
 * that renders nothing because one clause is misfiled hides the other
 * twenty-three.
 *
 * A clause in more than one instrument sorts under the FIRST one it names, so
 * that the twin appears once in a whole-library reading rather than twice.
 * `libraryFor` is what shows it in the other document's context.
 */
export const inReviewOrder = (clauses: McaClause[]): McaClause[] => {
  const instrument = (clause: McaClause) => {
    const index = MCA_INSTRUMENTS.indexOf(clause.instruments[0]);

    return index === -1 ? MCA_INSTRUMENTS.length : index;
  };

  const section = (clause: McaClause) => {
    const order = SECTION_ORDER[clause.instruments[0]] ?? [];
    const index = order.indexOf(clause.section);

    return index === -1 ? order.length : index;
  };

  return [...clauses].sort(
    (a, b) =>
      instrument(a) - instrument(b) || section(a) - section(b) || a.sortKey - b.sortKey || a.slug.localeCompare(b.slug),
  );
};
