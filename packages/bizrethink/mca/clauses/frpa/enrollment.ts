import type { McaClause } from '../types';

/**
 * Section 4 — terms of enrollment, and the third place a grant can escape.
 *
 * SEVEN OF THESE ARE AUTHORED, THE REST ARE STILL TRANSCRIBED. §4.12 was
 * rewritten with Section 6 by `default-remedies`; §§4.5, 4.6, 4.9, 4.10, 4.11
 * and 4.13 were rewritten by `enrollment` on 2026-09-10 under
 * [ADR 0012](../../../../../docs/adr/0012-the-baseline-document-is-input-not-specification.md).
 * §4.2 was READ and deliberately left alone — see the note above it. The other
 * eight bodies here are still the words v4 prints and belong to other clusters.
 *
 * WHY THIS SECTION NEEDED ITS OWN CROSS-CLAUSE CHECK. `one-settlement-base`
 * asserts the corpus measures one asset and `remedies-reach-no-further` asserts
 * that no REMEDY reaches past it. Section 4 is neither: it is where the
 * **grants** live — a security interest, a negative pledge, a power of attorney,
 * a funding discretion — and v4 distributed one defect across four of them, each
 * looking like housekeeping on its own. `__tests__/no-grant-beyond-the-purchased-share.test.ts`
 * reads all ten together.
 *
 * `__tests__/frpa-coverage.test.ts` separately asserts that NOTHING in the
 * document is missing from the library — the direction that fails silently.
 */
export const FRPA_ENROLLMENT: McaClause[] = [
  {
    slug: 'frpa.merchant-deposit-agreement-4-1',
    version: 1,
    instrument: 'frpa',
    kind: 'clause',
    includeWhen: null,
    number: '4.1',
    section: 'enrollment',
    sortKey: 10,
    heading: 'Merchant Deposit Agreement',
    body: 'Merchant shall execute an agreement (the “Merchant Deposit Agreement”) acceptable to Buyer and have the Approved Bank Account with a depository institution (“Bank”) acceptable to Buyer. Merchant shall provide Buyer and/or its authorized agent with the information and authorizations necessary to verify Merchant’s Receipts into the Approved Bank Account.\nMerchant authorizes its merchant processor and applicable third parties to provide Buyer all information necessary to permit Buyer to determine the Specified Percentage due.\nBuyer may charge fees as set forth on Appendix A (the “Fee Structure”); such fees are added to the Remaining Balance and collected through the same settlement remittance as the Purchased Amount. Every amount deducted from the Purchase Price before delivery to Merchant must appear as a line in the itemization in Section 1.4 and be stated as a dollar figure before Merchant signs. Buyer may not deduct any amount that does not so appear.\nThe foregoing authorizations shall continue in effect until Buyer receives final payment of the entire Purchased Amount and all other amounts due. Bank may rely upon the instructions of Buyer without independent verification. Merchant waives any claim for damages against Bank in connection with actions taken based upon instructions from Buyer, unless such damages were due to Bank’s failure to follow Buyer’s instructions.\nMerchant acknowledges that: (i) Bank will be acting on behalf of Buyer with respect to portions of the Purchased Amount until remitted to Buyer through the settlement process; (ii) Bank may or may not be an affiliate of Buyer; (iii) Merchant has no power or authority to control Bank’s or Buyer’s actions with respect to remittance; (iv) Buyer is not responsible and shall not be liable for the actions of Bank, and Merchant agrees to hold Buyer harmless; and (v) funds representing the Purchased Amount in the possession of Bank and Buyer constitute property owned solely by Buyer, and Merchant disclaims any and all interest therein.',
    source: { kind: 'attorney-drafted', author: null },
    status: 'draft',
    appliesInStates: [],
    examinedBy: [
      {
        review: 'REVIEW-01',
        findings: [
          'amount-you-deliver-is-not-fixed',
          'closing-costs-undefined-and-unbounded',
          'completion-threshold-two-conflicting-tests',
          'defined-term-drift',
          'frpa-undefined-capitalised-terms',
          'undefined-money-terms',
        ],
      },
    ],
  },
  /*
    RETAINED, AND THE RETENTION IS THE WORK. The memo's disposition is RETAIN
    with a dependency: the clause is worth exactly what §2.6 says, because the
    cross-reference is the whole clause. The dependency was checked rather than
    assumed, and this is what the check found.

    §2.6 AS THE SPINE REWROTE IT SUPPLIES WHAT §4.2 NEEDS. "This Agreement is
    complete, and Buyer's right to receive Purchased Receipts ends, when the
    Remaining Balance reaches zero, or when this Agreement is cancelled or
    otherwise lawfully terminated ... (the “Completion Threshold”). That is the
    only test of completion, and it governs wherever another provision of this
    Agreement describes completion differently." The term is therefore indefinite
    and purchase-only, which is what an indefinite term has to mean in a sale.

    THE THREE FINDINGS ON THIS CLAUSE, RE-READ AGAINST THE NEW SPINE.
    - `completion-threshold-two-conflicting-tests` is closed by §2.6's "only
      test" sentence, which is written to override every other description.
    - `acceleration-defeats-indefinite-term` is closed from §6.2's side, not
      this one: the uncollected Purchased Amount "is not automatically due, is
      not made due by an Event of Default, and is not agreed liquidated
      damages". An indefinite term that a default converts into a fixed sum due
      immediately is not indefinite, so §4.2 is only honest while that stays
      shut. `no-grant-beyond-the-purchased-share.test.ts` asserts both halves.
    - `frpa-7-6-and-4-2-contradict-the-2-6-completion-test` is NOT closed. §7.6
      is `miscellaneous`'s clause and still describes termination its own way.
      Reported, not fixed.

    ONE THING §2.6 CHANGED THAT §4.2 SILENTLY GAINED. §2.6's Remaining Balance
    "never includes a fee", so the balance §4.2 runs until is a purchase-only
    balance. Before the spine, §4.1's Appendix A fees were added to it and the
    term ran until the fees were paid too. That conflict is live in §4.1 and is
    `fees-and-money`'s to resolve; if it resolves the other way, this clause
    changes meaning without changing a word.

    NO DEPARTURE. The memo proposes no replacement text and none is written.
  */
  {
    slug: 'frpa.term-of-agreement-4-2',
    version: 1,
    instrument: 'frpa',
    kind: 'clause',
    includeWhen: null,
    number: '4.2',
    section: 'enrollment',
    sortKey: 20,
    heading: 'Term of Agreement',
    body: 'This Agreement shall continue until the Completion Threshold is attained (Section 2.6).',
    source: { kind: 'attorney-drafted', author: null },
    status: 'draft',
    appliesInStates: [],
    examinedBy: [
      {
        review: 'REVIEW-01',
        findings: ['acceleration-defeats-indefinite-term', 'completion-threshold-two-conflicting-tests'],
      },
      { review: 'REVIEW-02', findings: ['frpa-7-6-and-4-2-contradict-the-2-6-completion-test'] },
    ],
  },
  {
    slug: 'frpa.financial-condition-4-3',
    version: 1,
    instrument: 'frpa',
    kind: 'clause',
    includeWhen: null,
    number: '4.3',
    section: 'enrollment',
    sortKey: 30,
    heading: 'Financial Condition',
    body: 'Merchant and Guarantor(s) authorize Buyer and its agents to investigate their financial responsibility and history and shall provide to Buyer any bank or financial statements, tax returns, and other financial documentation as Buyer deems necessary prior to or at any time after execution of this Agreement. A photocopy of this authorization will be deemed acceptable for release of financial information. Buyer is authorized to update such information and financial profiles from time to time as it deems appropriate.',
    source: { kind: 'attorney-drafted', author: null },
    status: 'draft',
    appliesInStates: [],
    examinedBy: [
      { review: 'REVIEW-02', findings: ['frpa-4-3-consumer-report-authority-depends-on-a-separate-instrument'] },
    ],
  },
  {
    slug: 'frpa.transaction-history-4-4',
    version: 1,
    instrument: 'frpa',
    kind: 'clause',
    includeWhen: null,
    number: '4.4',
    section: 'enrollment',
    sortKey: 40,
    heading: 'Transaction History',
    body: 'Merchant authorizes the Bank and the Approved Processor to provide Buyer with Merchant’s banking and credit-card processing history from time to time to determine qualification or continuation in this program.',
    source: { kind: 'attorney-drafted', author: null },
    status: 'draft',
    appliesInStates: [],
    examinedBy: [{ review: 'REVIEW-02', findings: ['frpa-undefined-capitalised-terms-in-the-unexamined-clauses'] }],
  },
  /*
    WHAT WAS WRONG, AND WHAT WAS NOT. The memo REFUTES the instinct to delete
    this clause: a commercial consequential-damages waiver between businesses is
    not inherently invalid, and a mutual one is ordinary paper. Two things about
    THIS one were wrong.

    (1) It ran one way. `frpa-4-5-exculpation-is-unqualified-where-every-sibling-clause-is-qualified`
        is the finding: every neighbouring limit in v4 carries a carve-out and
        this one carries none, so Buyer was exculpated for its own fraud.
    (2) It is a defence to the refund the agreement now promises. §2.6 obliges
        Buyer to refund any amount collected above the Purchased Amount, and §3
        gives a reconciliation and an adjustment. An unqualified waiver of
        "lost profits, lost revenues ... indirect or consequential damages, each
        of which is waived by Merchant" is the first thing a defendant reaches
        for when a merchant sues to get an over-collection back. That is not a
        theoretical objection: the over-collection claim is precisely a claim
        for money the merchant should never have parted with, and calling it
        consequential is a stretch a court might not make but a claims handler
        certainly will.

    WHAT CHANGED. Mutual, and limited to remote or speculative loss from an
    ORDINARY breach. Misconduct, unauthorised collection and data duties are
    carved out. The refund, the reconciliation and the recovery of amounts
    wrongfully collected are put outside it in terms, so the clause cannot be
    read against them at all.

    DEPARTURE FROM THE MEMO. Two.
    (1) The memo's carve-out list ends at "liability and remedies that applicable
        law does not permit to be waived". Kept, and the sentence that names the
        specific rights is made a separate limb — a general saving and a specific
        exclusion do different work, and the general one is what a drafter
        deletes first in a later revision without noticing what went with it.
    (2) The memo says "It does not limit return of funds, reconciliation, direct
        damages, or recovery of amounts wrongfully collected". Pointed at §2.6
        and §3 by number, because "return of funds" is not a term this Agreement
        uses and an unanchored phrase is how a right becomes arguable.

    NOT FIXED HERE. `el-4-5-fcra-authorisation-runs-to-a-different-entity-than-the-frpas`
    is a finding about the Equipment Lease's §4.5, not this one — the loci
    collide on a section number across two instruments. It belongs to whoever
    holds the Equipment Lease, and the `examinedBy` entry is left as it stands
    because README rule 4 says a finding attaches by judgement and the judgement
    stays visible.
  */
  {
    slug: 'frpa.no-liability-4-5',
    version: 1,
    instrument: 'frpa',
    kind: 'clause',
    includeWhen: null,
    number: '4.5',
    section: 'enrollment',
    sortKey: 50,
    heading: 'No Liability',
    body: 'To the extent applicable law permits, neither party is liable to the other for remote or speculative consequential damages, or for lost profits, lost revenue or lost business opportunity, arising solely from an ordinary breach of this Agreement. This limitation is mutual and applies equally to Buyer, to Merchant and to each Guarantor.\nIt does not apply to fraud, willful misconduct, gross negligence, unauthorized collection, unauthorized use or disclosure of information, breach of a confidentiality or data-security duty, a third-party claim covered by an express indemnity, or a liability or remedy that applicable law does not permit to be waived.\nIt limits nothing that this Agreement promises. It does not reduce, cap or provide a defence to Merchant’s right to the refund of any amount collected above the Purchased Amount under Section 2.6, to a reconciliation or an adjustment under Section 3, to direct damages, or to the recovery of an amount wrongfully collected. No punitive or statutory remedy is waived where the waiver would be unenforceable.',
    source: { kind: 'attorney-drafted', author: null },
    status: 'draft',
    appliesInStates: [],
    examinedBy: [
      {
        review: 'REVIEW-02',
        findings: [
          'el-4-5-fcra-authorisation-runs-to-a-different-entity-than-the-frpas',
          'frpa-4-5-exculpation-is-unqualified-where-every-sibling-clause-is-qualified',
        ],
      },
    ],
  },
  /*
    THE SELF-HELP PROBLEM IN ONE CLAUSE. The memo rates it High; the cluster
    brief rates it Critical, and the brief is right.

    WHAT WAS WRONG. An IRREVOCABLE appointment as attorney-in-fact "with full
    authority to take any action or execute any instrument or document", armed
    by "a violation by Merchant of any term of this Agreement" — so every
    covenant in Section 5 was a trigger, including a late financial statement.
    Then five limbs, of which three reach outside anything Buyer bought:
    obtaining and adjusting INSURANCE, signing Merchant's name on invoices and
    on assignments directing account debtors to pay Buyer, and instituting any
    PROCEEDING Buyer deems necessary. Signing a merchant's litigation documents
    is an evidentiary problem as well as a self-help one — a pleading or an
    admission signed by the counterparty is a document nobody can later
    disentangle.

    IT ALSO REACHED PROPERTY THE GRANT DOES NOT SELL. "To collect monies due or
    to become due under or in respect of any of the Collateral" is written
    against v4's §4.10 Collateral, which included the accounts the receipts arose
    from. Against the granting clause as the spine rewrote it, that is the
    merchant's retained share and its whole customer ledger.

    THE DIRECT CONTRADICTION WITH §6.2, AND HOW IT IS RESOLVED. §6.2, rewritten
    this session, says "Buyer holds no power of attorney for the purposes of this
    Section and may take no self-help remedy", and separately "no signing of
    process in Merchant's name". §4.6 as it stood granted precisely that power
    and armed it on an Event of Default. Two clauses twenty pages apart
    disagreeing about whether a power exists is worse than either alone, and the
    later reader picks.

    Resolved IN §6.2'S FAVOUR, which is the only resolution available: §6.2's
    disclaimer is scoped "for the purposes of this Section", so a ministerial
    PRE-default collection authority can coexist with it, but only if §4.6 says
    in terms that it confers nothing on an Event of Default and that Section 6.2
    governs enforcement. It now does. Nothing in §6.2 was touched — that clause
    is `default-remedies`' and this cluster does not edit it.

    WHAT IS LEFT. Two ministerial acts, both inside the purchased share: hand an
    Approved Processor the Split Funding Authorization Merchant has already
    signed, and endorse a jointly payable instrument to the extent of the share
    sold. Neither creates a right Buyer does not already have; both are about
    delivering an instruction Merchant gave.

    NOTICE IS A CONDITION, NOT A COURTESY, and that is a DEPARTURE FROM THE MEMO.
    The memo says "Buyer shall provide Merchant a copy of any such action
    promptly", which makes an unnoticed act a breach of a side promise — leaving
    the act itself effective and the merchant with a claim for nothing. Written
    instead so that an act taken without the notice is not authorized by this
    Section at all. The processor copy is contemporaneous, matching §6.2's "copy
    of each such instruction at the same time" and §2.3's specification for
    Exhibit A.

    SECOND DEPARTURE. The memo leaves the authority's revocability unstated
    after removing "irrevocably". An unstated answer is the old answer in
    practice, so it is stated: revocable, except to the extent revocation would
    defeat a Split Funding Authorization already in force — which is the only
    part a funder actually needs and the only part Merchant has separately signed.

    NO DAY COUNTS ARE INVENTED. The memo says "promptly" and so does this.
  */
  {
    slug: 'frpa.power-of-attorney-4-6',
    version: 1,
    instrument: 'frpa',
    kind: 'clause',
    includeWhen: null,
    number: '4.6',
    section: 'enrollment',
    sortKey: 60,
    heading: 'Power of Attorney',
    body: 'Merchant appoints Buyer its agent for the limited and ministerial purposes stated in this Section and for no other purpose. To the extent applicable law permits, and only so far as is reasonably necessary for Buyer to receive the Purchased Receipts, Buyer may (i) deliver to an Approved Processor the Split Funding Authorization Merchant has executed under Section 2.3, together with an accurate correction or termination of it, and (ii) endorse an instrument made payable to Buyer and Merchant jointly, solely to the extent of the Specified Percentage of the Card Receipts the instrument represents, and remit the remainder to Merchant promptly.\nNotice is a condition of this authority. Buyer shall send Merchant a copy of each instruction it delivers to an Approved Processor at the same time it delivers it, and shall notify Merchant of an endorsement promptly, with the amount endorsed and the amount remitted. An act taken without that notice is not authorized by this Section.\nThis authority does not permit Buyer to sign, in Merchant’s name, a pleading, an affidavit, an admission, a confession of judgment, a settlement agreement, an insurance application or claim, an invoice, a bill of lading, an assignment directing a customer or account debtor to pay Buyer, or a financing or security document; to obtain or adjust insurance; to institute or defend a proceeding; or to collect Merchant’s retained share of Card Receipts, a non-card receipt, an account receivable, or any other asset of Merchant.\nThis authority is not a remedy. It confers nothing on an Event of Default, it is not coupled with an interest beyond the Purchased Receipts, and Section 6.2 governs what Buyer may do on an Event of Default and states that Buyer holds no power of attorney for that purpose. Merchant may revoke this authority at any time, except so far as revocation would defeat a Split Funding Authorization then in force. It circumvents no notice, no judicial process, no automatic stay and no limit in Section 6, and it ends when this Agreement reaches the Completion Threshold under Section 2.6.',
    source: { kind: 'attorney-drafted', author: null },
    status: 'draft',
    appliesInStates: [],
    examinedBy: [{ review: 'REVIEW-02', findings: [] }],
  },
  {
    slug: 'frpa.protection-of-information-4-7',
    version: 1,
    instrument: 'frpa',
    kind: 'clause',
    includeWhen: null,
    number: '4.7',
    section: 'enrollment',
    sortKey: 70,
    heading: 'Protection of Information',
    body: 'Merchant and each person signing this Agreement on behalf of Merchant and/or as Guarantor authorizes Buyer to disclose information concerning Merchant’s and each Guarantor’s credit standing and business conduct only to agents, affiliates, subsidiaries, and credit reporting bureaus as is required in connection with the Receipts. Merchant and Guarantor(s) waive to the maximum extent permitted by law any claim for damages against Buyer or any of its affiliates relating to any (i) investigation undertaken by or on behalf of Buyer as permitted by this Agreement, or (ii) disclosure of information as permitted by this Agreement.',
    source: { kind: 'attorney-drafted', author: null },
    status: 'draft',
    appliesInStates: [],
    examinedBy: [{ review: 'REVIEW-01', findings: ['information-sharing-only-vs-any-third-party'] }],
  },
  {
    slug: 'frpa.confidentiality-4-8',
    version: 1,
    instrument: 'frpa',
    kind: 'clause',
    includeWhen: null,
    number: '4.8',
    section: 'enrollment',
    sortKey: 80,
    heading: 'Confidentiality',
    body: 'Merchant agrees that the terms and conditions of the products and services offered by Buyer, including this Agreement and any other Buyer documentation (collectively, “Confidential Information”), are proprietary and confidential information of Buyer. Unless disclosure is required by law or court order, Merchant shall not disclose Confidential Information to any person other than Merchant’s attorney, accountant, financial advisor, or employee who needs to know such information for the purpose of advising Merchant (each, an “Advisor”), provided such Advisor uses such information solely for advising Merchant and first agrees in writing to be bound by the terms of this Section. Notwithstanding that proviso, Merchant may disclose Confidential Information to its attorney, accountant or other professional adviser for the purpose of advising Merchant without that adviser giving any undertaking to Buyer, and may disclose Confidential Information to any governmental or regulatory authority. Confidential Information does not include information that is or becomes public other than through a breach of this Section. Merchant’s obligations under this Section end three (3) years after this Agreement is completed under Section 2.6 or is otherwise terminated.',
    source: { kind: 'attorney-drafted', author: null },
    status: 'draft',
    appliesInStates: [],
    examinedBy: [
      {
        review: 'REVIEW-02',
        findings: [
          'frpa-4-8-conditions-the-counsel-review-7-22-promises',
          'frpa-4-8-may-impede-a-merchant-complaint-to-a-regulator',
        ],
      },
    ],
  },
  /*
    A REFUTATION, AND THE CLAUSE CHANGE IS NEAR-COSMETIC. The memo is the fourth
    place it refutes a review finding, and it is worth stating plainly because
    the temptation is to draft as though the finding stood.

    `frpa-4-9-authorises-ucc-filings-under-a-dba-the-repository-does-not-record`
    reads a secured-party trade name as invalidating a filing. It does not: a
    trade name is not categorically bad under Article 9, and NOTHING ON THIS
    RECORD SHOWS THE D/B/A IS UNREGISTERED — the record simply does not say. What
    survives of the finding is narrower and still true: this repository records
    no d/b/a for either Lombard entity, and CT §36a-870(a), Va. Code §6.2-2230
    and Tex. Fin. Code §398.053(d)(2) each require a provider's trading name to
    be on a state registration form. That is a registration question, not a
    drafting one.

    WHAT CHANGED, WHICH IS LITTLE. v4's sentence was a bare acknowledgement that
    Buyer "may use" d/b/a names, which grants nothing and constrains nothing. It
    now states the default — legal name — and puts three conditions on anything
    else: lawful use, registration where registration is required, and no
    obscuring of the legal identity. The affiliate limb is the substantive part:
    no affiliate may be named as owner or secured party unless it has actually
    acquired the interest, because the equipment affiliate appearing as secured
    party on a filing for receipts it did not buy is the concrete version of the
    risk, and this corpus cross-references that affiliate four times.

    THE REAL ACTION IS NOT DRAFTING. Pull the live UCC-1s, confirm the named
    secured party, confirm the collateral description against §4.10 as rewritten,
    and confirm each registration. `lombard-contracts` holds no financing
    statement and no d/b/a record — searched, not assumed. That is operations,
    and it is reported rather than attempted here.

    DEPARTURE FROM THE MEMO. The memo writes "Lombard Capital LLC" into the body
    twice. `tenant-agnostic.test.ts` forbids a tenant name in any body and is
    right to: the library is a product, not one funder's paperwork. `{{funder}}`
    carries it. The memo's "notice under Section 7.2" is kept but split — §7.2 is
    Assignment and §7.3 is Notices, so the acquisition goes to one and the notice
    of it to the other.
  */
  {
    slug: 'frpa.d-b-a-names-4-9',
    version: 1,
    instrument: 'frpa',
    kind: 'clause',
    includeWhen: null,
    number: '4.9',
    section: 'enrollment',
    sortKey: 90,
    heading: 'D/B/A Names',
    body: 'Buyer shall identify itself by its legal name, {{funder}}, in every notice given under this Agreement and in every financing statement or other filing made in connection with it. Buyer may use a trade name in addition to its legal name only where that trade name is lawfully used, is registered wherever registration is required of it, and does not obscure the legal identity of Buyer or of a person that has actually acquired Buyer’s interest.\nNo affiliate of Buyer, and no equipment seller, lessor, subscription provider, broker or servicer, may be named as owner of the Purchased Receipts or as secured party in any filing unless it has lawfully acquired that interest by an assignment permitted by Section 7.2 and Merchant has been given notice of the assignment under Section 7.3.\nThis Section cures nothing. A filing that misidentifies the secured party, or that describes collateral more widely than Section 4.10 authorizes, is not made good by this Section, and Buyer shall amend or terminate it promptly on becoming aware of it or on Merchant’s written request.',
    source: { kind: 'attorney-drafted', author: null },
    status: 'draft',
    appliesInStates: [],
    examinedBy: [
      { review: 'REVIEW-02', findings: ['frpa-4-9-authorises-ucc-filings-under-a-dba-the-repository-does-not-record'] },
    ],
  },
  /*
    THE MOST CONSEQUENTIAL CLAUSE IN THIS CLUSTER. The memo rates it High; the
    brief rates it Critical and gives the reason: two of the three defects are
    drafting errors rather than policy choices, and a drafting error is not
    something a business decision can ratify.

    DEFECT 1 — "PRECAUTIONARY" WAS DOING THE WORK OF AN ANALYSIS. Article 9
    applies to a SALE of accounts by its own terms, not merely to a loan secured
    by them. Calling the interest precautionary replaces none of attachment,
    filing or priority: the filing is still required to perfect, the description
    still has to be sufficient, and priority is still decided by the same rules
    against the same competing claimants. The label told a reader the analysis
    had been done when it had not been.

    DEFECT 2 — A GUARANTOR WHO OWNS NO COLLATERAL CANNOT GRANT MERCHANT'S
    ASSETS. v4 had "Merchant and Guarantor each agree to execute any documents
    ... to perfect or maintain Buyer's first-priority security interest" and
    "Merchant and Guarantor authorize Buyer to file any financing statements
    deemed necessary by Buyer". The Collateral is Merchant's; a Guarantor holds
    none of it. So the sentence is either void, or — worse and more likely in
    practice — an authorisation to file against the GUARANTOR personally, which
    is an individual lien obtained by a plural noun. That is the drafting error
    the brief means, and it is the same error §4.11 made in its own words.

    DEFECT 3 — A COVENANT CANNOT ELIMINATE SOMEBODY ELSE'S LIEN. "Buyer's
    first-priority security interest" asked Merchant to promise a priority
    Merchant cannot deliver: an existing lender's blanket lien and an Approved
    Processor's contractual setoff and reserve rights both survive whatever
    Merchant promises, and a merchant that has either is in breach on day one.
    The duty belongs to the party that can perform it. Buyer searches, Buyer
    obtains the release or the subordination, and it does so before it funds.

    AND THE GRANT IS NOW NARROWER THAN THIS CLAUSE READS, WHICH IS THE POINT THE
    SPINE HANDED OVER. v4 took an interest in "the Receipts purchased under this
    Agreement AND THE ACCOUNTS AND OTHER RECEIVABLES FROM WHICH THOSE RECEIPTS
    ARISE". Against `frpa.granting-clause` as rewritten — the Specified
    Percentage of Card Receipts, and Buyer "owns nothing else" — that phrase
    resolves to a SHARE of each account, not the account. A reader will not get
    there on their own, so the clause now says it: the interest reaches only the
    Specified Percentage and does not reach the whole of any account.

    **THE COLLATERAL DESCRIPTION ON ANY LIVE UCC-1 MUST BE RE-CHECKED AGAINST
    THIS.** A filing drafted against the old words describes more than this
    clause now authorizes, and an over-broad filing is a real problem for the
    merchant's other credit whether or not it is enforceable. That is
    `lombard-contracts` and operations work; this session neither pulled the
    filings nor found any record of one — searched, not assumed.

    WHAT ELSE CHANGED. The deposit-account limb goes: v4 reached "identifiable
    proceeds on deposit in the Approved Bank Account" and had Merchant agree to
    execute "any account control agreements" Buyer deemed necessary, which is an
    account-level sweep obtained by covenant. Identifiable proceeds are still
    Collateral — that is Article 9 and removing it would be pretending — but a
    control agreement is now something that may be separately negotiated and that
    may not collect what this Agreement does not entitle Buyer to collect. The
    D/B/A sentence moves to §4.9 where it belongs. The costs sentence becomes a
    pointer to §6.3, which is `three-inconsistent-attorney-fee-formulas` and
    `charges-scattered-outside-fee-schedule` closed from this side; §6.3 holds
    the single 25% ceiling.

    DEPARTURE FROM THE MEMO. Three.
    (1) The memo says "Merchant does not guarantee first priority against
        interests disclosed to Buyer or arising by law". Written the other way
        round — Merchant does not represent, warrant or covenant first priority
        at all — because a promise carved back by two exceptions still reads as
        a promise, and the exceptions are exactly the cases that arise.
    (2) The memo's "Filing, perfection, and priority are governed by the
        mandatory choice-of-law rules of applicable Article 9" is kept and paired
        with a sentence saying no choice of law in this Agreement displaces them.
        §7.1 chooses a governing law and a reader who finds it first will think
        it settles perfection. It does not.
    (3) The memo does not say what happens to an over-broad filing already made.
        Added, because that is the live problem rather than the hypothetical one.

    UNVERIFIED AUTHORITY. The characterisation reasoning around this clause runs
    through LG Funding, with Richmond Capital 246 AD3d 585, Apollo Funding 241
    AD3d 1508 and NewCo 250 AD3d 1641 cited alongside. NOBODY ON THIS PROJECT HAS
    PULLED ANY OF THEM FROM THE OFFICIAL REPORTERS. Recorded here so a reviewer
    checks them rather than inherits them; no citation appears in any body.
  */
  {
    slug: 'frpa.security-interest-4-10',
    version: 1,
    instrument: 'frpa',
    kind: 'clause',
    includeWhen: null,
    number: '4.10',
    section: 'enrollment',
    sortKey: 100,
    heading: 'Security Interest',
    body: 'This Agreement is a sale of accounts, and Article 9 of the Uniform Commercial Code (the “UCC”) applies to it. Describing an interest as precautionary replaces no part of attachment, filing or priority, so, to evidence and perfect the sale, Merchant grants Buyer a security interest in the Purchased Receipts and their identifiable proceeds (the “Collateral”).\nThe Collateral is stated narrowly on purpose. In each underlying card sale the interest reaches only the Specified Percentage of the Card Receipts sold to Buyer under this Agreement; it does not reach the whole of any account, receivable or sale, and no wider reading may be taken from the fact that a purchased receipt arises out of an account. No interest is granted in Merchant’s retained share of Card Receipts, in a non-card receipt, or in Merchant’s equipment, inventory, chattel paper, documents, instruments, deposit accounts, general intangibles or other assets. No Guarantor grants any interest in any property under this Agreement, and no property of a Guarantor is Collateral: a Guarantor owns none of the Collateral and can grant none of it.\nWhat may be filed. Merchant authorizes Buyer to file a financing statement that describes the Collateral as this Section describes it and names Merchant by the legal name shown on its public organic record. Merchant does not authorize, and Buyer shall not make, a filing that describes all assets, all accounts, all receivables, or any category wider than the Collateral, and Buyer shall amend or terminate such a filing promptly on becoming aware of it or on Merchant’s written request. Perfection, priority and the law that governs them are determined by the mandatory rules of Article 9 as enacted in the applicable jurisdiction, and no choice of law elsewhere in this Agreement displaces them.\nPriority is Buyer’s diligence, not Merchant’s promise. Buyer shall carry out its own lien searches and obtain any release, subordination or intercreditor arrangement it requires before the Purchase Date. Merchant shall disclose the secured parties and processor arrangements it knows of, and shall not voluntarily grant a conflicting interest, but Merchant does not represent, warrant or covenant that Buyer’s interest is or will be first in priority. This Agreement does not release, subordinate or extinguish an existing lender’s lien, an Approved Processor’s contractual setoff, charge or reserve rights, or a lien arising by operation of law, and Merchant is not in breach because such an interest exists or is asserted.\nA deposit account control agreement, if one is separately negotiated and signed, may not authorize collection of any amount Buyer is not entitled to collect under this Agreement and does not enlarge the Collateral. Enforcement of this interest is confined to Section 6.2, to Section 9.2 for any claim against a Guarantor, to judicial process, and to applicable bankruptcy law. Buyer shall file or authorize the release of every filing recording this interest when this Agreement reaches the Completion Threshold, as Section 2.6 requires. The costs and expenses of protecting, preserving and enforcing this interest are governed solely by Section 6.3 and are subject to the single aggregate limit that Section states.',
    source: { kind: 'attorney-drafted', author: null },
    status: 'draft',
    appliesInStates: [],
    examinedBy: [
      {
        review: 'REVIEW-01',
        findings: [
          'all-assets-lien-vs-nonrecourse-recital',
          'charges-scattered-outside-fee-schedule',
          'frpa-sub-equipment-lien-conflict',
          'liquidated-damages-plus-actual-costs',
          'three-inconsistent-attorney-fee-formulas',
        ],
      },
      { review: 'REVIEW-02', findings: ['frpa-4-9-authorises-ucc-filings-under-a-dba-the-repository-does-not-record'] },
    ],
  },
  /*
    TWO CONFUSIONS IN ONE SENTENCE, and the memo names both.

    WHAT WAS WRONG (1) — THE GUARANTOR UNDERTAKING. "Merchant and Guarantor each
    agrees not to create ... any lien on or with respect to any of the
    Collateral". The Guarantor owns none of the Collateral, so the undertaking is
    either empty or reaches the Guarantor's own property. Same error as §4.10's
    plural noun, in a second clause, which is why the check that catches it runs
    over the whole cluster rather than over one body.

    WHAT WAS WRONG (2) — "A PERMITTED CLAIM RANKING AFTER THE SPECIFIED
    PERCENTAGE". This describes a monthly equipment lease payment as though it
    held a rank in a priority scheme, and it does not. Asset ownership and
    settlement priority are different questions. Buyer OWNS the Specified
    Percentage of each Card Receipt; a lease payment is an unsecured obligation
    owed to a third party under a different contract, and calling it a permitted
    claim ranking after Buyer neither subordinates it to anyone nor gives it a
    standing it otherwise lacks. What it does do is make an affiliate's invoice
    look like it has a place in this Agreement's waterfall, which is the
    commingling `frpa-sub-equipment-lien-conflict` records.

    WHAT CHANGED. Narrowed to what the memo asks for: a knowing double sale of
    the same Purchased Receipts, and a voluntary conflicting interest in the
    exact share sold. Everything else is expressly outside it — the retained
    share, non-card receipts, other assets, interests already disclosed, liens
    arising by operation of law, and a processor's ordinary charges, setoff and
    reserve rights. Consent is required for the two things it does reach, and may
    not be unreasonably withheld where Buyer's purchased share stays protected.
    The Guarantor undertaking goes. The equipment sentence says the true thing
    instead of the flattering one: separate obligation, separate agreement, no
    lien, no rank, and the definitions clause already provides that a
    merchant-level equipment charge does not reduce Card Receipts.

    DEPARTURE FROM THE BRIEF'S GATE, AND IT IS DELIBERATE. The brief marks this
    clause `action: both` on `equipment`, which would make the whole clause
    conditional on the funder selling equipment. It stays `includeWhen: null`.
    `facts.ts` says what the fact actually decides — "the equipment explainers,
    the §5.5 insurance clause and **§4.11's ranking limb**" — a LIMB, not the
    clause, and `includeWhen` has no limb granularity. Gating the clause would
    delete the double-sale prohibition from every no-equipment template, which is
    the one thing in here a funder cannot do without. The equipment sentence is
    instead written so that it is true and harmless where there is no equipment.
    Splitting the clause in two would answer it properly and is not available:
    the count `frpa-coverage.test.ts` pins would move.

    DEPARTURE FROM THE MEMO. The memo says the restriction "does not reach ...
    ordinary processor charges". Widened to setoff and reserve rights, because
    those are the processor entitlements that actually collide with a purchased
    share, and because `frpa.definitions` already treats them as part of what
    makes a settlement net.
  */
  {
    slug: 'frpa.negative-pledge-4-11',
    version: 1,
    instrument: 'frpa',
    kind: 'clause',
    includeWhen: null,
    number: '4.11',
    section: 'enrollment',
    sortKey: 110,
    heading: 'Negative Pledge',
    body: 'Merchant shall not knowingly sell the same Purchased Receipts to another person, and shall not voluntarily grant a lien, security interest or other interest that conflicts with Buyer’s interest in the Purchased Receipts, without Buyer’s prior written consent. Buyer shall not unreasonably withhold that consent where the Specified Percentage sold to Buyer remains protected.\nThis restriction reaches nothing else. It does not reach Merchant’s retained share of Card Receipts, a non-card receipt, or any other asset of Merchant; and it does not reach an interest disclosed to Buyer before the Purchase Date, a lien arising by operation of law, an Approved Processor’s ordinary charges, setoff or reserve rights, or a purchase-money interest in equipment. No Guarantor gives any undertaking under this Section, and no Guarantor grants any lien.\nWhere Merchant leases or subscribes for equipment from {{equipmentAffiliate}}, the charge for it is a separate obligation under a separate agreement. It is not secured by the Collateral, it takes no rank or priority by reason of this Agreement, and it is neither a claim against the Purchased Receipts nor an amount subordinated to them; it is billed and collected as that agreement provides, and it does not reduce Card Receipts.',
    source: { kind: 'attorney-drafted', author: null },
    status: 'draft',
    appliesInStates: [],
    examinedBy: [
      { review: 'REVIEW-01', findings: ['all-assets-lien-vs-nonrecourse-recital', 'frpa-sub-equipment-lien-conflict'] },
    ],
  },
  /*
    DRAFTED WITH SECTION 6, NOT WITH THIS FILE. §4.12 is the `default-remedies`
    cluster's fifth clause; it lives here because the document puts it in the
    security section, twenty pages from the limits it depends on.

    WHAT WAS WRONG. It is a general remedies grant — "any remedy available at law
    (including those available under the UCC) or in equity to collect, enforce,
    or satisfy any obligations then owing" — sitting outside Section 6. The
    subject-to clause was doing all the work, and a reader who finds §4.12 first
    finds a different agreement. That is
    `frpa-4-12-reopens-the-acceleration-6-2-closed`: §6.2's lead-in restricted
    the 100% sweep to five enumerated triggers, and this sentence handed back
    every remedy the law allows on ANY Event of Default, including under old
    §6.1.1's any-breach-of-any-covenant.

    "Any obligations then owing" was the second half of the problem. Under a
    purchase there is no obligation to pay the uncollected Purchased Amount, so
    the phrase either means nothing or means the thing §2.1 and the granting
    clause say does not exist.

    WHAT CHANGED. A pointer, not a grant. Buyer's remedies are the ones §6.2
    gives and no others, and the four limits are named rather than gestured at.
    The second sentence states what no provision anywhere may do, because the
    defect this clause created was a remedy grant in an unexpected place, and one
    unexpected place having been closed is not the same as the class being closed.

    THE DELETED CROSS-REFERENCE. v4 pointed at "the remedy in Section 6.2.1",
    which no longer exists — §6.2 has no numbered subsections. The rewrite of
    Section 6 and this clause had to happen in one pass or this reference would
    dangle; `remedies-reach-no-further.test.ts` asserts over the whole FRPA that
    nothing points at a deleted subsection of §6.2.

    DEPARTURE FROM THE MEMO. The memo's replacement says Buyer may enforce "only
    the rights and remedies expressly permitted by Section 6". Written as Section
    6.2 specifically, since §6.1 defines defaults and §6.3 caps costs — neither
    grants a remedy — and a pointer at a whole Section is how a reader ends up
    back in the prose that made §6.2.5 possible.
  */
  {
    slug: 'frpa.remedies-4-12',
    version: 1,
    instrument: 'frpa',
    kind: 'clause',
    includeWhen: null,
    number: '4.12',
    section: 'enrollment',
    sortKey: 120,
    heading: 'Remedies',
    body: 'Buyer may enforce only the rights and remedies Section 6.2 expressly gives it, and only subject to the notice and cure requirement in Section 6.1, the aggregate limit in Section 6.3, Section 9.2 for any claim against a Guarantor, and applicable law. Nothing in this Section, and nothing elsewhere in this Agreement, enlarges the Purchased Receipts, accelerates Card Receipts that have not been generated, permits collection of Merchant’s retained share of Card Receipts, or makes Buyer’s remedies cumulative of any remedy Section 6.2 does not give.',
    source: { kind: 'attorney-drafted', author: null },
    status: 'draft',
    appliesInStates: [],
    examinedBy: [{ review: 'REVIEW-02', findings: ['frpa-4-12-reopens-the-acceleration-6-2-closed'] }],
  },
  /*
    WHAT WAS WRONG. Three sentences, all discretion. "A date to be determined by
    Buyer in its sole discretion", "may refuse to purchase the Receipts for any
    reason or no reason", "any commercially reasonable method, at Buyer's sole
    discretion". Meanwhile Merchant has signed a Split Funding Authorization,
    consented to UCC filings, granted a security interest and given up its
    processing arrangements — all before Buyer is committed to anything at all.
    That asymmetry is independently a good-faith problem, and it is a statutory
    problem in at least one state.

    VERIFIED AGAINST THE VENDORED PRIMARY TEXT, and this is the one authority in
    this cluster that was actually read rather than inherited.
    `packages/bizrethink/mca/sources/CT-CGS-36a-861-872.txt`, Sec. 36a-869(a):
    "A provider shall not revoke, withdraw or modify a specific offer made on or
    after July 1, 2024, until midnight of the third calendar day after the date
    of the specific offer. A specific offer may be revoked, withdrawn or modified
    (1) based on information obtained in the underwriting process, including, but
    not limited to, verification of any information provided by the recipient, or
    (2) at the request of the recipient." "For any reason or no reason" is the
    negation of that sentence, and the memo's finding
    `frpa-4-13-unlimited-right-to-refuse-vs-ct-offer-revocation-bar` is correct.

    WHAT CHANGED. Buyer states the offer's expiry, the outstanding conditions and
    the latest funding date before Merchant accepts; the conditions have to be
    objective, because a condition Buyer alone judges is the discretion it
    replaced. Buyer honours any statutory period during which it may not withdraw
    a specific offer. On acceptance and satisfaction of the stated conditions,
    Buyer funds by the stated date. If it does not, Merchant walks away without
    charge and Buyer unwinds what Merchant put in place for a funding that never
    happened — stopping the split instructions and releasing the filings.

    NO TRANSFER BEFORE CONSIDERATION, WHICH IS WHAT MAKES THE SALE A SALE. The
    granting clause takes effect "on the Purchase Date"; the definitions clause
    sends the reader here for what that is; so this clause carries the
    definition, and defines it as the day the money actually moves rather than a
    day Buyer picks. That closes the half of
    `frpa-undefined-capitalised-terms-in-the-unexamined-clauses` that lands here.

    THE THREE-DAY COUNT IS NOT IN THE BODY, DELIBERATELY. Connecticut's period
    applies to a "specific offer" in Connecticut; writing three calendar days
    into the base form would state one state's rule as the contract's rule
    everywhere and would be wrong the moment a state legislates a different one.
    The clause states the duty generally and names §36a-869 as the instance that
    exists. This is also why no other day count appears: the brief forbids
    inventing them and Section 1 is where the dates belong.

    THIS CLAUSE SPECIFIES A FORM NOBODY IN THIS LIBRARY OWNS. Section 1 is the
    AcroForm grid the Lombard pipeline injects; no clause here holds it. The
    first paragraph now requires three rows Section 1 does not have — the offer
    expiry, the outstanding conditions, and the latest funding date — in the same
    way §2.3 specifies an Exhibit A that has to be re-drafted to match. Written
    as a specification on purpose, but **it is a form change and it is handed
    back, not made**: the rows have to be added in `lombard-contracts` and given
    widget numbers, and until they are, the duty this clause imposes has nowhere
    to be performed. Also true of the payment method, which is why that sentence
    names the methods rather than cross-referencing a row that does not exist —
    the spine found the same trap in the holdback explainer, where the memo's
    text pointed at a Section 1 history Section 1 does not hold.

    DISTINCT FROM §4.14, AND THE MEMO INSISTS ON IT. Connecticut's offer period
    runs BEFORE acceptance and constrains BUYER. §4.14's three-day right to
    cancel runs AFTER funding and belongs to MERCHANT. They are not the same
    protection and satisfying one does not satisfy the other.

    DEPARTURE FROM THE MEMO. Two.
    (1) The memo says "Buyer-retained deductions need not circulate through
        Merchant's account, but must be earned, lawful, and fully disclosed."
        Kept in substance and pointed at the itemization in Section 1.4, because
        §4.1 already requires every deduction to appear there as a dollar figure
        before Merchant signs and "fully disclosed" without an anchor is weaker
        than the rule that already exists.
    (2) The memo distinguishes Purchase Price from Net Amount Funded inside this
        clause. `frpa.definitions` now defines both from Section 1, so the
        distinction is stated as the mechanic of the Purchase Date rather than
        re-defined here — a term defined twice is `defined-term-drift`.
  */
  {
    slug: 'frpa.timing-and-method-of-funding-4-13',
    version: 1,
    instrument: 'frpa',
    kind: 'clause',
    includeWhen: null,
    number: '4.13',
    section: 'enrollment',
    sortKey: 130,
    heading: 'Timing and Method of Funding',
    body: 'Before Merchant accepts, Buyer shall state in Section 1 the time at which its offer expires, every outstanding condition to funding, and the latest date by which Buyer will fund. A condition must be objective and capable of being checked; a condition whose satisfaction is left to Buyer’s judgement alone is not a condition for the purposes of this Section. Buyer shall honor any period during which applicable law forbids it to revoke, withdraw or modify a specific offer, including Connecticut General Statutes Section 36a-869 where that section applies. Buyer shall notify Merchant promptly of any withdrawal of its offer or failure of a condition, and shall give the reason.\nOnce Merchant has accepted and the stated conditions are satisfied, Buyer shall provide the Purchase Price by the latest funding date stated in Section 1, by wire, ACH or another method Merchant has authorized in writing, to the Approved Bank Account.\n“Purchase Date” means the date on which Buyer delivers the Net Amount Funded to Merchant, completes each third-party disbursement and prior-purchase payoff Merchant has expressly authorized, and applies no deduction other than those itemized as dollar figures in Section 1.4. A deduction Buyer retains for itself need not pass through Merchant’s account, but it must be earned, lawful and itemized there before Merchant signs. No Purchased Receipt is sold, and no Purchased Receipt transfers to Buyer, before the Purchase Date.\nIf Buyer does not fund by that date, Merchant may terminate this Agreement by notice and without charge. On such a termination, or on a withdrawal of the offer, Buyer shall promptly withdraw every instruction it has given an Approved Processor and shall file or authorize the release of every filing it made in anticipation of the purchase.',
    source: { kind: 'attorney-drafted', author: null },
    status: 'draft',
    appliesInStates: [],
    examinedBy: [
      {
        review: 'REVIEW-02',
        findings: [
          'frpa-4-13-unlimited-right-to-refuse-vs-ct-offer-revocation-bar',
          'frpa-undefined-capitalised-terms-in-the-unexamined-clauses',
        ],
      },
    ],
  },
  {
    slug: 'frpa.right-to-cancel-4-14',
    version: 1,
    instrument: 'frpa',
    kind: 'clause',
    includeWhen: null,
    number: '4.14',
    section: 'enrollment',
    sortKey: 140,
    heading: 'Right to Cancel',
    body: 'Merchant has the right to cancel this Agreement within three (3) calendar days after Buyer has delivered the Net Amount Funded. Merchant may exercise this right by notifying Buyer in writing that it is cancelling this Agreement and returning the Net Amount Funded to Buyer, including any payoffs made on Merchant’s behalf by Buyer. For the cancellation to be effective, Buyer must receive both the notice and the return of the funds within three (3) calendar days after Buyer has delivered the Net Amount Funded.',
    source: { kind: 'attorney-drafted', author: null },
    status: 'draft',
    appliesInStates: [],
    examinedBy: [
      { review: 'REVIEW-01', findings: ['cancellation-forfeits-origination-fee'] },
      { review: 'REVIEW-02', findings: ['iso-a2-a4-no-clawback-when-the-merchant-cancels-under-frpa-4-14'] },
    ],
  },
  /*
    ONE SECTION, TWO CLAUSES, AND THIS IS WHERE THE LIMB PROBLEM GETS ANSWERED.

    §4.11's comment above states the problem and records that it could not be
    solved there: *"`includeWhen` has no limb granularity … Splitting the clause
    in two would answer it properly and is not available: the count
    `frpa-coverage.test.ts` pins would move."* The count moves here, on purpose,
    97 → 99, and `library.test.ts`'s 200 → 202 with it.

    THE FACT DECIDES A WHOLE CLAUSE, WHICH IS THE ONLY SHAPE `includeWhen` CAN
    EXPRESS HONESTLY. `concurrentPositions` gated the whole of §4.15 while the
    memo's objection was to one limb of it — the automatic cascade — and the
    memo does not want silence in its place, it wants the opposite rule stated:
    *"Buyer shall not maintain more than one active purchase of the same Card
    Receipts under this Agreement or a renewal."* Turning the fact off deleted
    the section instead of replacing it, and left §7.1's "Except as expressly
    provided in Sections 3.3, 3.4 and 4.15" carving out a clause that was not
    there. `engine/__tests__/select-clauses.test.ts` catches that now; it is the
    first thing the new cross-reference assertion found.

    So §4.15 is an EXHAUSTIVE PAIR: `concurrentPositions` is a boolean, one
    clause answers each value, and every template has exactly one §4.15. Neither
    is a fragment of the other and neither needs the other to read.

    WHAT WAS WRONG WITH THE CASCADE, kept below for the funder that runs one.
    (1) It applied "the Specified Percentage and Estimated Daily Holdback", as
        though the estimate were a second thing collected. `frpa.definitions`
        now says an estimate "creates no obligation to deliver any amount by any
        date"; only the Specified Percentage of Card Receipts is collected.
    (2) "Position 1 being the first-priority funding" invented a priority scheme
        between Buyer's own purchases and called an ordering a priority. The
        same confusion §4.11 records about equipment charges "ranking after the
        Specified Percentage".
    (3) It described §5.16 as "the prohibition on third-party Stacking", with
        `Stacking` capitalised and undefined — `frpa-undefined-capitalised-terms`
        — and §5.16 is no longer a stacking prohibition at all.
    (4) THE SPINE'S EIGHTH HANDOVER. The cascade turns on the Completion
        Threshold, and §2.6 now defines the Remaining Balance as a purchase-only
        figure: no fee, no equipment charge, no cost of enforcement, and nothing
        charged after the Purchase Date increases it. So a purchase completes,
        and the cascade fires, on the purchase amount alone — an unpaid
        Appendix A fee no longer holds an earlier position open and no longer
        keeps a later one from starting.

    WHAT CHANGED. Each purchase is its own transaction with its own ledger.
    Application is to the earliest outstanding purchase and is recorded once.
    Nothing reaches a later purchase before the earlier one is complete under
    §2.6. The Specified Percentage does not rise because a second purchase
    exists, and the total withheld across all of them is stated to Merchant
    before Merchant signs the later one — which is the disclosure the
    multi-position product actually owes and v4 did not make.

    UNVERIFIED. REVIEW-01's `lombard-multi-position-vs-no-stack` reports that
    Lombard's marketing promises no stacking while this clause authorised
    Buyer's own. Nobody on this project has read that marketing; the finding is
    the only evidence of it, and the memo says either it changes or the product
    does. Lombard's profile now changes the product. A funder that keeps the
    cascade has an unresolved marketing question, which is a UDAP question
    before it is a contract one.
  */
  {
    slug: 'frpa.position-and-cascade-of-collections-4-15',
    version: 1,
    instrument: 'frpa',
    kind: 'clause',
    /*
      The cascade exists only where the funder may hold more than one position.
      Its pair below covers the other value; between them the section is always
      present.
    */
    includeWhen: (facts) => facts.concurrentPositions,
    number: '4.15',
    section: 'enrollment',
    sortKey: 150,
    heading: 'Position and Cascade of Collections',
    body: 'Where Buyer holds more than one active purchase of Card Receipts from Merchant, each purchase is a separate transaction with its own Purchased Amount, its own Remaining Balance and its own ledger. Buyer shall apply each amount it receives to the earliest purchase then outstanding, shall record it once and in that purchase’s ledger, and shall not apply any amount to a later purchase before the earlier one has reached its Completion Threshold under Section 2.6.\nThe Specified Percentage under this Agreement does not increase because another purchase is active. Before Merchant signs a later purchase, Buyer shall state to Merchant in writing the total percentage of Card Receipts that will be withheld across all of Buyer’s active purchases. On Merchant’s reasonable request Buyer shall give Merchant a statement showing, for each active purchase, the amounts credited to it and its Remaining Balance.\nThis Section governs only Buyer’s own purchases. Merchant’s dealings with any other person are governed by Sections 4.11 and 5.16.',
    source: { kind: 'attorney-drafted', author: null },
    status: 'draft',
    appliesInStates: [],
    examinedBy: [{ review: 'REVIEW-01', findings: ['lombard-multi-position-vs-no-stack'] }],
  },
  /*
    THE OTHER HALF OF §4.15, and the memo's own sentence for it.

    Selected when the funder holds one position at a time, which is Lombard as
    of 2026-09-10. The memo's replacement text is the base and is kept almost
    whole; three departures.

    DEPARTURE 1 — NO REFERENCE TO SECTION 8. The memo ends "completion or
    separately authorized settlement of the prior purchase at or before the new
    Purchase Date under Section 8". Sections 8.1 and 8.2 are both gated on
    `renewalModel`, so a funder with `renewalModel: 'none'` and one position at a
    time — the arbitration profile in the engine test is exactly that — would
    read a clause pointing at two sections its document does not contain. The
    duty is stated in full here instead, and §2.6 supplies completion, which is
    ungated. This is the failure the new cross-reference assertion exists to
    catch, found while drafting rather than after.

    DEPARTURE 2 — "OF THE SAME CARD RECEIPTS" IS WIDENED TO "FROM MERCHANT".
    Every purchase under this form is of a percentage of the same stream, so
    "the same Card Receipts" adds a qualifier a funder could argue about while
    running two purchases against one merchant. The rule is one active purchase
    per merchant.

    DEPARTURE 3 — THE LAST SENTENCE IS NEW. Without it the clause reads as a
    restriction on MERCHANT, which is the opposite of what it is: it binds
    Buyer, and Merchant's own financing is §5.16's subject and expressly not an
    Event of Default under §6.1.

    DEPARTURE 4 — "THE NEW PURCHASE DATE" IS NOT USED. `Purchase Date` is a
    defined term and §4.13 defines it as THIS Agreement's, so "the new Purchase
    Date" would use a defined term to mean something the definition does not
    cover. The deadline is expressed as the date the subsequent purchase is
    funded, which is the same moment and needs no second definition. §7.13 and
    §8.1 avoid the phrase for the same reason; §8.2 and §004 keep it, because
    there it does mean this Agreement's own.

    WHAT IT DELIBERATELY DOES NOT SAY. It states no operational consequence of a
    settlement — stopping the split instructions, closing the ledger, releasing
    the filings. §2.6 already carries those for completion and §8.2 carries them
    for a settlement, and writing them a third time here is how §2.4 and §5.17
    came to contradict each other. The rule this clause owns is the POSITION
    rule, and it owns it alone.

    NO INVENTED FREQUENCY. The statement duty in the cascade clause above reads
    "on Merchant's reasonable request" rather than a monthly cap: the brief
    forbids inventing counts the memo and the current body do not fix, and a
    number is what a first draft of that sentence reached for.
  */
  {
    slug: 'frpa.single-active-position-4-15',
    version: 1,
    instrument: 'frpa',
    kind: 'clause',
    includeWhen: (facts) => !facts.concurrentPositions,
    number: '4.15',
    section: 'enrollment',
    sortKey: 150,
    heading: 'Single Active Position',
    body: 'Buyer shall not maintain more than one active purchase of Card Receipts from Merchant, whether under this Agreement or under a subsequent purchase. No amount collected under this Agreement is applied to any other transaction, and no remittance cascades automatically from one transaction to another.\nA subsequent purchase requires a new agreement, every disclosure the law then requires, and fresh signatures. This Agreement must have reached its Completion Threshold under Section 2.6, or have been settled with Merchant’s separate written authorization, at or before the date the subsequent purchase is funded.\nThis Section binds Buyer. It does not restrict Merchant’s financing from any other person, which Section 5.16 addresses.',
    source: { kind: 'attorney-drafted', author: null },
    status: 'draft',
    appliesInStates: [],
    examinedBy: [{ review: 'REVIEW-01', findings: ['lombard-multi-position-vs-no-stack'] }],
  },
  {
    slug: 'frpa.electronic-account-monitoring-authorization-plaid-4-16',
    version: 1,
    instrument: 'frpa',
    kind: 'clause',
    includeWhen: null,
    number: '4.16',
    section: 'enrollment',
    sortKey: 160,
    heading: 'Electronic Account Monitoring Authorization (Plaid)',
    body: "Merchant authorizes Buyer to obtain read-only electronic access to the Approved Bank Account through Plaid, Inc. (or any equivalent secure bank-data aggregation service designated by Buyer) for the purpose of (a) verifying Merchant's daily and weekly Receipts during the term of this Agreement, (b) supporting the Reconciliation procedures set forth in Section 3, (c) confirming that the Specified Percentage of Receipts is being properly remitted by the Approved Processor, and (d) ongoing creditworthiness review by Buyer.\nMerchant shall (i) authorize the Plaid connection during onboarding, (ii) maintain the connection in active status throughout the term of this Agreement, and (iii) promptly re-authorize if the connection lapses for any reason (including bank-side credential changes or token expiry). Buyer's access via Plaid is read-only; this authorization does not, by itself, authorize any debit, transfer, or withdrawal — collection mechanisms are governed exclusively by Section 2.3 (Split Funding via Approved Processor).\nMerchant acknowledges that prolonged loss of Plaid connectivity (more than five (5) consecutive Workdays without Buyer's prior written consent) shall constitute an Event of Default under Section 6.1.1, except that a lapse arising from a cause outside Merchant's reasonable control — including a bank-side credential change, token expiry, or an outage at the aggregation service — shall not be an Event of Default if Merchant re-authorizes the connection within ten (10) Workdays after notice from Buyer.\nBuyer agrees to (i) handle all data obtained through Plaid in accordance with applicable privacy and data-protection laws, (ii) limit access to essential personnel only, and (iii) not share Merchant's bank-data with third parties except as required for servicing this Agreement (e.g., the Approved Processor or industry-standard performance reporting per Section 7.15).",
    source: { kind: 'attorney-drafted', author: null },
    status: 'draft',
    appliesInStates: [],
    examinedBy: [
      {
        review: 'REVIEW-01',
        findings: [
          'defined-term-drift',
          'frpa-plaid-default-not-enumerated-in-61',
          'guaranty-covers-every-covenant',
          'no-cure-period-anywhere',
          'plaid-connectivity-lapse-is-default',
          'plaid-lapse-is-strict-liability-default',
        ],
      },
    ],
  },
];
