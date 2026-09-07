import type { PrescribedForm } from '../types';

/**
 * California's lease financing disclosure, 10 CCR §915.
 *
 * A DIFFERENT INSTRUMENT FROM §914, not a variant of it, and the temptation to
 * treat the two as one table with different strings is exactly what
 * `near-identical-states.test.ts` exists to refuse. The differences are
 * substantive:
 *
 *   - EIGHT rows, not nine (§915(a)(1)). No Estimated Payment row, no Payment
 *     Terms row, no Estimated Term — the lease table has a bare "Term".
 *   - "Annual Percentage Rate (APR)", not "Estimated Annual Percentage Rate
 *     (APR)"; "Total Payment Amount", not "Estimated Total Payment Amount";
 *     "Payment", not "Estimated Payment". A lease has fixed payments, so
 *     nothing about it is estimated, and every label drops the word.
 *   - The APR paragraph incorporates "the anticipated cost for you to acquire
 *     the property at the end of the lease term", which has no counterpart in
 *     §914 at all.
 *   - There is NO funding-provided deductions sentence and no double-dipping
 *     paragraph. §915(a)(2)(C) is one sentence and the row is closed.
 *   - The Term row "shall include no information in the third column"
 *     (§915(a)(7)) — a rule §914 has nowhere, and the only content rule in this
 *     table a machine can decide.
 *
 * EIGHT ROWS AND NOT NINE, DELIBERATELY. §915(a)(11) inserts an "Average
 * Monthly Cost" row below the fourth "if the contract provides for periodic
 * payments that are not monthly". The equipment lease is monthly, so the row is
 * not required and the table is eight. This is the mirror of §914(a)(12), where
 * Lombard's daily payments make the equivalent row REQUIRED and the sales-based
 * table ten. Same rule, opposite outcome, because the products differ.
 *
 * WHAT THIS SPEC DOES NOT SAY. It says what §915 prescribes for a lease
 * financing disclosure. It says nothing about whether the Subscription is lease
 * financing — REVIEW-01
 * `lease-disclosure-assumes-a-purchase-option-the-subscription-does-not-grant`
 * is an OPEN blocker for the owner on exactly that question, and both templates
 * are being held unsent. A conforming form for the wrong transaction is still
 * the wrong form, and nothing in this package can tell you which transaction
 * you have.
 */
export const CA_LEASE_FINANCING: PrescribedForm = {
  slug: 'ca-lease-financing',
  citation: '10 CCR §915',
  sourceFile: 'CA-10CCR-900-956.txt',
  jurisdiction: 'US-CA',
  transaction: 'lease-financing',
  status: 'published',
  source: {
    kind: 'regulator-prescribed-form',
    citation: '10 CCR §915',
    sourceFile: 'CA-10CCR-900-956.txt',
    verbatimVerifiedAt: '2026-09-07',
    structureVerifiedAt: '2026-09-07',
  },
  sourceDigest: '302f878f33afa3a72f7c7b0bff6fe66afbd921658aa7a5abf4a7e01942d4199c',
  /*
    §915 is one of at least six prescribed tables in this file. Scoping matters
    more here than anywhere else in the library: §914 sits IMMEDIATELY BEFORE
    §915 and §916 immediately after, both of them sales-based-adjacent tables
    with overlapping labels — "Funding Provided", "Finance Charge", "Payment",
    "Prepayment" all appear in all three. Unscoped, a §914 label passes as a
    §915 row without complaint.
  */
  section: {
    from: '§ 915. Lease Financing Disclosure Formatting and Contents.',
    to: '§ 916 General Asset-Based Lending Transaction Disclosure Formatting and Contents.',
  },
  /*
    As §914, and for the same reason: §915(a)(11) introduces the Average Monthly
    Cost row LAST, as an instruction to "insert one additional row below the
    fourth row". Its prose order is not the table's order the moment the
    payments stop being monthly, so a source-order check would report a defect
    in a correct table. The reading is kept identical to its sibling
    deliberately — see the counsel backlog in docs-mca-counsel-sequencing.md,
    where the prose-described reading for CA and NY is already an open question.
  */
  structureEvidence: 'prose-described',
  rows: [
    // §915(a)(2). One sentence, and the row is closed. Note the full stop:
    // §600.14(b)(3)(i) ends the same sentence with a COLON.
    {
      label: 'Funding Provided',
      verbatim: 'This is how much funding [name of financer] will provide.',
      onlyPrescribedContent: true,
    },
    /*
      §915(a)(3)(C). "fees you pay", where New York's §600.14(c)(3) says
      "finance charges you pay, AND the periodic payments you make". Two
      differences in one sentence, and our New York form has the second of them
      and not the first — see `lease-conformity.test.ts`.
    */
    {
      label: 'Annual Percentage Rate (APR)',
      verbatim:
        'APR is the cost of your financing expressed as a yearly rate. APR incorporates the amount and timing of the funding you receive, fees you pay, the periodic payments you make, and the anticipated cost for you to acquire the property at the end of the lease term. Your APR is not an interest rate.',
      onlyPrescribedContent: true,
    },
    /*
      §915(a)(4)(C): "the provider's calculation of the finance charge, with the
      amount and description of each expense included in the finance charge".
      Described, not worded, so there is nothing to pin — and note that this is
      a COMPLETENESS obligation the checker cannot discharge: our row describes
      the calculation in prose and states no per-expense amount. Whether that
      satisfies "the amount … of each expense" is a human question, raised in
      the PR and not decided here.
    */
    { label: 'Finance Charge', verbatim: null, onlyPrescribedContent: true },
    {
      label: 'Total Payment Amount',
      verbatim:
        'This is the total dollar amount of payments you will make during the term of the contract (including the cost of the purchase option).',
      onlyPrescribedContent: true,
    },
    // §915(a)(6)(B)(ii) — "a short explanation of the payment and purchase
    // option", introduced by "For example", so the language is illustrative and
    // there is no verbatim to pin.
    { label: 'Payment', verbatim: null, onlyPrescribedContent: true },
    // §915(a)(7): "shall include no information in the third column".
    { label: 'Term', verbatim: null, onlyPrescribedContent: true, thirdColumnEmpty: true },
    /*
      §915(a)(8) combines the FIRST COLUMN of the seventh and eighth rows into
      one cell reading "Prepayment". Both rows therefore carry that label, and
      the shipped documents do not merge the cells — see the PR.

      §915(a)(9)(A) is the branch that applies where prepayment still costs
      finance charge.
    */
    {
      label: 'Prepayment',
      verbatim:
        'If you pay off the financing before the end of the term, you will be required to pay all or a portion of the finance charge other than accrued and unpaid interest, up to $[maximum non-interest finance charge].',
      onlyPrescribedContent: true,
    },
    // §915(a)(10)(B), the "in all other cases" branch. New York's counterpart
    // §600.14(j)(2) inserts "then" after the comma; California does not.
    {
      label: 'Prepayment',
      verbatim:
        'If you pay off the financing before the end of the term, you will not be required to pay additional fees or charges.',
      onlyPrescribedContent: true,
    },
  ],
};
