import type { McaClause } from '../types';

/**
 * The deal itself — Section 1’s notes, the parties, the grant.
 *
 * ALL SIX ARE NOW AUTHORED. `frpa.holdback-explainer` and
 * `frpa.granting-clause` were rewritten by the spine cluster on 2026-09-10 under
 * [ADR 0012](../../../../../docs/adr/0012-the-baseline-document-is-input-not-specification.md):
 * the baseline is drafting input, not specification, and reproducing it is not
 * a goal. `frpa.parties`, `frpa.equipment-cost-explainer` and
 * `frpa.equipment-cost-exclusivity` were rewritten by the enrollment cluster the
 * same day, under the same ADR, and `frpa.rollover-method-election` by
 * `renewal-positions` after it — last, because an election is incoherent until
 * the mechanism it elects between is settled.
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
  /*
    WHAT WAS WRONG. Not the safeguard — the safeguard is the best thing in the
    clause and the memo keeps it. What was wrong is the first limb of the choice
    it offers: *"the cost is added to the Purchased Amount and repaid through the
    Specified Percentage"*. That commingles equipment consideration with the
    receivables purchase, and it is the sentence that makes `frpa-sub-equipment-lien-conflict`
    and the disclosure defect below possible at once.

    WHAT CHANGED. Equipment is bought or leased under a separate written
    agreement that identifies the equipment, the seller or lessor, the cash
    price, the taxes, who ends up owning it and any recurring charge — so a
    merchant can see what it is paying for before it agrees. Where Merchant
    elects to buy for cash, the price comes out of the Purchase Price as an
    itemized, separately authorized line in Section 1.4, which is where §4.1
    already requires every deduction to appear as a dollar figure before
    signature. Nothing is added on top of the factored Purchased Amount. The
    no-double-charge safeguard survives word for word in substance.

    THE ARITHMETIC IS NOT A PREFERENCE, IT IS FORCED BY §2.6. The spine's
    Remaining Balance *"never includes a fee, an equipment charge, a cost of
    enforcement"*, and the Remaining Balance is the Purchased Amount less
    credits. A Purchased Amount computed as (Purchase Price × Factor Rate) +
    Equipment Cost Deferred therefore puts an equipment charge inside the
    Remaining Balance by construction, and §2.6 and §003 cannot both stand. The
    spine landed first and is the base this cluster drafts against.

    DEPARTURE FROM THE BRIEF'S `my_note`, AND IT IS A REAL ONE. The note says
    removing deferred equipment is a product decision with revenue consequences
    that should wait until 100/101 clear, and asks for the Equipment Lease and
    the Subscription to be read first. Drafting cannot sit on the fence: the
    clause either states an addition or it does not. What is reported instead is
    that the revenue consequence is smaller than it looks — equipment can still
    be funded, out of the Purchase Price, with the factor applied to a Purchase
    Price that includes it. What goes is only the structure that applies the
    factor and *then* adds the goods price on top. If the owner wants deferral
    back, §2.6's sentence has to change with it, and `LOMBARD_FACTS.equipment`
    moves from `deferred` to `purchased-at-funding`. Neither is this cluster's
    file.
  */
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
    body: 'What is the Equipment Cost? Point-of-sale equipment is bought or leased under a separate written agreement, and that agreement — not this one — governs it. It identifies the equipment, the seller or lessor, the cash price, any taxes, who owns the equipment, when it is delivered, and any recurring charge. If Merchant elects to buy the equipment for cash, Merchant may separately authorize the price as an itemized deduction from the Purchase Price, shown as a dollar figure in the itemization in Section 1.4 before Merchant signs. If Merchant instead leases or subscribes for the equipment from {{equipmentAffiliate}}, no equipment amount is deducted at funding and both equipment figures in Section 1 are stated as $0.00 rather than left blank. No equipment charge is added to the Purchased Amount or to the Remaining Balance, and “Equipment Cost Deferred” in Section 1.3 is stated as $0.00. Merchant does not pay for the same equipment twice: where an equipment price has been deducted at funding, no lease or subscription charge is payable for that equipment, and where a lease or subscription charge is payable, no equipment price is deducted. A charge billed at merchant level for equipment leased or subscribed from {{equipmentAffiliate}} does not reduce Card Receipts. Where the law requires an equipment or related service charge to be reflected in a disclosure given with this Agreement, it is reflected as that law requires; the description of a charge in this Agreement decides nothing about how the law treats it.',
    source: { kind: 'attorney-drafted', author: null },
    status: 'draft',
    appliesInStates: [],
    examinedBy: [{ review: 'REVIEW-02', findings: [] }],
  },
  /*
    THE CRITICAL ONE IN THIS CLUSTER, AND THE DEFECT IS ONE SENTENCE.

    WHAT WAS WRONG. *"Because that amount is the price of goods and not a cost of
    the financing, it is excluded from the finance charge and from the amount
    financed stated on any state disclosure accompanying this Agreement."*

    Finance charge and amount financed are two DIFFERENT statutory calculations
    with different definitions, and a charge cannot be outside both by
    description — if it is genuinely a goods price funded by the transaction it
    belongs in the amount financed, and if it is a charge required as a condition
    of funding it belongs in the finance charge. An affiliate charge that a
    merchant must accept to get funded is the textbook inclusion case, not the
    textbook exclusion. The clause also had a private party declaring the
    contents of a disclosure field a state regulator defines, which is the
    disclosure-surface half of ADR 0008 being decided on the agreement surface.

    WHAT CHANGED. The exclusion is deleted outright. The clause now says the
    opposite thing: the calculation is the law's, Buyer performs it, and nothing
    in this Agreement determines the answer. The exclusivity rule survives —
    it is what stops the same equipment being charged twice — and the formula is
    restated without the addition, for the §2.6 reason set out above §002.

    DEPARTURE FROM THE MEMO. The memo says "Buyer shall calculate the finance
    charge, amount financed or funds provided, disbursement amount, and other
    required disclosure fields under applicable law". Kept, but pointed at the
    fields the statutes actually name rather than listing four of them, because
    the eleven tracked states do not use one vocabulary and an incomplete list
    reads as an exhaustive one.

    GATED, per the brief's `action: both` on `equipment`. A funder that sells no
    equipment has no exclusivity rule to state, and the disclosure sentence
    inside it would then be the only place the corpus says who computes a
    disclosure field — which would be the wrong home for it. NOT a departure but
    worth naming: the general proposition survives outside the gate, because
    §002 carries the same sentence and both gates are identical.

    UNVERIFIED. The memo cites NY Fin. Servs. Law §803 and Cal. Fin. Code §22802
    as the definitional sources. Neither is vendored in
    `packages/bizrethink/mca/sources/` — 23 NYCRR 600 and 10 CCR 900-956 are the
    regulations, not the statutes — and nobody on this project has read either
    section. Recorded here, never in a body.
  */
  {
    slug: 'frpa.equipment-cost-exclusivity',
    version: 1,
    instrument: 'frpa',
    kind: 'clause',
    /*
      Same gate as the explainer above, and deliberately identical: two clauses
      that state one rule between them must appear and disappear together.
    */
    includeWhen: (facts) => facts.equipment !== 'none',
    number: '',
    section: 'funding-terms',
    sortKey: 30,
    heading: '',
    body: 'An equipment amount is deducted at funding or it is not charged under this Agreement at all. “Equipment Cost Deferred” in Section 1.3 is stated as $0.00, and the Purchased Amount in Section 1.3 is the Purchase Price multiplied by the Factor Rate, without any equipment or fee addition. An equipment amount deducted at funding must be separately invoiced, expressly authorized by Merchant, and itemized as a dollar figure in Section 1.4; an amount that does not so appear may not be deducted. Buyer is responsible for calculating the finance charge, the amount financed or funds provided, the disbursement amount, and every other field a disclosure required by law obliges it to state, under the definitions that law supplies and on the commercial facts of this transaction. No description in this Agreement determines whether a charge is included in or excluded from a calculation required by applicable law, and the fact that a charge is called the price of goods decides nothing. A factor rate is not an annual percentage rate.',
    source: { kind: 'attorney-drafted', author: null },
    status: 'draft',
    appliesInStates: [],
    examinedBy: [{ review: 'REVIEW-02', findings: [] }],
  },
  /*
    WHAT WAS WRONG. The row named two methods — "Deduct or Carry" — and so
    described a Section 8.2 that only one kind of funder has. Under
    `renewalModel: 'payoff-only'` §8.2 offers no election at all, and the
    explainer would have sent a merchant looking for a choice the agreement does
    not contain. It also said nothing about what the entry must CONTAIN, which is
    the memo's whole point: a Section 1 row that reads "Carry" discloses a
    treatment and no figures.

    WHAT CHANGED. The row states a treatment and the numbers behind it: the prior
    transaction identified, its settlement amount, any rebate or discount, the
    part of the Purchase Price applied to it, and the resulting Net Amount
    Funded. It may not be blank, and no amount it states may be blank — the
    memo's "No election or amount may remain blank when Merchant signs".

    DEPARTURE FROM THE MEMO — THE CARRY SENTENCE IS CONDITIONAL. The memo's flat
    "No prior balance is carried into the new Purchased Amount" is true of the
    payoff §8.2 and false of the carry one, and this explainer is selected for
    both. It is written as a rule with its exception pointed at the clause that
    decides: nothing is added to the Purchased Amount except as §8.2 expressly
    provides and Merchant has elected in writing before the Agreement issues for
    signature. Under `payoff-only` §8.2 provides nothing, so the sentence bites
    exactly as the memo intends; under `carry` it points at method (b).

    DEPARTURE — "PRIOR TRANSACTION TREATMENT" REPLACES "ROLLOVER METHOD". The
    memo renames the row. The slug does not follow, because a slug is the stable
    identity and renaming one breaks every approval keyed to it (README rule 7).

    THE WIDGET STAYS. `«25»` is the AcroForm anchor the Lombard pipeline injects
    (README rule 2). The row's LABEL changes, which is a form change in
    `lombard-contracts` and is handed back rather than made here — the same
    handoff §4.13 records for the three Section 1 rows it specifies.
  */
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
    body: 'Prior transaction treatment: _________«25»_________. This reads “Not applicable” where Merchant has no prior transaction to be settled out of this funding. Otherwise it states the treatment Merchant has elected under Section 8.2, and identifies the prior transaction, its settlement amount as at the Purchase Date, any rebate or discount applied, the part of the Purchase Price applied to it, and the resulting Net Amount Funded. Nothing is added to the Purchased Amount in Section 1.3 except as Section 8.2 expressly provides and Merchant has elected in writing before this Agreement is issued for signature. This entry may not be blank when Merchant signs, and no amount it states may be left blank.',
    source: { kind: 'attorney-drafted', author: null },
    status: 'draft',
    appliesInStates: [],
    examinedBy: [{ review: 'REVIEW-02', findings: [] }],
  },
  /*
    WHAT WAS WRONG. Three things, none of them fatal, which is why the memo
    rates it Moderate and the disposition is still REPLACE IN FULL.

    (1) "the “Merchant” or “Seller”" defines a second name for the same party
        and then no clause in any of the six instruments ever uses it —
        `defined-term-drift` in its cheapest form. A reader who meets "Seller"
        in a later draft has no way to know it is not a third party.
    (2) The preamble said the Agreement is "entered into and effective as of"
        the Effective Date, in a document whose granting clause transfers on the
        PURCHASE DATE. Signing and transfer are different events and v4 ran them
        together in its first sentence.
    (3) Naming an Approved Processor and an equipment affiliate in Section 1
        reads, to a merchant, as making them parties. They are not, and two of
        the memo's findings elsewhere turn on that.

    WHAT CHANGED. The alias goes. Signing is separated from transfer, with the
    cross-reference pointed at §4.13 where the Purchase Date is defined. A closing
    sentence says who is not a party and what it would take to become one.

    WHAT THE CLAUSE CANNOT DO, AND THE MEMO SAYS SO. Entity status, the actual
    office and the merchant's identity are unverified, and no drafting cures a
    wrong party name. `lombard-contracts`' CONTRACT_INDEX records the EIN, the
    payee bank details and the sender address as NOT verified, with the warning
    that "the last index stated them confidently and every one was wrong". The
    fix is an entity-verification step at underwriting, which is operations.

    DEPARTURE FROM THE MEMO — THE WIDGETS STAY. The memo's replacement moves the
    Effective Date, the office and the merchant name into Section 1 and drops
    «31», «96» and «32». README rule 2 keeps the `«N»` AcroForm anchors exactly
    where the body has them; they are what the Lombard pipeline injects, and a
    body without them cannot be filled in. They are kept in the same three roles
    and the Section 1 cross-references are added around them.

    A TENANT FACT THIS LIBRARY CANNOT YET EXPRESS, LEFT AS IT WAS. "a Florida
    limited liability company" is Lombard's entity type and state, hard-coded in
    a library whose whole point is that it is not one funder's paperwork
    (`tenant-agnostic.test.ts`). It survives because the party placeholders are
    exactly three and there is no `{{funderState}}`; inventing a fourth is
    outside this cluster's authority. Reported rather than fixed.
  */
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
    body: 'This Future Receivables Purchase Agreement (this “Agreement”) is entered into as of ____«31»_____ (the “Effective Date”) by {{funder}}, a Florida limited liability company, with its principal office at _______________«96»_______________ (the “Buyer”), and _____________«32»_____________ (the “Merchant”), identified by its full legal name, entity type and state of organization in Section 1. The Merchant Information, Deposit Account, Funding Terms, Itemization and Approved Processors set out in Section 1 form part of this Agreement, and the address and operational notice contact of each party are stated there; notice is given as Section 7.3 provides.\nSigning this Agreement transfers nothing. The sale and transfer of the Purchased Receipts take effect only on the Purchase Date, as Section 4.13 provides, and only when Buyer has funded the Purchase Price.\nAn Approved Processor, an equipment seller, lessor or subscription provider, an affiliate of Buyer, a broker and a servicer are not parties to this Agreement and acquire no right and assume no obligation under it, whether or not they are named in Section 1, unless one of them separately signs this Agreement in that capacity.',
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
