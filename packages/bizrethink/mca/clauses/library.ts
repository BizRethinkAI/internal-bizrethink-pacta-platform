import { EQUIPMENT_LEASE_LIBRARY, EQUIPMENT_SECTION_ORDER } from './equipment-lease';
import { FRPA_LIBRARY, FRPA_SECTION_ORDER } from './frpa';
import { MCA_INSTRUMENTS, type McaInstrument } from './instruments';
import { ISO_PRA_LIBRARY, ISO_PRA_SECTION_ORDER } from './iso-pra';
import { PERMISSION_TO_RELEASE_LIBRARY, PERMISSION_TO_RELEASE_SECTION_ORDER } from './permission-to-release';
import { PAYZLI_LIBRARY, PAYZLI_SECTION_ORDER } from './split-funding';
import { SUBSCRIPTION_LIBRARY } from './subscription';
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
export const ALL_MCA_CLAUSES: McaClause[] = [
  ...FRPA_LIBRARY,
  ...EQUIPMENT_LEASE_LIBRARY,
  ...SUBSCRIPTION_LIBRARY,
  ...ISO_PRA_LIBRARY,
  ...PAYZLI_LIBRARY,
  ...PERMISSION_TO_RELEASE_LIBRARY,
];

/**
 * The clauses published in one agreement.
 *
 * EXACT MEMBERSHIP, NO PORTABLE TIER. The lease library unions a `generic` and
 * a `US` tier into every jurisdiction, because 36 of its clauses depend on no
 * state's law. There is no equivalent here and inventing one would be a
 * mistake: a clause that reads identically in two agreements is not "portable",
 * it would be one clause published in both. No such clause exists: across 177
 * clauses of four instruments, every one names exactly one. The distinction
 * still matters, because a portable tier leaks by construction — anything
 * placed in it reaches every document — and this filter is exact equality.
 */
export const libraryFor = (instrument: McaInstrument): McaClause[] =>
  ALL_MCA_CLAUSES.filter((clause) => clause.instrument === instrument);

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
  frpa: FRPA_SECTION_ORDER,
  'equipment-lease': EQUIPMENT_SECTION_ORDER,
  // The Subscription is the Equipment Lease's twin and shares its sections
  // exactly, which is the one place the duplication is deliberate rather than
  // a risk: two names for one order would let the twins be READ in different
  // orders while their clauses still matched.
  subscription: EQUIPMENT_SECTION_ORDER,
  'iso-pra': ISO_PRA_SECTION_ORDER,
  'split-funding': PAYZLI_SECTION_ORDER,
  'permission-to-release': PERMISSION_TO_RELEASE_SECTION_ORDER,
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
 */
export const inReviewOrder = (clauses: McaClause[]): McaClause[] => {
  const instrument = (clause: McaClause) => {
    const index = MCA_INSTRUMENTS.indexOf(clause.instrument);

    return index === -1 ? MCA_INSTRUMENTS.length : index;
  };

  const section = (clause: McaClause) => {
    const order = SECTION_ORDER[clause.instrument] ?? [];
    const index = order.indexOf(clause.section);

    return index === -1 ? order.length : index;
  };

  return [...clauses].sort(
    (a, b) =>
      instrument(a) - instrument(b) || section(a) - section(b) || a.sortKey - b.sortKey || a.slug.localeCompare(b.slug),
  );
};
