import type { McaClause } from '../types';

/**
 * The deal itself — Section 1’s notes, the parties, the grant.
 *
 * TWO OF THESE ARE AUTHORED, THE REST ARE STILL TRANSCRIBED, and the file has
 * to say which. `frpa.holdback-explainer` and `frpa.granting-clause` were
 * rewritten on 2026-09-10 under
 * [ADR 0012](../../../../../docs/adr/0012-the-baseline-document-is-input-not-specification.md):
 * the baseline is drafting input, not specification, and reproducing it is not
 * a goal. The other four bodies here are still the words v4 prints.
 *
 * WHAT THAT COSTS, STATED RATHER THAN HIDDEN. `bodies-match-the-document` is
 * red on both rewritten clauses, which ADR 0012 authorises. `frpa-coverage`’s
 * *leaves no line unaccounted for* is red too, and the ADR does NOT speak to
 * it: that test asks the opposite question — is anything in the DOCUMENT
 * missing from the library — and once a body is authored, the line it replaced
 * is accounted for by nothing. The answer is to re-render the `.docx` from the
 * library, which is `lombard-contracts` work and is not done here. Declaring
 * those lines non-clause would make the check vacuous and is not the answer.
 */
export const FRPA_PREAMBLE: McaClause[] = [
  /*
    WHAT WAS WRONG. The estimate was drawn on "average sales revenue" while the
    only collection mechanism in the document takes a percentage of CARD
    settlements. The illustration and the thing it illustrates had different
    denominators, so the figure a merchant reads in Section 1 is not a
    percentage of anything this Agreement collects. `types.ts` records why an
    explainer is dangerous rather than harmless: it READS as operative while
    describing something that is not, which is why the 2026-09-09 memo rates
    this High.

    WHAT CHANGED. One base — Card Receipts, as the definitions clause defines
    it. The estimate is stated to authorise nothing: not a payment, not a
    minimum, not a schedule, not a payoff date. Collection is pointed at
    Sections 2 and 3, which now say the same thing as each other and as this.

    DEPARTURE FROM THE MEMO. The memo grounds the illustration in "the
    historical period and assumptions identified in Section 1". Section 1
    identifies neither — 1.3 holds an Estimated Daily Holdback and a Holdback
    Effective Date and no history at all — so the memo's sentence would
    cross-reference a blank, which is `frpa-undefined-capitalised-terms` in
    another form. It refers instead to the Card Receipts history Merchant
    actually gave Buyer before funding, which exists and is producible.

    NOT CHANGED, AND NOT THIS CLUSTER'S. `kind` stays `clause` although this is
    one of the four Funding Terms explainers `types.ts` describes. Reclassifying
    it belongs to `feat-mca-clause-kind-and-fields`.
  */
  {
    slug: 'frpa.holdback-explainer',
    version: 1,
    instrument: 'frpa',
    kind: 'clause',
    includeWhen: null,
    number: '',
    section: 'funding-terms',
    sortKey: 10,
    heading: '',
    body: 'What is the Estimated Daily Holdback? The Estimated Daily Holdback stated in Section 1 is a good-faith illustration of the Specified Percentage of Merchant’s average daily Card Receipts, calculated from the Card Receipts history Merchant gave Buyer before the Purchase Date. It is not a payment, it is not a minimum, it is not a scheduled amount, and it is not a promise that any amount will be collected on any day. Collection occurs only as the Specified Percentage of actual Card Receipts under Sections 2 and 3, and no fixed amount is collected under this Agreement. If Merchant’s Card Receipts fall, what Buyer collects falls with them. Section 3 states how the illustration is reconciled and adjusted. A separate Split Funding Authorization (Exhibit A) is executed for each Approved Processor identified in Section 1.',
    source: { kind: 'attorney-drafted', author: null },
    status: 'draft',
    appliesInStates: [],
    examinedBy: [{ review: 'REVIEW-02', findings: [] }],
  },
  {
    slug: 'frpa.equipment-cost-explainer',
    version: 1,
    instrument: 'frpa',
    kind: 'clause',
    /*
      Nothing to explain when the product involves no equipment.
    */
    includeWhen: (facts) => facts.equipment !== 'none',
    number: '',
    section: 'funding-terms',
    sortKey: 20,
    heading: '',
    body: 'What is the Equipment Cost? Point-of-sale equipment may be paid for in one of two ways, and only one. Either the cost is added to the Purchased Amount and repaid through the Specified Percentage (“Equipment Cost Deferred” in Section 1.3), or it is deducted from the Purchase Price at funding (“Less: Equipment fee (paid at funding)” in Section 1.4). Under either, Merchant owns the equipment outright. If either figure is greater than $0.00, Merchant is not asked to lease the same equipment and no monthly lease payment is payable for it. If instead Merchant leases the equipment under a separate Equipment Lease Agreement with {{equipmentAffiliate}}, both figures in Section 1 are stated as $0.00 rather than left blank. In no event does Merchant pay for the same equipment under both this Agreement and an Equipment Lease Agreement.',
    source: { kind: 'attorney-drafted', author: null },
    status: 'draft',
    appliesInStates: [],
    examinedBy: [{ review: 'REVIEW-02', findings: [] }],
  },
  {
    slug: 'frpa.equipment-cost-exclusivity',
    version: 1,
    instrument: 'frpa',
    kind: 'clause',
    includeWhen: null,
    number: '',
    section: 'funding-terms',
    sortKey: 30,
    heading: '',
    body: 'Only one of “Equipment Cost Deferred” in Section 1.3 and “Less: Equipment fee (paid at funding)” in Section 1.4 may be completed with an amount greater than $0.00; the other must be stated as $0.00. The Purchased Amount shown in Section 1.3 is calculated as (Purchase Price × Factor Rate) + Equipment Cost Deferred, and is therefore inclusive of any Equipment Cost Deferred. Because that amount is the price of goods and not a cost of the financing, it is excluded from the finance charge and from the amount financed stated on any state disclosure accompanying this Agreement.',
    source: { kind: 'attorney-drafted', author: null },
    status: 'draft',
    appliesInStates: [],
    examinedBy: [{ review: 'REVIEW-02', findings: [] }],
  },
  {
    slug: 'frpa.rollover-method-election',
    version: 1,
    instrument: 'frpa',
    kind: 'clause',
    /*
      The election only means something once a renewal mechanism exists.
    */
    includeWhen: (facts) => facts.renewalModel !== 'none',
    number: '',
    section: 'funding-terms',
    sortKey: 40,
    heading: '',
    body: 'Rollover Method (renewals only): _________«25»_________. This states the method Merchant elected under Section 8.2 — Deduct or Carry — and the Purchased Amount in Section 1.3 is calculated on it. On a first-time transaction with no prior balance, this reads “Not applicable”.',
    source: { kind: 'attorney-drafted', author: null },
    status: 'draft',
    appliesInStates: [],
    examinedBy: [{ review: 'REVIEW-02', findings: [] }],
  },
  {
    slug: 'frpa.parties',
    version: 1,
    instrument: 'frpa',
    kind: 'clause',
    includeWhen: null,
    number: '',
    section: 'preamble',
    sortKey: 10,
    heading: '',
    body: 'This Future Receivables Purchase Agreement (this “Agreement”) is entered into and effective as of ____«31»_____ (the “Effective Date”) by and between {{funder}}, a Florida limited liability company, with its principal office at _______________«96»_______________ (the “Buyer”), and _____________«32»_____________ (the “Merchant” or “Seller”), with reference to the Merchant Information, Deposit Account, Funding Terms, Itemization, and Approved Processors set forth in Section 1 above.',
    source: { kind: 'attorney-drafted', author: null },
    status: 'draft',
    appliesInStates: [],
    examinedBy: [{ review: 'REVIEW-02', findings: [] }],
  },
  /*
    WHAT WAS WRONG. The single most important defect in the document. It sold
    "all of Merchant's future accounts, contract rights and other obligations
    ... cash, check, credit or debit card, electronic transfer or other form of
    monetary payment" — the whole receipts universe — while 2.2 collected a
    fixed percentage of card settlements and Section 3 reconciled against
    something wider again. One agreement, three assets. That mismatch is the
    recharacterisation vector, the undisclosed catch-up claim and the
    ordinary-course dispute generator at once, and it is what a UCC-1 gets
    over-filed on: 4.10 already narrows the security interest to "the purchased
    Receipts", and until now the two clauses disagreed about what those were.

    WHAT CHANGED. The grant is the Specified Percentage of Card Receipts and
    nothing else. The retained percentage, the non-card receipts and every other
    asset are expressly outside the sale. The shortfall risk is Buyer's, said in
    the operative sentence rather than left to 2.1's recital.

    DEPARTURES FROM THE MEMO. Two.
    (1) The memo funds "under Sections 1 and 4.13, including only lawful,
        disclosed, expressly authorized deductions and payoffs". That is pointed
        at the itemization in 1.4, which is where 4.1 already requires every
        deduction to appear as a dollar line before signature, so the
        cross-reference is made specific rather than left as a standard.
    (2) The memo's "Buyer acquires no ownership of ..." is restated as what
        Buyer DOES own, as and when each Card Receipt is generated. A grant that
        says what passes is worth more than one that lists what does not, and
        the second form is how the old clause and 4.10 drifted apart.

    UNVERIFIED AUTHORITY. The memo's recharacterisation reasoning cites Richmond
    Capital, 246 AD3d 585, Apollo Funding, 241 AD3d 1508, and NewCo, 250 AD3d
    1641, alongside LG Funding. NOBODY ON THIS PROJECT HAS PULLED ANY OF THEM
    FROM THE OFFICIAL REPORTERS. They are recorded so a reviewer checks them
    rather than inherits them, and no citation appears in any clause body.
  */
  {
    slug: 'frpa.granting-clause',
    version: 1,
    instrument: 'frpa',
    kind: 'clause',
    includeWhen: null,
    number: '',
    section: 'preamble',
    sortKey: 20,
    heading: '',
    body: 'Effective on the Purchase Date, and in consideration of the Purchase Price funded under Section 4.13 net only of the deductions and payoffs itemized in Section 1.4, Merchant sells, assigns and transfers to Buyer the Specified Percentage of the Card Receipts generated on and after the Purchase Date, until Buyer has received the Purchased Amount (the “Purchased Receipts”). Buyer owns each Purchased Receipt as and when the Card Receipt it is part of is generated. Buyer owns nothing else: Merchant’s retained percentage of Card Receipts, Merchant’s cash, cheque, electronic-transfer and other non-card receipts, and every other asset of Merchant remain Merchant’s and are outside this sale. Buyer takes the risk that the Purchased Receipts are generated more slowly than the Estimated Daily Holdback illustrates, or are never sufficient to deliver the Purchased Amount. Merchant does not repurchase Purchased Receipts that are never generated and owes no shortfall arising from a decline or failure of its business. This sale gives Buyer no interest larger than the Purchased Receipts, and Buyer’s rights on an Event of Default are only those Section 6 gives it.',
    source: { kind: 'attorney-drafted', author: null },
    status: 'draft',
    appliesInStates: [],
    examinedBy: [{ review: 'REVIEW-02', findings: [] }],
  },
];
