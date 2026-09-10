import type { McaClause } from '../types';

/**
 * Section 6 — events of default and remedies.
 *
 * Bodies are the words the shipped document prints.
 * `__tests__/frpa-coverage.test.ts` additionally asserts that NOTHING in the
 * document is missing from the library — the direction that fails silently.
 */
export const FRPA_DEFAULT: McaClause[] = [
  {
    slug: 'frpa.events-of-default-6-1',
    version: 1,
    instrument: 'frpa',
    kind: 'clause',
    number: '6.1',
    section: 'default',
    sortKey: 10,
    heading: 'Events of Default',
    body: 'Each of the following constitutes an Event of Default hereunder:\n6.1.1 Merchant shall violate any term or covenant in this Agreement;\n6.1.2 Any representation or warranty by Merchant in this Agreement is proven to have been incorrect, false, or misleading in any material respect when made;\n6.1.3 The sending of notice of termination by Guarantor(s);\n6.1.4 Merchant shall transfer or sell all or substantially all of its assets other than in a transaction permitted by Section 5.18;\n6.1.5 Merchant shall make or send notice of any intended bulk sale or transfer, other than a notice given to Buyer under Section 6.4 or a bulk-sale notice required by law in respect of a transfer to which Buyer has consented under Section 5.18;\n6.1.6 Merchant shall use any depository account other than the Approved Bank Account for the credit or deposit of the Receipts without the prior written consent of Buyer;\n6.1.7 Merchant shall change the Approved Bank Account without the prior written consent of Buyer;\n6.1.8 Merchant takes any action or fails to take any action, or offers any incentive — economic or otherwise — the result of which will be to induce any customer or customers to pay for Merchant’s services with any means other than by Receipts which are deposited in the Approved Bank Account;\n6.1.9 Merchant shall perform any act that reduces the value of any Collateral granted under this Agreement;\n6.1.10 Merchant shall default under any of the terms, covenants, and conditions of any other agreement with Buyer;\n6.1.11 [Reserved];\n6.1.12 [Reserved];\n6.1.13 Merchant takes on additional financing (known as “Stacking”) at any time after the Effective Date and prior to payoff of the Purchased Amount;\n6.1.14 Merchant notifies Buyer that it is unilaterally terminating the Agreement or notifies Buyer of Merchant’s intent to breach the Agreement;\n6.1.15 Merchant transports, moves, interrupts, suspends, dissolves, or terminates its business without the prior written consent of Buyer, other than (i) a bankruptcy filing (which shall not be an Event of Default for purposes of this clause), or (ii) Merchant going out of business in the ordinary course (which shall also not be an Event of Default for purposes of this clause).\nNotice and Opportunity to Cure. No event described in Sections 6.1.1, 6.1.6, 6.1.7, 6.1.9 or 6.1.10, and no failure under Sections 4.16, 5.2, 5.5, 5.6 or 5.8, shall constitute an Event of Default unless Buyer has given Merchant written notice of the event and the event remains uncured ten (10) Workdays after such notice. Buyer shall not exercise any remedy under Section 6.2 in respect of such an event before that period has run.\nBankruptcy and Business Failure. Notwithstanding anything in this Agreement to the contrary, neither the filing of a voluntary or involuntary petition under Title 11 of the United States Code, nor Merchant’s insolvency, nor the cessation of Merchant’s business for lack of revenue, shall constitute an Event of Default or give rise to any remedy under this Section 6 or to any liability of any Guarantor.',
    source: { kind: 'attorney-drafted', author: null },
    status: 'draft',
    appliesInStates: [],
    examinedBy: [
      {
        review: 'REVIEW-01',
        findings: [
          'bankruptcy-carveout-defeated-by-5-9',
          'default-on-any-term-no-cure-no-materiality',
          'defined-term-drift',
          'frpa-plaid-default-not-enumerated-in-61',
          'frpa-undefined-capitalised-terms',
          'guarantor-termination-notice-is-default',
          'guaranty-covers-every-covenant',
          'guaranty-reaches-business-failure',
          'no-cure-period-anywhere',
          'reconciliation-switched-off-by-any-breach',
        ],
      },
      {
        review: 'REVIEW-02',
        findings: [
          'frpa-6-1-4-defaults-on-a-sale-5-18-expressly-permits',
          'frpa-6-4-compels-the-notice-6-1-5-makes-a-default',
          'frpa-9-4-creates-guarantor-liability-on-merchant-bankruptcy',
        ],
      },
    ],
  },
  {
    slug: 'frpa.remedies-6-2',
    version: 1,
    instrument: 'frpa',
    kind: 'clause',
    number: '6.2',
    section: 'default',
    sortKey: 20,
    heading: 'Remedies',
    body: 'Upon the occurrence of an Event of Default, Buyer may proceed to protect and enforce its rights or remedies by suit in equity or by action at law, or both, whether for the specific performance of any covenant, agreement, or other provision contained herein, or to enforce the discharge of Merchant’s obligations hereunder (including the Guaranty) or any other legal or equitable right or remedy. All rights, powers, and remedies of Buyer in connection with this Agreement may be exercised at any time after the occurrence of an Event of Default, are cumulative and not exclusive, and shall be in addition to any other rights, powers, or remedies provided by law or equity. In addition, Buyer may take the actions set out below, save that the remedy in Section 6.2.1 is available only on an Event of Default under Sections 6.1.4, 6.1.5, 6.1.8, 6.1.13 or 6.1.14, or on conduct of the kind described in Section 5.17. It is not available on an Event of Default under Section 6.1.1 or on any other breach of covenant, representation or warranty:\n6.2.1 Declare that the full uncollected Purchased Amount plus all fees due under this Agreement is due and payable in full immediately, and the Specified Percentage shall increase to one hundred percent (100%) of card settlement proceeds, collected through the Approved Processor under Section 2.3. This does not reach cash, cheques or other non-card Receipts, and Buyer shall not debit Merchant’s deposit account to collect;\n6.2.2 Enforce the provisions of the Guaranty against the Guarantor(s);\n6.2.3 Enforce its security interest in the Collateral and proceed to protect and enforce its rights and remedies by lawsuit. In any such lawsuit in which Buyer recovers judgment, Merchant shall be liable for Buyer’s reasonable attorneys’ fees and court costs actually incurred, subject to Section 6.3;\n6.2.4 [Reserved]; and\n6.2.5 Without waiving any of its rights and remedies and without notice to Merchant or Guarantor(s), notify Merchant’s credit card processor of the sale of Receipts hereunder and direct such processor to make payment to Buyer of all or any portion of the amounts received by such processor on behalf of Merchant. Merchant grants Buyer an irrevocable power of attorney coupled with an interest, and appoints Buyer or any of Buyer’s representatives as Merchant’s attorney-in-fact, to take any and all action necessary to direct such new or additional credit card processor to provide such Receipts to Buyer.',
    source: { kind: 'attorney-drafted', author: null },
    status: 'draft',
    appliesInStates: [],
    examinedBy: [
      {
        review: 'REVIEW-01',
        findings: [
          'acceleration-defeats-indefinite-term',
          'attorneys-fees-two-different-rates',
          'charges-scattered-outside-fee-schedule',
          'default-collection-reaches-cash-and-checks',
          'default-on-any-term-no-cure-no-materiality',
          'guarantor-termination-notice-is-default',
          'liquidated-damages-plus-actual-costs',
          'remedy-stack-exceeds-the-debt',
          'three-inconsistent-attorney-fee-formulas',
        ],
      },
      {
        review: 'REVIEW-02',
        findings: [
          'frpa-4-12-reopens-the-acceleration-6-2-closed',
          'frpa-6-4-compels-the-notice-6-1-5-makes-a-default',
        ],
      },
    ],
  },
  {
    slug: 'frpa.costs-of-collection-6-3',
    version: 1,
    instrument: 'frpa',
    kind: 'clause',
    number: '6.3',
    section: 'default',
    sortKey: 30,
    heading: 'Costs of Collection',
    body: "Each Merchant and Guarantor shall pay to Buyer, on demand, all costs and expenses incurred by Buyer in connection with any Event of Default or the enforcement of Buyer's rights under this Agreement, the Guaranty, or any related agreement. Such costs and expenses are limited to amounts actually incurred and reasonable in amount, and include: (i) attorneys' fees; (ii) administrative or filing fees, expert witness fees, and costs of suit; and (iii) collection-agency commissions. Buyer shall on request furnish Merchant a reasonably detailed statement of the amounts claimed under this Section. Notwithstanding any other provision of this Agreement, the aggregate of all amounts recoverable from Merchant and Guarantor(s) on account of enforcement costs and expenses — under this Section, Section 4.10, Section 6.2.3, Section 7.9, and Appendix A combined — shall not exceed twenty-five percent (25%) of the undelivered Purchased Amount, and in no event shall Buyer recover the same cost or expense more than once.\n6.3.1 Prejudgment and Postjudgment Interest\nIf Buyer becomes entitled to the entry of a judgment against any Merchant or Guarantor, prejudgment and postjudgment interest shall accrue at the statutory rate provided by the law of the forum, and Buyer claims no contractual rate. This Agreement is not a loan and Buyer does not charge interest on it.",
    source: { kind: 'attorney-drafted', author: null },
    status: 'draft',
    appliesInStates: [],
    examinedBy: [
      {
        review: 'REVIEW-01',
        findings: [
          'attorneys-fees-two-different-rates',
          'charges-scattered-outside-fee-schedule',
          'frpa-arbitration-clauses-with-no-arbitration-agreement',
          'indemnity-charges-interest-document-denies',
          'interest-charges-inside-a-not-a-loan',
          'liquidated-damages-plus-actual-costs',
          'liquidated-damages-plus-actual-expenses',
          'orphan-arbitration-references',
          'orphan-arbitration-twenty-day-bar',
          'remedy-stack-exceeds-the-debt',
          'three-inconsistent-attorney-fee-formulas',
        ],
      },
    ],
  },
  {
    slug: 'frpa.required-notifications-6-4',
    version: 1,
    instrument: 'frpa',
    kind: 'clause',
    number: '6.4',
    section: 'default',
    sortKey: 40,
    heading: 'Required Notifications',
    body: 'Merchant is required to give Buyer written notice within twenty-four (24) hours of any filing under Title 11 of the United States Code. Merchant is required to give Buyer seven (7) days’ written notice prior to the closing of any sale of all or substantially all of Merchant’s assets or stock.',
    source: { kind: 'attorney-drafted', author: null },
    status: 'draft',
    appliesInStates: [],
    examinedBy: [
      {
        review: 'REVIEW-02',
        findings: [
          'frpa-6-4-24-hour-notice-cannot-be-given-under-7-3',
          'frpa-6-4-compels-the-notice-6-1-5-makes-a-default',
        ],
      },
    ],
  },
];
