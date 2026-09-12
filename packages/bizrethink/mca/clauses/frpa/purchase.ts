import type { McaClause } from '../types';

/**
 * Sections 2 and 3 — the sale, its collection and its reconciliation.
 *
 * ALL TEN ARE AUTHORED. §2.1–§2.6 and the definitions were rewritten on
 * 2026-09-10 under
 * [ADR 0012](../../../../../docs/adr/0012-the-baseline-document-is-input-not-specification.md),
 * as the spine the rest of the corpus depends on: one purchased share, one
 * settlement base, one aggregate cap, one delivery cap that does not float.
 * §§3.1–3.4 followed immediately, because they reconciled against a base the
 * definitions clause had moved underneath them — every deadline and every
 * credit mechanic in Section 3 was written for a wider number than the one
 * Buyer now collects on.
 *
 * TWO TESTS HOLD THIS FILE TOGETHER, AND THEY ASK DIFFERENT QUESTIONS.
 * `__tests__/one-settlement-base.test.ts` asks whether the six spine clauses
 * agree with each other: the base is defined once, `Receipts` and `Daily
 * Receipts` are bridged to it, and the grant, the collection clause and the
 * completion test all measure the same asset.
 * `__tests__/reconciliation-cannot-be-switched-off.test.ts` asks whether the
 * reconciliation four can be conditioned out of existence — which is how v4
 * defeated them, not by denying the right but by attaching eight separate
 * conditions to it. Both were red on every substantive assertion before their
 * bodies existed.
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
    whyThisClause: {
      kind: 'implements',
      citation:
        'O.C.G.A. §10-1-393.18(e)(4); Utah Code §7-27-202(3); K.S.A. §75-784(b)(5); Mo. Rev. Stat. §427.300.3(2)(e) (variable-payment methodology in covered agreements)',
    },
    variance: {
      kind: 'fixed',
      because: 'no-alternative',
      note: 'The settlement-base answers currently select the same net-receipts definition; a gross definition with consistent collection and disclosure terms is not authored.',
    },
    version: 1,
    instrument: 'frpa',
    kind: 'clause',
    includeWhen: null,
    section: 'purchase',
    sortKey: 5,
    heading: 'Definitions',
    body: 'In this Agreement:\n“Workday” means a day other than a Saturday, a Sunday or a federal banking holiday.\n“Approved Processor” means each credit and debit card processor identified in the Merchant and Funding Information grid and each processor added under Section [[clause:frpa.approved-bank-account-2-4]]. “Approved Bank Account” means each deposit account identified in the Merchant and Funding Information grid and each account added under Section [[clause:frpa.approved-bank-account-2-4]]. “Bank” means a bank that maintains an Approved Bank Account.\n“Card Receipts” means the net credit and debit card settlement proceeds actually payable to Merchant by an Approved Processor for Merchant’s ordinary-course sales, after refunds, chargebacks, separately identified taxes and gratuities payable to others, and that Approved Processor’s own lawful ordinary charges and reserves as shown on Merchant’s settlement statements. Those charges and reserve arrangements, as they stand on the Purchase Date, are disclosed to Merchant in writing before the Purchase Date, and a material change to either is disclosed promptly. Neither party may change or arrange them in order to alter the economics stated in the Merchant and Funding Information grid. Charges billed at merchant level for equipment leased or subscribed from {{equipmentAffiliate}} are not deducted in determining Card Receipts. A released reserve is a Card Receipt when it becomes payable, and only to the extent it is attributable to a sale generated on or after the Purchase Date. Each refund, chargeback, reserve and release is traced to the sale it arises from and counted once; the same adjustment may not both reduce an amount credited to Buyer and reduce Card Receipts. Transfers between Merchant’s own accounts, capital contributions, financing proceeds, and the proceeds of sales generated before the Purchase Date are not Card Receipts.\n“Receipts” and “Daily Receipts”, wherever used in this Agreement, mean Card Receipts, unless the provision using the term says otherwise in terms.\n“Specified Percentage” means the percentage stated in the Merchant and Funding Information grid. It does not increase on an Event of Default.\n“Purchase Price”, “Factor Rate”, “Purchased Amount”, “Net Amount Funded” and “Estimated Daily Holdback” mean the amounts completed and itemized in the Merchant and Funding Information grid, and the Purchased Amount is subject to Section [[clause:frpa.completion-threshold-2-6]]. “Purchase Date” has the meaning given in Section [[clause:frpa.timing-and-method-of-funding-4-13]]. “Purchased Receipts” has the meaning given in the sale above. “Remaining Balance” and “Completion Threshold” have the meanings given in Section [[clause:frpa.completion-threshold-2-6]].\nAn estimate in this Agreement, including the Estimated Daily Holdback, states no maturity date and creates no obligation to deliver any amount by any date.',
    source: { kind: 'attorney-drafted', author: null },
    status: 'draft',
    appliesInStates: ['US-GA', 'US-UT', 'US-KS', 'US-MO'],
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
    /*
      LAST SENTENCE ADDED 2026-09-10, and it is here rather than in §5.5 because
      §5.5 is now gated on `equipment !== 'none'`.

      §5.5 carries "takes no interest in a policy that would pay Buyer because
      Merchant's Card Receipts have fallen". That is characterisation-load-bearing
      in EVERY template: a funder insured against non-generation has not taken the
      risk of non-generation, whatever §2.1 recites. Behind an equipment gate it
      vanishes from a no-equipment funder's agreement, which is exactly the
      template where the recital is doing the most work alone.

      Widened past insurance to guaranty and indemnity, because the defect is the
      arrangement rather than its name. Found by the representations cluster,
      which could not fix it itself — adding a 98th clause trips the count
      `frpa-coverage` pins.
    */
    slug: 'frpa.sales-of-receipts-not-a-loan-2-1',
    whyThisClause: { kind: 'discretionary' },
    variance: {
      kind: 'fixed',
      because: 'load-bearing',
      note: 'The contingent purchase needs its non-generation risk and limits on recourse stated consistently with the grant and remedies; a label alone does not determine legal characterization.',
    },
    version: 1,
    instrument: 'frpa',
    kind: 'clause',
    includeWhen: null,
    section: 'purchase',
    sortKey: 10,
    heading: 'Sales of Receipts; Not a Loan',
    body: 'The parties intend a present purchase of a contingent interest in future Card Receipts, on the terms of the sale stated above. There is no maturity date, no minimum collection, and no obligation on Merchant to deliver Card Receipts that are never generated. The Purchase Price is negotiated consideration for the Purchased Receipts. Merchant makes no representation or warranty as to the fair market value of the Purchased Receipts or as to what Buyer will collect. Buyer’s remedies are limited by Section [[section:default]], and the Guaranty is limited by the separately signed Personal Guaranty of Performance. How this transaction is characterized, and whether it is enforceable, are determined by applicable law and by how this Agreement actually operates, not by this Section. No party waives any usury or other defence that law does not permit to be waived, and no provision of this Agreement permits Buyer to collect an amount that law does not permit it to collect. Buyer shall promptly refund any amount it collects in excess of its lawful entitlement. Buyer holds no insurance, guaranty, indemnity or other arrangement that would pay Buyer because Card Receipts have fallen or were not generated, and takes no interest in one.',
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
    whyThisClause: {
      kind: 'implements',
      citation:
        'O.C.G.A. §10-1-393.18(e)(4); Utah Code §7-27-202(3); K.S.A. §75-784(b)(5); Mo. Rev. Stat. §427.300.3(2)(e) (variable-payment methodology in covered agreements)',
    },
    variance: {
      kind: 'fixed',
      because: 'load-bearing',
      note: 'The purchase needs a rule tying remittances to actual receipts and a completion event; removing this rule cannot supply the missing ACH collection alternatives.',
    },
    version: 1,
    instrument: 'frpa',
    kind: 'clause',
    includeWhen: null,
    section: 'purchase',
    sortKey: 20,
    heading: 'Collection Mechanism and Term',
    body: 'Buyer collects only the Specified Percentage of actual Card Receipts, and only through an Approved Processor under Section [[clause:frpa.primary-collection-split-funding-via-approved-processor-2-3]]. If Merchant generates no Card Receipts in a period, nothing is due for that period and no arrears accrue for it. The Estimated Daily Holdback is informational: it does not authorize a fixed debit, a minimum remittance, a catch-up collection or a payoff date, and Buyer may not collect a fixed amount under this Agreement. What Buyer collects rises and falls with Merchant’s actual Card Receipts and may be more or less than the Estimated Daily Holdback on any Workday. This Agreement continues until the Completion Threshold in Section [[clause:frpa.completion-threshold-2-6]] is attained, or until it is cancelled under Section [[clause:frpa.right-to-cancel-4-14]] or otherwise lawfully terminated. It has no maturity date, and the risk that a decline or failure of Merchant’s business leaves the Purchased Amount undelivered is Buyer’s under Section [[clause:frpa.sales-of-receipts-not-a-loan-2-1]].',
    source: { kind: 'attorney-drafted', author: null },
    status: 'draft',
    appliesInStates: ['US-GA', 'US-UT', 'US-KS', 'US-MO'],
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
    whyThisClause: { kind: 'discretionary' },
    variance: {
      kind: 'fixed',
      because: 'load-bearing',
      note: 'Removing the split rule would leave the agreement without a collection mechanism. Processor acceptance is required for the deal to proceed, not a reason to omit the instruction from the template.',
    },
    version: 1,
    instrument: 'frpa',
    kind: 'clause',
    includeWhen: null,
    section: 'purchase',
    sortKey: 30,
    heading: 'Primary Collection: Split Funding via Approved Processor',
    body: 'Merchant authorizes each Approved Processor, by a Split Funding Authorization in the form of the Split Funding Authorization exhibit signed separately for that processor, to remit the Specified Percentage of Card Receipts to Buyer and the balance to Merchant. A Split Funding Authorization shall state the settlement base, the Specified Percentage, a transaction reference, a reconciliation contact, and how the instruction is stopped. It shall not authorize a fixed or minimum remittance, an increase in the Specified Percentage, a debit to any deposit account of Merchant, or the collection of any amount other than the Purchased Receipts.\nOne aggregate cap applies across every Approved Processor: the total remitted to Buyer under all Split Funding Authorizations shall not exceed the Purchased Amount. Buyer shall set and update each processor’s limit so that it does not. Buyer bears the risk of a settlement or instruction delay and shall refund any excess under Section [[clause:frpa.completion-threshold-2-6]].\nAn Approved Processor is not a party to this Agreement and this Agreement does not bind it. Buyer shall obtain each Approved Processor’s written acceptance of the Split Funding Authorization before the Purchase Date, and is responsible for sending it accurate commencement, correction and termination instructions. If an Approved Processor does not accept, or does not perform, Buyer’s route is the replacement arrangements in Section [[clause:frpa.approved-bank-account-2-4]] and not a claim against Merchant. A processor’s own form does not amend this Agreement; an amendment requires a writing signed by Merchant and Buyer, together with any disclosure the law then requires.',
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
    whyThisClause: { kind: 'discretionary' },
    variance: {
      kind: 'fixed',
      because: 'load-bearing',
      note: 'The split design needs identified processors and accounts, replacement arrangements and a rule for interrupted settlements; no alternate collection mechanism is authored.',
    },
    version: 1,
    instrument: 'frpa',
    kind: 'clause',
    includeWhen: null,
    section: 'purchase',
    sortKey: 40,
    heading: 'Approved Bank Account',
    body: 'Merchant shall identify in the Merchant and Funding Information grid each Approved Bank Account and each Approved Processor through which Card Receipts settle, and shall keep the split under Section [[clause:frpa.primary-collection-split-funding-via-approved-processor-2-3]] in place through them. Merchant may add or replace an account or a processor on notice to Buyer; Buyer shall not unreasonably withhold, condition or delay approval, and shall cooperate in putting a replacement Split Funding Authorization in place. An account or processor added under this Section becomes an Approved Bank Account or an Approved Processor. Merchant may use any other account for funds that are not Purchased Receipts.\nMerchant shall notify Buyer before a planned change that affects the collection of Purchased Receipts, and promptly after learning of an unplanned interruption. While an interruption continues, Merchant shall account for the Purchased Receipts it actually receives and shall remit them under Section [[clause:frpa.return-of-buyer-proceeds-7-16]]. A failure, outage or withdrawal of service by a Bank or an Approved Processor, and a good-faith change made under this Section, are not an Event of Default. Directing Card Receipts away from an Approved Processor with the intent to defeat the split is a breach of this Section.',
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
    whyThisClause: { kind: 'discretionary' },
    variance: {
      kind: 'fixed',
      because: 'load-bearing',
      note: 'The purchase needs one ending balance, a stop instruction, refunds and release of its filings; removing this clause would leave collection without a contractual stopping rule.',
    },
    version: 1,
    instrument: 'frpa',
    kind: 'clause',
    includeWhen: null,
    section: 'purchase',
    sortKey: 60,
    heading: 'Completion Threshold',
    body: '“Remaining Balance” means, at any time, the Purchased Amount less every amount credited to it, after any correction made under Section [[section:reconciliation]]. It never includes a fee, an equipment charge, a cost of enforcement, or an amount owed under any other agreement, and no amount charged after the Purchase Date increases it.\nThis Agreement is complete, and Buyer’s right to receive Purchased Receipts ends, when the Remaining Balance reaches zero, or when this Agreement is cancelled or otherwise lawfully terminated without a continuing right to Purchased Receipts (the “Completion Threshold”). That is the only test of completion, and it governs wherever another provision of this Agreement describes completion differently.\nOn the Completion Threshold, Buyer shall instruct every Approved Processor to stop withholding immediately, shall confirm completion to Merchant within two (2) Workdays, and shall refund any amount collected above the Purchased Amount within five (5) Workdays after it is identified. Buyer shall give Merchant a final ledger, and shall file or authorize the release of every filing that records its interest, within ten (10) Workdays, or sooner where law requires.\nBuyer shall identify to Merchant promptly any unresolved correction relating to the purchase, and may not resume withholding after the Completion Threshold without Merchant’s written agreement or an order of a court. A refund or chargeback arising after completion does not reopen this Agreement, create damages, or create liability for a Guarantor. A proved claim of fraud or intentional diversion remains subject to Section [[section:default]] and the separately signed Personal Guaranty of Performance.',
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
  /*
    WHAT WAS WRONG. Not a denial of the right — a set of conditions on it. The
    trigger was an "unforeseen" decrease or increase, so a merchant whose
    receipts fell for a reason anyone could have foreseen had nothing to ask
    for. The reach was ONE calendar month immediately preceding the request, so
    an error four months old was unreachable however plainly it was an error.
    Initiation was Merchant's alone. And the correction ran both ways: an
    over-collection came back, an under-collection was "corrected prospectively
    through the Approved Processor split", which is a catch-up by raising the
    percentage, described as a correction.

    That last mechanic is the one REVIEW-01 caught from the other end.
    `periodic-amount-undefined-fixed-draw-residue` observes that a true
    percentage of settlement CANNOT over-collect, so §3's crediting machinery
    only makes sense if a fixed amount is being drawn — the residue of the ACH
    architecture the v3→v4 restructure was meant to remove. Its recommended fix
    is exactly this clause's job: recast the crediting as correcting processor
    mis-withholding rather than as truing up a periodic draw.

    WHAT CHANGED. Reconciliation is verification and correction. Either party
    may initiate, at any time, for any period, on no showing about trading, and
    while a default is alleged or after completion. Buyer reconciles monthly
    whether or not anyone asks — a right nobody exercises is not evidence the
    percentage operated. An over-collection is refunded on a clock that starts
    from information Buyer already has. An under-collection is corrected ONLY by
    the percentage continuing to operate on receipts as they are generated,
    which is the whole of the correction that a purchase of a share permits.

    DEPARTURES FROM THE MEMO. Six.
    (1) The memo leaves the UNDER-collection route unstated. Silence would leave
        v4's "prospectively through the Approved Processor split" as the implied
        mechanic, so it is stated and closed.
    (2) The memo's prohibition is percentage, minimum remittance and extended
        deadline. Added: an account debit and a fee. Both reach the same
        catch-up by another road, and §2.3 already forbids the debit at
        processor level — leaving it out here would make the two clauses differ
        on the same question.
    (3) "Information already available to Buyer" is written to include what it
        can obtain from an Approved Processor or through electronic account
        access Merchant has authorized. That access is §4.16, which is another
        cluster's clause; it is described rather than cited, because a number
        that cluster may move would otherwise become a dangling cross-reference.
    (4) Added the sentence putting a correction into the Remaining Balance.
        §2.6 defines that balance "after any correction made under Section 3"
        and, until this sentence, nothing in Section 3 said a correction reached
        the ledger at all.
    (5) The heading was "Merchant's Right to Reconciliation". With either party
        initiating and Buyer under a standing monthly duty, that misdescribes
        the clause; it is "Reconciliation".
    (6) The memo's "a decline in receipts creates no arrearage" is kept and
        paired with the amount-becomes-due negation, because "arrearage" is the
        label and "no amount becomes due" is the operative consequence. §2.2
        already says the same thing for a period with no Card Receipts; these
        two must not diverge.
    (7) The memo negates an "unforeseen or sustained" change; "steady" is added
        to the list, because that is §3.4's own trigger word and one clause of
        this section should not negate a gate the next one still imposes.

    THE CROSS-REFERENCE THE SPINE HANDED OVER, DISCHARGED HERE. v4 reconciled
    against "the Receipts that Merchant collected during that month" — gross,
    everything, including refunded and charged-back sales and the processor's
    own charges. Buyer collects on Card Receipts, which is net of all of those.
    Reconciling a net collection against a gross base manufactures a permanent
    apparent under-collection in Buyer's favour, every month, on every deal. The
    definitions bridge would have hidden it rather than fixed it, which is why
    this clause names Card Receipts in terms.

    A CONFLICT HANDED ON, NOT RESOLVED. "Buyer shall not increase the Specified
    Percentage ... in order to recover the difference" is narrower than §6.2.1,
    which raises the percentage to 100% on default. This clause speaks only to
    recovering an estimate shortfall, so the two do not collide on their face;
    the real collision is between §6.2.1 and the definitions clause, and
    `default-remedies` owns it.

    UNVERIFIED AUTHORITY. The memo's assessment rests on Richmond Capital,
    246 AD3d 585, for the proposition that what decides these cases is whether
    the promised percentage actually operated. REVIEW-01 cites LG Funding,
    181 AD3d 664, factor (1) — "whether there is a reconciliation provision" —
    and the Davis v. Richmond Capital Group line, 194 AD3d 516 (1st Dep't 2021),
    for a discretionary reconciliation being illusory; its own note records that
    holding as stated from memory. Apollo Funding 241 AD3d 1508, NewCo
    250 AD3d 1641, Principis and Grafton are cited around them in the memo.
    NOBODY ON THIS PROJECT HAS PULLED ANY OF THESE FROM THE OFFICIAL REPORTERS.
    Recorded here, never in a body.
  */
  {
    slug: 'frpa.merchant-s-right-to-reconciliation-3-1',
    whyThisClause: { kind: 'discretionary' },
    variance: {
      kind: 'fixed',
      because: 'load-bearing',
      note: 'Verification and correction preserve the actual purchased percentage and aggregate cap; reconciliation cannot disappear when receipts fall or a default is alleged.',
    },
    version: 1,
    instrument: 'frpa',
    kind: 'clause',
    includeWhen: null,
    section: 'reconciliation',
    sortKey: 10,
    heading: 'Reconciliation',
    body: 'Reconciliation is verification and correction. Either Merchant or Buyer may request a reconciliation at any time, for any period, and without showing an unforeseen, steady or sustained change in Card Receipts. A request may be made while an Event of Default is alleged or continuing, and after the Completion Threshold is attained. Buyer shall in addition reconcile each Approved Processor’s ledger against the Card Receipts settled to Merchant at least once each month, whether or not Merchant has asked it to.\nA reconciliation compares the amount actually credited to the Purchased Amount for the period with the Specified Percentage of the Card Receipts actually generated in that period. Buyer shall give Merchant the calculation and shall refund any amount over-collected within five (5) Workdays after it has sufficient information, counting as sufficient the information already in Buyer’s possession or obtainable by it from an Approved Processor or through electronic account access Merchant has authorized. A correction under this Section reduces or increases the Remaining Balance under Section [[clause:frpa.completion-threshold-2-6]] accordingly.\nAn under-collection is corrected only by the continued operation of the Specified Percentage on Card Receipts as they are generated. Buyer shall not increase the Specified Percentage, impose a minimum or fixed remittance, debit an account of Merchant, set or extend a deadline, or charge a fee, in order to recover the difference between the Estimated Daily Holdback and what the Specified Percentage actually produced. A decline in Card Receipts creates no arrearage, and no amount becomes due because a period produced less than the Estimated Daily Holdback. A documented failure to remit Purchased Receipts that were actually generated is dealt with under Section [[clause:frpa.return-of-buyer-proceeds-7-16]].',
    source: { kind: 'attorney-drafted', author: null },
    status: 'draft',
    appliesInStates: [],
    examinedBy: [{ review: 'REVIEW-01', findings: ['defined-term-drift', 'undefined-money-terms'] }],
  },
  /*
    WHAT WAS WRONG. Four conditions, each defensible alone. Initiation was
    Merchant's "sole responsibility"; every request had to carry a bank
    statement AND a processing statement for the month at issue; there was a
    thirty-Workday window; and a request made after the term had expired
    AUTOMATICALLY EXTENDED the agreement until Buyer had collected the whole
    Purchased Amount.

    The last is the worst thing in this cluster and it is easy to read past. It
    converts the merchant's own request for a reconciliation into a guarantee of
    the full sum — the merchant asks whether it was over-charged and, by asking,
    revives an obligation the completion test had ended. It is
    `acceleration-defeats-indefinite-term` pointed the other way: that finding is
    about a term made finite at Buyer's option, this is about a term made
    infinite at the merchant's expense, and both defeat LG Funding factor two.

    v4 had already SOFTENED two of REVIEW-01's three targets — ten Workdays
    became thirty, and "requests received after this period are nullified"
    became "not nullified". A deadline that does not forfeit is not a deadline;
    it is a sentence that makes a merchant think it has missed something. It
    goes entirely rather than being lengthened again.

    WHAT CHANGED. Any reasonable channel, out of §7.3's certified mail. Buyer
    acknowledges in one Workday and starts from what it already holds, which is
    the processor ledger — the merchant's statements are corroboration, not a
    precondition. Buyer may ask for more only where it is reasonably necessary
    and must say what is missing. Nothing is forfeited for lateness, informality
    or repetition. The undisputed part of a calculation is paid while the rest is
    investigated, and there is a named human to argue the arithmetic with.

    DEPARTURES FROM THE MEMO. Five.
    (1) The §7.3 carve-out is not in the memo. It is v4's own, and REVIEW-01's
        `reconciliation-right-conditioned-into-near-nullity` names §7.3 as one
        of the three conditions, so it is kept and widened to cover a §3.4
        request as well. §7.3 is `miscellaneous`'s clause and is untouched here.
    (2) The memo allows a telephone request. No requirement to confirm it in
        writing is added, because a confirmation requirement is a documentary
        precondition wearing a different hat — the exact defect being removed.
    (3) "Repeated" is added to the memo's late-or-informal-or-post-completion
        list. v4 permitted requests "as many times as it deems proper, provided
        that each request is made in accordance with this section", and the
        proviso is where the forfeiture lived.
    (4) The memo deletes the automatic post-completion extension and says
        nothing further. An express negation is added — a post-completion
        request does not extend the Agreement, revive the right to Purchased
        Receipts, or authorize further withholding. Deleting a sentence does not
        answer the question it answered, and §2.6's "may not resume withholding"
        should not have to carry this alone.
    (5) "Applicable statutory limitation periods remain in effect" is written as
        an operative prohibition on shortening one, which is the only version a
        contract can perform. The heading loses "Request for", since the section
        now imposes duties on Buyer rather than describing Merchant's paperwork.

    TWO DEFINED TERMS DROPPED. "Reconciliation Information" and "Reconciliation
    Month" are gone: the first named a fixed documentary bundle that is no
    longer a precondition, the second a one-month reach that no longer exists.
    Nothing else in the corpus cites either — checked across all six instruments
    before removing them, because dropping a term other clauses reach is how
    `frpa-undefined-capitalised-terms` gets recreated in the act of fixing it.
  */
  {
    slug: 'frpa.request-for-reconciliation-procedure-3-2',
    whyThisClause: { kind: 'discretionary' },
    variance: {
      kind: 'fixed',
      because: 'load-bearing',
      note: 'The reconciliation right needs usable request methods, supporting records and a response process; no alternate procedure is authored.',
    },
    version: 1,
    instrument: 'frpa',
    kind: 'clause',
    includeWhen: null,
    section: 'reconciliation',
    sortKey: 20,
    heading: 'Reconciliation Procedure',
    body: 'A request for reconciliation may be made by email to the address stated in the Merchant and Funding Information grid, through any servicing portal Buyer makes available, by telephone, or by any other reasonable method. Section [[clause:frpa.notices-7-3]] does not apply to a request under this Section or to a request under Section [[clause:frpa.adjustment-of-the-estimated-daily-holdback-3-4]]. Buyer shall acknowledge a request within one (1) Workday and shall begin from the processor and account information it already holds.\nBuyer may ask Merchant for further records only where they are reasonably necessary to reconcile the identified period, and shall state what is missing and why it is needed. Merchant shall cooperate reasonably. Where a standard bank or processor statement is unavailable, Buyer shall accept equivalent records, including a processor report or data obtained through electronic account access Merchant has authorized.\nNo request is forfeited because it is late, informal, repeated, or made after the Completion Threshold is attained, and Merchant may request reconciliation as often as it reasonably needs to. A request made after the Completion Threshold does not extend this Agreement, does not revive Buyer’s right to receive Purchased Receipts, and does not authorize any further withholding; Section [[clause:frpa.completion-threshold-2-6]] governs what happens on completion.\nWhere Buyer disputes part of a calculation, it shall resolve and refund the undisputed part within the time stated in Section [[clause:frpa.merchant-s-right-to-reconciliation-3-1]] while it investigates the rest. Buyer shall give Merchant a written calculation showing the figures it used, and the name and contact details of a person who will review it on request. Nothing in this Section shortens a limitation period that applies by law.',
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
  /*
    WHAT WAS WRONG. This is the clause a plaintiff's counsel reads aloud, and it
    is four sentences long. A merchant who asked for a reconciliation and did
    not produce two statements within five Workdays had its request treated as
    WITHDRAWN. A merchant who did not answer Buyer's own request was "considered
    interference with Buyer's rights and deemed a default of this Agreement" —
    and under §6.1.1 an Event of Default is any breach of any covenant, with the
    word "cure" appearing nowhere in the document. That is
    `reconciliation-switched-off-by-any-breach` exactly: the merchant most
    likely to need reconciliation, the one whose receipts fell and who is
    therefore behind on paperwork, is the one the clause disqualifies, and once
    disqualified there is no route back.

    The third sentence is separately wrong. "Any request for reconciliation must
    be initiated prior to the payoff of the Purchased Amount plus any other sums
    due" bars a merchant from ever asking whether it was over-collected, because
    the only moment the question can be answered in full is after collection has
    stopped. The memo names this as incorrect in terms.

    WHAT CHANGED. An incomplete request stays open. Buyer says what is missing,
    allows ten Workdays and more where the cause is not Merchant's, and then
    reconciles anyway on the best reliable information — stating what it
    assumed, because a reconciliation built on assumptions the merchant cannot
    see is not a verification of anything. Missing records authorise nothing:
    not a higher percentage, not a fixed remittance, not a refusal to refund,
    not a withdrawal, not a default. Requests may be made after payoff.

    DEPARTURES FROM THE MEMO. Four.
    (1) The memo allows "a reasonable extension for circumstances outside
        Merchant's control". A bank or processor outage is named as an example,
        because §2.4 already provides that such an outage is not an Event of
        Default and the two clauses must not answer the same fact differently.
    (2) Added the duty to state what was assumed when reconciling on incomplete
        information. Without it, "best reliable information available" is a
        discretion, and a discretionary reconciliation is the thing the memo
        says is worth nothing.
    (3) The memo's "Buyer may pursue relief only for conduct independently
        satisfying Section 6.1" is narrowed to a remedy IN RESPECT OF MERCHANT'S
        RECORDS. As written it reads as limiting every remedy in the agreement,
        which is Section 6's subject and not this clause's; a records clause
        that silently rewrites the remedies clause is how contradictions of the
        §5.17-versus-§2.4 kind get made.
    (4) Added the express negation of the deeming provision — making a request,
        or being slow to answer one, is not interference. The memo removes the
        sentence; removing it does not stop Buyer arguing the point, and this
        clause exists precisely because that argument was once printed.

    A WEAKNESS IN THE MEMO'S OWN FIX, REPORTED NOT CURED. "Conduct that
    independently satisfies Section 6.1" is a real limit only if Section 6.1 is
    a real list. As this clause was drafted, §6.1.1 read "Merchant shall violate
    any term or covenant in this Agreement", so almost any conduct satisfied it
    and the cross-reference did less than it reads; the "proved to have caused
    Buyer loss" limb was carrying the sentence. That dependency belongs to
    `default-remedies`, which owns §6.1 and which REVIEW-01 asks to narrow it.
    THIS CLAUSE IS ONLY AS STRONG AS THAT ONE — if §6.1 is ever widened back,
    this limit weakens with it and nothing here will say so.

    UNVERIFIED AUTHORITY. As recorded on §3.1. The LG Funding factor-one
    analysis and the Davis v. Richmond Capital line are what make a switchable
    reconciliation right the centre of a recharacterisation argument; neither
    has been read from an official reporter by anybody on this project.
  */
  {
    slug: 'frpa.failure-to-provide-reconciliation-information-3-3',
    whyThisClause: { kind: 'discretionary' },
    variance: {
      kind: 'fixed',
      because: 'load-bearing',
      note: 'Reconciliation must still operate when records are incomplete; removing this rule would leave the refund and correction process unresolved during an information gap.',
    },
    version: 1,
    instrument: 'frpa',
    kind: 'clause',
    includeWhen: null,
    section: 'reconciliation',
    sortKey: 30,
    heading: 'Incomplete Reconciliation Information',
    body: 'A request that is incomplete remains open. Buyer shall state in writing what is missing, shall allow Merchant at least ten (10) Workdays to supply it, and shall allow a reasonable further period where the delay arises from a cause outside Merchant’s reasonable control, including a bank or processor outage. If information is still missing at the end of that period, Buyer shall reconcile on the best reliable information available to it and shall state what it assumed.\nMissing records, an unavailable statement, and the loss of electronic account access do not by themselves authorize Buyer to increase the Specified Percentage, impose a fixed or minimum remittance, refuse a refund that the available information supports, treat a request as withdrawn, or declare an Event of Default. Making a request, or being slow to answer one, is not interference with Buyer’s rights.\nA request may be made before or after the Purchased Amount has been delivered in full.\nBuyer may pursue a remedy in respect of Merchant’s records only for conduct that independently satisfies Section [[clause:frpa.events-of-default-6-1]] and is proved to have caused Buyer loss. Buyer shall not presume fraud, diversion or concealment from incomplete information.',
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
  /*
    WHAT WAS WRONG. Least of the four, and the memo says so: the mandatory grant
    and the survival sentence are protective and they stay. Three things did not
    work. The trigger was a "steady decrease", so an abrupt one did not qualify.
    The grant was conditioned on "the Reconciliation Information", carrying
    §3.2's documentary precondition into a clause that only needs Buyer's own
    ledger. And the new figure "replaced and superseded" the Estimated Daily
    Holdback — which is `periodic-amount-undefined-fixed-draw-residue`
    showing through. An informational illustration cannot be superseded by
    another informational illustration in any sense that matters; the sentence
    only means something if a fixed amount is being drawn, which is precisely
    the architecture the v3→v4 restructure was supposed to have removed.

    WHAT CHANGED. The request needs no showing at all. Buyer computes the update
    from the Card Receipts data it holds. And the clause now says the four
    things an updated estimate does NOT do — alter the Specified Percentage,
    change what §2.2 collects, oblige Merchant to deliver any amount, or fix a
    date for delivery of the Purchased Amount. That is the point of the memo's
    note: adjusting an informational estimate must not silently change the
    actual settlement percentage, and "informational" is a word v4 also used
    while making the new figure supersede the old one.

    DEPARTURES FROM THE MEMO. Three.
    (1) "Applies from the request date for reporting purposes" is written as
        applying from the date the request was received — v4's own trigger — and
        the "for reporting purposes" qualifier is expanded into the four express
        negations. The qualifier alone repeats the mistake it is correcting.
    (2) The defined terms "Adjustment" and "Adjusted Daily Holdback" are
        dropped, and the clause speaks of an updated Estimated Daily Holdback.
        Nothing in the corpus cites either term — checked. Introducing a
        capitalised term that `frpa.definitions` does not point at would
        recreate `frpa-undefined-capitalised-terms`, and this cluster may not
        edit the definitions clause to add one. The heading keeps the ordinary
        word "Adjustment", which now carries no defined meaning.
    (3) The memo's survival sentence covers "reconciliation and adjustment
        rights". It is written to cover §§3.1–3.3 and this Section by number, so
        that a reader of §3.3 — the clause that used to switch the right off —
        finds the survival rule from where the argument will start.

    v4's LAST SENTENCE IS DELETED WITHOUT REPLACEMENT. "One or more Adjustments
    may substantially extend the term of this Agreement" was true only on the
    fixed-draw reading. On a percentage of Card Receipts, changing an estimate
    changes nothing about when the Purchased Amount is delivered; §2.6's
    Completion Threshold decides that and nothing else does.
  */
  {
    slug: 'frpa.adjustment-of-the-estimated-daily-holdback-3-4',
    whyThisClause: { kind: 'discretionary' },
    variance: {
      kind: 'fixed',
      because: 'no-alternative',
      note: 'The holdback remains an informational estimate under every currently authored collection rule; the fact does not supply an alternative fixed-payment adjustment clause.',
    },
    version: 1,
    instrument: 'frpa',
    kind: 'clause',
    includeWhen: null,
    section: 'reconciliation',
    sortKey: 40,
    heading: 'Adjustment of the Estimated Daily Holdback',
    body: 'Merchant may request an updated Estimated Daily Holdback at any time, and need not show a decline that is steady or sustained. Buyer shall calculate a supported update from the Card Receipts data then available to it and shall communicate it to Merchant within five (5) Workdays after the request. The update applies from the date the request was received.\nAn updated Estimated Daily Holdback is informational. It restates the illustration given in the Merchant and Funding Information grid, and does not alter the Specified Percentage, does not change what Buyer collects under Section [[clause:frpa.collection-mechanism-and-term-2-2]], does not create an obligation on Merchant to deliver any amount, and does not fix a date by which the Purchased Amount is to be delivered. What Buyer collects continues to rise and fall with actual Card Receipts.\nThe rights given by Sections [[clause:frpa.merchant-s-right-to-reconciliation-3-1]], [[clause:frpa.request-for-reconciliation-procedure-3-2]], [[clause:frpa.failure-to-provide-reconciliation-information-3-3]] and this Section survive an alleged or continuing Event of Default and remain exercisable after the Completion Threshold is attained, so that a collection already made can be verified, corrected and refunded.',
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
