import type { McaClause } from '../types';

/**
 * Section 5 — representations, warranties and covenants.
 *
 * THIRTEEN OF THE EIGHTEEN WERE REWRITTEN ON 2026-09-10 under
 * [ADR 0012](../../../../../docs/adr/0012-the-baseline-document-is-input-not-specification.md).
 * §5.4 is retained. The lead-in, §5.11, §5.13 and §5.16 belong to other
 * clusters and still print v4's words.
 *
 * ONE DEFECT IN FOURTEEN PLACES. This is where an agreement whose entire
 * consideration is that BUYER bears the risk of non-generation hands that risk
 * back. A representation of present fact is fair. A continuing promise about
 * future business performance is not — and v4 made almost every one of these a
 * continuing promise, through a lead-in that says "and during the term of this
 * Agreement", through §6.1.1 (any covenant violation is an Event of Default),
 * and through §9.2(b), which reaches a human being personally.
 *
 * So a merchant whose sales fell, who was late with a bank statement, who shut
 * for a fortnight in August, or who was sued by a supplier, had breached. The
 * counsel brief in `lombard-contracts/counsel/BRIEF-01` names §5.2, §5.15 and
 * §5.18 as the leaks, against a published commitment that says personal
 * liability for business performance never happens.
 *
 * `__tests__/representations-are-present-fact.test.ts` is what holds these
 * together, in two halves that are both needed: a denylist over the vocabulary
 * that makes a representation continue, which deletion alone would satisfy, and
 * a required disclaimer in each clause that could still be read as a promise,
 * which it would not. On its first run, against v4's bodies and before any of
 * this text existed, it failed 37 of its 99 tests. One assertion PASSED on that
 * run — `/one and only one/`, which is §2.4's vocabulary and had never appeared
 * in Section 5 — and was removed rather than kept, because a green assertion
 * that could not have been red is not evidence of anything.
 *
 * THE DIGEST ASSERTION IN `bodies-match-the-document.test.ts` STILL STANDS. It
 * catches a vendored `.docx` moving underneath us and is not about bodies.
 */
export const FRPA_REPRESENTATIONS: McaClause[] = [
  /*
    THE CLAUSE THAT DECIDES WHAT THE OTHER SEVENTEEN ARE.

    WHAT WAS WRONG. Eleven words: "represents, warrants, and covenants that as
    of the Effective Date **and during the term of this Agreement**". Three
    things collapse into one. A representation is a statement of present fact; a
    warranty is a promise that it is true; a covenant is a promise about the
    future. Saying all three of every sentence beneath it turns "Merchant has
    good title" into "Merchant will always have good title", and a statement that
    was true at funding into a breach the day it stops being true.

    Run that through v4's §6.1.1 — any covenant violation is an Event of Default
    — and through §9.2(b), which reached any materially inaccurate present-fact
    representation, and ordinary business deterioration becomes personal
    liability for a human being. This lead-in is the multiplier on every other
    defect in Section 5, and it is why it sits in the guaranty cluster rather
    than the representations one: what makes it dangerous is §9.2.

    THE REPRESENTATIONS CLUSTER DELIBERATELY DID NOT DEPEND ON THIS FIX.
    `representations-are-present-fact.test.ts` requires each of its fourteen
    clauses to carry its OWN temporal anchor — "Purchase Date", "when furnished"
    — precisely so that the section is sound whether or not this clause was ever
    rewritten. This is the fix; that belt-and-braces stays, and should.

    WHAT CHANGED. Facts are made as at the Effective Date and, after a
    reasonable opportunity to update disclosures, the Purchase Date. Nothing
    continues unless a provision says in terms that it is a continuing covenant.
    A representation is expressly not a promise about future financial
    condition, revenue, solvency or business continuity — the four things a
    purchaser of future receivables has bought the risk of.

    DEPARTURES FROM THE MEMO. Two.
    (1) The memo's last sentence — "An inaccurate statement or covenant breach
        gives rise to remedies only as provided in Sections 6 and 9" — is kept
        but written as remedies "under this Agreement", because Sections 6 and 9
        are not the only places a remedy could be asserted from and an exclusive
        list that is not exhaustive is worse than a general rule.
    (2) The trailing colon is gone. v4's lead-in ended with ":" and each
        representation beneath it was a grammatical continuation of it. Under
        ADR 0011 the numbering and the assembly order are emitted, and a clause
        selected out would leave the sentence dangling, so each representation
        is a sentence of its own and this is a paragraph rather than a stem.

    UNVERIFIED AUTHORITY. None is needed; the memo cites none here. The change
    is a drafting correction, not a position about New York law.
  */
  {
    slug: 'frpa.representations-lead-in',
    version: 1,
    instrument: 'frpa',
    kind: 'clause',
    /*
      NOT GATED. It scopes representations every template contains, and a
      funder who takes no guaranty needs it as much as one who does — more, if
      anything, because there is no §9.2 to limit what an inaccuracy costs.
    */
    includeWhen: null,
    number: '',
    section: 'representations',
    sortKey: 5,
    heading: '',
    body: 'Merchant makes each representation of existing fact in this Section as of the Effective Date and, after a reasonable opportunity to update its disclosures, as of the Purchase Date only. A representation is not a promise of future financial condition, revenue, solvency or business continuity. Only a provision expressly stated as a continuing covenant applies after the Purchase Date. An inaccurate statement, and a breach of a covenant in this Section, give rise to remedies under this Agreement only as Section 6 and Section 9 provide.',
    source: { kind: 'attorney-drafted', author: null },
    status: 'draft',
    appliesInStates: [],
    examinedBy: [{ review: 'REVIEW-02', findings: [] }],
  },
  /*
    WHAT WAS WRONG. Two things, and the heading was one of them. "Advances are
    not Loans" calls the transaction an advance in the act of denying it is a
    loan, in a document whose whole characterisation case is that this is a
    purchase. The body then asked the MERCHANT to state that it "fully
    understands" a legal conclusion — a party with no counsel in the room
    certifying the answer to the question a court will decide. That is worth
    nothing as evidence and reads badly when the question is actually litigated.

    WHAT CHANGED. The same risk allocation, stated as a mutual contractual rule
    rather than a merchant certification, and the heading names the allocation
    instead of the denial. Nothing is conceded about characterisation, because
    nothing here can be.

    DEPARTURE FROM THE MEMO. The memo's last sentence is "Nothing in this Section
    waives a statutory protection or defense." Written as "available to either
    party": the one-sided reading — Merchant waives nothing, Buyer may — is the
    reading a merchant's counsel would press, and it costs nothing to close.

    UNVERIFIED AUTHORITY. The allocation stated here is the first and third of
    LG Funding's factors, with Richmond Capital 246 AD3d 585 the memo's authority
    for treating express non-recourse language as material. Nobody on this
    project has pulled either from an official reporter.
  */
  {
    slug: 'frpa.advances-are-not-loans-5-1',
    version: 1,
    instrument: 'frpa',
    kind: 'clause',
    includeWhen: null,
    number: '5.1',
    section: 'representations',
    sortKey: 10,
    heading: 'Allocation of Non-Generation Risk',
    body: 'The parties agree to the non-recourse allocation stated in the granting clause and in Section 2.1. Buyer assumes the risk that Merchant generates insufficient Purchased Receipts, and the risk that collection takes an indefinite time. Merchant does not warrant, and is not asked to certify, how a court or a regulator will characterize this transaction. Nothing in this Section waives a statutory protection or defence available to either party.',
    source: { kind: 'attorney-drafted', author: null },
    status: 'draft',
    appliesInStates: [],
    examinedBy: [
      {
        review: 'REVIEW-01',
        findings: [
          'all-assets-lien-vs-nonrecourse-recital',
          'business-interruption-insurance-defeats-risk',
          'usury-defence-waiver-void',
          'usury-defense-waiver',
        ],
      },
    ],
  },
  /*
    WHAT WAS WRONG. This clause is the cluster's theme in its purest form. It
    warranted statements not yet written ("any future statements that may be
    furnished"), promised that no material adverse change had occurred OR would,
    imposed a continuing duty to report deterioration, and labelled a late
    document an immediate material breach with no cure. Run that through §6.1.1
    — any covenant violation is an Event of Default — and through §9.2(b), and a
    merchant whose sales fall and who is slow returning a statement has made a
    human being personally liable. Lombard's published commitment #3 says that
    never happens; counsel BRIEF-01 names this clause first among the leaks.

    A no-material-adverse-change promise is close to self-contradictory in a
    product whose consideration is that BUYER bears the risk of non-generation.

    WHAT CHANGED. Accuracy is fixed to the moment of furnishing. The forward
    promise and the reporting covenant go. Production becomes a practical duty
    with a real window, a purpose limit and an extension for records nobody has.
    A later decline is expressly not a breach and not an Event of Default.

    DEPARTURES FROM THE MEMO. Three, all small.
    (1) "ten Workdays" rather than the memo's bare "ten Workdays of a specific
        request": written as a WRITTEN request, because an oral request with a
        default attached is not a thing a merchant can diary.
    (2) The extension is expressed as a duty on Buyer to allow one, not as a
        passive "with reasonable extensions". A passive extension has no grantor,
        so there is nobody it obliges and nobody to ask when it is refused.
    (3) The memo's "subject to identified qualifications" is written "subject to
        any qualification identified in them", so the qualification has to be on
        the face of the record rather than asserted later.

    NUMBERS. Ten Workdays is the memo's figure. Nothing else here fixes a count
    the document or the memo had not already fixed; v4's five BUSINESS days is
    replaced because "business day" is undefined in this agreement and Workday
    is not — the same `defined-term-drift` the spine fixed.
  */
  {
    slug: 'frpa.financial-condition-and-financial-information-5-2',
    version: 1,
    instrument: 'frpa',
    kind: 'clause',
    includeWhen: null,
    number: '5.2',
    section: 'representations',
    sortKey: 20,
    heading: 'Financial Condition and Financial Information',
    body: 'To Merchant’s knowledge after reasonable inquiry, the financial records Merchant has furnished to Buyer are authentic and fairly present the matters they purport to show as of their stated dates, subject to any qualification identified in them. Merchant shall disclose to Buyer any material correction it discovers before the Purchase Date. After the Purchase Date, Merchant shall provide the existing records reasonably necessary to verify Purchased Receipts within ten (10) Workdays after a specific written request, and Buyer shall allow a reasonable extension where a record is unavailable or the delay is outside Merchant’s control. A later adverse change in Merchant’s financial condition, sales or operations is not a breach of any representation in this Agreement and is not an Event of Default. Records duties, and the remedies for them, remain subject to Section 3, Section 4.3 and Section 6.',
    source: { kind: 'attorney-drafted', author: null },
    status: 'draft',
    appliesInStates: [],
    examinedBy: [{ review: 'REVIEW-01', findings: ['guaranty-covers-every-covenant', 'no-cure-period-anywhere'] }],
  },
  /*
    WHAT WAS WRONG. An absolute, unqualified representation of compliance with
    every federal, state and local law, plus a covenant to go on complying, plus
    a flat "no outstanding tax liens" that no merchant can actually verify. A
    small restaurant with a lapsed sign permit or a county tax lien nobody told
    it about has breached — and under §9.2(b) that inaccuracy reaches a person.
    REVIEW-02 also has this clause and §5.14 giving the same compliance
    representation twice, which is how the two drifted.

    WHAT CHANGED. A knowledge-and-reasonable-inquiry standard; materiality; the
    compliance covenant reduced to reasonable efforts; an express contest right
    carried over from v4 (which had it for taxes and not for anything else); and
    the tax limb narrowed to what actually bears on this transaction — liens on
    the Purchased Receipts and material unpaid taxes.

    WHY THE DIVISION WITH §5.14 IS THIS WAY ROUND. §5.3 keeps approvals and
    taxes; §5.14 keeps proceedings. That is the split the two headings already
    promise, and it removes the duplication without deleting either clause.

    DEPARTURE FROM THE MEMO. The memo ends "absent conduct independently
    satisfying Section 6.1". Written as "becomes one only on conduct that
    independently satisfies Section 6.1", because the memo's phrasing reads as a
    carve-out from a default that has already occurred, and the intended rule is
    that the default never occurs on the event alone.

    THE COVENANT LIMB DEPENDS ON SECTION 6, AND SECTION 6 MOVED WHILE THIS WAS
    WRITTEN. In v4, "shall use reasonable efforts to maintain approvals" would
    still be an Event of Default through §6.1.1 — any covenant violation. The
    default-remedies cluster has since replaced §6.1's fifteen limbs with a
    closed list of three and added *"Merchant's covenants ... including those in
    Sections 4 and 5, remain covenants"*, which closes it. **That is another
    cluster's uncommitted draft**; if it does not land, this limb is reachable
    again and the reasonable-efforts wording is the only thing limiting it.
  */
  {
    slug: 'frpa.governmental-approvals-5-3',
    version: 1,
    instrument: 'frpa',
    kind: 'clause',
    includeWhen: null,
    number: '5.3',
    section: 'representations',
    sortKey: 30,
    heading: 'Governmental Approvals',
    body: 'To Merchant’s knowledge after reasonable inquiry, Merchant holds the material governmental approvals and permits needed for the business it has disclosed to Buyer, and is not subject to an undisclosed legal restriction that prevents the sale of the Purchased Receipts. Merchant has disclosed to Buyer each material tax lien known to it that affects the Purchased Receipts, and each material unpaid tax, other than an amount lawfully deferred or contested in good faith. Merchant shall use reasonable efforts to maintain the approvals necessary for its lawful operations. A lien, a tax dispute or a loss of an approval arising after the Purchase Date is not itself an Event of Default, and becomes one only on conduct that independently satisfies Section 6.1.',
    source: { kind: 'attorney-drafted', author: null },
    status: 'draft',
    appliesInStates: [],
    examinedBy: [
      { review: 'REVIEW-02', findings: ['frpa-5-3-and-5-14-give-the-same-compliance-representation-twice'] },
    ],
  },
  /*
    RETAINED, WORD FOR WORD, AND THE RETENTION IS THE DECISION. An ordinary
    authority representation is exactly what this should be: a statement of
    present fact about the signer, which is the one shape of representation this
    cluster is not trying to remove.

    THE MEMO'S DEPENDENCY IS DILIGENCE, NOT DRAFTING, and it is not satisfied.
    The clause does not verify who actually signed, and it is not a substitute
    for a guarantor's own signature — which is the gap REVIEW-02 records against
    §9.1, where three guarantor identity grids exist as widgets under a heading
    and an outside attorney could not review the execution block at all. Nothing
    in this cluster closes that; it is named here so retaining §5.4 is not read
    as evidence that it is closed.

    `representations-are-present-fact.test.ts` pins this body verbatim, so the
    retention has to be un-decided deliberately rather than edited away.
  */
  {
    slug: 'frpa.authorization-5-4',
    version: 1,
    instrument: 'frpa',
    kind: 'clause',
    includeWhen: null,
    number: '5.4',
    section: 'representations',
    sortKey: 40,
    heading: 'Authorization',
    body: 'Merchant, and the person(s) signing this Agreement on behalf of Merchant, have full power and authority to incur and perform the obligations under this Agreement, all of which have been duly authorized.',
    source: { kind: 'attorney-drafted', author: null },
    status: 'draft',
    appliesInStates: [],
    examinedBy: [{ review: 'REVIEW-02', findings: ['debt-vocabulary-the-language-guard-would-not-catch'] }],
  },
  /*
    WHAT WAS WRONG, AND WHAT WAS RIGHT. The second sentence is one of the better
    sentences in v4 and the memo says so: refusing an interest in a policy that
    pays Buyer BECAUSE receipts have fallen is the difference between bearing the
    risk of non-generation and insuring against it, which is REVIEW-01's
    `business-interruption-insurance-defeats-risk`. The first sentence is the
    defect. The "Collateral" it speaks of is §4.10's — the purchased Receipts and
    their proceeds — so a property-casualty loss-payee endorsement over it is
    close to meaningless, while the covenant to obtain and evidence one is a real
    duty running through §6.1.1 that nobody at Lombard will monitor.

    WHAT CHANGED. The loss-payee requirement goes. What stands is a disclaimer:
    no insurance is required, no policy is assigned, and equipment insurance is
    the equipment agreement's business and not a default under this one.

    GATED ON `equipment`, AND THE GATE COSTS SOMETHING. The clause is selected
    only where the deal has equipment, which is where the equipment-insurance
    carve-out has any work to do. The price is that the FIRST sentence — the
    characterisation-bearing one — disappears from a template with no equipment,
    and no other clause says it. §2.1 and §2.2 allocate the non-generation risk
    but neither refuses the insurance. **Reported to the spine rather than fixed
    here**: one sentence in §2.1 would close it, and §2.1 is not this cluster's.
    Writing an ungated second insurance clause is not available — the corpus is
    pinned at 97 FRPA clauses.

    DEPARTURE FROM THE MEMO. The memo deletes the clause outright. It is kept, in
    the gated form, because deleting it deletes the favourable sentence too, and
    because the memo's own replacement text is a disclaimer rather than a
    deletion — the two halves of the memo entry disagree and this follows the
    text over the rationale.
  */
  {
    slug: 'frpa.insurance-5-5',
    version: 1,
    instrument: 'frpa',
    kind: 'clause',
    /*
      A property-casualty loss-payee requirement is a poor fit when the collateral
      is a percentage of card receivables; it exists here because equipment does.
    */
    includeWhen: (facts) => facts.equipment !== 'none',
    number: '5.5',
    section: 'representations',
    sortKey: 50,
    heading: 'Insurance',
    body: 'Buyer does not require insurance guaranteeing the Purchased Amount, the Purchased Receipts or Merchant’s future sales, and takes no interest in a policy that would pay Buyer because Merchant’s Card Receipts have fallen. No insurance policy is assigned by this Agreement, and Merchant is not required to name Buyer under one. An insurance requirement for equipment leased or subscribed from {{equipmentAffiliate}} is governed solely by the equipment agreement; it does not secure this purchase, and a breach of it is not an Event of Default under this Agreement.',
    source: { kind: 'attorney-drafted', author: null },
    status: 'draft',
    appliesInStates: [],
    examinedBy: [
      {
        review: 'REVIEW-01',
        findings: [
          'business-interruption-insurance-defeats-risk',
          'guaranty-covers-every-covenant',
          'no-cure-period-anywhere',
        ],
      },
    ],
  },
  /*
    WHAT WAS WRONG. Twenty-eight words containing an unbounded covenant: "any
    other action that could have any adverse effect upon Merchant's obligations".
    Nothing is outside that. Hiring badly, pricing badly, losing a lease, a bad
    review — each could adversely affect Merchant's ability to perform, each
    needed Buyer's prior written consent, and each was labelled a material breach
    the moment it happened, with no notice and no cure. It also contradicted
    §2.4 in v4 and contradicts the rewritten §2.4 more sharply, because §2.4 now
    lets an account or a processor be added or replaced on notice.

    WHAT CHANGED. The clause becomes a pointer. Account and processor changes are
    §2.4's; the unbounded limb is deleted rather than narrowed, because there is
    no honest narrowing of "any other action"; and the material-breach label goes.

    DEPARTURE FROM THE MEMO. The memo's replacement also says "and shall not
    intentionally divert Purchased Receipts". That sentence is not repeated here.
    §9.2(c) and §6.2 both reach the anti-diversion covenant by citing **Section
    5.17 by number**, and two homes for one rule is `defined-term-drift` in
    covenant form — the defect REVIEW-01 raised against five terms of v4. The
    duty lives in §5.17 and this clause points at it.
  */
  {
    slug: 'frpa.the-account-5-6',
    version: 1,
    instrument: 'frpa',
    kind: 'clause',
    includeWhen: null,
    number: '5.6',
    section: 'representations',
    sortKey: 60,
    heading: 'The Account',
    body: 'A change to an Approved Bank Account or an Approved Processor that affects the collection of Purchased Receipts is governed exclusively by Section 2.4. Merchant shall cooperate reasonably in keeping the agreed split in place. Intentional diversion of Purchased Receipts is governed by Section 5.17 and by no other provision of this Section. No account change, no processor change, and no adverse effect on Buyer’s collection is by itself an Event of Default.',
    source: { kind: 'attorney-drafted', author: null },
    status: 'draft',
    appliesInStates: [],
    examinedBy: [
      {
        review: 'REVIEW-01',
        findings: ['defined-term-drift', 'frpa-undefined-capitalised-terms', 'no-cure-period-anywhere'],
      },
    ],
  },
  /*
    WHAT WAS WRONG. One day's notice, at any time, to certify to Buyer OR TO ANY
    OTHER PERSON BUYER NAMES that the agreement is unmodified and to state how
    much of the Purchased Amount has been delivered. Two defects, and the second
    is the serious one.

    The first is practicality: one day is not a window in which a small merchant
    reconciles a ledger, and failure to meet it runs through §6.1.1.

    The second is that an unqualified estoppel is a device for extinguishing a
    live reconciliation dispute. Section 3 gives Merchant a right to reconcile
    and to be credited; a signature certifying Buyer's delivery figure, obtained
    the day after it was demanded, is an admission that the figure is right. An
    assignee taking the paper then relies on it. The clause could therefore
    switch off the single merchant-protective mechanism in the agreement,
    without either party intending it.

    WHAT CHANGED. Ten Workdays. Buyer must send what it wants confirmed, with the
    ledger behind it, so the merchant is confirming a document rather than a
    conclusion. Merchant may record modifications, disputes, qualifications and a
    pending reconciliation. Refusing to sign something disputed or inaccurate is
    not a default, not an admission, not a waiver, and not a confirmation of the
    uncollected balance.

    DEPARTURE FROM THE MEMO. The memo says "Buyer shall first provide its
    proposed statement and supporting ledger". Written as "shall send with the
    notice", so the ten Workdays run from the day Merchant has the document. The
    memo's ordering leaves the clock able to start before there is anything to
    check.

    NUMBERS. Ten Workdays is the memo's figure. Workday rather than "day",
    matching `frpa.definitions`.
  */
  {
    slug: 'frpa.estoppel-certificate-5-8',
    version: 1,
    instrument: 'frpa',
    kind: 'clause',
    includeWhen: null,
    number: '5.8',
    section: 'representations',
    sortKey: 80,
    heading: 'Estoppel Certificate',
    body: 'On at least ten (10) Workdays’ prior written notice, Merchant shall cooperate reasonably in confirming that this Agreement is in force and in confirming the amounts shown in the available records. Buyer shall send with the notice the statement it proposes and the supporting ledger. Merchant may state in its response any modification, dispute, qualification, or pending reconciliation under Section 3. Merchant’s failure to sign a statement it disputes or believes to be inaccurate is not an Event of Default, is not an admission or a waiver, and is not a confirmation of how much of the Purchased Amount remains uncollected.',
    source: { kind: 'attorney-drafted', author: null },
    status: 'draft',
    appliesInStates: [],
    examinedBy: [{ review: 'REVIEW-01', findings: ['no-cure-period-anywhere'] }],
  },
  /*
    WHAT WAS WRONG. "Merchant does not contemplate ... any petition for bankruptcy
    protection." A representation about a state of mind, and the state of mind is
    whether to take legal advice about a federal statutory right.

    Its effect is not the disclosure it looks like. §9.2 excludes bankruptcy from
    the guaranty, and §6.1 carves a filing out of the Events of Default — but
    both carve-outs are defeated if the merchant, months earlier, represented that
    it did not contemplate one. The later filing is then evidence the
    representation was false WHEN MADE, which §9.2(b) reaches and §6.1.2 makes a
    default. REVIEW-01 has this as `bankruptcy-carveout-defeated-by-5-9`: a route
    to bankruptcy recourse through a clause that says nothing about recourse. It
    also chills something the merchant is entitled to do, which is talk to a
    lawyer.

    WHAT CHANGED. A disclosure limited to petitions actually filed and pending at
    funding — knowledge-qualified for involuntary petitions, which a merchant may
    not yet have been served with. No covenant against seeking relief. Advice,
    insolvency and a later filing are expressly not Events of Default and create
    no guarantor liability, which closes the route rather than merely narrowing
    the words.

    THE HEADING CHANGED TOO. "No Bankruptcy" would now misdescribe a clause whose
    substance is that a later bankruptcy is permitted — the same defect as §5.1's
    heading, and the memo names that one.

    DEPARTURE FROM THE MEMO. None of substance. "All rights remain subject to
    applicable bankruptcy law" is written "Every right under this Agreement", so
    it is clearly about this Agreement's rights and not a general recital.

    PAIRS WITH THE GUARANTY CLUSTER, AND NEITHER FIX WORKS ALONE. Memo entry 087
    is the other half. Fixing this clause while §9.2's bankruptcy carve-out is
    still defeasible, or the reverse, leaves the clawback route open.
  */
  {
    slug: 'frpa.no-bankruptcy-5-9',
    version: 1,
    instrument: 'frpa',
    kind: 'clause',
    includeWhen: null,
    number: '5.9',
    section: 'representations',
    sortKey: 90,
    heading: 'Bankruptcy Proceedings',
    body: 'Merchant has disclosed to Buyer each bankruptcy petition filed by it, and each bankruptcy petition to its actual knowledge filed against it, that is pending on the Purchase Date. Merchant makes no representation about whether it may later seek restructuring or bankruptcy advice or relief. Seeking that advice, insolvency, and a later filing are not Events of Default and create no liability for a Guarantor. Every right under this Agreement remains subject to applicable bankruptcy law.',
    source: { kind: 'attorney-drafted', author: null },
    status: 'draft',
    appliesInStates: [],
    examinedBy: [
      { review: 'REVIEW-01', findings: ['bankruptcy-carveout-defeated-by-5-9', 'guaranty-reaches-business-failure'] },
    ],
  },
  /*
    WHAT WAS WRONG. Two things, and the second is a category error that appears
    four times in v4.

    First, it duplicates §4.11's negative pledge. Two negative pledges over the
    same asset, in different words, are two rules that can drift apart — and
    these already had, because §4.11 restricts liens on the "Collateral" and
    this restricted encumbrance of "the Receipts", which before the spine's
    definitions were different sets.

    Second, the equipment carve-out. A monthly equipment payment billed at
    merchant level by a processor is a CHARGE, not a lien; calling it "a
    permitted claim ranking after the Specified Percentage" states a priority for
    something that has no security interest to prioritise. It also invites the
    reading that the affiliate has a junior lien on the purchased share, which is
    an interest {{equipmentAffiliate}} has not been granted and should not have.
    `frpa.definitions` has already dealt with the economics: an equipment charge
    is not deducted in determining Card Receipts, so it falls on Merchant's
    retained share rather than on the shared base.

    WHAT CHANGED. One rule for the sold share, in §4.11. The carve-out becomes
    what it should always have been: a statement that an equipment or
    subscription charge obtains nothing.

    GATED ON `equipment`. Both sentences are about equipment; with none in the
    deal the clause has no work and §4.11 still holds the negative pledge, so
    nothing is lost when it drops out. `LOMBARD_FACTS.equipment` is `deferred`,
    so it is still selected for the funder whose paper this is.

    DEPARTURE FROM THE MEMO. The memo says "Restrictions ... are governed
    exclusively by Section 4.11". Written "by Section 4.11 and by no other
    provision of this Agreement", because "exclusively" in the memo's sentence
    can be read as governing WHICH restrictions rather than WHERE they live.
    Subscription payments are named alongside equipment: the Equipment Lease and
    the Subscription are the same document with its vocabulary swapped, and a
    carve-out that names only one of them is exactly the divergence
    `twins.test.ts` exists to catch.
  */
  {
    slug: 'frpa.no-encumbrance-of-receipts-5-10',
    version: 1,
    instrument: 'frpa',
    kind: 'clause',
    /*
      Both limbs are about equipment. With none in the deal §4.11 still holds the
      negative pledge, so the clause drops out without leaving a hole.
    */
    includeWhen: (facts) => facts.equipment !== 'none',
    number: '5.10',
    section: 'representations',
    sortKey: 100,
    heading: 'No Encumbrance of Receipts',
    body: 'A further sale of the Purchased Receipts, and a voluntary encumbrance of them, are restricted by Section 4.11 and by no other provision of this Agreement. A charge for equipment leased or subscribed from {{equipmentAffiliate}}, and a payment under a subscription, obtains no security interest and no priority under this Agreement, and does not rank against the Purchased Receipts.',
    source: { kind: 'attorney-drafted', author: null },
    status: 'draft',
    appliesInStates: [],
    examinedBy: [{ review: 'REVIEW-02', findings: [] }],
  },
  /*
    AN ABSOLUTE WARRANTY OF SOMETHING NOBODY CAN KNOW, MADE PERSONAL BY §9.2(b).

    WHAT WAS WRONG. "good, complete, and marketable title to all Receipts, free
    and clear of any and all liabilities, liens, claims, charges, restrictions,
    conditions, options, rights, mortgages, security interests, equities,
    pledges, and encumbrances of any kind or nature whatsoever, or any other
    rights or interests that may be inconsistent with the transactions
    contemplated with, or adverse to the interests of, Buyer".

    Every word after "liens" reaches things a merchant cannot know: an unfiled
    statutory interest, a processor's contractual right of setoff, an equity
    somebody may later assert. And v4's §9.2(b) guaranteed any materially
    inaccurate present-fact representation, unqualified by knowledge, so an
    innocent error about an unknown adverse right became recourse against a
    human being. REVIEW-02 raised it with §5.13 as
    `frpa-5-11-and-5-13-route-personal-liability-through-the-narrowed-9-2`, and
    it is the reason both clauses are drafted in this cluster.

    IT IS ALSO THE WRONG PARTY'S JOB. Priority is a search: UCC-1 filings, the
    processor agreement, prior funders' notices. Buyer runs those searches
    before funding, has the merchant's authorisation to do so under §4.3, and is
    the only party that can. A warranty is not a substitute for diligence; it is
    a way of charging the merchant for not doing it.

    WHAT CHANGED. Knowledge after reasonable inquiry, disclosure of known prior
    assignments and consensual liens, an express refusal to warrant unknown
    statutory interests and processor rights, and Buyer owning priority
    verification. An inaccurate statement reaches a Guarantor only where §9.2's
    conduct and proof requirements are satisfied — stated in the clause, so a
    reader of Section 5 does not have to find Section 9 to learn it.

    THE EQUIPMENT CARVE-OUT IS GONE, and it is not a loss. It said the monthly
    equipment payment was "a permitted claim ranking after the Specified
    Percentage", which states a priority for something with no security interest
    to prioritise and invites the reading that {{equipmentAffiliate}} holds a
    junior lien on the purchased share. The representations cluster removed the
    same sentence from §5.10 and gave the reason: `frpa.definitions` settles the
    economics, because an equipment charge is not deducted in determining Card
    Receipts and so falls on Merchant's retained share.

    DEPARTURE FROM THE MEMO. One, and it is the same one §5.12 hit. The memo says
    "Section 1 shall identify any permitted prior interests and required releases
    or subordinations". **Section 1 has no such row.** Its grid is Legal Name,
    DBA, Tax ID, Entity Type, State of Inc., contacts and two addresses. Writing
    a cross-reference to a field that does not exist would invent an AcroForm
    widget the pipeline does not inject, so the disclosure is required in
    writing before the Purchase Date instead — the route the spine took for the
    processor's charges and reserves and §5.12 took for use of proceeds. A grid
    row is the better fix and belongs to whoever owns `frpa.parties`.

    UNVERIFIED AUTHORITY. The memo cites none for this clause; the narrowing is
    a drafting and allocation judgement, not a reading of a case.
  */
  {
    slug: 'frpa.unencumbered-receipts-5-11',
    version: 1,
    instrument: 'frpa',
    kind: 'clause',
    /* A title representation is not a guaranty. See the lead-in. */
    includeWhen: null,
    number: '5.11',
    section: 'representations',
    sortKey: 110,
    heading: 'Unencumbered Receipts',
    body: 'To Merchant’s knowledge after reasonable inquiry, Merchant is entitled to sell the Purchased Receipts, and Merchant has disclosed to Buyer all known prior assignments of and consensual liens on them. Merchant has identified to Buyer in writing before the Purchase Date any prior interest the parties permit to remain and any release or subordination Buyer requires. Merchant does not warrant the absence of unknown statutory interests, processor rights or legal claims. Buyer shall independently verify priority before funding. An inaccurate statement in this Section creates liability under the Guaranty only where the conduct and proof requirements of Section 9.2 are satisfied.',
    source: { kind: 'attorney-drafted', author: null },
    status: 'draft',
    appliesInStates: [],
    examinedBy: [
      { review: 'REVIEW-02', findings: ['frpa-5-11-and-5-13-route-personal-liability-through-the-narrowed-9-2'] },
    ],
  },
  /*
    WHAT WAS WRONG. Three things, and the first is the one that decides which law
    applies to the whole transaction.

    (1) It asks the merchant to LABEL the transaction commercial. A label does
        not decide it; actual purpose and the actual use of proceeds do, and a
        recipient who is in fact a consumer keeps consumer protections whatever
        the paper says. A form that relies on the label is a form that fails
        exactly where it matters.
    (2) "A valid business in good standing" assumes an entity. We will see sole
        proprietors, and for one the sentence is either false or meaningless —
        while the person's own name, not a registered entity's, is what the form
        has to capture.
    (3) REVIEW-02's `frpa-5-12-does-not-state-the-merchants-principal-place-of-business`:
        it equates the principal place of business with §1.1's Business Address.
        The two are different, and neither is the place from which the business
        is directed or managed — which is the connecting factor several state
        commercial-financing statutes actually use.

    WHAT CHANGED. Primary purpose and actual use of proceeds instead of a label.
    Entity and sole-proprietor limbs, using §1.1's existing Entity Type and State
    of Inc. rows. The management location captured. A duty on Buyer to verify the
    facts that decide applicable law, because Buyer is the party that can. And an
    express statement that the Section converts nothing and waives nothing.

    TWO DEPARTURES FROM THE MEMO, BOTH FORCED BY SECTION 1 AS IT STANDS. The
    memo has the use of proceeds "accurately stated in Section 1", and has
    Section 1 state the management location. **Neither field exists.** §1.1 has
    Legal Name, DBA, Tax ID, Entity Type, State of Inc., contact rows, Business
    Address and Mailing Address, and nothing else. So both are required in
    writing before the Purchase Date instead, which is the same route the spine
    took for the processor's charges and reserves, and for the same reason: this
    cluster does not control Section 1's grid and inventing a row in a comment
    would be inventing a widget the pipeline does not inject.

    A GRID ROW IS THE BETTER FIX, AND IT IS NOT AVAILABLE HERE. Adding "Use of
    Proceeds" and "Directed or Managed From" to §1.1 would put both facts on the
    face of the document where underwriting can see them. That is a change to
    `frpa.parties` and to the AcroForm map in `lombard-contracts`, and it is
    handed to whoever owns Section 1.
  */
  {
    slug: 'frpa.business-purpose-5-12',
    version: 1,
    instrument: 'frpa',
    kind: 'clause',
    includeWhen: null,
    number: '5.12',
    section: 'representations',
    sortKey: 120,
    heading: 'Business Purpose',
    body: 'Merchant enters this Agreement primarily for a lawful business or commercial purpose, and the use of proceeds Merchant has stated to Buyer in writing before the Purchase Date is accurate. If Merchant is an entity, Section 1 states its legal form and the jurisdiction in which it is organized. If Merchant is a sole proprietor, Section 1 identifies that status and the legal owner of the business. Section 1 states Merchant’s principal place of business, and where the business is principally directed or managed from a different address, Merchant has stated that address to Buyer in writing before the Purchase Date. Buyer shall verify the facts needed to determine which law applies to this transaction. This Section does not convert a transaction that is primarily for personal, family, or household purposes into a business transaction, and does not waive a protection that applies to one.',
    source: { kind: 'attorney-drafted', author: null },
    status: 'draft',
    appliesInStates: [],
    examinedBy: [
      { review: 'REVIEW-02', findings: ['frpa-5-12-does-not-state-the-merchants-principal-place-of-business'] },
    ],
  },
  /*
    A MERCHANT WARRANTING HOW A BANKRUPTCY COURT WILL RULE.

    WHAT WAS WRONG. The clause had the merchant warrant that this transaction
    "will not ... be considered a fraudulent transfer or fraudulent conveyance,
    or otherwise be void or voidable under similar laws or principles, the
    doctrine of equitable subordination, laws regarding preferential transfers,
    **or for any other reason**."

    Every item on that list is a judicial conclusion, not a fact. Whether a
    transfer is avoidable turns on reasonably equivalent value, on insolvency at
    the time, on intent, and on timing — and reasonably equivalent value is a
    question about what BUYER gave. So the merchant warranted the outcome of a
    question that depends on the counterparty's own conduct, and, through
    v4's §9.2(b), warranted it personally. "Or for any other reason" then
    warranted every ground that has not been invented yet.

    It is also self-defeating for the funder. A warranty that the transaction is
    not avoidable is worth nothing in the proceeding where it matters — a
    trustee is not bound by the debtor's contractual opinion — and it is
    evidence the parties contemplated the risk.

    WHAT CHANGED. Disclosure of known contractual restrictions that would
    actually prevent the sale or the split, which is a fact a merchant has. An
    express refusal to give a legal warranty about avoidance, subordination or
    challenge. And the sentence that closes the loop with §6.1 and §9.2: a
    challenge or an avoidance is not itself an Event of Default and creates no
    liability under the Guaranty.

    WHY THE "EVENT OF DEFAULT UNDER ANOTHER CONTRACT" LIMB SHRANK. v4 warranted
    that performing this Agreement would not put the merchant in default under
    ANY contract with anyone. A merchant with a landlord, a franchisor, a bank
    line and three suppliers cannot audit that, and the funder does not need it:
    what it needs is to know about a restriction that would stop the receipts
    being sold or the split being installed. That is what the clause now asks.

    DEPARTURES FROM THE MEMO. Two, both small.
    (1) The split is identified as "the processor split under Section 2.3"
        rather than "the agreed processor split", because §2.3 is where the
        instruction and the single aggregate cap live and an unanchored "agreed"
        invites a second, different arrangement.
    (2) "Merchant retains every defence available to it under those laws" is
        added. The memo's replacement removes the warranty but does not say the
        defences survive, and a clause that goes quiet about defences in a
        bankruptcy paragraph is a clause somebody will argue waived them.

    UNVERIFIED AUTHORITY. The memo cites none here. The reasoning is the
    Bankruptcy Code's own structure rather than any decision, and nobody on this
    project has verified it against the Code either.
  */
  {
    slug: 'frpa.defaults-under-other-contracts-improper-transfers-5-13',
    version: 1,
    instrument: 'frpa',
    kind: 'clause',
    /* A disclosure representation, in every template. See the lead-in. */
    includeWhen: null,
    number: '5.13',
    section: 'representations',
    sortKey: 130,
    heading: 'Defaults under Other Contracts; Improper Transfers',
    body: 'Merchant has disclosed to Buyer each known contractual restriction that would materially prevent the sale of the Purchased Receipts or the processor split under Section 2.3. Merchant does not make a legal warranty that this transaction cannot be avoided, subordinated or challenged under bankruptcy, fraudulent-transfer, preference or other law, and Merchant retains every defence available to it under those laws. No such challenge, and no such avoidance, itself creates an Event of Default or liability under the Guaranty.',
    source: { kind: 'attorney-drafted', author: null },
    status: 'draft',
    appliesInStates: [],
    examinedBy: [
      { review: 'REVIEW-02', findings: ['frpa-5-11-and-5-13-route-personal-liability-through-the-narrowed-9-2'] },
    ],
  },
  /*
    WHAT WAS WRONG. The knowledge qualifier sat on the THREATENED limb only, so
    the pending limb was absolute: a merchant warranted that no proceeding was
    pending anywhere, before any court, agency, panel or tribunal — including
    ones it had not been served with and ones brought in another state. Combined
    with the lead-in's "and during the term of this Agreement", it also warranted
    that none would ever arise, so being sued was a breach. And its test —
    anything that "may result in any material adverse change" — is the future
    business performance this whole cluster is removing, in a clause that looks
    like it is about litigation.

    WHAT CHANGED. Actual knowledge on both limbs. Materiality tied to the two
    things a funder actually needs to know at funding: authority to enter, and
    ability lawfully to sell. Fixed to the Purchase Date. And an express
    statement that it warrants nothing about future litigation, its outcome, or
    a decline in the business.

    WHY IT SURVIVES §5.3 RATHER THAN MERGING INTO IT. REVIEW-02 has the two
    giving the same compliance representation twice, which is true of v4. The
    answer taken here is division, not deletion: §5.3 keeps approvals and taxes,
    this keeps proceedings, and neither now states a general compliance
    warranty. Merging them would have produced one long clause and lost the two
    headings a reader navigates by.

    DEPARTURE FROM THE MEMO. The memo's "any remedy is subject to Sections 6 and
    9" is narrowed to a remedy for an inaccuracy IN THIS SECTION. As written it
    could be read as a general limit on remedies, which is not this clause's to
    state and would collide with the Section 6 cluster.
  */
  {
    slug: 'frpa.civil-criminal-regulatory-matters-5-14',
    version: 1,
    instrument: 'frpa',
    kind: 'clause',
    includeWhen: null,
    number: '5.14',
    section: 'representations',
    sortKey: 140,
    heading: 'Civil/Criminal/Regulatory Matters',
    body: 'Merchant has disclosed to Buyer each proceeding pending, and each proceeding to its actual knowledge threatened, that materially affects its authority to enter this Agreement or its ability lawfully to sell the Purchased Receipts, in each case as at the Purchase Date. This is not a warranty against future litigation, against an adverse outcome, or against a decline in Merchant’s business. A remedy for an inaccuracy in this Section is subject to Section 6 and Section 9.',
    source: { kind: 'attorney-drafted', author: null },
    status: 'draft',
    appliesInStates: [],
    examinedBy: [
      { review: 'REVIEW-02', findings: ['frpa-5-3-and-5-14-give-the-same-compliance-representation-twice'] },
    ],
  },
  /*
    WHAT WAS WRONG. A six-month lookback over any decision to close "in whole or
    in part, temporarily or permanently". A restaurant that shut for two weeks in
    August, a shop that closed one of three locations, a salon that decided in
    March to take a fortnight off — each has breached, on the day of signature,
    without knowing it. REVIEW-01's `guaranty-reaches-business-failure` is what
    that costs: an inaccurate present-fact representation is precisely what
    §9.2(b) reaches, so the vacation becomes personal recourse.

    WHAT CHANGED. It aims at the thing a funder is entitled to protection from,
    which is a merchant taking money while sitting on a decision to shut the
    business the receipts come from. A firm decision, existing at funding, to
    close permanently. Everything else — a past temporary closure, a renovation,
    a seasonal shutdown, a later good-faith decision — is expressly not a breach,
    and there is no promise to keep trading.

    DEPARTURE FROM THE MEMO. The memo's "A prior temporary closure ... or later
    good-faith decision to close is not a breach" is written as "not a breach of
    this Section". Unqualified, it would purport to immunise a closure against
    every other provision of the agreement, including the anti-diversion covenant
    in §5.17 — an over-correction that a funder's counsel would rightly refuse.

    NO PROMISE TO OPERATE IS THE POINT, NOT AN ASIDE. It is the sentence that
    keeps this clause a representation instead of a covenant, and it is the same
    sentence §5.18 needs for the same reason.
  */
  {
    slug: 'frpa.business-closure-5-15',
    version: 1,
    instrument: 'frpa',
    kind: 'clause',
    includeWhen: null,
    number: '5.15',
    section: 'representations',
    sortKey: 150,
    heading: 'Business Closure',
    body: 'Merchant has disclosed to Buyer any firm decision, existing on the Purchase Date, to permanently discontinue the business from which the Purchased Receipts are expected to arise. A temporary closure before the Purchase Date, an ordinary renovation, a seasonal shutdown, or a decision taken in good faith after the Purchase Date to close, is not a breach of this Section. Merchant does not promise to operate for a minimum period.',
    source: { kind: 'attorney-drafted', author: null },
    status: 'draft',
    appliesInStates: [],
    examinedBy: [{ review: 'REVIEW-01', findings: ['guaranty-reaches-business-failure'] }],
  },
  /*
    THREE CLAUSES GAVE THREE DIFFERENT STACKING ANSWERS. This is where they are
    made one, and two of the three had already moved before this clause was
    touched.

    WHAT WAS WRONG (1) — THE PROHIBITION. "Merchant shall not, without Buyer's
    prior written consent, sign any agreement for the sale of future receipts
    with any party other than Buyer" bans a sale of Merchant's OWN retained
    share, which Buyer never bought. §4.11 already states the rule that protects
    what Buyer did buy — no knowing second sale of the same Purchased Receipts,
    no voluntary conflicting interest in them — and stating a second, wider
    version of it in Section 5 is `defined-term-drift` in the form that matters:
    two texts, one subject, and a reader who finds either one first finds a
    different agreement.

    WHAT WAS WRONG (2) — THE SHARING LIMB. "Buyer may share information regarding
    this Agreement with any third party in order to determine whether Merchant is
    in compliance with this provision" is REVIEW-01's
    `information-sharing-only-vs-any-third-party`: an unrestricted disclosure
    right to anyone, granted to police a covenant. §4.7 already limits disclosure
    to agents, affiliates, subsidiaries and credit bureaux. The limb is deleted
    and the limit is pointed at.

    WHAT THE OTHER TWO CLAUSES NOW SAY, CHECKED RATHER THAN ASSUMED. §6.1.13
    banned all further financing; §6.1 was rewritten to three lettered limbs of
    misconduct and a not-a-default list, and "additional financing taken by
    Merchant" is now expressly IN that list, so the ban is gone. §4.15 permitted
    Buyer's own stacks; it is now a pair of clauses, and for a funder that holds
    one position at a time the rule reads the other way. Nothing here contradicts
    either.

    WHAT CHANGED. The clause stops prohibiting and starts doing the one thing
    neither §4.11 nor §6.1 does: it says financing is not forbidden merely by
    being financing, and it sets up the information exchange the memo asks for
    when a proposed arrangement would touch the share already sold. The memo is
    explicit that this narrow covenant "is a commercial risk choice" rather than
    a legal requirement, and it is recorded as one.

    DEPARTURE FROM THE MEMO — "SECTIONS 4.15 AND 8" BECOMES "SECTION 4.15".
    Section 8's renewal clauses are gated on `renewalModel`; a fixed reference to
    them from an ungated clause dangles in a no-renewal template, and Section 8
    would then hold only §8.3, which is about prepayment and says nothing about a
    subsequent purchase. §4.15 is always present in one of its two forms and both
    forms answer the question.

    DEPARTURE FROM THE BRIEF'S GATE. The brief marks this `action: both` on
    `concurrentPositions`. It stays `includeWhen: null`, for the reason §4.11
    gives about the same fact: gating it would delete the information-exchange
    duty and the not-an-Event-of-Default sentence from exactly the funder that
    holds one position at a time, which is the funder Lombard now is. The fact is
    about what BUYER may hold; this clause is about what MERCHANT may do.

    THE HEADING CHANGES. "Stacking Prohibited" describes a rule the clause no
    longer contains, and a heading that survives the text under it is how a
    reader ends up citing the wrong provision.
  */
  {
    slug: 'frpa.stacking-prohibited-5-16',
    version: 1,
    instrument: 'frpa',
    kind: 'clause',
    includeWhen: null,
    number: '5.16',
    section: 'representations',
    sortKey: 160,
    heading: 'Other Financing; Conflicting Sales',
    body: 'Merchant’s undertaking not to sell the same Purchased Receipts to another person, and not to grant a voluntary interest that conflicts with Buyer’s interest in them, is stated in Section 4.11. This Section does not enlarge it.\nFinancing that Merchant obtains on other assets, or on Merchant’s retained share of Card Receipts, is not prohibited by this Agreement, and taking it is not an Event of Default; Section 6.1 states the only conduct that is. Before entering an arrangement that would affect the share of Card Receipts sold to Buyer, Merchant shall give Buyer the information reasonably necessary to assess the conflict, and Buyer shall respond reasonably and promptly.\nBuyer may use and disclose information given under this Section only as Section 4.7 permits, and may not disclose it to any other person in order to police this Section.\nBuyer’s own subsequent purchases from Merchant are governed by Section 4.15.',
    source: { kind: 'attorney-drafted', author: null },
    status: 'draft',
    appliesInStates: [],
    examinedBy: [{ review: 'REVIEW-01', findings: ['information-sharing-only-vs-any-third-party'] }],
  },
  /*
    CROSS-REFERENCE 3, HANDED OVER BY THE SPINE, AND RESOLVED HERE.

    WHAT WAS WRONG. A daily deposit obligation over ALL Receipts, which before
    the definitions bridge meant cash and cheques too; a ban on adding an
    account; a ban on closing one; consent gates on both; and the equipment
    lien-ranking error a third time. The deposit duty is not merely broad, it is
    unperformable — card settlement does not arrive daily, weekends and federal
    holidays exist, chargebacks reverse, and processors hold reserves. An
    unperformable covenant wired to §6.1.1 is a default the funder can call
    whenever it chooses, which is the fact a court looks for when deciding
    whether the "indefinite term" was real.

    THE CONTRADICTION WITH §2.4. The spine's §2.4 now lets Merchant add or
    replace an account or a processor on notice, with Buyer's approval not to be
    unreasonably withheld, and says an outage is not a default. §5.17 forbade the
    same act outright. Both could not stand. **§2.4 wins**: it was drafted with
    the notice-and-replace machinery, it is not this cluster's to change, and the
    ban is the half that was wrong. This clause no longer restricts accounts at
    all, and points at §2.4 so a reader looking here finds the rule.

    WHAT CHANGED, AND WHAT DELIBERATELY DID NOT. The deposit duty goes. The
    account bans go. The equipment sentence goes — `frpa.definitions` already
    settles that an equipment charge is not deducted in determining Card
    Receipts, so it falls on Merchant's retained share.

    What stays is the anti-diversion covenant, deliberately and in a form that
    can be described, because **§9.2(c) and §6.2 both reach it by citing "Section
    5.17" by number** and neither is this cluster's to edit. Narrowing this
    clause to a pointer would orphan the one limb of the guaranty that Lombard's
    published commitment #3 expressly keeps — "deliberately routing card volume
    away to avoid remitting" — and would make §6.2.1's remedy trigger unreachable
    on the conduct it is meant for. A negative list follows, because a covenant
    against diversion with no stated exclusions is a covenant a funder can point
    at any bad month and call breached.

    DEPARTURE FROM THE MEMO. The memo's first sentence has Merchant "maintain
    agreed instructions for Approved Processors to remit Purchased Receipts".
    That is §2.3's subject and §2.4's duty — "shall keep the split under Section
    2.3 in place" — written a third time. It is replaced with a cross-reference.
    Restating a duty in a second place is how §2.4 and §5.17 came to contradict
    each other in the first place.

    ADDED BEYOND THE MEMO. "This Agreement imposes no daily deposit obligation",
    stated positively rather than left as an absence. The daily deposit duty is
    in every market form and in v4's own §6.1.6 and §6.1.8; deleting the sentence
    without replacing it leaves a reader — and an arbitrator — free to infer it
    from the surrounding machinery.

    THE CONTRADICTION ALSO LIVED IN SECTION 6, AND THAT HALF IS NOT THIS
    CLUSTER'S. v4's §6.1.6 defaulted on using any depository account other than
    the Approved Bank Account, §6.1.7 on changing it, and §6.1.8 on inducing a
    customer to pay by any means other than Receipts deposited in it. All three
    survive §2.4 and would survive this clause. The default-remedies cluster's
    uncommitted draft removes them — its §6.1 is now a closed list of three, and
    names "the addition or replacement of an Approved Bank Account or an Approved
    Processor under Section 2.4" as expressly not a default. **If that draft does
    not land, the contradiction has moved into Section 6 rather than being
    fixed**, and this clause is the wrong place to look for it.
  */
  {
    slug: 'frpa.no-diversion-of-receipts-5-17',
    version: 1,
    instrument: 'frpa',
    kind: 'clause',
    includeWhen: null,
    number: '5.17',
    section: 'representations',
    sortKey: 170,
    heading: 'No Diversion of Receipts',
    body: 'Merchant shall keep in place the instructions under Section 2.3 by which each Approved Processor remits the Purchased Receipts in its ordinary settlement cycle, and shall account for any Purchased Receipts it receives itself and remit them under Section 7.16. Merchant shall not intentionally conceal or divert the Purchased Receipts in order to defeat Buyer’s ownership of them.\nNone of the following is concealment or diversion: an ordinary settlement delay; a refund, a chargeback or a processor reserve; a bank holiday, a bank failure or a processor outage; a change of account or processor made and disclosed under Section 2.4; or a good-faith commercial decision about how Merchant operates, prices or promotes its business.\nThis Agreement imposes no daily deposit obligation. Merchant’s non-card receipts, and Merchant’s retained percentage of Card Receipts, are Merchant’s to bank and to use as it chooses.',
    source: { kind: 'attorney-drafted', author: null },
    status: 'draft',
    appliesInStates: [],
    examinedBy: [
      { review: 'REVIEW-01', findings: ['defined-term-drift'] },
      { review: 'REVIEW-02', findings: ['frpa-undefined-capitalised-terms-in-the-unexamined-clauses'] },
    ],
  },
  /*
    THE WORST SENTENCE IN THIS CLUSTER, AND POSSIBLY IN THE AGREEMENT.
    "Merchant will not voluntarily close its business on a temporary basis for
    renovations, repairs, or any other voluntary purposes." A merchant may close
    only when a local ordinance or a legal order forces it to, or when
    circumstances outside its control do.

    Read that in a recharacterisation case. The funder's position is that it
    bought an asset and bears the risk that the asset is never generated. The
    document says the merchant may not stop generating it. That is not a purchase
    of receipts, it is an obligation to work until a sum is paid — the single
    worst fact a funder can hand an opponent, and it sits beside §6.1.15, which
    defaults on interrupting or suspending the business. Whatever the drafter
    intended, this is the sentence that gets read aloud.

    THE REST WAS BROKEN TOO. Prior written consent to change a place of business
    or a trading name. Consent AND an assumption agreement for any sale of the
    business, which makes a merchant's exit hostage. And REVIEW-02's
    `frpa-6-1-4-defaults-on-a-sale-5-18-expressly-permits`: §6.1.4 defaults on a
    transfer of substantially all assets "other than in a transaction permitted
    by Section 5.18", while §5.18 permitted none.

    WHAT CHANGED. Notice replaces consent for identification changes — a funder
    needs to know the name, the organisation jurisdiction, the processor and the
    location, and needs none of them to require permission. For a sale, a
    cooperation duty aimed at what a funder actually needs: disclosure, and
    preservation of its interest in receipts already sold, including a successor
    split where the successor and the processor will agree to one. Operating,
    renovation, relocation and closure decisions are the merchant's, in good
    faith, and do not create a default, a repurchase duty, or liability for
    receipts never generated.

    THE §6.1.4 FIX HAD TO BE MADE FROM THIS SIDE. "A sale made in compliance with
    this paragraph is a transaction permitted by this Section" is what gave
    §6.1.4's carve-out something to bite on. Without it, removing the consent
    requirement makes REVIEW-02's finding WORSE — every sale becomes a default,
    because none is permitted by a Section that no longer permits anything.

    Its original consumer has since gone: the default-remedies cluster rewrote
    §6.1 in this checkout into a closed list of three, and §6.1.4 no longer
    exists. The sentence is kept anyway. It is now a permission standing on its
    own rather than a hook, it is the express reversal of the sentence v4 used to
    forbid a sale, and Section 6 is another cluster's uncommitted draft. The test
    pins it.

    DEPARTURES FROM THE MEMO. Two.
    (1) The memo requires notice of a "principal-location" change. Written as
        principal place of business, matching §5.12 and §1.1, so the two clauses
        cannot mean different addresses.
    (2) The memo ends "Intentional fraudulent transfer or diversion remains
        subject to Section 6.1". Diversion is written as "of the kind described
        in Section 5.17", because §5.17 now carries a negative list and an
        unqualified reference would leave the exclusions behind.

    THE SAME BAN LIVED IN SECTION 6, AND ITS REMOVAL IS SOMEBODY ELSE'S DRAFT.
    v4's §6.1.15 makes it an Event of Default for Merchant to "transport, move,
    interrupt, suspend, dissolve or terminate its business without the prior
    written consent of Buyer" — the banned sentence rewritten as a default, and
    beyond this cluster's reach. The choice made here is the spine's over §6.2.1:
    state the allocation, refuse to draft a contradiction into a clause this
    cluster may not touch, and report it.

    The default-remedies cluster's uncommitted draft resolves it — §6.1 is now a
    closed list of three and names "a good-faith closure, suspension, relocation,
    dissolution or sale of the business" as expressly not a default. **If that
    draft does not land, this clause and §6.1.15 flatly contradict each other and
    the form must not be used.**
  */
  {
    slug: 'frpa.change-of-name-or-location-or-sale-or-closing-of-business-5-18',
    version: 1,
    instrument: 'frpa',
    kind: 'clause',
    includeWhen: null,
    number: '5.18',
    section: 'representations',
    sortKey: 180,
    heading: 'Change of Name or Location or Sale or Closing of Business',
    body: 'Merchant shall give Buyer reasonable advance notice of a planned change to its legal name, to the jurisdiction in which it is organized, to an Approved Processor, or to its principal place of business, where the change materially affects the collection of Purchased Receipts; and prompt notice where advance notice is impracticable.\nFor a proposed sale of substantially all of the business from which the Purchased Receipts arise, Merchant shall cooperate reasonably to disclose the transaction to Buyer and to preserve Buyer’s lawful interest in Purchased Receipts already sold, including by putting a successor split arrangement in place where the successor and the Approved Processor lawfully agree to one. A sale made in compliance with this paragraph is a transaction permitted by this Section. A transfer of an asset that does not generate Purchased Receipts, and a sale in the ordinary course of business, require no notice and no consent under this Section.\nMerchant may decide in good faith how to operate its business, whether to renovate, whether to relocate, whether to close temporarily, and whether to close permanently. Those decisions do not themselves create an Event of Default, a duty to repurchase, or liability for receipts never generated. An intentional fraudulent transfer, and intentional diversion of the kind described in Section 5.17, remain subject to Section 6.1.',
    source: { kind: 'attorney-drafted', author: null },
    status: 'draft',
    appliesInStates: [],
    examinedBy: [
      { review: 'REVIEW-01', findings: ['guaranty-covers-every-covenant'] },
      {
        review: 'REVIEW-02',
        findings: ['frpa-5-7-duplicates-5-18', 'frpa-6-1-4-defaults-on-a-sale-5-18-expressly-permits'],
      },
    ],
  },
];
