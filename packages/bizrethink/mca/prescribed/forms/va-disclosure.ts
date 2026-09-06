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
 * There is almost nothing to quote. What can be checked is that every prescribed
 * label is present, spelled as the Commonwealth spells it, and in order.
 *
 * That is a weaker check, and it is the check the regulation actually supports.
 * Writing a `verbatim` for these rows would be inventing an obligation Virginia
 * does not impose, which is the same error as ignoring one.
 *
 * KNOWN GAP: we hold the form, not the Code. Prohibitions, registration duties,
 * broker rules and penalties around the form are unverified — see
 * MCA-CLAUSE-LIBRARY-PHASE0.md §3.
 */
export const VA_DISCLOSURE: PrescribedForm = {
  slug: 'va-disclosure',
  citation: 'Va. sales-based financing disclosure form',
  sourceFile: 'VA-Disclosure-Form.txt',
  // Virginia's first column carries the label plus tick-boxes and, under
  // several labels, the printed formula. See `labelMatch` in types.ts.
  labelMatch: 'contains',
  rows: [
    { label: 'Total Amount Financed', verbatim: null, onlyPrescribedContent: false },
    { label: 'Fees Deducted or Withheld at Disbursement', verbatim: null, onlyPrescribedContent: false },
    { label: 'Disbursement Amount', verbatim: null, onlyPrescribedContent: false },
    { label: 'Finance Charge', verbatim: null, onlyPrescribedContent: false },
    { label: 'Total Repayment Amount', verbatim: null, onlyPrescribedContent: false },
    { label: 'Estimated Number of Payments', verbatim: null, onlyPrescribedContent: false },
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
