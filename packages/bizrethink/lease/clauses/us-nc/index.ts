import type { Clause } from '../types';
import { NC_BOILERPLATE } from './boilerplate';
import { NC_DEPOSIT } from './deposit';
import { NC_MAINTENANCE } from './maintenance';
import { NC_RENT_AND_FEES } from './rent-and-fees';
import { NC_USE_AND_REMEDIES } from './use-and-remedies';

/**
 * The North Carolina clause library — seventeen clauses, and the thirty-six
 * portable ones it does not have to own.
 *
 * WHAT THIS SET IS. Only what North Carolina law requires, and what a
 * Florida-specific clause had to be replaced by. It is deliberately not a port
 * of Florida's twenty-eight: nine of those exist solely because a Florida
 * statute exists, and North Carolina simply does not get them. The list, and
 * the reason for each, is in `north-carolina.test.ts`.
 *
 * NORTH CAROLINA COMPELS NO LEASE TEXT. Nothing in Chapter 42 says a
 * residential lease "shall contain" anything. Verified 2026-09-06 across the
 * whole of the General Statutes, not only Chapter 42 — "radon" appears once in
 * the entire code and it is sale-side (§47E-4(b)(6)); there is no bedbug, mould,
 * flood or methamphetamine lease disclosure; there is no landlord-identity
 * requirement (§42-44(c1) is a safe harbour against a duty the State never
 * created); and there is no entry-notice statute at all. The all-caps legend
 * and the escrow-identity disclosure people expect to find are in Chapter 42A,
 * which governs VACATION RENTALS and is excluded from Article 5 by §42-39(a1).
 *
 * So the only clause a North Carolina lease is compelled to carry is the
 * FEDERAL lead-paint disclosure, and it arrives through the portable tier. That
 * is asserted, not described, because a compelled count of one is a fact a
 * reviewing attorney should be shown.
 *
 * KNOWN GAP, FLAGGED RATHER THAN OMITTED. Where a landlord bills the tenant for
 * water, sewer, electric or natural gas under N.C. Gen. Stat. §42-42.1 and
 * §62-110(g)-(j), the Utilities Commission's rules (R18-7(g), R22-7(g),
 * R24-7(g)) impose requirements at or before signing, and Rule R18-6(a) caps the
 * administrative fee. No clause here covers that, because the interview has no
 * fact recording whether the landlord bills for a utility — it records only who
 * PAYS. Adding one is a separate change; the gap is named in the PR so it is
 * missing on purpose rather than by accident.
 *
 * SLUGS END IN `-nc`, AND THAT IS LOAD-BEARING. `loadClauseApprovals` keys
 * attorney approvals by slug alone and keeps only the newest row per slug, so a
 * Florida `deposit.return` and a North Carolina `deposit.return` sharing a name
 * would let one state's approval hide the other's — the second clause would read
 * as unapproved forever with nothing red. Florida's slugs are unsuffixed for
 * historical reasons only; a third state suffixes too.
 */
export const NC_CLAUSE_MODULES = {
  deposit: NC_DEPOSIT,
  rentAndFees: NC_RENT_AND_FEES,
  maintenance: NC_MAINTENANCE,
  useAndRemedies: NC_USE_AND_REMEDIES,
  boilerplate: NC_BOILERPLATE,
} as const;

/**
 * Listed through the module map rather than spread inline, for the reason the
 * Florida index gives: a module that is imported and never spread compiles
 * cleanly, is not flagged as unused, and silently drops its clauses out of every
 * lease. That happened once and cost seven clauses.
 */
export const NC_LIBRARY: Clause[] = Object.values(NC_CLAUSE_MODULES).flat();
