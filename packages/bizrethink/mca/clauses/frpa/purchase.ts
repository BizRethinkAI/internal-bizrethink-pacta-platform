import type { McaClause } from '../types';

/**
 * Sections 2 and 3 — the sale, its collection and its reconciliation.
 *
 * SIX OF THESE ARE AUTHORED, THE RECONCILIATION FOUR ARE NOT. §2.1–§2.6 and the
 * definitions were rewritten on 2026-09-10 under
 * [ADR 0012](../../../../../docs/adr/0012-the-baseline-document-is-input-not-specification.md),
 * as the spine the rest of the corpus depends on: one purchased share, one
 * settlement base, one aggregate cap, one delivery cap that does not float.
 * §§3.1–3.4 still print v4’s words and still reconcile against a base the
 * definitions clause has now moved underneath them — the first thing the next
 * cluster has to fix.
 *
 * `__tests__/one-settlement-base.test.ts` is what holds the six together: the
 * base is defined once, `Receipts` and `Daily Receipts` are bridged to it, and
 * the grant, the collection clause and the completion test all measure the same
 * asset. It was red on every assertion before the rewrite.
 */
export const FRPA_PURCHASE: McaClause[] = [
  /*
    WHAT WAS WRONG. Three definitions — Workday, one bank account, one
    processor — in a document that then used "Receipts", "Daily Receipts",
    "Future Receipts", "the Account" and "Receivables Purchased Amount" as
    though they had been defined too. That is REVIEW-01's `defined-term-drift`,
    `undefined-money-terms` and `frpa-undefined-capitalised-terms`, all three
    recorded implemented against a document that still does it. Worse than the
    missing terms: taxes, tips, processor fees, reserves, refunds and
    chargebacks were not spoken to at all, so any of the six could move the
    economic percentage with no amendment, no disclosure, and no dispute a
    merchant could win.

    WHAT CHANGED. One base, defined once, with an express treatment for each of
    the six movers. "Receipts" and "Daily Receipts" are bridged to it, which is
    how this cluster reaches roughly fifteen clauses it does not edit. The money
    terms and both completion terms are pointed at the clauses that fix them.

    THE NET BASE IS A DESIGN CHOICE, NOT A STATUTORY DEFINITION, and the memo
    says so. Pricing, the processor instruction and every state disclosure must
    be computed on the SAME base as collection. A funder that prices on gross
    settlement needs a different definition here, and its disclosures will be
    wrong until it gets one.

    DEPARTURES FROM THE MEMO. Three.
    (1) The memo discloses initial charges and reserve arrangements "in Section
        1". Section 1 has no such field, so the disclosure is required in
        writing before the Purchase Date instead of inventing a grid line in a
        form this cluster does not control.
    (2) The affiliate-charge sentence is written with `{{equipmentAffiliate}}`
        and tied to the merchant-level billing 4.11 and 5.17 already describe,
        so an equipment charge falls on Merchant's retained share rather than on
        the shared base. Deducted from the base it would silently reduce what
        Buyer collects and lengthen the deal, with no amendment.
    (3) "Factor Rate", "Estimated Daily Holdback", "Purchased Receipts",
        "Remaining Balance" and "Completion Threshold" are added to the pointer
        list. The memo does not list them; they are used throughout the corpus,
        and leaving them out would fix an undefined-terms finding by name while
        leaving it in place.

    A CONFLICT CREATED ON PURPOSE, AND HANDED ON. "It does not increase on an
    Event of Default" contradicts 6.2.1, which raises the Specified Percentage
    to 100% of card settlement proceeds on the fraud-type defaults. 6.2.1 is not
    in this cluster. The memo's position is that a default increase is itself a
    recharacterisation vector; this definition takes that position, and the
    conflict is reported to whoever draws the Section 6 cluster rather than
    being papered over here.
  */
  {
    slug: 'frpa.definitions',
    version: 1,
    instrument: 'frpa',
    kind: 'clause',
    includeWhen: null,
    number: '',
    section: 'purchase',
    sortKey: 5,
    heading: '',
    body: 'In this Agreement:\n“Workday” means a day other than a Saturday, a Sunday or a federal banking holiday.\n“Approved Processor” means each credit and debit card processor identified in Section 1 and each processor added under Section 2.4. “Approved Bank Account” means each deposit account identified in Section 1 and each account added under Section 2.4. “Bank” means a bank that maintains an Approved Bank Account.\n“Card Receipts” means the net credit and debit card settlement proceeds actually payable to Merchant by an Approved Processor for Merchant’s ordinary-course sales, after refunds, chargebacks, separately identified taxes and gratuities payable to others, and that Approved Processor’s own lawful ordinary charges and reserves as shown on Merchant’s settlement statements. Those charges and reserve arrangements, as they stand on the Purchase Date, are disclosed to Merchant in writing before the Purchase Date, and a material change to either is disclosed promptly. Neither party may change or arrange them in order to alter the economics stated in Section 1. Charges billed at merchant level for equipment leased or subscribed from {{equipmentAffiliate}} are not deducted in determining Card Receipts. A released reserve is a Card Receipt when it becomes payable, and only to the extent it is attributable to a sale generated on or after the Purchase Date. Each refund, chargeback, reserve and release is traced to the sale it arises from and counted once; the same adjustment may not both reduce an amount credited to Buyer and reduce Card Receipts. Transfers between Merchant’s own accounts, capital contributions, financing proceeds, and the proceeds of sales generated before the Purchase Date are not Card Receipts.\n“Receipts” and “Daily Receipts”, wherever used in this Agreement, mean Card Receipts, unless the provision using the term says otherwise in terms.\n“Specified Percentage” means the percentage stated in Section 1. It does not increase on an Event of Default.\n“Purchase Price”, “Factor Rate”, “Purchased Amount”, “Net Amount Funded” and “Estimated Daily Holdback” mean the amounts completed and itemized in Section 1, and the Purchased Amount is subject to Section 2.6. “Purchase Date” has the meaning given in Section 4.13. “Purchased Receipts” has the meaning given in the sale above. “Remaining Balance” and “Completion Threshold” have the meanings given in Section 2.6.\nAn estimate in this Agreement, including the Estimated Daily Holdback, states no maturity date and creates no obligation to deliver any amount by any date.',
    source: { kind: 'attorney-drafted', author: null },
    status: 'draft',
    appliesInStates: [],
    examinedBy: [{ review: 'REVIEW-02', findings: [] }],
  },
  /*
    WHAT WAS WRONG. Two things, and the memo REFUTES one of them.

    Refuted: REVIEW-01's `fair-market-value-recital-self-refuting` reads the
    factor rate in 1.3 as proving the fair-market-value recital false. It does
    not — a purchase at a discount can be at fair market value, and the memo
    says so in terms. The register still carries that finding as `open` against
    this clause and needs correcting in `lombard-contracts`; it is NOT corrected
    here, because the register is vendored and this session does not write it.

    Standing: the merchant's CONCESSION of value is unsupported and the merchant
    is in no position to give it; "Buyer ... shall own all the Receipts
    described herein" restates the granting clause's over-broad grant a second
    time in different words, which is how the two drifted apart; and the savings
    clause invites collection first and reduction afterwards.

    WHAT CHANGED. The concession goes. The second statement of the grant goes
    with it — the sale is stated once, above. The savings clause is replaced by
    a refund duty: a savings provision does not cure a transaction that is
    actually a usurious loan, and `usury-defence-waiver-void` records that an
    advance waiver is itself evidence the drafter contemplated one.

    DEPARTURE FROM THE MEMO. The memo's "Buyer's remedies and the Guaranty are
    limited by Sections 6 and 9" is split into the two limits that actually
    exist: Section 6 limits remedies, Section 9 limits the guaranty, and they
    are not interchangeable.

    UNVERIFIED AUTHORITY. The characterisation analysis runs on LG Funding's
    factors, with Richmond Capital, Apollo Funding, NewCo, Principis and Grafton
    cited around them; REVIEW-01's `acceleration-defeats-indefinite-term` names
    LG Funding factor two by number. None has been pulled from the official
    reporters by anybody on this project. Recorded here, never in a body.
  */
  {
    slug: 'frpa.sales-of-receipts-not-a-loan-2-1',
    version: 1,
    instrument: 'frpa',
    kind: 'clause',
    includeWhen: null,
    number: '2.1',
    section: 'purchase',
    sortKey: 10,
    heading: 'Sales of Receipts; Not a Loan',
    body: 'The parties intend a present purchase of a contingent interest in future Card Receipts, on the terms of the sale stated above. There is no maturity date, no minimum collection, and no obligation on Merchant to deliver Card Receipts that are never generated. The Purchase Price is negotiated consideration for the Purchased Receipts. Merchant makes no representation or warranty as to the fair market value of the Purchased Receipts or as to what Buyer will collect. Buyer’s remedies are limited by Section 6, and the Guaranty is limited by Section 9. How this transaction is characterized, and whether it is enforceable, are determined by applicable law and by how this Agreement actually operates, not by this Section. No party waives any usury or other defence that law does not permit to be waived, and no provision of this Agreement permits Buyer to collect an amount that law does not permit it to collect. Buyer shall promptly refund any amount it collects in excess of its lawful entitlement.',
    source: { kind: 'attorney-drafted', author: null },
    status: 'draft',
    appliesInStates: [],
    examinedBy: [
      {
        review: 'REVIEW-01',
        findings: [
          'fair-market-value-recital-self-refuting',
          'indemnity-charges-interest-document-denies',
          'interest-charges-inside-a-not-a-loan',
          'usury-defence-waiver-void',
        ],
      },
    ],
  },
  /*
    WHAT WAS WRONG. It named the collection base two different ways in two
    sentences — "the Specified Percentage of Merchant's daily credit and debit
    card receipts", then an estimate built on "projected sales" — cited 2.3 by
    a title 2.3 does not have (`frpa-22-cites-wrong-clause-title`), and said
    nothing about the case that decides whether this is a sale: a day with no
    receipts. `acceleration-defeats-indefinite-term` is the other half: an
    indefinite term that 6.2.1 can convert into a fixed sum due immediately is
    not indefinite.

    WHAT CHANGED. Zero-receipt and no-maturity treatment stated plainly, because
    both are cheap to write and are the evidence that matters. Nothing is due
    for a period with no Card Receipts AND no arrears accrue for it — an
    arrears concept is how a percentage-of-receipts deal becomes an instalment
    obligation without anyone deciding to. The estimate authorises nothing. The
    cross-reference is to the number alone, so a heading change cannot make it
    wrong again.

    DEPARTURE FROM THE MEMO. The memo ends "subject to cancellation, lawful
    termination, and the allocation of business-failure risk in Sections 2.1 and
    6.1". 6.1 is the list of Events of Default and allocates no risk; 4.14 is
    the three-day cancellation right. Both cross-references are corrected to the
    clauses that say those things.

    WHAT THIS CLAUSE DELIBERATELY DOES NOT DO. It does not repeal 6.2.1's
    acceleration. Writing "no provision of Section 6 creates a maturity date"
    here would be drafting a contradiction into the document over a clause this
    cluster may not touch. It states the allocation and leaves the remedy to the
    Section 6 cluster.

    UNVERIFIED AUTHORITY. Richmond Capital, 246 AD3d 585, is the memo's
    authority for treating explicit zero-receipt and no-maturity language as
    material. Not pulled from the reporter by anybody here.
  */
  {
    slug: 'frpa.collection-mechanism-and-term-2-2',
    version: 1,
    instrument: 'frpa',
    kind: 'clause',
    includeWhen: null,
    number: '2.2',
    section: 'purchase',
    sortKey: 20,
    heading: 'Collection Mechanism and Term',
    body: 'Buyer collects only the Specified Percentage of actual Card Receipts, and only through an Approved Processor under Section 2.3. If Merchant generates no Card Receipts in a period, nothing is due for that period and no arrears accrue for it. The Estimated Daily Holdback is informational: it does not authorize a fixed debit, a minimum remittance, a catch-up collection or a payoff date, and Buyer may not collect a fixed amount under this Agreement. What Buyer collects rises and falls with Merchant’s actual Card Receipts and may be more or less than the Estimated Daily Holdback on any Workday. This Agreement continues until the Completion Threshold in Section 2.6 is attained, or until it is cancelled under Section 4.14 or otherwise lawfully terminated. It has no maturity date, and the risk that a decline or failure of Merchant’s business leaves the Purchased Amount undelivered is Buyer’s under Section 2.1.',
    source: { kind: 'attorney-drafted', author: null },
    status: 'draft',
    appliesInStates: [],
    examinedBy: [
      {
        review: 'REVIEW-01',
        findings: [
          'acceleration-defeats-indefinite-term',
          'default-collection-reaches-cash-and-checks',
          'defined-term-drift',
          'frpa-22-cites-wrong-clause-title',
        ],
      },
    ],
  },
  /*
    WHAT WAS WRONG. Two sentences, the second an open-ended promise to sign "any
    documentation required by the processor". That imports whatever powers an
    unseen processor form happens to contain — a fixed daily debit, a deposit
    account authority, collection of unrelated charges — into an agreement that
    grants none of them. The first sentence presented split funding as something
    this Agreement arranges, which it cannot: an Approved Processor does not
    sign it, and a UCC 9-406 notification of a PARTIAL assignment does not
    compel an acquirer to split settlement.

    WHAT CHANGED. The authorisation is specified — base, percentage, reference,
    contact, stop instruction — and what it may NOT authorise is listed. ONE
    aggregate cap across every processor, with the duty to set and update
    processor-level limits on Buyer, because a merchant cannot see another
    processor's remittance and a per-processor cap over-collects by design. The
    clause says the processor is not a party and that this Agreement does not
    bind it, and puts the acceptance obligation on Buyer before funding.

    NOT GATED ON `processorSplitAccepted`, AND THIS IS THE ONE PLACE THIS
    CLUSTER DID NOT DO WHAT IT WAS ASKED. The obvious gate is
    `(facts) => facts.processorSplitAccepted`, and it was written, run, and
    taken out again. Two reasons, in order of weight.

    (1) It does not fix the defect. Gating this clause OUT of a template whose
        funder has no accepted split produces an agreement with no collection
        mechanism at all — worse paper, not safer paper. The defect is
        operational: nobody has countersigned an acceptance. The memo's own fix
        is a duty on Buyer to obtain one before funding, and that duty is now in
        the body where it binds, rather than in a predicate that deletes the
        mechanism instead.
    (2) It collides with an invariant this session may not edit.
        `engine/__tests__/select-clauses.test.ts` asserts that `LOMBARD_FACTS`
        selects the WHOLE shipped FRPA, because that profile describes the paper
        rather than the recommendation. `processorSplitAccepted` is FALSE there
        — correctly, it is a fact about the world and the world has not
        countersigned — so any gate reading it positively drops this clause and
        fails that test. The only ways to hold both are to falsify the fact,
        which is laundering, or to accept a template with no collection clause,
        which is (1).

    So the fact stays unread by this clause and the collision is handed on: the
    day Lombard holds countersigned acceptances, `processorSplitAccepted` flips
    to true and a gate here becomes free. Until then a template can be assembled
    whose split nobody has agreed to, and NOTHING in this library says so. That
    is a real gap and it is not closed here.

    DEPARTURE FROM THE MEMO. The memo has Buyer obtain acceptance "before
    funding"; written as before the Purchase Date, which is the term 4.13
    defines and the same moment. Added, because the memo leaves the risk
    unallocated: if a processor does not accept or does not perform, Buyer's
    route is 2.4's replacement machinery and not a claim against Merchant.
    Without that sentence a non-signatory's behaviour lands back on the merchant
    through 6.1.1.
  */
  {
    slug: 'frpa.primary-collection-split-funding-via-approved-processor-2-3',
    version: 1,
    instrument: 'frpa',
    kind: 'clause',
    includeWhen: null,
    number: '2.3',
    section: 'purchase',
    sortKey: 30,
    heading: 'Primary Collection: Split Funding via Approved Processor',
    body: 'Merchant authorizes each Approved Processor, by a Split Funding Authorization in the form of Exhibit A signed separately for that processor, to remit the Specified Percentage of Card Receipts to Buyer and the balance to Merchant. A Split Funding Authorization shall state the settlement base, the Specified Percentage, a transaction reference, a reconciliation contact, and how the instruction is stopped. It shall not authorize a fixed or minimum remittance, an increase in the Specified Percentage, a debit to any deposit account of Merchant, or the collection of any amount other than the Purchased Receipts.\nOne aggregate cap applies across every Approved Processor: the total remitted to Buyer under all Split Funding Authorizations shall not exceed the Purchased Amount. Buyer shall set and update each processor’s limit so that it does not. Buyer bears the risk of a settlement or instruction delay and shall refund any excess under Section 2.6.\nAn Approved Processor is not a party to this Agreement and this Agreement does not bind it. Buyer shall obtain each Approved Processor’s written acceptance of the Split Funding Authorization before the Purchase Date, and is responsible for sending it accurate commencement, correction and termination instructions. If an Approved Processor does not accept, or does not perform, Buyer’s route is the replacement arrangements in Section 2.4 and not a claim against Merchant. A processor’s own form does not amend this Agreement; an amendment requires a writing signed by Merchant and Buyer, together with any disclosure the law then requires.',
    source: { kind: 'attorney-drafted', author: null },
    status: 'draft',
    appliesInStates: [],
    examinedBy: [{ review: 'REVIEW-02', findings: [] }],
  },
  /*
    WHAT WAS WRONG. "One and only one" bank account and "one and only one"
    processor, in a document whose Exhibit A contemplates a Split Funding
    Authorization per processor and whose 1.5 has a row for additional and
    replacement processors. The document contradicted itself on its own face.
    The replacement duty was worse: on a bank or processor withdrawing service,
    Merchant had to have arranged a replacement BEFORE the first day of the
    unavailability — which nobody can do, and which turns an outage into an
    Event of Default under 6.1.1.

    WHAT CHANGED. The restriction is narrowed to what a funder actually needs:
    continuity of the split, and no deliberate diversion of the purchased share.
    Other accounts, for funds that are not Purchased Receipts, are Merchant's
    business. Notice is before a planned change and promptly after an unplanned
    one. An outage is expressly not a default.

    DEPARTURE FROM THE MEMO. The memo's "Merchant shall identify each account
    and processor used for Card Receipts in Section 1" is kept but paired with
    an addition route, because the definitions clause defines Approved Bank
    Account and Approved Processor as identified in Section 1 OR added under
    this Section, and a clause that knew only about Section 1 would leave that
    second limb undefined.

    CROSS-CLAUSE CONFLICT, REPORTED NOT FIXED. 5.17 still forbids adding an
    account at all and requires every Receipt to be deposited in the Approved
    Bank Account. With the definitions bridge that now reads as a
    Card-Receipts-only duty, which is an improvement, but it still contradicts
    the notice-and-replace route here. 5.17 is the representations cluster's.
  */
  {
    slug: 'frpa.approved-bank-account-2-4',
    version: 1,
    instrument: 'frpa',
    kind: 'clause',
    includeWhen: null,
    number: '2.4',
    section: 'purchase',
    sortKey: 40,
    heading: 'Approved Bank Account',
    body: 'Merchant shall identify in Section 1 each Approved Bank Account and each Approved Processor through which Card Receipts settle, and shall keep the split under Section 2.3 in place through them. Merchant may add or replace an account or a processor on notice to Buyer; Buyer shall not unreasonably withhold, condition or delay approval, and shall cooperate in putting a replacement Split Funding Authorization in place. An account or processor added under this Section becomes an Approved Bank Account or an Approved Processor. Merchant may use any other account for funds that are not Purchased Receipts.\nMerchant shall notify Buyer before a planned change that affects the collection of Purchased Receipts, and promptly after learning of an unplanned interruption. While an interruption continues, Merchant shall account for the Purchased Receipts it actually receives and shall remit them under Section 7.16. A failure, outage or withdrawal of service by a Bank or an Approved Processor, and a good-faith change made under this Section, are not an Event of Default. Directing Card Receipts away from an Approved Processor with the intent to defeat the split is a breach of this Section.',
    source: { kind: 'attorney-drafted', author: null },
    status: 'draft',
    appliesInStates: [],
    examinedBy: [{ review: 'REVIEW-02', findings: [] }],
  },
  /*
    WHAT WAS WRONG. "Remaining Balance" was the Purchased Amount PLUS any fees
    charged under 4.1 and Appendix A. That makes the delivery cap a variable
    Buyer can raise after signature: every "total cost of financing" figure the
    eleven state disclosures require is then a number this Agreement expressly
    permits us to exceed. It is also the mechanism behind two REVIEW-02 findings
    — the split instruction stops at the Purchased Amount while the agreement's
    right runs to a larger figure, so the paper that moves the money and the
    paper that says when to stop disagree by exactly the fee stack.

    WHAT CHANGED. A purchase-only ledger. The Remaining Balance is the Purchased
    Amount less what has been credited to it, and nothing charged after the
    Purchase Date increases it. Completion stops the withholding, produces a
    final ledger, refunds the excess and releases the filings, each on a stated
    clock. A post-completion correction is identified to Merchant and cannot
    restart collection by Buyer's own act.

    ENFORCEMENT COSTS ARE NOT ABOLISHED, THEY ARE MOVED. 6.3 caps them at 25% of
    the undelivered Purchased Amount and is untouched. What this clause removes
    is their collection through the same settlement sweep as the purchase, which
    is what made the two completion tests diverge.

    DEPARTURE FROM THE MEMO. The memo's replacement never names the Completion
    Threshold. 4.2, 4.15 and 7.6 all cite it by that name and none is in this
    cluster, so dropping the defined term would have recreated
    `frpa-undefined-capitalised-terms` in the act of fixing it. The term is kept
    and attached to the memo's test.

    THE ONLY NUMBERS IN THIS CLUSTER. Two, five and ten Workdays are the memo's
    own figures. Nothing else here fixes a percentage, a dollar amount or a day
    count that the document or the memo had not already fixed.
  */
  {
    slug: 'frpa.completion-threshold-2-6',
    version: 1,
    instrument: 'frpa',
    kind: 'clause',
    includeWhen: null,
    number: '2.6',
    section: 'purchase',
    sortKey: 60,
    heading: 'Completion Threshold',
    body: '“Remaining Balance” means, at any time, the Purchased Amount less every amount credited to it, after any correction made under Section 3. It never includes a fee, an equipment charge, a cost of enforcement, or an amount owed under any other agreement, and no amount charged after the Purchase Date increases it.\nThis Agreement is complete, and Buyer’s right to receive Purchased Receipts ends, when the Remaining Balance reaches zero, or when this Agreement is cancelled or otherwise lawfully terminated without a continuing right to Purchased Receipts (the “Completion Threshold”). That is the only test of completion, and it governs wherever another provision of this Agreement describes completion differently.\nOn the Completion Threshold, Buyer shall instruct every Approved Processor to stop withholding immediately, shall confirm completion to Merchant within two (2) Workdays, and shall refund any amount collected above the Purchased Amount within five (5) Workdays after it is identified. Buyer shall give Merchant a final ledger, and shall file or authorize the release of every filing that records its interest, within ten (10) Workdays, or sooner where law requires.\nBuyer shall identify to Merchant promptly any unresolved correction relating to the purchase, and may not resume withholding after the Completion Threshold without Merchant’s written agreement or an order of a court. A refund or chargeback arising after completion does not reopen this Agreement, create damages, or create liability for a Guarantor. A proved claim of fraud or intentional diversion remains subject to Sections 6 and 9.',
    source: { kind: 'attorney-drafted', author: null },
    status: 'draft',
    appliesInStates: [],
    examinedBy: [
      {
        review: 'REVIEW-01',
        findings: [
          'completion-threshold-two-conflicting-tests',
          'frpa-undefined-capitalised-terms',
          'undefined-money-terms',
        ],
      },
      {
        review: 'REVIEW-02',
        findings: [
          'frpa-7-6-and-4-2-contradict-the-2-6-completion-test',
          'payzli-cessation-on-notice-vs-frpa-2-6-automatic-cessation',
          'payzli-instruction-stops-short-of-the-frpa-completion-threshold',
        ],
      },
    ],
  },
  {
    slug: 'frpa.merchant-s-right-to-reconciliation-3-1',
    version: 1,
    instrument: 'frpa',
    kind: 'clause',
    includeWhen: null,
    number: '3.1',
    section: 'reconciliation',
    sortKey: 10,
    heading: 'Merchant’s Right to Reconciliation',
    body: 'If at any time during the term of this Agreement Merchant experiences an unforeseen decrease or increase in its Daily Receipts, Merchant shall have the right, at its sole and absolute discretion but subject to the procedure set forth below, to request retroactive reconciliation of the Estimated Daily Holdback for one (1) full calendar month immediately preceding the day when such request for reconciliation is received by Buyer (each such calendar month, a “Reconciliation Month”).\nSuch reconciliation (the “Reconciliation”) shall be performed by Buyer within five (5) Workdays following its receipt of the Merchant’s request by crediting any over-collected difference back to Merchant, or correcting any under-collection prospectively through the Approved Processor split, so that the total amount collected by Buyer during the Reconciliation Month is equal to the Specified Percentage of the Receipts that Merchant collected during that month. One or more Reconciliation procedures may reduce or increase the effective Estimated Daily Holdback and may shorten or extend the term of this Agreement.',
    source: { kind: 'attorney-drafted', author: null },
    status: 'draft',
    appliesInStates: [],
    examinedBy: [{ review: 'REVIEW-01', findings: ['defined-term-drift', 'undefined-money-terms'] }],
  },
  {
    slug: 'frpa.request-for-reconciliation-procedure-3-2',
    version: 1,
    instrument: 'frpa',
    kind: 'clause',
    includeWhen: null,
    number: '3.2',
    section: 'reconciliation',
    sortKey: 20,
    heading: 'Request for Reconciliation Procedure',
    body: 'It shall be Merchant’s sole responsibility to initiate Reconciliation by sending a written request to Buyer. Each request shall include a copy of Merchant’s bank statement and credit card processing statements for the Reconciliation Month at issue (the “Reconciliation Information”) and shall be received by Buyer within thirty (30) Workdays after the last day of the Reconciliation Month at issue. A request received after that period is not nullified; Buyer shall perform the Reconciliation for the month at issue if the Reconciliation Information supports it. Notwithstanding Section 7.3, a request for Reconciliation or an Adjustment may be sent by email to the address stated in Section 1, and is effective on receipt.\nMerchant shall have the right to request Reconciliation as many times during the term of this Agreement as it deems proper, provided that each request is made in accordance with this section. If a request is made after the expiration of the term of this Agreement and the total amount actually collected by Buyer is less than the Purchased Amount, the term of this Agreement shall automatically be extended until the total amount collected equals the Purchased Amount.\nNothing in this section shall modify the Estimated Daily Holdback for any calendar month other than the Reconciliation Month(s) as the result of the Reconciliation.',
    source: { kind: 'attorney-drafted', author: null },
    status: 'draft',
    appliesInStates: [],
    examinedBy: [
      {
        review: 'REVIEW-01',
        findings: [
          'acceleration-defeats-indefinite-term',
          'reconciliation-right-conditioned-into-near-nullity',
          'reconciliation-switched-off-by-any-breach',
        ],
      },
    ],
  },
  {
    slug: 'frpa.failure-to-provide-reconciliation-information-3-3',
    version: 1,
    instrument: 'frpa',
    kind: 'clause',
    includeWhen: null,
    number: '3.3',
    section: 'reconciliation',
    sortKey: 30,
    heading: 'Failure to Provide Reconciliation Information',
    body: 'If Merchant requests a Reconciliation and fails to provide the Reconciliation Information within five (5) Workdays after the request, Buyer may consider the request withdrawn. If Buyer requests a reconciliation and Merchant fails to provide the Reconciliation Information within five (5) Workdays, Buyer may adjust the Estimated Daily Holdback based on the best information reasonably available. Any request for reconciliation must be initiated prior to the payoff of the Purchased Amount plus any other sums due. Merchant’s refusal to deliver Reconciliation Information pursuant to Buyer’s request may be considered interference with Buyer’s rights and deemed a default of this Agreement.',
    source: { kind: 'attorney-drafted', author: null },
    status: 'draft',
    appliesInStates: [],
    examinedBy: [
      {
        review: 'REVIEW-01',
        findings: [
          'frpa-undefined-capitalised-terms',
          'periodic-amount-undefined-fixed-draw-residue',
          'reconciliation-right-conditioned-into-near-nullity',
          'reconciliation-switched-off-by-any-breach',
          'undefined-money-terms',
        ],
      },
    ],
  },
  {
    slug: 'frpa.adjustment-of-the-estimated-daily-holdback-3-4',
    version: 1,
    instrument: 'frpa',
    kind: 'clause',
    includeWhen: null,
    number: '3.4',
    section: 'reconciliation',
    sortKey: 40,
    heading: 'Adjustment of the Estimated Daily Holdback',
    body: 'If at any time during the term of this Agreement Merchant experiences a steady decrease in its Receipts, Merchant shall have the right, at its sole and absolute discretion, to request a modification (the “Adjustment”) of the Estimated Daily Holdback. Where the request is supported by the Reconciliation Information, Buyer shall grant the Adjustment; Buyer has no discretion to withhold it. The Adjustment shall become effective as of the date the request is received by Buyer, and the new Adjusted Daily Holdback shall replace and supersede the Estimated Daily Holdback set forth above. The Adjustment shall be performed by Buyer within five (5) Workdays following its receipt of the request. Merchant’s right to request Reconciliation under Section 3.1 and an Adjustment under this Section survives an Event of Default and may be exercised while an Event of Default is continuing. One or more Adjustments may substantially extend the term of this Agreement.',
    source: { kind: 'attorney-drafted', author: null },
    status: 'draft',
    appliesInStates: [],
    examinedBy: [
      {
        review: 'REVIEW-01',
        findings: [
          'defined-term-drift',
          'frpa-undefined-capitalised-terms',
          'periodic-amount-undefined-fixed-draw-residue',
          'undefined-money-terms',
        ],
      },
    ],
  },
];
