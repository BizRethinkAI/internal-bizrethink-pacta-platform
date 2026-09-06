import type { ContentStatute } from '../types';

/**
 * Texas — Tex. Fin. Code §398.051, added by HB 700 (89th Leg., 2025).
 *
 * The longest of the content statutes: eleven items in (a), plus three renewal
 * figures in (b) that only apply where the provider requires an existing
 * financing to be paid off. Texas prescribes no labels and no words.
 *
 * §398.052 makes Texas the only one of the nine that requires the recipient's
 * SIGNATURE on the disclosures, before the application is finalised. That is
 * worth remembering when weighing how clearly an item is presented: a document
 * someone signs is one they are taken to have read.
 *
 * KNOWN WEAKNESS — §398.051(a)(5), the estimated period.
 * The item is disclosed, but only as an unlabelled "N days" appended to the
 * Estimated Periodic Payment figure ("$X  15% x 180 days"). Nothing on the form
 * calls it the estimated period, and the row's own explanation does not give it.
 * The Estimated Average Monthly Income row then refers to "the estimated
 * periodic payment and term above" — pointing at a term the form never labels.
 * California and New York each give this its own row.
 *
 * Recorded rather than quietly fixed: correcting wording to match a statute is
 * unambiguous, but adding a row is a change to a document that has already been
 * through review, and the item is present. Flagged for a decision.
 */
export const TX_DISCLOSURE: ContentStatute = {
  slug: 'tx-disclosure',
  citation: 'Tex. Fin. Code §398.051',
  sourceFile: 'TX-Fin-Code-Ch-398.txt',
  requirements: [
    {
      citation: 'Tex. Fin. Code §398.051(a)(1)',
      requires: 'The total amount of the financing.',
      row: 'Total Funds Provided',
      evidence: ['gross amount'],
    },
    {
      citation: 'Tex. Fin. Code §398.051(a)(2)',
      requires: 'The disbursement amount.',
      row: 'Total Funds Disbursed',
      evidence: ['after deductions'],
    },
    {
      citation: 'Tex. Fin. Code §398.051(a)(3)',
      requires: 'The finance charge.',
      row: 'Total Dollar Cost',
      evidence: ['Total Amount to Repay', 'Total Funds Provided'],
    },
    {
      citation: 'Tex. Fin. Code §398.051(a)(4)',
      requires: 'The total repayment amount.',
      row: 'Total Amount to Repay',
      evidence: ['remit to Provider'],
    },
    {
      citation: 'Tex. Fin. Code §398.051(a)(5)',
      requires: 'The estimated period for the periodic payments to equal the total repayment amount.',
      row: 'Estimated Periodic Payment',
      // Carried in the value cell as "... x N days" and nowhere else. See the
      // KNOWN WEAKNESS note above; pinning "days" is what holds it in place
      // until that is decided.
      evidence: ['days'],
    },
    {
      citation: 'Tex. Fin. Code §398.051(a)(6)(B)(i)',
      requires:
        'Where payment amounts are variable: a payment schedule, or a description of the method used to calculate the amounts and frequency of payments.',
      row: 'Estimated Periodic Payment',
      evidence: ['Each Workday', 'Specified Percentage'],
    },
    {
      citation: 'Tex. Fin. Code §398.051(a)(6)(B)(ii)',
      requires: 'Where payment amounts are variable: the amount of the average projected payments per month.',
      // Its own row, because Texas asks for it as a separate figure from the
      // periodic payment. None of the other eight states require it.
      row: 'Average Projected Monthly Payment',
      evidence: ['average of the estimated monthly amounts'],
    },
    {
      citation: 'Tex. Fin. Code §398.051(a)(7)',
      requires:
        'A description of all other potential fees and charges not included in the finance charge, including draw fees, late payment fees, and returned payment fees.',
      row: 'Other Potential Fees and Charges',
      evidence: ['fee'],
    },
    {
      citation: 'Tex. Fin. Code §398.051(a)(8)',
      requires:
        'Any finance charge payable if the recipient pays off or refinances before the transaction is scheduled to be repaid in full.',
      row: 'Prepayment',
      evidence: ['FRPA §8.3'],
    },
    {
      citation: 'Tex. Fin. Code §398.051(a)(9)',
      requires: 'Any ADDITIONAL fees, not included in the finance charge, payable on early pay-off or refinancing.',
      // A separate limb from (a)(8): one is about the finance charge, the other
      // about fees outside it, and a form answering only the first has answered
      // half the question.
      row: 'Prepayment',
      evidence: ['not be charged any additional fees'],
    },
    {
      citation: 'Tex. Fin. Code §398.051(a)(10)',
      requires: 'A description of collateral requirements or security interests, if applicable.',
      row: 'Collateral Requirements or Security Interests',
      evidence: ['security interest'],
    },
    {
      citation: 'Tex. Fin. Code §398.051(a)(11)',
      requires: 'A statement of whether the provider will pay compensation directly to a broker, and if so the amount.',
      row: 'Broker Compensation',
      evidence: ['broker'],
    },
    {
      citation: 'Tex. Fin. Code §398.051(b)(1)(A)',
      requires:
        'On a required pay-off of an existing financing: the amount of the new financing used to pay prepayment charges required to be paid.',
      row: 'Prepayment Charges Required to Be Paid',
      evidence: [],
    },
    {
      citation: 'Tex. Fin. Code §398.051(b)(1)(B)',
      requires:
        'On a required pay-off: the amount used to pay unpaid interest expense or finance charges not forgiven at renewal.',
      row: 'Unpaid Interest or Finance Charges Not Forgiven at Renewal',
      evidence: [],
    },
    {
      citation: 'Tex. Fin. Code §398.051(b)(2)',
      requires:
        'Where the disbursement amount is reduced to pay down an unpaid balance: the actual dollar amount of the reduction.',
      row: 'Reduction in Disbursement Amount',
      evidence: ['§398.051(b)(2)'],
    },
  ],
};
