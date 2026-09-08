import type { NonClauseLine } from '../documents';
import type { McaClause } from '../types';
import { PERMISSION_TO_RELEASE_SECTIONS } from './sections';

/**
 * The Permission to Release — a preamble and seven numbered sections.
 *
 * PHASE 0 RECORDS THIS DOCUMENT AS HAVING ZERO CLAUSES. Its table gives
 * "Permission to Release — 0", with an em dash where the examined count should
 * be, so it was read as having nothing in it and never appeared in the 140.
 * It has eight clauses and REVIEW-01 raised six findings against them.
 *
 * That is the third correction to Phase 0's corpus, after the Payzli addressee
 * line that was not a clause and the Subscription Agreement that was missing
 * entirely. The pattern is consistent and worth naming: **the census was built
 * by an extraction that keyed on `N.M` numbering**, so a document numbered any
 * other way — `1.`, or not at all — came out empty or wrong.
 *
 * WHY IT MATTERS MORE THAN A COUNT. §3 and §4 are the credit-bureau and FCRA
 * authorisations that FRPA §4.3 depends on, and REVIEW-02's
 * `frpa-4-3-consumer-report-authority-depends-on-a-separate-instrument` is
 * exactly the point: the FRPA's authority to pull a consumer report rests on an
 * instrument the corpus had recorded as empty.
 */
export const PERMISSION_TO_RELEASE_CLAUSE_MODULES = {
  authorisations: PERMISSION_TO_RELEASE_SECTIONS,
} as const;

export const PERMISSION_TO_RELEASE_LIBRARY: McaClause[] = Object.values(PERMISSION_TO_RELEASE_CLAUSE_MODULES).flat();

export const PERMISSION_TO_RELEASE_SECTION_ORDER = ['authorisations'] as const;

/** Lines that belong to no section, each with the reason. */
export const PERMISSION_TO_RELEASE_NON_CLAUSE: NonClauseLine[] = [
  { anchor: 'PERMISSION TO RELEASE INFORMATION', reason: 'document title' },
  { anchor: 'Date: ', reason: 'a date field' },
  { anchor: 'AGREED AND ACKNOWLEDGED:', reason: 'signature block header' },
  { anchor: 'Signature:', reason: 'signature block' },
  { anchor: '[TABLE] {{SIGNATURE', reason: 'signature block' },
];
