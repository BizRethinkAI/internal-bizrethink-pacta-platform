import type { PrescribedForm } from '../types';

/**
 * Connecticut — Appendix A to the Department of Banking's guidance of
 * 10 June 2024 (rev. 1 August 2024) under P.A. 23-201, codified at
 * Conn. Gen. Stat. §§36a-861 to 36a-872.
 *
 * A prescribed FORM, like Virginia's: fixed labels, provider's own answers.
 * §36a-863 requires the disclosure "in a format prescribed by the Banking
 * Commissioner", and Appendix A is that format.
 *
 * THE DEPARTMENT HAS EXPRESSLY CLOSED THE SUBSTITUTION DOOR. The guidance
 * states that it "has not determined that the laws of any other state require
 * commercial financing disclosures that meet or exceed Connecticut's ... such
 * that another state's approved form may be used to comply". So Virginia's form
 * — the closest relative, and similar enough to invite it — may not be sent to
 * a Connecticut recipient. The differences below are not stylistic:
 *
 *   - Connecticut's second row is "Finance CHARGES Deducted or Withheld";
 *     Virginia's is "FEES Deducted or Withheld".
 *   - Connecticut asks for the estimated TIME PERIOD for payments to equal the
 *     total repayment amount; Virginia asks for the estimated NUMBER of
 *     payments.
 *   - Connecticut's prepayment row demands the percentage of any unpaid finance
 *     charge AND the maximum dollar amount; Virginia asks only for a
 *     description of prepayment policies.
 *   - Connecticut's broker row is qualified "(Paid from Financed Amount)".
 *   - Page one closes with INITIALS and a date. Virginia's closes with a
 *     signature. Our form is correct on this — it carries {{INITIALS, r1}}.
 *
 * TWO OBLIGATIONS THAT ARE NOT ABOUT THE FORM, and that this package cannot
 * check because they live in the contract and the sending process rather than
 * the disclosure:
 *
 *   - §36a-868 bars a commercial financing contract entered into on or after
 *     1 July 2024 from waiving the recipient's right to notice, judicial
 *     hearing or prior court order on a prejudgment remedy. FRPA §7.24 already
 *     relies on this. It is NOT a confession-of-judgment ban — the Act contains
 *     none, and the two are routinely conflated.
 *   - §36a-869 bars revoking, withdrawing or modifying a specific offer until
 *     midnight of the third calendar day after its date — SUBJECT TO two
 *     express carve-outs in the same sentence (information obtained in
 *     underwriting; the recipient's own request), and §36a-869(b) lets the offer
 *     state that it is a preliminary review only. This is weaker than the flat
 *     irrevocability the package assumed while it held only the guidance.
 *
 * THE GAP IS CLOSED. Conn. Gen. Stat. §§36a-861 to 36a-872 are vendored at
 * `sources/CT-CGS-36a-861-872.txt` from the Connecticut General Assembly, and
 * every claim above is a verbatim quotation re-matched against them on every
 * run — see `statutes/ct-va-obligations.ts` and `__tests__/ct-va-statutes.test.ts`.
 * Two of the corrections it forced are recorded there: the Act is in chapter
 * 669 rather than 668, and §36a-869 is not what the guidance reads like.
 *
 * WHAT STILL RESTS ON THE GUIDANCE. Exactly one thing, and it is the load-
 * bearing one: that the Commissioner has made no §36a-867 determination
 * recognising another state's form. §36a-867 opens the reciprocity door only on
 * such a determination; whether one exists is a fact about the Department's
 * practice, and the Act cannot state it.
 */
export const CT_DISCLOSURE: PrescribedForm = {
  slug: 'ct-disclosure',
  citation: 'Conn. DOB Appendix A (rev. 8/1/2024)',
  sourceFile: 'CT-DOB-Guidance.txt',
  jurisdiction: 'US-CT',
  // Read out of the Act, not assumed: §36a-861(1) defines commercial financing
  // as "any extension of SALES-BASED FINANCING … not exceeding two hundred
  // fifty thousand dollars". The ceiling is a per-deal fact nothing here checks.
  transaction: 'sales-based-financing',
  status: 'published',
  source: {
    kind: 'regulator-prescribed-form',
    citation: 'Conn. DOB Appendix A (rev. 8/1/2024)',
    sourceFile: 'CT-DOB-Guidance.txt',
    verbatimVerifiedAt: '2026-09-06',
    structureVerifiedAt: '2026-09-06',
  },
  sourceDigest: '7a347bdb5046d948592edea0f968efccf80c1bcec7ef06894b08558c882d4f2b',
  // The file is Appendix A and nothing else, so there is no neighbouring form
  // for a label to be borrowed from.
  section: null,
  // The source is the FORM, printed in table order, so the row order is
  // genuinely re-checkable — unlike California's and New York's regulations,
  // which describe their rows in a prose order that is not the table's.
  structureEvidence: 'source-order',
  labelMatch: 'contains',
  rows: [
    { label: 'Total Amount of the Commercial Financing', verbatim: null, onlyPrescribedContent: false },
    { label: 'Finance Charges Deducted or Withheld at Disbursement', verbatim: null, onlyPrescribedContent: false },
    { label: 'Disbursement Amount', verbatim: null, onlyPrescribedContent: false },
    { label: 'Finance Charge', verbatim: null, onlyPrescribedContent: false },
    { label: 'Total Repayment Amount', verbatim: null, onlyPrescribedContent: false },
    {
      label: 'Estimated Time Period Required for the Periodic Payments to Equal the Total Repayment Amount',
      verbatim: null,
      onlyPrescribedContent: false,
    },
    { label: 'Payment Schedule', verbatim: null, onlyPrescribedContent: false },
    {
      label: 'Description of All Other Potential Fees and Charges NOT Included in the Finance Charge',
      verbatim: null,
      onlyPrescribedContent: false,
    },
    {
      label: 'Description of Collateral Requirements or Security Interests',
      verbatim: null,
      onlyPrescribedContent: false,
    },
    { label: 'Broker Compensation (Paid from Financed Amount)', verbatim: null, onlyPrescribedContent: false },
    {
      label: 'Finance Charges or Fees upon Prepayment or Refinance',
      verbatim: null,
      onlyPrescribedContent: false,
    },
  ],
};
