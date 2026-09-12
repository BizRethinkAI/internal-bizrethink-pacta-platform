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
    whyThisClause: {
      kind: 'implements',
      citation: '7 TAC §86.312(b)(3) (fees must be disclosed and contracted for in covered Texas transactions)',
    },
    variance: {
      kind: 'fixed',
      because: 'load-bearing',
      note: 'The purchase needs a complete fee schedule and a rule for blanks, changes and collection; removing the schedule would leave charges unstated.',
    },
    version: 1,
    instrument: 'frpa',
    kind: 'clause',
    includeWhen: null,
    section: 'appendix',
    sortKey: 10,
    heading: 'Permitted Fees',
    body: 'This Appendix is the whole of what Buyer may charge Merchant under this Agreement. Buyer may charge only a fee identified, in the completed Appendix and in every disclosure applicable law requires before Merchant accepts, by its name, its dollar amount or a lawful calculation method, the person to whom it is paid, what it is for, and when it is charged. A fee left blank, or not identified in the completed Appendix, is $0.00 and may not be charged. Buyer may not create a fee, or vary a fee, after Merchant signs.\nA fee is a separate debt and is not part of the purchase. No fee is added to the Purchased Amount or the Remaining Balance, and no fee is collected through a Split Funding Authorization or otherwise out of the settlement of Card Receipts. Section [[clause:frpa.merchant-deposit-agreement-4-1]] states how a fee is charged, demanded and collected.\nNo fee is charged for a reconciliation or an adjustment under Section [[section:reconciliation]]; for a decline in or an absence of Card Receipts; for a business failure, an ordinary loss of the business, or Merchant’s insolvency or bankruptcy; for a loss of or an interruption in access to information or to a system; for a good-faith addition or replacement of an Approved Bank Account or an Approved Processor under Section [[clause:frpa.approved-bank-account-2-4]]; or for Merchant exercising a legal right or a right this Agreement gives Merchant. Section [[clause:frpa.events-of-default-6-1]] lists these among the things that are not an Event of Default, and a fee may not be used to charge for one of them.\nAttorneys’ fees, court costs, collection expenses and interest are not fees. They are costs of enforcement, and Section [[clause:frpa.costs-of-collection-6-3]] governs them, states the only ceiling on them, and requires them to be awarded by a court or agreed in writing before they are payable.\nBuyer may waive a fee. A waived fee is removed from every amount Buyer claims and may not be reinstated; Buyer may keep its record of the waiver.',
    source: { kind: 'attorney-drafted', author: null },
    status: 'draft',
    appliesInStates: ['US-TX'],
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
    whyThisClause: {
      kind: 'implements',
      citation: '23 NYCRR §600.21(f) (written broker-compensation notice for covered New York recipients)',
    },
    variance: {
      kind: 'fixed',
      because: 'load-bearing',
      note: 'When an ISO is paid from the origination fee, the same cost must be identified once with its recipient; no-broker templates omit this explanation.',
    },
    version: 1,
    instrument: 'frpa',
    kind: 'clause',
    /*
      Whole-clause, and every value of the fact is answered: a broker funder gets
      this paragraph and §7.21; a funder with no broker channel gets neither, and
      the Origination Fee itemization it still needs is in §4.1.
    */
    includeWhen: (facts) => facts.brokerChannel,
    section: 'appendix',
    sortKey: 20,
    heading: 'Origination Fee Paid to an ISO',
    body: 'Part or all of the Origination Fee itemized in the Itemization of Net Amount Funded grid may be paid by Buyer to an ISO. Buyer shall state in the Merchant and Funding Information grid the amount so paid and the ISO to which it is paid, and shall make every compensation disclosure applicable law requires.\nThat payment is made by Buyer out of an amount with which Merchant has already been charged. It is included in the transaction cost disclosed to Merchant before Merchant accepts, and it authorizes no further charge to Merchant by Buyer or by an ISO. Merchant is not required to pay an ISO anything as a condition of this Agreement.\nWhere an amount charged to Merchant funds an ISO’s compensation, Buyer shall not state that Merchant is charged no ISO fee. What Merchant is charged, and who is paid out of it, are stated in the Itemization of Net Amount Funded grid and in this Appendix.\nSection [[clause:frpa.independent-sales-organizations-and-brokers-7-21]] governs an ISO’s conduct, an unauthorized charge collected by an ISO, and Buyer’s duty to refund one.',
    source: { kind: 'attorney-drafted', author: null },
    status: 'draft',
    appliesInStates: ['US-NY'],
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
    whyThisClause: { kind: 'discretionary' },
    variance: {
      kind: 'fixed',
      because: 'load-bearing',
      note: 'The appendix must point to the single enforcement-cost rule rather than price a second recovery; no alternate appendix enforcement charge is authored.',
    },
    version: 1,
    instrument: 'frpa',
    kind: 'clause',
    includeWhen: null,
    section: 'appendix',
    sortKey: 30,
    heading: 'Enforcement Costs',
    body: 'Attorneys’ fees, court costs, collection expenses and any statutory interest are recoverable only under Section [[clause:frpa.costs-of-collection-6-3]], and only as that Section provides — on proof of what was incurred, only in the amount a court awards or a written settlement agrees, only against an itemized statement given to Merchant beforehand, subject to the single aggregate ceiling that Section states, without double recovery, and subject to the limit that Section places on what a Guarantor may be charged.\nThey are not fees and this Appendix does not price them. They are not earned automatically, and they are not calculated as a percentage of the uncollected Purchased Amount. They are not added to the Purchased Amount or the Remaining Balance and are not collected out of the settlement of Card Receipts.',
    source: { kind: 'attorney-drafted', author: null },
    status: 'draft',
    appliesInStates: [],
    examinedBy: [{ review: 'REVIEW-02', findings: [] }],
  },
  /*
    A FULL-PERFORMANCE GUARANTY AND A FRAUD CLAIM, IN THE SIGNATURE BLOCK.

    WHAT WAS WRONG. "Each of Merchant and Guarantor represents that he or she is
    authorized to sign this Agreement, LEGALLY BINDING MERCHANT AND GUARANTOR TO
    COMPLY WITH THE TERMS OF THIS AGREEMENT and that the information provided
    herein and IN ALL OF BUYER'S DOCUMENTS, FORMS, AND RECORDED INTERVIEWS is
    true, accurate, and COMPLETE IN ALL RESPECTS. ANY MISREPRESENTATION made by
    Merchant or Guarantor in connection with this Agreement MAY CONSTITUTE A
    SEPARATE CAUSE OF ACTION FOR FRAUD or intentional misrepresentation."

    Three defects, in ascending order of how well they hide.

    (1) THE GUARANTY. "Legally binding Merchant AND GUARANTOR to comply with the
        terms of this Agreement" is a full-performance guaranty — the market form
        §9.2 deliberately refuses — obtained in the signature block, twenty pages
        from §9.2's promise that "this Guaranty does not guarantee ... the
        performance of any other covenant". `personal-liability-is-section-9-
        only.test.ts` found this and conceded it to `miscellaneous`, and it was
        the FOURTH route around §9.2 after §7.9's indemnity, §7.21's ISO
        indemnity and §4.10's perfection costs.

        **THE CONCESSION IN THAT FILE IS DELETED IN THIS CHANGE.** Its own
        docstring requires it — *"When the owning cluster fixes one, delete its
        line here"* — and `data-and-channel` set the precedent when it closed
        §7.21. A concession left standing after the defect is fixed is a line of
        a test that can no longer be red, which is the exact failure this package
        shipped once in two assertions that filtered on `Divergence` kinds that
        do not exist. With the line gone, the set-level assertion covers this
        clause with no exception.

    (2) THE CERTIFICATION'S SCOPE. "All of Buyer's documents, forms, and recorded
        interviews", certified "complete in all respects". Buyer's documents
        include a broker's write-up, an underwriter's summary and a call-centre
        note. The signer did not write them, may never have seen them, and is
        made to warrant them absolutely — no materiality, no knowledge
        qualifier, no as-of date. And "recorded interviews": a transcript or
        summary of a phone call, adopted by signature, which is §7.18's recording
        consent turned into a warranty.

    (3) THE FRAUD SENTENCE. Calling any misrepresentation a "separate cause of
        action for fraud" supplies none of the elements — no scienter, no
        reliance, no causation, no damage — and a contract cannot supply them.
        What it does supply is a sentence a collector can quote to a guarantor
        whose only error was a wrong figure on a form, which is what the memo
        means by "does not establish scienter, reliance, causation, or damages".

    WHAT CHANGED. The capacity question is answered first and separately: a
    person signing for Merchant signs in a business capacity and takes on nothing
    personally by doing so, and becomes a Guarantor only by separately signing
    the Guaranty in that capacity. The certification narrows to Merchant's own
    identified written submissions, on knowledge after reasonable inquiry, as of
    the dates they bear, subject to disclosed qualifications — which is the same
    standard `representations` put on the §5 lead-in, so the two agree. The fraud
    sentence becomes what it should always have been: a statement that the
    elements are the law's, and that an error is not one of them. And each signer
    gets the papers.

    DEPARTURE 1 — NO CITATION TO SECTION 9. The memo writes "unless separately
    signing as Guarantor under Section 9". §9.1 is gated on `guarantyScope !==
    'none'` and §9.2 on `=== 'limited-conduct'`, so under `guarantyScope: 'none'`
    the whole of Section 9 is absent and the citation would dangle — a fifth
    entry in `select-clauses.test.ts`'s "Section 9" register, in the one clause
    of the document that is in front of every signer. Written as "separately
    signs the Guaranty", which is true under every value of the fact.

    DEPARTURE 2 — "AS OF THEIR STATED SIGNATURE DATES" BECOMES THE DATES BESIDE
    THE SIGNATURES. v4 executed "as of the Effective Date", which is a single
    date in Section 1 that both parties may sign on different days from. The
    signature block is a `{{DATE}}` widget per signer — see `FRPA_NON_CLAUSE`,
    "[TABLE] Printed Name:" and "{{SIGNATURE," — so the dates exist and the
    recital should use them.

    DEPARTURE 3 — THE NON-ADOPTION SENTENCE IS ADDED. Not in the memo, which
    narrows the certification but does not say what happens to the documents it
    no longer covers. Without it, a broker's write-up is merely un-warranted
    rather than un-adopted, and "un-warranted" is a weaker answer to the same
    question.

    NO WIDGET MARKERS, AND THE BRIEF EXPECTED SOME. It says *"Exhibit A and the
    execution block have many"* `«N»` markers. Neither record has one and neither
    ever did: the signature grid — "[TABLE] BUYER Lombard Capital LLC",
    "PERSONAL GUARANTOR", "Guarantor Signature:", "{{SIGNATURE," — is declared in
    `frpa/index.ts` as SIX separate `FRPA_NON_CLAUSE` lines, and this record is
    only the prose paragraph above it. Nothing was dropped. `frpa-coverage.test.ts`
    is what would notice if it had been.
  */
  {
    slug: 'frpa.execution',
    whyThisClause: { kind: 'discretionary' },
    variance: {
      kind: 'fixed',
      because: 'load-bearing',
      note: 'Merchant’s authorized signature and a guarantor’s separate capacity must be distinguishable; the agreement cannot operate without execution by its actual parties.',
    },
    version: 1,
    instrument: 'frpa',
    kind: 'clause',
    unnumberedReason: 'Execution block read with the signatures and their stated capacities.',
    includeWhen: null,
    section: 'execution',
    sortKey: 40,
    heading: 'Execution',
    body: 'IN WITNESS WHEREOF, the parties execute this Agreement as of the dates written beside their signatures.\nA person signing for Merchant signs in the business capacity identified beside that signature, represents that Merchant has authorized the signature, and takes on no personal obligation by giving it. A person becomes a Guarantor only by separately signing the Guaranty in that capacity, and a signature given in one capacity is not a signature in the other.\nMerchant confirms that the written statements of fact it identified and submitted to Buyer for this transaction are, to its knowledge after reasonable inquiry, materially accurate as of the dates they bear, subject to any qualification or correction Merchant disclosed. No person adopts, by signing this Agreement, a document that person did not submit, a summary or recording made by another, or an application completed by another.\nA claim for fraud or intentional misrepresentation requires proof of every element applicable law imposes. An error, an omission or a figure later corrected does not establish one, and no provision of this Agreement supplies an element of one.\nEach signer shall be given the complete signed documents, including every exhibit and every disclosure that forms part of this transaction, at or promptly after signing.',
    source: { kind: 'attorney-drafted', author: null },
    status: 'draft',
    appliesInStates: [],
    examinedBy: [{ review: 'REVIEW-02', findings: [] }],
  },
  /*
    THE CRITICAL, AND THE ONE THAT DECIDES WHETHER THE PRODUCT WORKS AT ALL.

    THE OWNER'S NOTE IS THE PREMISE: *"A UCC §9-406 notice of a PARTIAL
    assignment does not compel an acquirer to split settlement. Nothing else in
    this agreement matters if Payzli will not honour the split."* Every other
    clause in this library allocates a risk. This one names the mechanism the
    whole instrument depends on, and the mechanism belongs to a third party.

    WHAT WAS WRONG. "The form of the Split Funding Authorization is ATTACHED AND
    INCORPORATED BY REFERENCE." Two words doing all the work and neither of them
    true in the way a reader would take it. The form is not attached to anything
    a merchant is shown; it is a separate `.docx` in `lombard-contracts`. And
    incorporating by reference a document the signer has not read is how this
    exhibit came to be reviewed twice without its own text ever being looked at
    — the identical defect `data-and-channel` found at Exhibit C and fixed the
    same way.

    THE MEMO SAYS THE AUTHORIZATION "IS NOT SUPPLIED". IT IS, AND READING IT IS
    WHAT MAKES THIS CRITICAL RATHER THAN THEORETICAL. `Lombard_Payzli_Split_
    Funding_Authorization_v2.docx` is vendored at
    `clauses/source-documents/`, and the instrument is in this library as seven
    `split-funding.*` clauses. Four things are true of it, and they are handed
    back rather than fixed here — **no cluster in this wave owns
    `split-funding`**, and it is outside this cluster's two files:

      (a) **IT SWEEPS A FEE.** *"The Purchased Amount under the Purchase
          Agreement is $«16»; that figure is stated for information only and IS
          NOT THE POINT AT WHICH WITHHOLDING STOPS, because Seller's obligations
          under the Purchase Agreement MAY INCLUDE FEES IN ADDITION to the
          Purchased Amount."* That is, in terms, the thing §4.1 forbids — "no fee
          is collected through a Split Funding Authorization" — written on the
          only piece of paper the processor actually reads. `fees-and-money`'s
          requirement that this exhibit forbid a fee exists because of this
          sentence, and its absence is why §4.1's rule had no counterpart where
          the money moves.
      (b) **IT HAS NO CAP.** Withholding runs "until Funding Company notifies
          Payzli in writing that Seller's obligations ... have been satisfied" —
          a stop at the funder's discretion rather than at the Purchased Amount,
          against §2.3's single aggregate cap and §2.6's Completion Threshold.
      (c) **IT TAKES AN INDEMNITY.** *"Seller hereby agrees to indemnify Payzli
          from any and all losses ... arising from Payzli's following the
          instructions set forth in this letter."* The instructions are Buyer's;
          the indemnity is Merchant's; and §7.9 as rewritten is the only
          indemnity Merchant gives under this Agreement.
      (d) **NOBODY COUNTERSIGNS IT.** The letter is signed by SELLER alone —
          "SELLER (`«4»` DBA `«5»`)", one signature widget, one date widget.
          **There is no acceptance block for the processor at all.** So §2.3's
          duty on Buyer to "obtain each Approved Processor's written acceptance
          ... before the Purchase Date" has nowhere on the paper to be
          discharged, and `LOMBARD_FACTS.processorSplitAccepted: false` is not a
          gap in the record — it is what the form makes inevitable.

      Two smaller ones, also handed back: the percentage is collected TWICE, in
      `«2»` (recital) and `«3»` (instruction), so two blanks can disagree about
      the one number in the deal; and the letter recites Payzli's own $295/$195
      termination fees, which is a third party's price list inside our form.

      All four are pinned in `__tests__/a-notice-can-arrive-in-time.test.ts` as a
      register that must stay reachable — the `KNOWN_GAPS` discipline — so the
      day somebody rewrites the letter the test goes red and the entry is deleted
      rather than left as a line that can no longer fail.

    WHAT CHANGED. The exhibit becomes the SPECIFICATION the authorization must
    meet, drafted to §2.3 and §2.6 exactly: the settlement base is Card Receipts
    as this Agreement defines them, the Specified Percentage, a transaction
    reference, a start date, a servicing and reconciliation contact, and a stop
    procedure tied to the Completion Threshold. ONE aggregate cap across every
    processor, with the processor-level limit Buyer sets under §2.3 stated in the
    document so the merchant can see it. A closed list of what the authorization
    may not do — fixed or minimum remittance, default increase, deposit-account
    debit, a fee, anything that is not a Purchased Receipt. The processor's own
    charges, reserves and settlement timing identified, so that what reaches
    Buyer can be checked against Card Receipts. And the executed pair — the
    authorization and the processor's written acceptance — kept with the
    transaction record and copied to Merchant.

    NOT GATED ON `processorSplitAccepted`, AND THE BRIEF ASKED FOR THE GATE. It
    marks this `both` on that fact. Refused. **The spine cluster's reasoning for
    refusing it on §2.3 applies here, and one of its two limbs no longer exists
    while a third has appeared.**

      - The spine's reason (1) HOLDS AND IS STRONGER HERE. Gating §2.3 out
        "produces an agreement with no collection mechanism at all — worse paper,
        not safer paper". Gating the EXHIBIT out is worse again: it deletes the
        specification precisely for the funder whose processor has not accepted,
        which is the funder that needs it. A gate that removes a requirement when
        the requirement is unmet is inverted.
      - The spine's reason (2) HAS GONE. It was that `select-clauses.test.ts`
        required `LOMBARD_FACTS` to select the whole FRPA. That invariant is
        retired — `renewal-positions` replaced it with the dangling-reference
        check — so the collision the spine named is no longer a reason for
        anything. Said plainly because the brief asks which of the spine's
        reasoning applies: **one of its two reasons does not.**
      - A THIRD REASON, WHICH IS THIS CLUSTER'S. Gating this out leaves a
        dangling reference that NOTHING IN THE PACKAGE CAN SEE. §2.3 ("a Split
        Funding Authorization in the form of Exhibit A") and
        `frpa.holdback-explainer` ("A separate Split Funding Authorization
        (Exhibit A) is executed for each Approved Processor") are both ungated and
        both name this exhibit BY NAME. `select-clauses.test.ts` reads `Section N`
        tokens; "Exhibit A" is not one. The gap would be silent. Asserted in this
        cluster's test instead.
      - AND THE FACT IS THE WRONG KIND. `clauses/facts.ts` says these are
        TEMPLATE facts, answered once by a funder, and that per-deal values
        "select no clauses". Whether a given processor has countersigned is a
        transaction-record fact that varies by processor and by deal. It belongs
        in the transaction file §86.311(b)(3) describes, not in a predicate that
        decides what the template says.

    So `processorSplitAccepted` is still read by nothing, and that remains a real
    gap: a template can be assembled whose split nobody has agreed to. What this
    cluster can do about it is make the requirement checkable against paper,
    which is what the exhibit now is, and say out loud that the vendored form
    does not meet it. Both are done.

    DEPARTURE 1 — "BEFORE FUNDING" BECOMES "BEFORE THE PURCHASE DATE". §4.13
    defines the Purchase Date and §2.3 already uses that term for the same
    moment. Two names for one moment in two clauses is how they drift apart.

    DEPARTURE 2 — THE MEMO'S "COORDINATED PROCESSOR-LEVEL LIMITS" IS WRITTEN AS
    A DISCLOSURE TO MERCHANT. The memo requires the limits to exist. §2.3 already
    puts the duty to set and update them on Buyer; what the merchant cannot
    otherwise see is what the limit IS, because it cannot observe another
    processor's remittance. So the authorization states it.

    DEPARTURE 3 — "SECTION 1.5" IS DROPPED. v4 pointed at "each Approved
    Processor identified in Section 1.5". `frpa.definitions` now defines Approved
    Processor as each processor identified in Section 1 AND each processor added
    under §2.4, and a §1.5-only reference would exclude every processor added
    afterwards — the case §2.4 exists for and the case an interruption produces.

    DEPARTURE 4 — NO ATTACHMENT, NO INCORPORATION. Exhibit C's departure 4,
    applied here for the same reason and stated the same way: the form is given
    in full before signature, and the executed pair is delivered afterwards.

    UNVERIFIED. Nobody on this project has read UCC §9-406, and the owner's
    premise about what a notification of a partial assignment does and does not
    compel is recorded here rather than relied on in the body. The body says only
    that an Approved Processor is not a party and that this Agreement does not
    bind it, which is true whatever §9-406 turns out to say. Note also 7 TAC
    §86.312(b)(12), vendored, which makes it an abusive practice to instruct a
    recipient's customer to redirect payments previously scheduled to another
    person unless that person consented or the debt was validly assigned —
    another reason the acceptance is obtained rather than assumed.

    NOT FIXED HERE. The `split-funding` instrument itself, all four defects above.
    A countersigned processor acceptance, and a real settlement tested end to end
    including tax, tips, refunds and reserves, are operational work that no
    drafting change substitutes for.
  */
  {
    slug: 'frpa.exhibit-a-split-funding',
    whyThisClause: { kind: 'discretionary' },
    variance: {
      kind: 'fixed',
      because: 'load-bearing',
      note: 'The split collection design needs a complete instruction and processor acceptance for each processor; an unaccepted instruction is a deal prerequisite to complete, not a clause to omit.',
    },
    version: 1,
    instrument: 'frpa',
    kind: 'clause',
    includeWhen: null,
    section: 'split-funding-exhibit',
    sortKey: 50,
    heading: 'Split Funding Authorization',
    body: 'Before the Purchase Date, Merchant and Buyer shall sign a separate Split Funding Authorization for each Approved Processor, and Buyer shall obtain that Approved Processor’s written acceptance of it, as Section [[clause:frpa.primary-collection-split-funding-via-approved-processor-2-3]] requires. This Exhibit states what each authorization shall contain. It incorporates no form, and a form that has not been given to Merchant in full before signature is not part of this Agreement.\nEach Split Funding Authorization shall state: the parties and the date of this Agreement; that the amount withheld is the Specified Percentage of Card Receipts as this Agreement defines them; a transaction reference by which a remittance can be identified; the date withholding begins; a servicing and reconciliation contact for Merchant; and how the instruction is stopped, including that Buyer shall instruct the Approved Processor to stop withholding immediately on the Completion Threshold under Section [[clause:frpa.completion-threshold-2-6]].\nOne aggregate cap applies. Each authorization shall state that the total remitted to Buyer under all Split Funding Authorizations for this Agreement shall not exceed the Purchased Amount, shall state the limit Buyer has set for that Approved Processor under Section [[clause:frpa.primary-collection-split-funding-via-approved-processor-2-3]], and shall require Buyer to update that limit so the aggregate cap is not exceeded.\nAn authorization shall not authorize a fixed or minimum remittance, an increase in the Specified Percentage on an Event of Default or otherwise, a debit to any deposit account of Merchant, the collection of a fee, or the collection of any amount that is not a Purchased Receipt. No fee is collected through a Split Funding Authorization, as Section [[clause:frpa.merchant-deposit-agreement-4-1]] provides, and an authorization that would collect one is not the authorization this Agreement requires.\nEach authorization shall identify the Approved Processor’s own charges, reserves, chargeback rights and existing rights, and the settlement timing that applies, so that what reaches Buyer can be checked against Card Receipts. It shall state how an over-remittance is identified, corrected and refunded under Section [[section:reconciliation]] and Section [[clause:frpa.completion-threshold-2-6]].\nNo Split Funding Authorization enlarges the purchase, the Guaranty or Buyer’s remedies. An Approved Processor is not a party to this Agreement and this Agreement does not bind it. The complete executed authorization and the Approved Processor’s written acceptance shall be kept with the transaction record, and a copy of each shall be given to Merchant.',
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
    whyThisClause: {
      kind: 'implements',
      citation: '15 U.S.C. §1681b(a)(2), (f) (individual consumer-report instructions and permissible use)',
    },
    variance: {
      kind: 'fixed',
      because: 'load-bearing',
      note: 'When an individual consumer report is obtained, separate purpose and signer authority must accompany it; the no-report answer omits the release rather than provides another authorization.',
    },
    version: 1,
    instrument: 'frpa',
    kind: 'clause',
    includeWhen: (facts) => facts.consumerReportPulled,
    section: 'permission-to-release-exhibit',
    sortKey: 60,
    heading: 'Permission to Release',
    body: 'A Permission to Release Information shall be given to Merchant in full before signature and shall be separately executed by the person with authority over the information it releases. It shall identify Buyer, {{funder}}, the information sources and the categories of information to be obtained, the permitted uses, the duration of the authorization, the persons to whom the information may be disclosed, and the notice and correction rights applicable law requires. Its permitted uses are limited to those Section [[clause:frpa.financial-condition-4-3]], Section [[clause:frpa.transaction-history-4-4]] and Section [[clause:frpa.protection-of-information-4-7]] allow, and it enlarges none of them.\nAuthority to obtain a consumer report on an individual shall be established and documented separately under applicable law, on a form signed by that individual. Merchant’s signature does not supply it for a person who has not signed, as Section [[clause:frpa.financial-condition-4-3]] states.\nNo release authorizes unrelated marketing, disclosure beyond the recipients it names, a waiver of statutory rights, or a collection power this Agreement does not grant. The executed release shall be kept with the transaction record, and a copy of it shall be delivered to each signer.',
    source: { kind: 'attorney-drafted', author: null },
    status: 'draft',
    appliesInStates: [],
    examinedBy: [{ review: 'REVIEW-02', findings: [] }],
  },
];
