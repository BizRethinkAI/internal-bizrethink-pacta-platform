import type { McaClause } from '../types';

/**
 * Appendix A and the exhibits — fees, execution, and the instruments this one calls for.
 *
 * Bodies are the words the shipped document prints.
 * `__tests__/frpa-coverage.test.ts` additionally asserts that NOTHING in the
 * document is missing from the library — the direction that fails silently.
 */
export const FRPA_APPENDIX: McaClause[] = [
  /*
    THE CLUSTER'S CRITICAL, IN ITS SECOND LOCATION — AND THE ONE WITH NO RULE AT
    ALL BEHIND IT.

    WHAT WAS WRONG. Two sentences. "All fees are added to the Remaining Balance
    and are collectible via the same methods as the Purchased Amount" is §4.1's
    defect restated where a merchant is most likely to read it, and the argument
    is the same: a fee inside the purchased pool is swept out of card settlements
    by a processor that adjudicates nothing, so a **disputed** charge is
    collected before anyone decides it was owed. "Fees may be voided by Buyer in
    its discretion" is the generic discretionary fee power the memo names — a
    discretion to waive implies a discretion to charge, and the schedule it sat
    under had no closure rule of any kind.

    THE MEMO'S PREMISE IS FALSE, AND THE TRUE VERSION IS WORSE. The memo says
    *"the actual fee table/rates are not supplied"* and the brief repeats it.
    **They are supplied.** `Lombard_FRPA_v4.docx` Appendix A carries a completed
    three-column table — Fee, Amount, When Applied — with nine rows, including a
    **$5,000 Default / Diversion Fee** charged "upon Event of Default, including
    changing the Approved Bank Account or diverting Receipts without consent",
    a **$75 Bank Account Change Fee**, a $35 same-day wire fee and a $200 site
    visit fee.

    THAT TABLE IS NOT IN THIS LIBRARY. `frpa/index.ts` declares it a non-clause
    line — *"the fee-schedule grid — the prose around it IS imported, as three
    clauses"* — so the three Appendix A records govern a schedule they do not
    contain, and this clause is the rule the grid has to satisfy. Applying the
    rule below to the shipped grid **deletes one of its nine rows outright, kills
    one limb of a second, and moves four more out of the Appendix into §6.3**.
    That is a change to the document in `lombard-contracts`, handed back rather
    than made here; the report lists the rows.

    THE $5,000 ROW IS NOT DISPOSED OF BY THIS CLAUSE, AND SAYING SO IS THE POINT.
    Its account-change limb dies here, because §2.4 now permits that change and a
    fee for permitted conduct collects on the permission. Its diversion limb does
    not: intentional diversion IS §6.1(b), so the charge is for conduct the
    Agreement still calls a default. What constrains it is elsewhere — §6.2 says
    the uncollected Purchased Amount "is not agreed liquidated damages", and
    §6.3's ceiling now expressly counts Appendix A — and whether a flat $5,000
    survives those two is a question for counsel, not for a drafting agent. It
    stops being SWEPT either way, which is this cluster's part of it.

    WHAT CHANGED. A closed schedule. Only a fee identified before Merchant
    accepts — by name, amount or lawful calculation method, payee, purpose and
    timing — may be charged; an omitted or blank fee is $0.00; nothing is created
    or varied after signature. No fee reaches the Purchased Amount, the Remaining
    Balance or the settlement of Card Receipts. A closed list of occasions on
    which no fee may be charged at all. And enforcement costs are named as what
    they are — not fees, governed by §6.3 alone.

    THE FIVE PROHIBITED OCCASIONS ARE NOT A DRAFTING FLOURISH. Each of them is
    conduct another clause of this Agreement now expressly permits, and a fee for
    permitted conduct collects on the permission. §3 gives Merchant a
    reconciliation; §2.4 lets Merchant change an account or a processor with
    approval not unreasonably withheld; §6.1's fourteen-item list says a decline
    in Card Receipts, an outage, a loss of access and an ordinary business
    failure are not Events of Default. v4's own grid prices two of them.

    DEPARTURE FROM THE MEMO. The memo's list of prohibited occasions is
    "reconciliation, receipts decline, ordinary business failure, data-access
    interruption, or exercising a legal right". Added: a good-faith change of an
    Approved Bank Account or an Approved Processor under §2.4, because that is
    the occasion the shipped grid actually prices — twice, at $75 and again
    inside the $5,000 default charge — and a prohibition that omits the live
    instance is a prohibition against a hypothetical.

    NO AMOUNT IS WRITTEN INTO THIS BODY, INCLUDING THE ONES THAT EXIST. The four
    dollar figures above are a funder's price list, not clause text, and this
    library is tenant-agnostic. $0.00 is the memo's own and is the absence of a
    price rather than one.

    THE WAIVER SENTENCE SURVIVES, INVERTED. v4 had Buyer void a fee "in its
    discretion" with the record kept for audit. The discretion goes and the
    record stays: a waived fee is irrevocably out of every amount claimed, and
    Buyer may keep the audit trail. That is the memo's, and it is the half of
    v4's sentence that was doing honest work.
  */
  {
    slug: 'frpa.appendix-a-fees-collectible',
    version: 1,
    instrument: 'frpa',
    kind: 'clause',
    includeWhen: null,
    number: 'Appendix A',
    section: 'appendix',
    sortKey: 10,
    heading: '',
    body: 'This Appendix is the whole of what Buyer may charge Merchant under this Agreement. Buyer may charge only a fee identified, in the completed Appendix and in every disclosure applicable law requires before Merchant accepts, by its name, its dollar amount or a lawful calculation method, the person to whom it is paid, what it is for, and when it is charged. A fee left blank, or not identified in the completed Appendix, is $0.00 and may not be charged. Buyer may not create a fee, or vary a fee, after Merchant signs.\nA fee is a separate debt and is not part of the purchase. No fee is added to the Purchased Amount or the Remaining Balance, and no fee is collected through a Split Funding Authorization or otherwise out of the settlement of Card Receipts. Section 4.1 states how a fee is charged, demanded and collected.\nNo fee is charged for a reconciliation or an adjustment under Section 3; for a decline in or an absence of Card Receipts; for a business failure, an ordinary loss of the business, or Merchant’s insolvency or bankruptcy; for a loss of or an interruption in access to information or to a system; for a good-faith addition or replacement of an Approved Bank Account or an Approved Processor under Section 2.4; or for Merchant exercising a legal right or a right this Agreement gives Merchant. Section 6.1 lists these among the things that are not an Event of Default, and a fee may not be used to charge for one of them.\nAttorneys’ fees, court costs, collection expenses and interest are not fees. They are costs of enforcement, and Section 6.3 governs them, states the only ceiling on them, and requires them to be awarded by a court or agreed in writing before they are payable.\nBuyer may waive a fee. A waived fee is removed from every amount Buyer claims and may not be reinstated; Buyer may keep its record of the waiver.',
    source: { kind: 'attorney-drafted', author: null },
    status: 'draft',
    appliesInStates: [],
    examinedBy: [{ review: 'REVIEW-02', findings: [] }],
  },
  /*
    "WE DO NOT CHARGE ISO FEES" WHEN THE MERCHANT'S OWN CHARGE PAYS THE
    COMMISSION.

    WHAT WAS WRONG. "Some or all of the Origination Fee may be paid to an
    independent sales organization ... Otherwise, Buyer is NOT charging any ISO
    fees to Merchant." Both halves are literally true and the paragraph as a
    whole misleads: the merchant IS charged for the broker, through the
    Origination Fee, and the sentence in capitals invites them to believe
    otherwise. The third sentence is worse — "if Merchant is charged another such
    fee, Merchant acknowledges that it is not being charged by Buyer" is a
    pre-signature acknowledgement of a fact nobody has yet observed, obtained
    from the party least able to check it, about the channel Buyer selected,
    contracted with, pays and can terminate.

    WHAT CHANGED. Disclose total merchant cost and who is paid out of it, which
    is the owner's note. The amount paid to an ISO and the ISO's identity are
    stated in Section 1. The commission is Buyer's, out of a charge Merchant has
    already borne, and authorises nothing further. The acknowledgement is gone
    and §7.21's refund duty is pointed at instead — Buyer refunds a substantiated
    unauthorized charge within ten Workdays without making Merchant chase the ISO
    first.

    THE GATE, AND THE GAP IT CLOSES. `data-and-channel` handed this over: §7.21
    is gated on `brokerChannel` and this paragraph was not, so a funder with no
    broker channel assembled an Appendix A paragraph about ISO fees for a channel
    it does not have — while the clause that governs ISOs was correctly absent.
    The fee disclosure without the conduct rule is the worse half to keep. It is
    now `brokerChannel`, and `__tests__/a-fee-is-a-debt-not-a-purchase.test.ts`
    asserts the two are selected together for both values of the fact.

    It also fixes a quieter dependency: "ISO" is DEFINED in §7.21 and nowhere
    else, so this paragraph used the term in templates where the definition was
    gated out. `select-clauses.test.ts` cannot see that — it reads `Section N`
    tokens — which is why the property is stated over the fact instead.

    THE LIMB WAS SPLIT OFF, NOT THE CLAUSE. The brief marks this `both` on
    `brokerChannel`. Under ADR 0013's diagnostic the paragraph carried two rules
    answering different questions: *what is Merchant charged* (every funder) and
    *who is paid out of it* (only a broker funder). Splitting into an exhaustive
    pair would have produced a second Appendix A record and moved three pinned
    counts to say something §4.1 already had to say. So the itemization limb
    moved into §4.1 — "The Origination Fee, if any, is the dollar amount so
    itemized" — and what is left here is all and only `brokerChannel` content, so
    the whole-clause gate is honest. The test asserts the itemization survives
    for a funder with no broker channel, which is the half that would otherwise
    have gone missing.

    DEPARTURE FROM THE MEMO. The memo says "no statement that there is 'no ISO
    fee' may conceal the source or amount of Merchant's total charges", which
    bars concealment and leaves the statement available. Written as a bar on the
    statement itself where a charge to Merchant funds the commission, because
    that is the only case in which anybody would want to make it, and a
    concealment standard requires proving intent about a sentence Buyer wrote.

    UNVERIFIED. The memo directs that any marketing claim of this kind be
    verified. No marketing material is in this repository or in
    `lombard-contracts`, and REVIEW-01's `iso-channel-vs-never-cold-call` is the
    only evidence any such claim exists. Nobody here has read one.
  */
  {
    slug: 'frpa.appendix-a-origination-fee-to-iso',
    version: 1,
    instrument: 'frpa',
    kind: 'clause',
    /*
      Whole-clause, and every value of the fact is answered: a broker funder gets
      this paragraph and §7.21; a funder with no broker channel gets neither, and
      the Origination Fee itemization it still needs is in §4.1.
    */
    includeWhen: (facts) => facts.brokerChannel,
    number: 'Appendix A',
    section: 'appendix',
    sortKey: 20,
    heading: '',
    body: 'Part or all of the Origination Fee itemized in Section 1.4 may be paid by Buyer to an ISO. Buyer shall state in Section 1 the amount so paid and the ISO to which it is paid, and shall make every compensation disclosure applicable law requires.\nThat payment is made by Buyer out of an amount with which Merchant has already been charged. It is included in the transaction cost disclosed to Merchant before Merchant accepts, and it authorizes no further charge to Merchant by Buyer or by an ISO. Merchant is not required to pay an ISO anything as a condition of this Agreement.\nWhere an amount charged to Merchant funds an ISO’s compensation, Buyer shall not state that Merchant is charged no ISO fee. What Merchant is charged, and who is paid out of it, are stated in Section 1.4 and in this Appendix.\nSection 7.21 governs an ISO’s conduct, an unauthorized charge collected by an ISO, and Buyer’s duty to refund one.',
    source: { kind: 'attorney-drafted', author: null },
    status: 'draft',
    appliesInStates: [],
    examinedBy: [{ review: 'REVIEW-02', findings: [] }],
  },
  /*
    THE SMALLEST CHANGE IN THE CLUSTER, AND THE REASON IT IS NOT NOTHING.

    WHAT WAS RIGHT. The substance — actually incurred, reasonable in amount, not
    a percentage of the undelivered Purchased Amount, subject to §6.3's aggregate
    limit — is sound, and the memo says so. It is `three-inconsistent-attorney-
    fee-formulas` already half-closed.

    WHAT WAS WRONG. It says it in PARALLEL OPERATIVE WORDS. "Buyer may recover
    its attorneys' fees and collection fees actually incurred and reasonable in
    amount" is a second grant of the same entitlement, and a second grant carries
    none of the conditions the first one has: §6.3 requires an award by a court
    or an agreement in a written settlement, an itemized statement with invoices
    before anything is payable, a limit on what a Guarantor may be charged, no
    recovery of internal overhead or unsuccessful-claim costs, and no
    double-recovery. A reader who stops at Appendix A meets none of them. Two
    statements of one rule is how the three formulas got out of step in the first
    place, which is the argument for stating it once rather than for stating it
    twice consistently.

    IT ALSO SAT BESIDE A GRID THAT CONTRADICTS §6.3 TWICE. The shipped Appendix A
    table gives the aggregate cap as "25% of undelivered Purchased Amount" —
    which now equals §6.3's "25% of the Remaining Balance", but only because §2.6
    made the Remaining Balance a purchase-only figure, so the two phrasings agree
    by accident rather than by drafting. Worse, its last row makes indemnified
    amounts accrue interest "from the date of demand", and §6.3.1 says in terms
    that "an invoice or a demand for payment creates no right to interest". That
    is `indemnity-charges-interest-document-denies` living in the fee table. The
    grid is not in this library; both rows are handed back.

    WHAT CHANGED. The entitlement is not restated. It is located — in §6.3 and
    only there — with §6.3's conditions named so that a reader of the Appendix
    knows they exist, and with the two consequences this cluster is responsible
    for spelled out: an enforcement cost is not a fee, and it is not swept.

    NO DEPARTURE FROM THE MEMO, and no narrowing of §6.3. The instruction that
    came with this cluster was explicit that the 25% entitlement is untouched and
    that `disputes-service` owns it. This clause states no percentage, which is
    what keeps the ceiling in one place.
  */
  {
    slug: 'frpa.appendix-a-attorneys-fees',
    version: 1,
    instrument: 'frpa',
    kind: 'clause',
    includeWhen: null,
    number: 'Appendix A',
    section: 'appendix',
    sortKey: 30,
    heading: '',
    body: 'Attorneys’ fees, court costs, collection expenses and any statutory interest are recoverable only under Section 6.3, and only as that Section provides — on proof of what was incurred, only in the amount a court awards or a written settlement agrees, only against an itemized statement given to Merchant beforehand, subject to the single aggregate ceiling that Section states, without double recovery, and subject to the limit that Section places on what a Guarantor may be charged.\nThey are not fees and this Appendix does not price them. They are not earned automatically, and they are not calculated as a percentage of the uncollected Purchased Amount. They are not added to the Purchased Amount or the Remaining Balance and are not collected out of the settlement of Card Receipts.',
    source: { kind: 'attorney-drafted', author: null },
    status: 'draft',
    appliesInStates: [],
    examinedBy: [{ review: 'REVIEW-02', findings: [] }],
  },
  {
    slug: 'frpa.execution',
    version: 1,
    instrument: 'frpa',
    kind: 'clause',
    includeWhen: null,
    number: '',
    section: 'appendix',
    sortKey: 40,
    heading: '',
    body: 'IN WITNESS WHEREOF, the parties have executed this Agreement as of the Effective Date. Each of Merchant and Guarantor represents that he or she is authorized to sign this Agreement, legally binding Merchant and Guarantor to comply with the terms of this Agreement and that the information provided herein and in all of Buyer’s documents, forms, and recorded interviews is true, accurate, and complete in all respects. Any misrepresentation made by Merchant or Guarantor in connection with this Agreement may constitute a separate cause of action for fraud or intentional misrepresentation.',
    source: { kind: 'attorney-drafted', author: null },
    status: 'draft',
    appliesInStates: [],
    examinedBy: [{ review: 'REVIEW-02', findings: [] }],
  },
  {
    slug: 'frpa.exhibit-a-split-funding',
    version: 1,
    instrument: 'frpa',
    kind: 'clause',
    includeWhen: null,
    number: 'Exhibit A',
    section: 'appendix',
    sortKey: 50,
    heading: '',
    body: 'A separate Split Funding Authorization Letter shall be executed for each Approved Processor identified in Section 1.5, instructing the Approved Processor to remit the Specified Percentage of credit and debit card receipts directly to Buyer’s designated account. The form of the Split Funding Authorization is attached and incorporated by reference, and shall be executed contemporaneously with this Agreement.',
    source: { kind: 'attorney-drafted', author: null },
    status: 'draft',
    appliesInStates: [],
    examinedBy: [{ review: 'REVIEW-02', findings: [] }],
  },
  /*
    WHAT THIS EXHIBIT ACTUALLY DID. It incorporated a document by reference and
    described it in a way the document does not match — "for the purposes of
    underwriting, ONGOING PROGRAM QUALIFICATION, and post-default collection".
    Ongoing program qualification is the same defect as §4.4's "continuation in
    this program" and §4.16's "ongoing creditworthiness review": a completed sale
    has nothing to re-qualify for. An exhibit that recites a purpose the
    operative clauses have removed reinstates it by the back door.

    THE REFUTATION, AND WHY IT DOES NOT END WHERE THE MEMO ENDS IT. The
    2026-09-09 memo says the actual release "is missing", so one cannot conclude
    that Lombard lacks FCRA authority — which refutes our register's finding.
    That refutation stands and is adopted. **Its premise does not.** The
    Permission to Release is not missing from this project: the `.docx` is in
    `lombard-contracts/sources/` and the instrument is in this library as eight
    `permission-to-release.*` clauses.

    Reading it makes the position sharper rather than settling it. Its §3 grants
    credit-bureau authority over "Merchant and any Personal Guarantor ...
    individually", so authority is not absent on the face of the form; its §4
    then sources the FCRA §604(a)(2) "written instructions" to "The Personal
    Guarantor's signature below", and REVIEW-01 records that the form has no
    such signature line — `ptr-no-guarantor-signature-line`,
    `permission-guarantor-bound-without-signing`,
    `ptr-written-instructions-sourced-to-unsigned-frpa`. So the instrument the
    memo says would supply permissible purpose relies on a signature the
    instrument does not collect.

    **Neither conclusion is written into this exhibit or into §4.3.** What this
    exhibit does instead is state the requirements a release must meet, so that
    the question is answerable from the executed paper rather than argued from
    its absence. That is the whole of what a drafting agent can honestly do here.
    UNVERIFIED: nobody on this project has read 15 U.S.C. §1681b.

    DEPARTURE 1 — "LOMBARD CAPITAL LLC" BECOMES `{{funder}}`. The memo names the
    entity; the library may not. `tenant-agnostic.test.ts` pins three
    placeholders and §4.9 sets the precedent for using `{{funder}}` where a legal
    name has to appear.

    DEPARTURE 2 — THE GATE. `consumerReportPulled`, which the brief asks for and
    which survives ADR 0013's test where §4.3's does not: `instrumentsFor`
    already drops the whole `permission-to-release` instrument on this fact, so
    an ungated exhibit would point the FRPA at an instrument the suite does not
    contain. That is a dangling reference ACROSS instruments, which
    `select-clauses.test.ts` cannot see because it assembles one instrument at a
    time — asserted here instead.

    DEPARTURE 3 — THE SIGNATURE REQUIREMENT IS OPERATIVE, NOT DESCRIPTIVE. The
    memo says "a Merchant signature does not authorize reports on nonsignatory
    individuals". The exhibit says the release must be ON A FORM SIGNED BY THAT
    INDIVIDUAL, which is the requirement REVIEW-01 found the vendored form fails.
    §4.3 carries the same limit ungated, because it is the operative one and this
    exhibit is not always present.

    DEPARTURE 4 — "ATTACHED AND INCORPORATED BY REFERENCE" IS DROPPED IN FAVOUR
    OF DELIVERY. Incorporation by reference of a document the signer has not seen
    is how this clause came to be reviewed twice without its own text. The
    requirement is that the whole form is given before signature and a copy of
    the executed release is delivered to each signer.

    NOT FIXED HERE. The `permission-to-release` instrument itself — its §3
    "ongoing creditworthiness review", its §4 self-certification of statutory
    effect, its §5 photocopy rule, its §6 release of every information source,
    and the missing signature line. **No cluster in this wave owns it.**
  */
  {
    slug: 'frpa.exhibit-c-permission-to-release',
    version: 1,
    instrument: 'frpa',
    kind: 'clause',
    includeWhen: (facts) => facts.consumerReportPulled,
    number: 'Exhibit C',
    section: 'appendix',
    sortKey: 60,
    heading: '',
    body: 'A Permission to Release Information shall be given to Merchant in full before signature and shall be separately executed by the person with authority over the information it releases. It shall identify Buyer, {{funder}}, the information sources and the categories of information to be obtained, the permitted uses, the duration of the authorization, the persons to whom the information may be disclosed, and the notice and correction rights applicable law requires. Its permitted uses are limited to those Section 4.3, Section 4.4 and Section 4.7 allow, and it enlarges none of them.\nAuthority to obtain a consumer report on an individual shall be established and documented separately under applicable law, on a form signed by that individual. Merchant’s signature does not supply it for a person who has not signed, as Section 4.3 states.\nNo release authorizes unrelated marketing, disclosure beyond the recipients it names, a waiver of statutory rights, or a collection power this Agreement does not grant. The executed release shall be kept with the transaction record, and a copy of it shall be delivered to each signer.',
    source: { kind: 'attorney-drafted', author: null },
    status: 'draft',
    appliesInStates: [],
    examinedBy: [{ review: 'REVIEW-02', findings: [] }],
  },
];
