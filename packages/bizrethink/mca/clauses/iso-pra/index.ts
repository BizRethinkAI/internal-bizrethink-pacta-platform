import type { McaClause } from '../types';
import { ISO_PRA_ADDITIONAL_OBLIGATIONS } from './additional-obligations';
import { ISO_PRA_COMMISSION } from './commission';
import { ISO_PRA_GENERAL } from './general';
import { ISO_PRA_REFERRAL_DUTIES } from './referral-duties';

/**
 * The ISO Partner Referral Agreement — twenty-four clauses, and the first
 * instrument imported.
 *
 * WHY THIS ONE FIRST. It is the smallest complete agreement in the corpus and
 * the only one no merchant ever sees, so the spine gets proved end to end on
 * the document where a mistake reaches a business partner rather than a
 * borrower. It is also examined end to end: REVIEW-01 read twenty-one of these
 * clauses and REVIEW-02 read the three it had not — A.2, A.6 and 1.6 — so
 * nothing here enters on nobody's authority.
 *
 * ITS SECTION NUMBERING IS INCONSISTENT AND THAT IS A KNOWN FINDING. The
 * document runs Section A, then Sections I, II and III, so its clauses are
 * numbered A.1–A.6 and then 1.1, 2.1, 3.1. REVIEW-01 raised it as
 * `iso-inconsistent-section-numbering` against "section headings throughout".
 * The numbers below are the document's, not a tidied version of them: `number`
 * is what a reader sees on the page, and a library that silently renumbered
 * would make the finding invisible and every locus in the review unfollowable.
 *
 * FOUR REVIEW-01 FINDINGS ARE NOT ATTACHED TO ANY CLAUSE, ON PURPOSE.
 * `iso-signature-dates-share-effective-date-field` is against the signature
 * block, `iso-inconsistent-section-numbering` against the headings,
 * `iso-channel-vs-never-cold-call` against the FRPA's §7.21, and
 * `ca-broker-row-contradicts-frpa-and-iso` against a row of the California
 * disclosure. None of them is about a clause of this agreement. They remain in
 * the register and are reachable there; inventing an attachment so that every
 * finding has a home would put a finding in front of a reviewer reading a
 * clause it is not about.
 */
export const ISO_PRA_CLAUSE_MODULES = {
  commission: ISO_PRA_COMMISSION,
  referralDuties: ISO_PRA_REFERRAL_DUTIES,
  additionalObligations: ISO_PRA_ADDITIONAL_OBLIGATIONS,
  general: ISO_PRA_GENERAL,
} as const;

/**
 * Listed through the module map rather than spread inline, for the reason the
 * lease library's index gives: a module that is imported and never spread
 * compiles cleanly, is not flagged as unused, and silently drops its clauses
 * out of every document. That happened once there and cost seven clauses.
 */
export const ISO_PRA_LIBRARY: McaClause[] = Object.values(ISO_PRA_CLAUSE_MODULES).flat();

/** Document order, which is also the order a reviewer should read it in. */
export const ISO_PRA_SECTION_ORDER = ['commission', 'referral-duties', 'additional-obligations', 'general'] as const;
