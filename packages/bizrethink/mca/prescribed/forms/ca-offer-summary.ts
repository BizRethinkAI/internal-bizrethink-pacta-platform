import type { PrescribedForm } from '../types';

/**
 * California's sales-based financing offer summary, 10 CCR §914.
 *
 * Transcribed from the regulation, not from our own form — the direction
 * matters. A spec derived from a document we already ship inherits that
 * document's defects and promotes them to authority; `checkAgainstSource`
 * proves this went the other way.
 *
 * NINE rows, plus a tenth. §914(a)(12) inserts "Estimated Monthly Cost" below
 * the fourth row when payments are not monthly. Ours are daily, so the row is
 * required and the table is ten rows, not nine.
 *
 * NOTE THE ASYMMETRY IN THE TWO PREPAYMENT ROWS. §914(a)(10) closes the eighth
 * row with "shall include only"; §914(a)(11) opens the ninth with "shall
 * include" and no "only". That single word is the difference between an extra
 * sentence being a defect and being permitted, and it is not a drafting
 * accident to be smoothed over.
 */
export const CA_OFFER_SUMMARY: PrescribedForm = {
  slug: 'ca-offer-summary',
  citation: '10 CCR §914',
  sourceFile: 'CA-10CCR-900-956.txt',
  rows: [
    {
      label: 'Funding Provided',
      verbatim: 'This is how much funding [name of financer] will provide.',
      onlyPrescribedContent: true,
      // §914(a)(2)(C)(ii)-(iv). Required OF US, not optional: our amount
      // financed exceeds recipient funds because the origination fee is
      // withheld, which is the same condition that makes the Itemization of
      // Amount Financed a separate required document under §956.
      alsoPermitted: [
        'Due to deductions or payments to others, the total funds that will be provided to you directly is [recipient funds]. For more information on what amounts will be deducted, please review the attached document "Itemization of Amount Financed."',
      ],
    },
    {
      label: 'Estimated Annual Percentage Rate (APR)',
      verbatim:
        'APR is the estimated cost of your financing expressed as a yearly rate. APR incorporates the amount and timing of the funding you receive, fees you pay, and the periodic payments you make. This calculation assumes your estimated average monthly income through [description of particular payment channel or mechanism] will be [average monthly income estimate determined in accordance with sections 930 or 931]. Since your actual income may vary from our estimate, your effective APR may also vary.',
      onlyPrescribedContent: true,
      // §914(a)(3)(D). Also required of us rather than optional — none of
      // Lombard's finance charge is interest, it is a fixed discount on
      // receivables purchased, so the "APR is not an interest rate" paragraph
      // is compelled. NY has no counterpart; see near-identical-states.test.ts.
      alsoPermitted: [
        'APR is not an interest rate. The cost of this financing is based upon fees charged by [financer] rather than interest that accrues over time.',
      ],
    },
    {
      label: 'Finance Charge',
      verbatim: 'This is the dollar cost of your financing.',
      onlyPrescribedContent: true,
      // §914(a)(4)(C)(ii) — the one genuinely OPTIONAL sentence in the form.
      // "the provider may include".
      alsoPermitted: ['Your finance charge will not increase if you take longer to pay off what you owe.'],
    },
    {
      label: 'Estimated Total Payment Amount',
      verbatim: 'This is the total dollar amount of payments we estimate you will make under the contract.',
      onlyPrescribedContent: true,
    },
    // §914(a)(12) — inserted below the fourth row; third column is described,
    // not dictated, so there is no verbatim string to pin
    { label: 'Estimated Monthly Cost', verbatim: null, onlyPrescribedContent: true },
    { label: 'Estimated Payment', verbatim: null, onlyPrescribedContent: true },
    { label: 'Payment Terms', verbatim: null, onlyPrescribedContent: true },
    { label: 'Estimated Term', verbatim: null, onlyPrescribedContent: true },
    {
      // §914(a)(10)(A) — the branch that applies where prepayment still costs
      // finance charge, which is our case
      label: 'Prepayment',
      verbatim:
        'If you pay off the financing faster than required, you still must pay all or a portion of the finance charge, up to $[maximum non-interest finance charge] based upon our estimates.',
      onlyPrescribedContent: true,
    },
    {
      // §914(a)(11)(B) — note: "shall include", NOT "shall include only"
      label: 'Prepayment',
      verbatim: 'If you pay off the financing faster than required, you will not be required to pay additional fees.',
      onlyPrescribedContent: false,
    },
  ],
};
