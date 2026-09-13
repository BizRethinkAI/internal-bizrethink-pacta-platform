import type { PrescribedForm } from '../types';

/**
 * Virginia — Sales-Based Financing Disclosure Form.
 *
 * A DIFFERENT KIND OF PRESCRIPTION from California and New York, and the reason
 * `PrescribedRow.verbatim` is nullable rather than required.
 *
 * CA and NY prescribe sentences: exact words, in closed rows, which the checker
 * pins character by character. Virginia prescribes a *form* — a fixed set of
 * labelled fields in a fixed order, with the provider's own text in the answers.
 * The fixed labels include bracketed formulas and a payment-range instruction.
 * They can be checked literally; the recipient-specific answers remain outside
 * that text check. The complete official PDF is retained for layout inspection.
 *
 * That is a weaker check, and it is the check the regulation actually supports.
 * Writing a `verbatim` for these rows would be inventing an obligation Virginia
 * does not impose, which is the same error as ignoring one.
 *
 * THE GAP IS CLOSED. Va. Code Ann. §§6.2-2228 to 6.2-2238 are vendored at
 * `sources/VA-Code-6.2-2228-2238.txt` from the Virginia Law Portal, and the
 * prohibitions, registration duties, broker rule and penalties are now verbatim
 * quotations re-matched on every run — see `statutes/ct-va-obligations.ts`.
 * §6.2-2231's nine numbered items each have a row on the form and a test says
 * which. Note the citation range: the chapter STOPS at §6.2-2238, and
 * §6.2-2239/§6.2-2240 belong to an unrelated chapter on virtual currency kiosk
 * operators.
 *
 * The implementing definition in 10VAC5-240-10 includes Regulation Z finance
 * charges; the Code alone was not the complete authority. The current rules
 * are retained in `sources/VA-10VAC5-240.txt`. Section 240-30 governs completion,
 * page-two use, unmodified format, signatures and updated disclosures at early
 * payoff/refinance. A row-text check does not enforce those workflow duties.
 */
export const VA_DISCLOSURE: PrescribedForm = {
  slug: 'va-disclosure',
  citation: 'Virginia SCC Sales-Based Financing Disclosure Form (Eff. 10/2022); 10VAC5-240-30',
  sourceFile: 'VA-Disclosure-Form.txt',
  jurisdiction: 'US-VA',
  // Read out of the Code: chapter 22.1 is "Sales-Based Financing Providers" and
  // §6.2-2228 defines the term. Note that it is keyed to the RECIPIENT's
  // principal place of business, not the provider's.
  transaction: 'sales-based-financing',
  status: 'published',
  source: {
    kind: 'regulator-prescribed-form',
    citation: 'Virginia SCC Sales-Based Financing Disclosure Form (Eff. 10/2022); 10VAC5-240-30',
    sourceFile: 'VA-Disclosure-Form.txt',
    verbatimVerifiedAt: '2026-09-12',
    structureVerifiedAt: '2026-09-12',
  },
  // Replaced the mismatched local form with the independently captured official
  // October 2022 form; both PDF pages and extractions were re-read 2026-09-12.
  // This is a different document, not a header-only digest refresh. The old
  // rendered specimen remains unchanged and must fail its four label checks.
  sourceDigest: '2994065ce53189a1726e34dfeee0ed943d61db3684a87073ad989a75775227ea',
  // The file is the form itself.
  section: null,
  structureEvidence: 'source-order',
  // The official label cells are fixed text, including the formulas/instruction.
  labelMatch: 'exact',
  rows: [
    { label: 'Total Amount of the Sales-Based Financing', verbatim: null, onlyPrescribedContent: false },
    { label: 'Fees Deducted or Withheld at Disbursement', verbatim: null, onlyPrescribedContent: false },
    {
      label: 'Disbursement Amount',
      labelSuffix: '[Total Amount of the Sales-Based Financing minus (-) Fees Deducted or Withheld at Disbursement]',
      verbatim: null,
      onlyPrescribedContent: false,
    },
    { label: 'Finance Charge', verbatim: null, onlyPrescribedContent: false },
    {
      label: 'Total Repayment Amount',
      labelSuffix: '[Disbursement Amount plus (+) Finance Charge]',
      verbatim: null,
      onlyPrescribedContent: false,
    },
    {
      label: 'Estimated Number of Payments',
      labelSuffix:
        '[Number of payments expected, based on the projected sales volume, to equal the Total Repayment Amount] A reasonable range may be provided ONLY for transactions with a variable payment schedule.',
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
    { label: 'Broker Compensation', verbatim: null, onlyPrescribedContent: false },
    { label: 'Description of Prepayment Policies', verbatim: null, onlyPrescribedContent: false },
  ],
};

/**
 * The header block, which Virginia lays out as its own grid rather than as rows
 * of the disclosure table. Checked separately for that reason — folding it into
 * `rows` would assert an ordering the form does not prescribe.
 */
export const VA_HEADER_LABELS = [
  'Disclosure Date',
  "Recipient's Name",
  "Recipient's Address",
  "Provider's Name",
  "Provider's Address",
  "Provider's Phone Number",
  "Provider's E-mail Address",
];
