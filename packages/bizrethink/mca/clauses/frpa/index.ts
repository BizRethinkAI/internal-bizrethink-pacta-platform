import type { NonClauseLine } from '../documents';
import type { McaClause } from '../types';
import { FRPA_APPENDIX } from './appendix';
import { FRPA_DEFAULT } from './default';
import { FRPA_ENROLLMENT } from './enrollment';
import { FRPA_GUARANTY } from './guaranty';
import { FRPA_MISCELLANEOUS } from './miscellaneous';
import { FRPA_PREAMBLE } from './preamble';
import { FRPA_PURCHASE } from './purchase';
import { FRPA_REPRESENTATIONS } from './representations';

/**
 * The Future Receivables Purchase Agreement — 101 clauses, and the largest
 * instrument in the corpus.
 *
 * EIGHTY-SEVEN THE DOCUMENT NUMBERS, FOURTEEN IT DOES NOT. The fourteen are the
 * reason `__tests__/frpa-coverage.test.ts` exists. Among them:
 *
 *   - **the granting clause**, "Effective as of the Purchase Date, Merchant
 *     hereby sells, assigns and transfers to Buyer (making Buyer the absolute
 *     owner)…", which is the sentence that makes this instrument a sale and not
 *     a loan, and therefore the subject of most of REVIEW-01's work;
 *   - **the definitions** of Workday, Approved Bank Account and Approved
 *     Processor, which sit between the Section 2 header and §2.1;
 *   - **Section 5's lead-in**, "Merchant represents, warrants, and covenants
 *     that as of the Effective Date and during the term of this Agreement:",
 *     which governs all eighteen representations beneath it and without which
 *     none of them is a representation at all.
 *
 * A library that imported `N.M` numbers would have dropped every one of them
 * without a word.
 *
 * WHY 87 AND NOT PHASE 0's 90. §6.1's fifteen limbs and §6.2's five are
 * enumerated items under a lead-in — "Each of the following constitutes an
 * Event of Default hereunder:" — and a limb approved apart from its lead-in
 * means nothing, so they live inside §6.1's and §6.2's bodies. Phase 0's
 * appendix counts some of them separately. Its count has already been corrected
 * twice (the Payzli addressee line that was not a clause, the Subscription
 * Agreement that was missing entirely), and this is the third.
 *
 * WHO EXAMINED IT. Both reviews, and unusually the split is clean: REVIEW-01
 * raised findings against 59 clauses and REVIEW-02 against the 31 it had not
 * reached. A clause neither raised anything against carries
 * `REVIEW-02, findings: []` — that review read the four negotiated documents
 * end to end, and "read and no finding" is not the same as clean.
 */
export const FRPA_CLAUSE_MODULES = {
  preamble: FRPA_PREAMBLE,
  purchase: FRPA_PURCHASE,
  enrollment: FRPA_ENROLLMENT,
  representations: FRPA_REPRESENTATIONS,
  default: FRPA_DEFAULT,
  miscellaneous: FRPA_MISCELLANEOUS,
  guaranty: FRPA_GUARANTY,
  appendix: FRPA_APPENDIX,
} as const;

export const FRPA_LIBRARY: McaClause[] = Object.values(FRPA_CLAUSE_MODULES).flat();

export const FRPA_SECTION_ORDER = [
  'funding-terms',
  'preamble',
  'purchase',
  'reconciliation',
  'enrollment',
  'representations',
  'default',
  'miscellaneous',
  'renewal',
  'guaranty',
  'service',
  'appendix',
] as const;

/**
 * Lines of the document that belong to no clause, each with the reason.
 *
 * The reason is required. "Not a clause" is a claim about the document, and a
 * claim with no stated basis is exactly how a real clause gets dropped — which
 * is what this whole file is built to prevent.
 */
export const FRPA_NON_CLAUSE: NonClauseLine[] = [
  { anchor: 'Future Receivables', reason: 'cover page title' },
  { anchor: 'Purchase Agreement', reason: 'cover page title' },
  { anchor: 'Purchase of Future Receivables', reason: 'cover page subtitle' },
  { anchor: '[TABLE]  | PREPARED BY', reason: 'cover page metadata block' },
  { anchor: 'Section 1: Merchant and Funding Information', reason: 'section header' },
  {
    anchor: '[TABLE] 1.1 MERCHANT INFORMATION',
    reason:
      'the Section 1 form grid — AcroForm widgets and labels, not prose. Its fields §1.3–§1.5 ARE named in review loci, which is why they appear in FRPA_LOCUS_EXCLUSIONS rather than being silently ignored',
  },
  { anchor: 'Section 2: Purchase and Sale', reason: 'section header' },
  { anchor: 'Section 3: Reconciliation and Adjustment', reason: 'section header' },
  { anchor: 'Section 4: Terms of Enrollment', reason: 'section header' },
  { anchor: 'Section 5: Representations, Warranties, and Covenants', reason: 'section header' },
  { anchor: 'Section 6: Events of Default and Remedies', reason: 'section header' },
  { anchor: 'Section 7: Miscellaneous', reason: 'section header' },
  { anchor: 'Section 8: Renewal and Rollover', reason: 'section header' },
  { anchor: 'Section 9: Personal Guaranty of Performance', reason: 'section header' },
  { anchor: 'Section 10: Waiver of Personal Service', reason: 'section header' },
  { anchor: 'Appendix A: Fee Schedule', reason: 'appendix header' },
  {
    anchor: '[TABLE] Fee | Amount | When Applied',
    reason: 'the fee-schedule grid — the prose around it IS imported, as three clauses',
  },
  { anchor: 'Signatures', reason: 'signature block header' },
  { anchor: '[TABLE] BUYER Lombard Capital LLC', reason: 'signature block' },
  { anchor: 'PERSONAL GUARANTOR', reason: 'signature block' },
  { anchor: 'Guarantor Signature:', reason: 'signature block' },
  { anchor: '{{SIGNATURE,', reason: 'a native signature widget' },
  { anchor: '[TABLE] Printed Name:', reason: 'signature block' },
  { anchor: 'Exhibit A: Split Funding Authorization', reason: 'exhibit header' },
  { anchor: 'Exhibit B: [Reserved]', reason: 'exhibit header' },
  { anchor: '[Reserved].', reason: 'the whole of Exhibit B' },
  { anchor: 'Exhibit C: Permission to Release Information', reason: 'exhibit header' },
];

/**
 * Clause numbers named in a review's locus that are NOT clauses of this
 * document — and why each one is not a defect.
 *
 * #126's rule is that a finding must never be bound to a clause by matching its
 * locus string, because the ISO PRA's numbering moved between the review and the
 * document and a match would have been wrong precisely where the review had
 * been acted on. That rule stands.
 *
 * The FRPA is the checked exception. v4 was locked on 2026-05-07 and BOTH
 * reviews ran against v4, so its loci still point at the text they were written
 * about: of 82 clause numbers named, 75 exist. These are the seven that do not,
 * and none is a mystery. Pinned by a test so the exception cannot quietly widen
 * into the rule it is an exception to.
 */
export const FRPA_LOCUS_EXCLUSIONS: Record<string, string> = {
  '1.3': 'a Section 1 form-grid field, not a prose clause',
  '1.4': 'a Section 1 form-grid field, not a prose clause',
  '1.5': 'a Section 1 form-grid field, not a prose clause',
  '3.14': 'the Equipment Lease / Subscription twins number, appearing in a cross-document locus',
  '3.5': 'the Equipment Lease / Subscription twins number, appearing in a cross-document locus',
  '3.6': 'the Equipment Lease / Subscription twins number, appearing in a cross-document locus',
  '6.5':
    'deleted outright by option (a) of REVIEW-01s own fix; see the manifest note on liquidated-damages-plus-actual-costs',
};
