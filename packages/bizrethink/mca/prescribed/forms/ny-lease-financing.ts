import type { PrescribedForm } from '../types';

/**
 * New York's lease financing disclosure, 23 NYCRR §600.14.
 *
 * TEN rows to California's eight (§600.14(a)). The two extra are the same two
 * New York adds to the sales-based table: "Collateral Requirements"
 * (§600.14(k)) and "Avoidable Fees and Charges" (§600.14(l)), neither of which
 * California asks for in any of its six tables.
 *
 * FOUR WORDING DIVERGENCES FROM §915, none cosmetic, and each one is the kind
 * that produced the defect in templates 104/105:
 *
 *   1. §600.14(b)(3)(i) ends the funding sentence with a COLON. §915(a)(2)(C)
 *      ends it with a full stop.
 *   2. §600.14(c)(3) says "finance charges you pay, AND the periodic payments
 *      you make". §915(a)(3)(C) says "fees you pay, the periodic payments you
 *      make" — a different noun AND one fewer conjunction.
 *   3. §600.14(j) inserts "then" after the comma in both prepayment branches
 *      ("…before the end of the term, THEN you will not be required…").
 *      §915(a)(10) does not.
 *   4. §600.14(b)(3)(ii) carries the double-dipping paragraph. §915 has no
 *      double-dipping disclosure anywhere.
 *
 * Our shipped New York form has (1) and (3) right and (2) WRONG: it carries
 * New York's noun inside California's sentence structure. See
 * `lease-conformity.test.ts`, which pins it rather than describing it.
 *
 * TEN ROWS AND NOT ELEVEN. §600.14(m) inserts an "Average Monthly Cost" row
 * below the fourth when payments are not monthly. The equipment lease is
 * monthly, so it does not apply — the opposite outcome to §600.6(m), where
 * Lombard's daily sales-based payments make the row required.
 *
 * The open characterisation question is the same as California's; see
 * `ca-lease-financing.ts`.
 */
export const NY_LEASE_FINANCING: PrescribedForm = {
  slug: 'ny-lease-financing',
  citation: '23 NYCRR §600.14',
  sourceFile: 'NY-23NYCRR-600.txt',
  jurisdiction: 'US-NY',
  transaction: 'lease-financing',
  status: 'published',
  source: {
    kind: 'regulator-prescribed-form',
    citation: '23 NYCRR §600.14',
    sourceFile: 'NY-23NYCRR-600.txt',
    verbatimVerifiedAt: '2026-09-07',
    structureVerifiedAt: '2026-09-07',
  },
  sourceDigest: 'f255a3f65ef0a79fc3583844a314a4ff9ffa97c8cc42839e641cd7d93b9df07a',
  /*
    Scoped for the reason `source-text.ts` gives at length: this file holds ten
    other prescribed tables, several of which share these labels. §600.10
    (closed-end) and §600.16 (all other transactions) both carry a "Funding
    Provided" row and a "Prepayment" row, and §600.15 sits immediately after
    this section.
  */
  section: {
    from: 'Section 600.14 Lease financing transaction disclosure formatting and contents.',
    to: 'Section 600.15 General asset‐based lending transaction disclosure formatting and contents.',
  },
  // §600.14(m) describes the Average Monthly Cost insertion last, as §600.6(m)
  // does. Same reading as its sibling, and the same open counsel question.
  structureEvidence: 'prose-described',
  rows: [
    {
      label: 'Funding Provided',
      // §600.14(b)(3)(i). The trailing colon is New York's; California's
      // §915(a)(2)(C) ends the identical sentence with a full stop.
      verbatim: 'This is how much funding [name of financer] will provide:',
      onlyPrescribedContent: true,
      // §600.14(b)(3)(ii), conditional on the financing satisfying obligations
      // under another financing with the provider. California has no
      // counterpart in §915.
      alsoPermitted: [
        'Does the renewal financing include any amount that is used to pay unpaid finance charges or fees, also known as double dipping? {Yes, enter amount}. If the amount is zero, the answer would be No.',
      ],
    },
    {
      label: 'Annual Percentage Rate (APR)',
      // §600.14(c)(3). "finance charges you pay, AND the periodic payments" —
      // both differences from §915(a)(3)(C) are in this one sentence.
      verbatim:
        'APR is the cost of your financing expressed as a yearly rate. APR incorporates the amount and timing of the funding you receive, finance charges you pay, and the periodic payments you make, and the anticipated cost for you to acquire the property at the end of the lease term. Your APR is not an interest rate.',
      onlyPrescribedContent: true,
    },
    // §600.14(d)(3) — the provider's calculation, described rather than worded.
    { label: 'Finance Charge', verbatim: null, onlyPrescribedContent: true },
    {
      label: 'Total Payment Amount',
      // §600.14(e)(3). Identical to §915(a)(5)(C), which is worth stating
      // explicitly: not every sentence in these two tables diverges, and
      // asserting a divergence that does not exist is its own defect.
      verbatim:
        'This is the total dollar amount of payments you will make during the term of the contract (including the cost of the purchase option).',
      onlyPrescribedContent: true,
    },
    // §600.14(f)(2)(ii) — "a short explanation", introduced by "For example".
    { label: 'Payment', verbatim: null, onlyPrescribedContent: true },
    // §600.14(g): "shall include no information in the third column".
    { label: 'Term', verbatim: null, onlyPrescribedContent: true, thirdColumnEmpty: true },
    // §600.14(h) combines the first column of the seventh and eighth rows into
    // one cell reading "Prepayment"; §600.14(i)(1) is the branch that applies.
    {
      label: 'Prepayment',
      verbatim:
        'If you pay off the financing before the end of the term, you will be required to pay all or a portion of the finance charge other than accrued and unpaid interest, up to $[maximum non-interest finance charge].',
      onlyPrescribedContent: true,
    },
    {
      label: 'Prepayment',
      // §600.14(j)(2). "term, THEN you will not be required" — California's
      // §915(a)(10)(B) omits the "then".
      verbatim:
        'If you pay off the financing before the end of the term, then you will not be required to pay additional fees or charges.',
      onlyPrescribedContent: true,
    },
    /*
      §600.14(k)(2): "shall include only a description of the collateral
      requirements or security interests of the transaction, if any."

      Described, not worded. The same counsel question the sales-based
      Collateral Requirements row carries applies here and is if anything
      sharper: our row describes both the retained title and a personal
      guaranty, and a guaranty is not a security interest in property.
    */
    { label: 'Collateral Requirements', verbatim: null, onlyPrescribedContent: true },
    /*
      §600.14(l)(2): "a description of all potential fees and charges that can
      be avoided by the recipient, if any, including, but not limited to, late
      payment fees and returned payment fees." Described, not worded — and
      "including, but not limited to" makes completeness a judgement this
      checker cannot make.
    */
    { label: 'Avoidable Fees and Charges', verbatim: null, onlyPrescribedContent: true },
  ],
};
