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
 * THE GAP IS CLOSED. Va. Code Ann. §§6.2-2228 to 6.2-2238 are vendored at
 * `sources/VA-Code-6.2-2228-2238.txt` from the Virginia Law Portal, and the
 * prohibitions, registration duties, broker rule and penalties are now verbatim
 * quotations re-matched on every run — see `statutes/ct-va-obligations.ts`.
 * §6.2-2231's nine numbered items each have a row on the form and a test says
 * which. Note the citation range: the chapter STOPS at §6.2-2238, and
 * §6.2-2239/§6.2-2240 belong to an unrelated chapter on virtual currency kiosk
 * operators.
 *
 * TWO THINGS THE CODE STILL DOES NOT GIVE US. It never defines "finance
 * charge", where Conn. Gen. Stat. §36a-861(3) does by reference to 12 CFR
 * 1026.4 — so the figure in that row rests on a reading nobody has written
 * down. And §6.2-2231(7)(a) requires items 1-6 to be RE-disclosed as of the day
 * of any prepayment or refinance, which is an event-triggered obligation no
 * blank form can carry.
 */
export const VA_DISCLOSURE: PrescribedForm = {
  slug: 'va-disclosure',
  citation: 'Va. sales-based financing disclosure form',
  sourceFile: 'VA-Disclosure-Form.txt',
  jurisdiction: 'US-VA',
  // Read out of the Code: chapter 22.1 is "Sales-Based Financing Providers" and
  // §6.2-2228 defines the term. Note that it is keyed to the RECIPIENT's
  // principal place of business, not the provider's.
  transaction: 'sales-based-financing',
  status: 'published',
  source: {
    kind: 'regulator-prescribed-form',
    citation: 'Va. sales-based financing disclosure form',
    sourceFile: 'VA-Disclosure-Form.txt',
    verbatimVerifiedAt: '2026-09-06',
    structureVerifiedAt: '2026-09-06',
  },
  // Digest re-computed 2026-09-07 after a vendoring header was added to the
  // source file recording where it came from. The STATUTORY TEXT is byte-identical;
  // only the header above it changed, so `verbatimVerifiedAt` stands rather than
  // being re-stamped. Saying that out loud because "the digest broke, I updated
  // it" is exactly the move this mechanism exists to make someone justify.
  sourceDigest: 'f8efa84abd2db5bbe82e50bae3695e29d2db608c359df09adb264b48a35e3a93',
  // The file is the form itself.
  section: null,
  structureEvidence: 'source-order',
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
