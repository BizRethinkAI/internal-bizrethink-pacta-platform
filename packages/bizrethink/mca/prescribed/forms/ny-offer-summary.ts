import type { PrescribedForm } from '../types';

/**
 * 23 NYCRR §600.6 — New York sales-based financing offer summary.
 *
 * Transcribed from the regulation, not from our form. Compare against
 * `ca-offer-summary.ts` only through the tests: the two are close enough to
 * invite reconciliation and different enough that reconciling them breaks one.
 *
 * THREE STRUCTURAL DIFFERENCES FROM CALIFORNIA, none of them cosmetic:
 *
 *  1. §600.6(a) prescribes TEN rows where §914(a)(1) prescribes nine. The extra
 *     one is "Collateral Requirements" (§600.6(l)), which California does not
 *     ask for at all.
 *  2. §600.6(b)(3)(v) puts the double-dipping question in the FIRST row, as a
 *     second paragraph. California's rules have no double-dipping disclosure in
 *     the offer summary.
 *  3. §600.6(k) closes the ninth row with "shall include only". Its California
 *     counterpart, §914(a)(11), says "shall include" and omits the "only" —
 *     adjacent paragraphs, adjacent rows, different rules.
 *
 * Both states then insert an "Estimated Monthly Cost" row below the fourth when
 * payments are not monthly (§600.6(m), §914(a)(12)). Lombard's are daily, so
 * this form is eleven rows.
 */
export const NY_OFFER_SUMMARY: PrescribedForm = {
  slug: 'ny-offer-summary',
  citation: '23 NYCRR §600.6',
  sourceFile: 'NY-23NYCRR-600.txt',
  jurisdiction: 'US-NY',
  status: 'published',
  source: {
    kind: 'regulator-prescribed-form',
    citation: '23 NYCRR §600.6',
    sourceFile: 'NY-23NYCRR-600.txt',
    verbatimVerifiedAt: '2026-09-06',
    structureVerifiedAt: '2026-09-06',
  },
  sourceDigest: '958bec0fdf305f2eba624b330ef2197abc28e0737514512de8bfc0b9251bf0f2',
  /*
    THIS SCOPE IS THE ONE THAT CATCHES THE DEFECT THAT SHIPPED.

    New York's own file contains CALIFORNIA's phrasing of the funding-provided
    sentence — "on what amounts will be deducted" — in a later section
    governing a different transaction type. Checked against the whole file, New
    York's form carrying California's words passes. Checked against §600.6, it
    does not. See `provenance-honesty.test.ts`, which pins exactly that.
  */
  section: {
    from: 'Section 600.6 Sales-based financing disclosure formatting and contents.',
    to: 'Section 600.7 Sales-based financing –estimated annual percentage rate.',
  },
  // As California: §600.6 describes the Estimated Monthly Cost row last, as an
  // insertion below the fourth, though the row is fifth.
  structureEvidence: 'prose-described',
  rows: [
    {
      label: 'Funding Provided',
      verbatim: 'This is how much funding [name of financer] will provide.',
      onlyPrescribedContent: true,
      alsoPermitted: [
        // §600.6(b)(3)(ii). NOTE the wording: "on the amounts that will be
        // deducted". California §914(a)(2)(C)(ii) says "on what amounts will be
        // deducted". Our California form carried THIS sentence until 2026-09-06.
        'Due to deductions or payments to others, the total funds that will be provided to you directly is [recipient funds]. For more information on the amounts that will be deducted, please review the attached document "Itemization of Amount Financed."',
        // §600.6(b)(3)(v), the double-dipping question, in a second paragraph.
        'Does the renewal financing include any amount that is used to pay unpaid finance charges or fees, also known as double dipping? [Yes, enter amount]. If the amount is zero, the answer would be No.',
      ],
      /*
        Ours, not New York's. §600.6(b)(3)(iii) requires "a short explanation
        that the amount paid directly to the recipient may change" and supplies
        no wording for it, so this sentence cannot be matched against the
        regulation and must not sit among sentences that can — it spent its
        first day in `alsoPermitted`, where the checker silently skipped it
        along with everything else in that field.

        CALIFORNIA §914(a)(2)(C)(iii) IMPOSES THE SAME OBLIGATION IN THE SAME
        WORDS AND OUR CALIFORNIA FORM CARRIES NO SUCH EXPLANATION. Both clauses
        are conditional — they bite only where the financing pays down other
        obligations the provider knows about — so this is either a New York row
        saying more than it needs to or a California row saying less than it
        must, and which one it is depends on the product rather than on the
        regulations. Raised for a human; not changed here.
      */
      providerDrafted: [
        {
          citation: '23 NYCRR §600.6(b)(3)(iii)',
          text: 'Part of this funding may pay down or pay off amounts you owe. The amount paid directly to you may change if the amount owed for those other obligations changes.',
        },
      ],
    },
    {
      label: 'Estimated Annual Percentage Rate (APR)',
      // "finance charges you pay" — California says "fees you pay". See
      // near-identical-states.test.ts.
      verbatim:
        'APR is the estimated cost of your financing expressed as a yearly rate. APR incorporates the amount and timing of the funding you receive, finance charges you pay, and the periodic payments you make. This calculation assumes your estimated average monthly income through [description of particular payment channel or mechanism] will be [average monthly income estimate determined in accordance with 23 NYCRR section 600.8 or 600.9]. Since your actual income may vary from our estimate, your effective APR may also vary.',
      onlyPrescribedContent: true,
      alsoPermitted: [
        'APR is not an interest rate. The cost of this financing is based upon fees charged by [financer] rather than interest that accrues over time.',
      ],
    },
    {
      label: 'Finance Charge',
      verbatim: 'This is the dollar cost of your financing.',
      onlyPrescribedContent: true,
      alsoPermitted: ['Your finance charge will not increase if you take longer to pay off what you owe.'],
    },
    {
      label: 'Estimated Total Payment Amount',
      verbatim: 'This is the total dollar amount of payments we estimate you will make under the contract.',
      onlyPrescribedContent: true,
    },
    /*
      §600.6(m), (f), (g), (h) and (l) all close their rows with "only", but
      prescribe a calculation or "a short explanation" rather than words — the
      language they quote is introduced by "e.g." So there is no verbatim to
      pin, and `verbatim: null` makes the checker skip the row entirely.

      That is a coverage hole, not a clean bill of health. `coverage()` reports
      it as a number so it cannot be mistaken for one.
    */
    { label: 'Estimated Monthly Cost', verbatim: null, onlyPrescribedContent: true },
    { label: 'Estimated Payment', verbatim: null, onlyPrescribedContent: true },
    { label: 'Payment Terms', verbatim: null, onlyPrescribedContent: true },
    { label: 'Estimated Term', verbatim: null, onlyPrescribedContent: true },
    {
      label: 'Prepayment',
      // §600.6(j)(1) — the branch that applies to us: our finance charge is a
      // fixed discount, not interest, so prepayment does not relieve it.
      verbatim:
        'If you pay off the financing faster than required, you still must pay all or a portion of the finance charge, up to $[maximum non-interest finance charge] based upon our estimates.',
      onlyPrescribedContent: true,
    },
    {
      label: 'Prepayment',
      verbatim: 'If you pay off the financing faster than required, you will not be required to pay additional fees.',
      // §600.6(k) says "only". California's §914(a)(11) does NOT. This single
      // boolean is the difference, and it is why the two forms cannot share a
      // spec.
      onlyPrescribedContent: true,
    },
    /*
      §600.6(l)(2): "shall include only a description of the collateral
      requirements or security interests of the transaction, if any."

      No verbatim — the regulation asks for a description. Left for counsel:
      our row also describes the personal guaranty under FRPA §9.2. A guaranty
      is not a security interest in property; whether it is a "collateral
      requirement" is a judgement call, and the alternative — omitting a
      material credit requirement from the row that exists to disclose credit
      requirements — reads worse.
    */
    { label: 'Collateral Requirements', verbatim: null, onlyPrescribedContent: true },
  ],
};
