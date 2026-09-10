import type { McaClause } from '../types';

/**
 * Sections 7 and 8 — miscellaneous, renewal and rollover.
 *
 * Bodies are the words the shipped document prints.
 * `__tests__/frpa-coverage.test.ts` additionally asserts that NOTHING in the
 * document is missing from the library — the direction that fails silently.
 */
export const FRPA_MISCELLANEOUS: McaClause[] = [
  {
    slug: 'frpa.modifications-amendments-7-1',
    version: 1,
    instrument: 'frpa',
    kind: 'clause',
    includeWhen: null,
    number: '7.1',
    section: 'miscellaneous',
    sortKey: 10,
    heading: 'Modifications; Amendments',
    body: 'Except as expressly provided in Sections 3.3, 3.4 and 4.15, no modification, amendment, waiver, or consent of any provision of this Agreement shall be effective unless the same shall be in writing and signed by both parties.',
    source: { kind: 'attorney-drafted', author: null },
    status: 'draft',
    appliesInStates: [],
    examinedBy: [{ review: 'REVIEW-02', findings: ['frpa-7-1-has-no-except-as-expressly-provided-carve-out'] }],
  },
  {
    slug: 'frpa.assignment-7-2',
    version: 1,
    instrument: 'frpa',
    kind: 'clause',
    includeWhen: null,
    number: '7.2',
    section: 'miscellaneous',
    sortKey: 20,
    heading: 'Assignment',
    body: 'Buyer may assign, transfer, or sell its rights to receive the Purchased Amount or delegate its duties hereunder, either in whole or in part. Merchant may not assign this Agreement without Buyer’s prior written consent, which consent may be withheld in Buyer’s sole discretion.',
    source: { kind: 'attorney-drafted', author: null },
    status: 'draft',
    appliesInStates: [],
    examinedBy: [{ review: 'REVIEW-02', findings: ['frpa-7-2-permits-delegation-of-the-reconciliation-duty'] }],
  },
  {
    slug: 'frpa.notices-7-3',
    version: 1,
    instrument: 'frpa',
    kind: 'clause',
    includeWhen: null,
    number: '7.3',
    section: 'miscellaneous',
    sortKey: 30,
    heading: 'Notices',
    body: 'All notices, requests, consents, demands, and other communications hereunder shall be delivered by certified mail, return receipt requested, to the respective parties at the addresses set forth in this Agreement (or at such other address as the party shall specify in writing) and shall become effective only upon receipt.',
    source: { kind: 'attorney-drafted', author: null },
    status: 'draft',
    appliesInStates: [],
    examinedBy: [
      { review: 'REVIEW-01', findings: ['reconciliation-right-conditioned-into-near-nullity'] },
      { review: 'REVIEW-02', findings: ['frpa-6-4-24-hour-notice-cannot-be-given-under-7-3'] },
    ],
  },
  {
    slug: 'frpa.waiver-of-remedies-7-4',
    version: 1,
    instrument: 'frpa',
    kind: 'clause',
    includeWhen: null,
    number: '7.4',
    section: 'miscellaneous',
    sortKey: 40,
    heading: 'Waiver of Remedies',
    body: 'No failure on the part of Buyer to exercise, and no delay in exercising, any right under this Agreement shall operate as a waiver thereof, nor shall any single or partial exercise of any right under this Agreement preclude any other or further exercise thereof or the exercise of any other right. The remedies provided hereunder are cumulative and not exclusive of any remedies provided by law or equity.',
    source: { kind: 'attorney-drafted', author: null },
    status: 'draft',
    appliesInStates: [],
    examinedBy: [{ review: 'REVIEW-02', findings: [] }],
  },
  {
    slug: 'frpa.binding-effect-governing-law-venue-and-jurisdiction-7-5',
    version: 1,
    instrument: 'frpa',
    kind: 'clause',
    includeWhen: null,
    number: '7.5',
    section: 'miscellaneous',
    sortKey: 50,
    heading: 'Binding Effect; Governing Law, Venue, and Jurisdiction',
    body: 'This Agreement shall be binding upon and inure to the benefit of the parties and their respective successors and assigns, except that Merchant shall not have the right to assign its rights hereunder or any interest herein without the prior written consent of Buyer, which consent may be withheld in Buyer’s sole discretion. This Agreement shall be governed by and construed in accordance with the laws of the State of New York. This Agreement is for the sale of Merchant’s future Receipts and is subject to the Uniform Commercial Code as adopted in New York. Any suit, action, or proceeding arising hereunder, or the interpretation, performance, or breach hereof, shall, if Buyer so elects, be instituted in any court sitting in New York State or in Pasco County, Florida (the “Acceptable Forums”). The parties agree that the Acceptable Forums are convenient and submit to the jurisdiction of the Acceptable Forums and waive any and all objections to jurisdiction or venue. Should a proceeding be initiated in any other forum, the parties waive any right to oppose any motion or application made by either party to transfer such proceeding to an Acceptable Forum. Merchant and Guarantor(s) further agree that mailing by certified or registered mail, return receipt requested, of any process required by any such court will constitute valid and lawful service of process against them, without the necessity for service by any other means.',
    source: { kind: 'attorney-drafted', author: null },
    status: 'draft',
    appliesInStates: [],
    examinedBy: [
      {
        review: 'REVIEW-01',
        findings: [
          'counterclaim-waiver-flips-by-forum',
          'frpa-arbitration-clauses-with-no-arbitration-agreement',
          'ny-law-below-gol-5-1401-threshold',
        ],
      },
      { review: 'REVIEW-02', findings: ['frpa-7-24-does-not-name-the-statute-that-actually-bites'] },
    ],
  },
  {
    slug: 'frpa.survival-of-representations-7-6',
    version: 1,
    instrument: 'frpa',
    kind: 'clause',
    includeWhen: null,
    number: '7.6',
    section: 'miscellaneous',
    sortKey: 60,
    heading: 'Survival of Representations',
    body: 'All representations, warranties, and covenants herein shall survive the execution and delivery of this Agreement and shall continue in full force until the Completion Threshold is attained and all amounts then due have been paid.',
    source: { kind: 'attorney-drafted', author: null },
    status: 'draft',
    appliesInStates: [],
    examinedBy: [{ review: 'REVIEW-02', findings: ['frpa-7-6-and-4-2-contradict-the-2-6-completion-test'] }],
  },
  {
    slug: 'frpa.severability-7-7',
    version: 1,
    instrument: 'frpa',
    kind: 'clause',
    includeWhen: null,
    number: '7.7',
    section: 'miscellaneous',
    sortKey: 70,
    heading: 'Severability',
    body: 'In case any of the provisions in this Agreement is found to be invalid, illegal, or unenforceable in any respect, the validity, legality, and enforceability of any other provision contained herein shall not in any way be affected or impaired. Any provision hereof prohibited by law shall be ineffective only to the extent of such prohibition without invalidating the remaining provisions hereof.',
    source: { kind: 'attorney-drafted', author: null },
    status: 'draft',
    appliesInStates: [],
    examinedBy: [{ review: 'REVIEW-01', findings: ['frpa-severability-text-under-entire-agreement'] }],
  },
  {
    slug: 'frpa.entire-agreement-7-8',
    version: 1,
    instrument: 'frpa',
    kind: 'clause',
    includeWhen: null,
    number: '7.8',
    section: 'miscellaneous',
    sortKey: 80,
    heading: 'Entire Agreement',
    body: 'This Agreement embodies the entire agreement between Merchant and Buyer and supersedes all prior agreements and understandings relating to the subject matter hereof.',
    source: { kind: 'attorney-drafted', author: null },
    status: 'draft',
    appliesInStates: [],
    examinedBy: [{ review: 'REVIEW-01', findings: ['frpa-severability-text-under-entire-agreement'] }],
  },
  /*
    THE SECOND GUARANTY, AND IT WAS WIDER THAN THE FIRST.

    WHAT WAS WRONG. "Upon the occurrence of any Event of Default, Merchant and
    Guarantor(s) jointly and severally shall assume liability for and hereby
    agree to indemnify ... Buyer and any third-party servicers from and against
    any and all liabilities, claims, losses, obligations, damages, penalties,
    actions, and suits of whatsoever kind and nature ... in any way relating to
    or arising out of such Event of Default."

    Read that beside §9.2, which guarantees fraud, materially false present-fact
    statements and intentional diversion and NOTHING ELSE. This clause made a
    guarantor liable for EVERY Event of Default — which, under v4's §6.1.1, was
    every breach of every covenant — and did it in the miscellaneous section,
    twenty pages from the Guaranty, without citing it. §9.2's promise that "this
    Guaranty does not guarantee ... the performance of any other covenant" was
    true of §9.2 and false of the document.

    It is a first-party indemnity wearing a third-party indemnity's clothes.
    "Losses incurred by Buyer relating to an Event of Default" is Buyer's own
    collection loss; an indemnity is for what a STRANGER claims. Section 6.2 and
    Section 6.3 already govern what Buyer may recover for itself, with a cure
    period, a proof requirement and a 25% ceiling — none of which this clause
    acknowledged, so it was also a way around all three.

    Three more defects, each its own finding. It indemnified "any third-party
    servicers" as principals in their own right. It reached "penalties", which
    can include regulatory penalties imposed on Buyer for Buyer's conduct. And
    its last sentence charged interest "at the rate set forth in Section 6.3.1,
    from the date of demand until paid in full" — `indemnity-charges-interest-document-denies`
    and `interest-charges-inside-a-not-a-loan` together.

    CROSS-REFERENCE 2, HANDED OVER BY THE BRIEF AND RESOLVED HERE. §6.3.1 no
    longer supplies a rate. As rewritten it says interest is recoverable "only
    if, from the date and at the rate, that applicable law authorizes or a court
    orders", that no contractual or default rate accrues, and that "an invoice or
    a demand for payment creates no right to interest". So v4's sentence pointed
    at a rate that does not exist AND asserted the one thing §6.3.1 denies. The
    sentence is deleted rather than repaired: this clause now defers to §6.3.1
    instead of restating it.

    WHAT CHANGED. A third-party indemnity, for the portion of a third-party
    claim a court finally determines — or a settlement Merchant approves —
    was directly caused by Merchant's fraud or intentional diversion. Given by
    MERCHANT alone. Notice, cooperation and a defence Merchant may conduct. An
    exclusions paragraph covering Buyer's own negligence, fraud, willful
    misconduct and legal violations, penalties for their conduct, the ordinary
    failure of future receipts to arise, and first-party claims, which stay in
    Section 6.2.

    DEPARTURES FROM THE MEMO. Four.
    (1) The memo says "Costs and interest remain subject to Section 6.3". Written
        as costs under Section 6.3 "including its single aggregate ceiling", and
        interest "only as Section 6.3.1 permits". The memo predates the Section 6
        rewrite and its sentence would have left the reader to discover that
        §6.3.1 now grants nothing.
    (2) "no amount increases the purchased balance or split" is written against
        the defined terms: the Purchased Amount, the Remaining Balance and the
        Specified Percentage. §2.6 says the Remaining Balance never includes a
        fee, and "purchased balance" is not a term this document has.
    (3) The memo's settlement sentence reads as a limit on Merchant's settlement
        authority but is drafted without a subject. Written with one.
    (4) Third-party servicers are dropped as indemnitees rather than narrowed. A
        servicer is Buyer's agent; if Buyer wants its servicer covered, the
        indemnity Buyer holds is what covers it, and naming the servicer
        separately creates a claimant the merchant never contracted with.

    IT IS NOT GATED, AND THAT IS DELIBERATE. The brief marks it `action: both`
    with `fact: guarantyScope`, and the owner's mid-flight instruction reverses
    that: an indemnity is not a guaranty. A funder taking no personal guaranty
    still needs one, and gating it would leave that template with no indemnity
    at all. The fix is that it stops reaching a Guarantor, which is what "creates
    no independent Guarantor liability" says in terms.

    NOT FIXED HERE. The register carries three arbitration findings on this
    clause — `frpa-arbitration-clauses-with-no-arbitration-agreement`,
    `orphan-arbitration-references` and `orphan-arbitration-twenty-day-bar`.
    They are about the FRPA referring to an arbitration agreement it does not
    contain, they are the `disputes-service` cluster's `disputeResolution`
    decision, and the whole of what this rewrite can honestly do about them is
    mention arbitration nowhere.
  */
  {
    slug: 'frpa.indemnification-7-9',
    version: 1,
    instrument: 'frpa',
    kind: 'clause',
    includeWhen: null,
    number: '7.9',
    section: 'miscellaneous',
    sortKey: 90,
    heading: 'Indemnification',
    body: 'Merchant shall indemnify Buyer only for the portion of a third-party claim finally determined by a court, or resolved in a written settlement Merchant has approved, to have been directly caused by Merchant’s fraud or intentional diversion of Purchased Receipts. Buyer shall give Merchant prompt written notice of the claim, shall cooperate reasonably, and shall permit Merchant to defend it with competent counsel. Merchant shall not settle a claim in a way that imposes an admission or a non-monetary duty on Buyer, or that fails to release Buyer, without Buyer’s consent, which shall not be unreasonably withheld. Late notice reduces Merchant’s liability only to the extent of the resulting material prejudice.\nThis indemnity does not cover the negligence, fraud, willful misconduct or violation of law of Buyer or of its representatives, a penalty imposed for their conduct, the ordinary failure of future receipts to arise, or a first-party claim by Buyer, which is governed by Section 6.2. It creates no independent Guarantor liability, and a claim against a Guarantor may be brought only as Section 9.2 permits. Costs are recoverable only under Section 6.3, including its single aggregate ceiling, and interest accrues only as Section 6.3.1 permits. No amount under this Section increases the Purchased Amount, the Remaining Balance or the Specified Percentage, and no loss may be recovered twice.',
    source: { kind: 'attorney-drafted', author: null },
    status: 'draft',
    appliesInStates: [],
    examinedBy: [
      {
        review: 'REVIEW-01',
        findings: [
          'charges-scattered-outside-fee-schedule',
          'frpa-arbitration-clauses-with-no-arbitration-agreement',
          'indemnity-charges-interest-document-denies',
          'interest-charges-inside-a-not-a-loan',
          'liquidated-damages-plus-actual-costs',
          'orphan-arbitration-references',
          'orphan-arbitration-twenty-day-bar',
          'three-inconsistent-attorney-fee-formulas',
        ],
      },
    ],
  },
  {
    slug: 'frpa.jury-trial-waiver-7-10',
    version: 1,
    instrument: 'frpa',
    kind: 'clause',
    /*
      One of four clauses the memo proposes deleting separately; they are one fact.
      A jury waiver is meaningless under an arbitration template.
    */
    includeWhen: (facts) => facts.disputeResolution === 'courts',
    number: '7.10',
    section: 'miscellaneous',
    sortKey: 100,
    heading: 'Jury Trial Waiver',
    body: 'THE PARTIES HERETO WAIVE TRIAL BY JURY IN ANY COURT IN ANY SUIT, ACTION, OR PROCEEDING ON ANY MATTER ARISING IN CONNECTION WITH OR IN ANY WAY RELATED TO THE TRANSACTIONS OF WHICH THIS AGREEMENT IS A PART OR THE ENFORCEMENT HEREOF. THE PARTIES HERETO ACKNOWLEDGE THAT EACH MAKES THIS WAIVER KNOWINGLY, WILLINGLY, AND VOLUNTARILY AND WITHOUT DURESS, AND ONLY AFTER EXTENSIVE CONSIDERATION OF THE RAMIFICATIONS OF THIS WAIVER WITH THEIR ATTORNEYS.',
    source: { kind: 'attorney-drafted', author: null },
    status: 'draft',
    appliesInStates: [],
    examinedBy: [{ review: 'REVIEW-02', findings: ['frpa-7-10-jury-waiver-recites-what-7-22-contemplates-is-false'] }],
  },
  {
    slug: 'frpa.class-action-waiver-7-11',
    version: 1,
    instrument: 'frpa',
    kind: 'clause',
    /*
      All three market forms pair a class waiver WITH arbitration. A bare one, as
      here, is the weakest of the three positions — but that is a drafting
      question, not a reason to exclude it from a courts template.
    */
    includeWhen: (facts) => facts.disputeResolution === 'courts',
    number: '7.11',
    section: 'miscellaneous',
    sortKey: 110,
    heading: 'Class Action Waiver',
    body: 'THE PARTIES HERETO WAIVE ANY RIGHT TO ASSERT ANY CLAIMS AGAINST THE OTHER PARTY, AS A REPRESENTATIVE OR MEMBER IN ANY CLASS OR REPRESENTATIVE ACTION, EXCEPT WHERE SUCH WAIVER IS PROHIBITED BY LAW OR AGAINST PUBLIC POLICY.',
    source: { kind: 'attorney-drafted', author: null },
    status: 'draft',
    appliesInStates: [],
    examinedBy: [{ review: 'REVIEW-01', findings: ['class-waiver-forfeits-own-recovery'] }],
  },
  {
    slug: 'frpa.service-of-process-7-12',
    version: 1,
    instrument: 'frpa',
    kind: 'clause',
    includeWhen: null,
    number: '7.12',
    section: 'miscellaneous',
    sortKey: 120,
    heading: 'Service of Process',
    body: 'IN ADDITION TO THE METHODS OF SERVICE ALLOWED BY STATE LAW, MERCHANT HEREBY CONSENTS TO SERVICE OF PROCESS UPON IT BY REGISTERED OR CERTIFIED MAIL, RETURN RECEIPT REQUESTED. SERVICE HEREUNDER SHALL BE COMPLETE UPON MERCHANT’S ACTUAL RECEIPT OF PROCESS OR UPON BUYER’S RECEIPT OF THE RETURN THEREOF BY THE UNITED STATES POSTAL SERVICE AS REFUSED OR UNDELIVERABLE. MERCHANT MUST PROMPTLY NOTIFY BUYER, IN WRITING, OF EACH AND EVERY CHANGE OF ADDRESS TO WHICH SERVICE OF PROCESS CAN BE MADE. SERVICE BY BUYER TO THE LAST KNOWN ADDRESS SHALL BE SUFFICIENT. MERCHANT WILL HAVE THIRTY (30) CALENDAR DAYS AFTER SERVICE HEREUNDER IS COMPLETE IN WHICH TO RESPOND. THE PARTIES FURTHER AGREE TO ACCEPT SERVICE OF PROCESS BY EMAIL TO ANY EMAILS DESIGNATED IN THIS AGREEMENT.',
    source: { kind: 'attorney-drafted', author: null },
    status: 'draft',
    appliesInStates: [],
    examinedBy: [
      { review: 'REVIEW-01', findings: ['ct-prejudgment-remedy-waiver', 'service-without-notice-vs-commitment-9'] },
    ],
  },
  /*
    WHAT WAS WRONG. Three mechanisms, each of which quietly undoes a protection
    stated somewhere else.

    (1) AUTOMATIC MASTER-AGREEMENT TREATMENT. "This Agreement shall serve as a
        Master Agreement which sets forth all of the terms and conditions
        governing any such sale", performed by "an additional schedule". A
        schedule is not a new agreement: it carries no fresh disclosures, no
        fresh underwriting and no fresh signature on the terms, and it makes
        every later funding inherit the terms of the first — including any term
        a later review finds wrong.
    (2) REDUCTION BY PRIOR PURCHASED AMOUNTS. "The Purchase Price listed on such
        schedule shall be reduced dollar-for-dollar by Purchased Amounts then
        outstanding from prior purchases." The Purchased Amount is a FACE
        figure. What is actually owed on a live purchase is the Remaining
        Balance, which §2.6 defines and which is smaller by everything already
        collected. Deducting the face amount overstates the payoff and
        understates the cash — REVIEW-01's `frontload-refactors-old-balance`.
    (3) THE RIGHT OF FIRST REFUSAL. Lawful, and unnecessary: Buyer already owns
        the share it bought, and a ROFR over Merchant's future sales protects
        nothing this Agreement gives.

    WHAT CHANGED. All three are denied rather than repaired, which is the memo's
    disposition, and the machinery moves to Section 8 where a subsequent purchase
    is actually governed. Nothing in the replacement is new law; it is the
    negation of three things v4 asserted.

    DEPARTURE FROM THE MEMO — "SECTION 8" IS NAMED AS §8.1 AND §8.2. The memo
    says "must comply with Section 8". A bare Section 8 reference resolves
    against §8.3 (voluntary prepayment) even in a template where the renewal
    clauses are gated out, so it would read as satisfied while pointing at a
    section that does not answer it. The two clauses that do are named.

    THE GATE STAYS ON `renewalModel`. A funder that does no subsequent purchases
    has nothing to deny here, and the clause's own text points at §8.1 and §8.2,
    which that funder's template does not contain.

    THE HEADING CHANGES for the reason §5.16's does: it named the machinery, and
    the machinery is gone.
  */
  {
    slug: 'frpa.sale-of-additional-pool-of-receipts-right-of-first-refusal-7-13',
    version: 1,
    instrument: 'frpa',
    kind: 'clause',
    /*
      Master-agreement treatment and the ROFR are renewal machinery.
    */
    includeWhen: (facts) => facts.renewalModel !== 'none',
    number: '7.13',
    section: 'miscellaneous',
    sortKey: 130,
    heading: 'No Master Agreement; No Right of First Refusal',
    body: 'This Agreement is not a master agreement for future funding, and it creates no right of first refusal in Buyer over any sale of receipts Merchant may wish to make. Neither party is obliged to enter a further purchase, and no schedule, addendum or acceptance of an offer varies this Section.\nEvery subsequent purchase must be separately offered, disclosed, documented and accepted, and must satisfy Section 8.1. No Purchased Amount and no Remaining Balance under a prior transaction is automatically deducted from the Purchase Price of a new one; a prior transaction is dealt with only as Section 8.2 provides and only where Merchant has authorized it.',
    source: { kind: 'attorney-drafted', author: null },
    status: 'draft',
    appliesInStates: [],
    examinedBy: [
      { review: 'REVIEW-01', findings: ['frontload-refactors-old-balance', 'lombard-multi-position-vs-no-stack'] },
    ],
  },
  /*
    WHAT WAS WRONG. A blanket authority to hand information about Merchant AND
    ITS PRINCIPALS to any number of unnamed "industry associations", twice
    stated to be exercisable "without further notice to" anybody. No purpose, no
    named recipient, no accuracy duty, no correction route, and — because it
    reached principals — natural persons.

    THE ONE SENTENCE THE OWNER'S NOTE CALLS THE EXPOSURE, and it is the second
    paragraph: **never report the non-generation of Purchased Receipts as a
    delinquent fixed debt.** This Agreement fixes no payment and no maturity
    date; §6.1 says an absence of Card Receipts is not a default and §2.6 says
    the Purchased Amount is not made due by one. A furnisher who nevertheless
    reports "past due" is reporting a debt the document says does not exist.
    Everything else in this clause is a control around that sentence.

    THE MEMO IS CAREFUL ABOUT SOMETHING WORTH KEEPING CAREFUL. An association
    may or may not be a consumer reporting agency depending on what it does with
    what it receives, and not all business-only reporting is FCRA-covered. The
    clause therefore states a CONDITION on Buyer — establish the authority the
    law requires before furnishing information about an individual — and decides
    nothing about whether a given recipient is covered. UNVERIFIED: nobody here
    has read 15 U.S.C. §1681s-2, and no federal consumer-credit statute is
    vendored in `mca/sources/`.

    DEPARTURE 1 — "INDUSTRY ASSOCIATION" IS NOT USED AT ALL. The memo keeps
    "reporting organization"; v4's term is what created the problem, since an
    association is defined by nothing. "A reporting organization that Buyer has
    specifically identified" is the operative half — identification is the duty,
    and the category is not.

    DEPARTURE 2 — THE MEMO'S "IDENTIFY A REASONABLY SUBSTANTIATED DISPUTE WHERE
    REQUIRED" IS TIED TO THE RECIPIENT'S RULES AS WELL AS TO LAW, because a
    network or trade recipient may impose a dispute flag the law does not.

    DEPARTURE 3 — THE DIVERSION LIMB IS POINTED AT §6.1(b) BY NUMBER. The memo
    says "distinguish a genuine payment diversion from ordinary non-generation".
    §6.1(b) is the only place this Agreement defines that conduct, and an
    unanchored "diversion" is a word a furnisher can decide for itself.
  */
  {
    slug: 'frpa.reporting-7-15',
    version: 1,
    instrument: 'frpa',
    kind: 'clause',
    includeWhen: null,
    number: '7.15',
    section: 'miscellaneous',
    sortKey: 150,
    heading: 'Reporting',
    body: 'Buyer may report accurate information about Merchant’s performance of this Agreement to a reporting organization that Buyer has specifically identified, for a lawful purpose Buyer has disclosed, and only as Section 4.7 and applicable law permit. Before furnishing information about an individual that a recipient may use in a consumer report, Buyer shall establish the authority applicable law requires for it and shall meet the accuracy, adverse-action and dispute duties that apply to the furnisher of it.\nBuyer shall not report the non-generation of Purchased Receipts as a delinquent or past-due fixed debt. This Agreement fixes no payment and no maturity date, so an absence of Card Receipts is not a missed payment; only the conduct described in Section 6.1(b) may be reported as a diversion, and a reasonably substantiated dispute shall be identified as disputed wherever applicable law or the recipient’s rules require.\nMerchant, and an individual whose information was furnished, may request the recipient’s identity and the process for correcting the information, and Buyer shall give both. No raw account data, no credentials and no information unrelated to Merchant’s performance of this Agreement may be furnished. This Section authorizes no marketing and no general disclosure to a trade body.',
    source: { kind: 'attorney-drafted', author: null },
    status: 'draft',
    appliesInStates: [],
    examinedBy: [{ review: 'REVIEW-01', findings: ['information-sharing-only-vs-any-third-party'] }],
  },
  {
    slug: 'frpa.return-of-buyer-proceeds-7-16',
    version: 1,
    instrument: 'frpa',
    kind: 'clause',
    includeWhen: null,
    number: '7.16',
    section: 'miscellaneous',
    sortKey: 160,
    heading: 'Return of Buyer Proceeds',
    body: 'In the event that Merchant, or any of Merchant’s respective directors, officers, employees, agents, subcontractors, or affiliates receives or comes into possession of any proceeds of the Purchased Amount, Merchant shall, or shall cause such other recipients to, immediately segregate and hold such proceeds in express trust for Buyer’s sole and exclusive benefit. Such proceeds shall be delivered to Buyer in full within three (3) business days of such receipt.',
    source: { kind: 'attorney-drafted', author: null },
    status: 'draft',
    appliesInStates: [],
    examinedBy: [{ review: 'REVIEW-01', findings: ['default-collection-reaches-cash-and-checks'] }],
  },
  {
    slug: 'frpa.electronic-signatures-7-17',
    version: 1,
    instrument: 'frpa',
    kind: 'clause',
    includeWhen: null,
    number: '7.17',
    section: 'miscellaneous',
    sortKey: 170,
    heading: 'Electronic Signatures',
    body: 'Electronic signatures (including those executed via any commercially recognized electronic-signature platform) shall be deemed acceptable for all purposes and shall have the same force and effect as original ink signatures. Electronic copies of this Agreement shall be treated as originals for all purposes.',
    source: { kind: 'attorney-drafted', author: null },
    status: 'draft',
    appliesInStates: [],
    examinedBy: [{ review: 'REVIEW-02', findings: [] }],
  },
  /*
    THREE DIFFERENT CONSENTS IN ONE CLAUSE, EACH TAKEN FROM THE WRONG PERSON.

    (1) RECORDING. "By signing this Agreement, each Merchant and Guarantor
        agrees that any such call may be monitored and/or recorded" — and the
        first sentence reaches calls with "their respective owners, employees,
        or agents". A company's signature cannot supply the recording consent of
        an employee who has not signed and may not have been hired yet, and
        several states require every participant's.

    (2) AUTOMATED CONTACT. A consent for "servicing, collections, marketing, or
        promoting", to any number in the Agreement OR ANY APPLICATION, for Buyer
        plus its servicers plus their subsidiaries and affiliates, "regardless
        of their inclusion on any do-not-call list". Four separate over-reaches:
        a number the signer may not control, an unnamed set of callers, a
        registration a private signature cannot override, and marketing bundled
        with servicing in one grant.

    (3) REVOCATION, WHICH IS THE FINDING. `tcpa-consent-not-revocable-as-
        promised`: the clause promises revocation "by any reasonable means" and
        then honours it only "for all contact that is not required to service
        this Agreement" — which is the contact a collector actually makes. A
        revocation right with the collector's own purpose carved out of it is
        the defect, not a detail of it.

    (4) PREMISES. Entry "during business hours, without prior notice, at any
        time after the occurrence of an Event of Default" to protect an interest
        in "the Receivables and the Collateral". §6.2 as `default-remedies`
        rewrote it says Buyer takes no self-help remedy; an unannounced entry
        right is a self-help remedy filed under communications.

    WHAT CHANGED. Consent is taken from the person entitled to give it for the
    number it is given for. Revocation is real, effective on receipt, with no
    servicing carve-out. Marketing is separated and optional. Recording takes
    each participant's consent with an unrecorded alternative. Entry needs
    consent or a court.

    DEPARTURE 1 — §7.3 IS EXPRESSLY DISAPPLIED TO A REVOCATION. v4 sent
    revocation "to the address in Section 7.3", and §7.3 requires certified mail
    effective only on receipt. A revocation that must be sent by certified mail
    is not revocable "by any reasonable means", and the two sentences were
    already inconsistent. §7.3 is `miscellaneous`'s clause and is not touched;
    this one says which rule governs a revocation, so the inconsistency has an
    answer wherever §7.3 lands.

    DEPARTURE 2 — NO STATEMENT OF WHAT THE LAW CURRENTLY REQUIRES. The memo is
    careful and the brief is emphatic, so this clause names no rule and no date.
    UNVERIFIED, and recorded here rather than anywhere a merchant reads: as of
    this memo the FCC's cross-topic informational revocation requirement is
    deferred to 31 January 2027 while the core revocation duties stand, and the
    one-to-one marketing consent rule was vacated. **Nobody on this project has
    read the FCC orders, the vacating opinion, or 47 U.S.C. §227.** A deferral is
    not an exemption, and the vacated rule must not be described as live law in
    any Pacta material. The clause is written to be correct under either state
    of that question: it obliges Buyer to honour a revocation within the period
    applicable law allows, and to use a method that is lawful without consent
    afterwards.

    DEPARTURE 3 — "SERVICERS AND THEIR SUBSIDIARIES AND AFFILIATES" IS NOT
    REPLACED WITH A NARROWER LIST. It is dropped. Buyer may contact; §7.2 governs
    who stands in Buyer's shoes; a consent naming a class of companies the signer
    cannot enumerate is not a consent to any of them.

    DEPARTURE 4 — THE GUARANTOR IS "SEPARATELY IDENTIFIED FOR THE PURPOSE". The
    memo's phrase, kept deliberately: §9.1 collects a Guarantor's contact
    details, and a guaranty is gated on `guarantyScope`, so this clause must not
    assume a Guarantor exists.
  */
  {
    slug: 'frpa.communications-recording-and-premises-access-7-18',
    version: 1,
    instrument: 'frpa',
    kind: 'clause',
    includeWhen: null,
    number: '7.18',
    section: 'miscellaneous',
    sortKey: 180,
    heading: 'Communications, Recording, and Premises Access',
    body: 'Buyer may contact Merchant, and a Guarantor separately identified for the purpose, to administer and lawfully service this Agreement, by a method applicable law permits. Where an automated call, an artificial or prerecorded voice call, or a text message requires consent, Buyer shall obtain that consent from the person legally entitled to provide it for the specified number, and shall record when and how it was given.\nA recipient may revoke consent at any time by any reasonable means, including by replying STOP to a text message, by telephone, or in writing; a revocation is effective when Buyer receives it, and Section 7.3 does not apply to it. Buyer shall honor a revocation within the period applicable law allows. Servicing or collecting this Agreement does not by itself preserve consent, and after a revocation Buyer shall use only a method that is lawful without it.\nMarketing consent, if Buyer asks for it, shall be obtained separately, shall identify the caller and the number the contact will come from, shall carry the disclosures applicable law requires, and shall be optional and not a condition of funding or of any term of it. This Agreement supplies no blanket do-not-call override and no consent for an unnamed affiliate.\nBefore recording a call, Buyer shall give the notice applicable law requires and obtain the consent applicable law requires from each participant, and shall offer an unrecorded alternative where that is practicable. A signature to this Agreement is not the consent of a person who has not given it.\nBuyer may enter Merchant’s premises only with reasonable advance notice and Merchant’s contemporaneous consent, or under an order of a court of competent jurisdiction, and in no case by force, by disruption of Merchant’s business, or by a breach of the peace. Section 6.2 states what Buyer may do on an Event of Default and that Buyer takes no self-help remedy.',
    source: { kind: 'attorney-drafted', author: null },
    status: 'draft',
    appliesInStates: [],
    examinedBy: [{ review: 'REVIEW-01', findings: ['tcpa-consent-not-revocable-as-promised'] }],
  },
  {
    slug: 'frpa.contractual-statutes-of-limitations-7-19',
    version: 1,
    instrument: 'frpa',
    kind: 'clause',
    /*
      Same bundle.
    */
    includeWhen: (facts) => facts.disputeResolution === 'courts',
    number: '7.19',
    section: 'miscellaneous',
    sortKey: 190,
    heading: 'Contractual Statutes of Limitations',
    body: 'Each Merchant and Guarantor agrees that any claim, whether sounding in contract, tort, law, equity, or otherwise, that is not asserted against Buyer within one (1) year after its accrual will be time-barred and forever waived, except to the extent such limitation is prohibited by applicable law.',
    source: { kind: 'attorney-drafted', author: null },
    status: 'draft',
    appliesInStates: [],
    examinedBy: [
      {
        review: 'REVIEW-01',
        findings: [
          'frpa-arbitration-clauses-with-no-arbitration-agreement',
          'one-year-limitations-one-sided',
          'orphan-arbitration-references',
          'orphan-arbitration-twenty-day-bar',
        ],
      },
    ],
  },
  {
    slug: 'frpa.counterclaim-waiver-7-20',
    version: 1,
    instrument: 'frpa',
    kind: 'clause',
    /*
      Same bundle. Under arbitration the rules of the forum govern instead.
    */
    includeWhen: (facts) => facts.disputeResolution === 'courts',
    number: '7.20',
    section: 'miscellaneous',
    sortKey: 200,
    heading: 'Counterclaim Waiver',
    body: 'In any litigation commenced by Buyer to enforce this Agreement, the Guaranty, or any related agreement, no Merchant or Guarantor will be permitted to interpose any counterclaim, except for any counterclaim arising out of the same transaction or occurrence as Buyer’s claim, which Merchant and Guarantor may assert in that proceeding. Any non-compulsory counterclaim must be brought as a separate proceeding.',
    source: { kind: 'attorney-drafted', author: null },
    status: 'draft',
    appliesInStates: [],
    examinedBy: [
      {
        review: 'REVIEW-01',
        findings: [
          'counterclaim-waiver-flips-by-forum',
          'frpa-arbitration-clauses-with-no-arbitration-agreement',
          'orphan-arbitration-references',
          'orphan-arbitration-twenty-day-bar',
        ],
      },
    ],
  },
  /*
    THE WIDEST GUARANTOR LIABILITY IN THE DOCUMENT, AND NO BRIEF NAMED IT.

    Found by `personal-liability-is-section-9-only.test.ts`, which states its
    property over the SET rather than over its own ten clauses, and found by
    nothing else — not the 2026-09-09 memo, which files this clause under
    channel oversight and does not raise it under Section 9, and not this
    cluster's own brief. The sentence:

      "Each Merchant and Guarantor agrees to indemnify and hold harmless Buyer
      ... from and against all losses, damages, claims, liabilities, and
      expenses ... resulting from any act or omission by any ISO."

    That is unlimited personal liability, for a broker the guarantor did not
    choose, cannot control, and whose agreement with Buyer they have never seen,
    triggered by conduct nobody in the room has to prove was wrongful — "any act
    or omission" is not qualified by fault. §9.2 makes a Guarantor answerable for
    their OWN proved fraud or intentional diversion, with Buyer bearing the
    burden; this made them answerable for a stranger's negligence, on Buyer's
    say-so. It is the third route around §9.2 rather than the second, and it is
    wider than §7.9, which the guaranty cluster closed.

    THE CONCESSION IN THAT TEST IS DELETED IN THE SAME CHANGE. A concession left
    standing after the defect is fixed is a line that can no longer be red.

    THE RISK ALLOCATION WAS BACKWARDS ON ITS OWN TERMS. Buyer selects, contracts
    with, pays and can terminate the ISO. Merchant meets it once. The party that
    controls the channel is the party that should carry it, and the memo says so.

    AND THE REFUND PROMISE WAS WORTH NOTHING. "Buyer will on notice require the
    ISO to refund it" is a promise to ASK. If the ISO has taken the fee and gone,
    Merchant has a promise that was performed and no money. The owner's note is
    the fix: give the merchant a direct remedy against us — we can recover from
    the ISO, the merchant cannot. `iso-a6-and-frpa-7-21-give-different-answers-
    about-a-merchant-paid-fee` is the finding, and it closes from both sides: ISO
    PRA §A.6 already obliges the ISO to refund the merchant and to evidence it,
    so the two documents now describe one outcome reached two ways rather than
    two different outcomes.

    THE "INDEPENDENT" LABEL. `iso-channel-vs-never-cold-call` reports that the
    channel exists at all while the funder's marketing promises no cold calling.
    Whatever that resolves to, a clause cannot decide its own agency question:
    apparent authority is created by the principal's conduct toward the third
    party, not by a recital between two of them. The clause keeps the disclaimer
    of unincorporated promises — that is ordinary and useful — and stops the
    disclaimer reaching responsibility the law attributes.

    THE GATE. `brokerChannel`, and it is a whole-clause gate under ADR 0013: a
    funder with no broker channel has no ISO, so the clause is genuinely absent
    rather than differently worded. It is cited by no ungated clause, which is
    the direction that would dangle. `instrumentsFor` already drops the ISO PRA
    on the same fact, so the two move together.

    DEPARTURE 1 — "BUYER'S AGREEMENTS WITH ITS ISOs PROHIBIT ..." BECOMES A
    PROMISE BY BUYER. v4 recited the contents of a contract the merchant has
    never seen and cannot enforce. A recital about a third document is worth
    nothing to the person reading this one; an undertaking that Buyer will
    require it is worth something and is checkable.

    DEPARTURE 2 — "SHOULD NOTIFY BUYER AT ONCE" BECOMES "MAY NOTIFY". A duty
    phrased as advice is neither, and a merchant who fails to report promptly
    should not thereby lose the refund this clause now owes them.

    DEPARTURE 3 — TEN WORKDAYS, NOT TEN DAYS. The memo fixes ten; `Workday` is
    the defined term this Agreement counts in everywhere else.

    NOT FIXED HERE, AND NOT THIS CLUSTER'S. `frpa.appendix-a-origination-fee-to-
    iso` is ungated and speaks of ISO fees, so a funder with `brokerChannel:
    false` gets an Appendix A paragraph about a channel it does not have. It is
    `fees-and-money`'s clause. UNVERIFIED, separately: the memo says to verify
    any anti-lead-list marketing claim; no marketing material is in this
    repository and nobody here has read one.
  */
  {
    slug: 'frpa.independent-sales-organizations-and-brokers-7-21',
    version: 1,
    instrument: 'frpa',
    kind: 'clause',
    includeWhen: (facts) => facts.brokerChannel,
    number: '7.21',
    section: 'miscellaneous',
    sortKey: 210,
    heading: 'Independent Sales Organizations and Brokers',
    body: 'Section 1 shall identify any independent sales organization, broker or marketing affiliate involved in this transaction (an “ISO”), its role, what it is paid, who pays it, and any disclosure applicable law requires. An ISO may be an independent contractor of Buyer, and that description does not waive any responsibility of Buyer arising from an ISO’s actual or apparent authority, from Buyer’s own conduct, or under applicable law. Buyer is not bound by a promise or representation of an ISO that is not contained in this Agreement and is not otherwise legally attributable to Buyer.\nBuyer shall maintain reasonable controls over the channel it engages, including onboarding, verification of any licensing or registration applicable law requires, training, monitoring, complaint handling, and compensation.\nMerchant and Guarantor do not indemnify Buyer, or any person associated with Buyer, for an act or omission of an ISO. Section 7.9 states the only indemnity Merchant gives under this Agreement.\nBuyer shall require by contract that an ISO it engages charge or collect from Merchant no compensation beyond what is expressly permitted, disclosed and agreed under applicable law; the commission Buyer pays is that ISO’s entire compensation for a transaction Buyer funds. Merchant is not required to pay an ISO anything as a condition of this Agreement, and may notify Buyer of a request for such a payment. Buyer shall investigate a reported unauthorized charge promptly, and shall refund a substantiated unauthorized charge collected by an ISO Buyer engaged within ten (10) Workdays after it is substantiated, without requiring Merchant to recover from the ISO first. Buyer may separately pursue the ISO. Nothing in this Section disclaims a representation legally attributable to Buyer, or limits a claim for deception or for an unauthorized fee.',
    source: { kind: 'attorney-drafted', author: null },
    status: 'draft',
    appliesInStates: [],
    examinedBy: [
      { review: 'REVIEW-01', findings: ['iso-channel-vs-never-cold-call'] },
      { review: 'REVIEW-02', findings: ['iso-a6-and-frpa-7-21-give-different-answers-about-a-merchant-paid-fee'] },
    ],
  },
  {
    slug: 'frpa.attorney-review-7-22',
    version: 1,
    instrument: 'frpa',
    kind: 'clause',
    includeWhen: null,
    number: '7.22',
    section: 'miscellaneous',
    sortKey: 220,
    heading: 'Attorney Review',
    body: 'Each Merchant and Guarantor acknowledges that it has had an opportunity to review this Agreement and all addenda with counsel of its choosing before signing or has chosen not to avail itself of that opportunity. Each Merchant and Guarantor further acknowledges that it has not relied on any representation by Buyer or any third party that is not set forth in this Agreement.',
    source: { kind: 'attorney-drafted', author: null },
    status: 'draft',
    appliesInStates: [],
    examinedBy: [
      {
        review: 'REVIEW-02',
        findings: [
          'frpa-4-8-conditions-the-counsel-review-7-22-promises',
          'frpa-7-10-jury-waiver-recites-what-7-22-contemplates-is-false',
        ],
      },
    ],
  },
  /*
    THE MEMO REFUTES THE FIRST INSTINCT AND IT IS RIGHT TO. The v4 text already
    conditions reporting on network rules and law; it does not license a false
    report. Three other things about it were wrong.

    (1) THE RELEASE. "Merchant waives and releases Buyer and its assignees,
        servicers, and processor partners from any claim arising from such
        reporting that is consistent with applicable law and card-network
        rules." A MATCH listing can end a merchant's ability to accept cards for
        five years. The release is circular — it releases only lawful reporting,
        which needs no release — and its practical effect is to put the merchant
        to proving unlawfulness before it has been told who reported what.

    (2) NOBODY IS IDENTIFIED. "Buyer or its assignees, servicers, or processor
        partners may report" names four candidate reporters, and under the
        network rules the acquirer is generally the party with standing to
        submit. A consent to being reported by whoever turns out to be able to
        is not a consent to anything in particular.

    (3) THE MISSING PREMISE, WHICH IS THE OWNER'S EMPHASIS. **This Agreement does
        not establish that an MCA default is a network-reportable event at all.**
        The reason codes are the network's, and they describe merchant conduct in
        a card acceptance relationship, not a purchaser's dispute with a seller
        of receivables. A form that recites consent to reporting without saying
        what the criteria are invites a report whose only basis is the consent.

    WHAT CHANGED. Only an authorized reporter may report. A report needs
    documented facts that satisfy the network's own criteria. No report and no
    threat of one as payment pressure. Identification and a correction channel
    where the rules permit. And nothing is released.

    THE CLAUSE MUST NOT BE READ AS A CONSENT AT ALL, WHICH IS WHY THE HEADING
    KEEPS "CONSENT AND RELEASE" AND THE BODY GIVES NEITHER. Departure noted
    deliberately: the heading is v4's and is retained so a reader looking for the
    provision they were told about finds it, while the text under it grants no
    consent and no release. If a later cluster renumbers or retitles Section 7,
    this heading is the first candidate.

    UNVERIFIED, AND THE MOST CONSEQUENTIAL IN THIS CLUSTER. **No card-network
    rulebook is in this repository and nobody on this project has read one.**
    The Mastercard MATCH reason codes, the standing to submit, the five-year
    retention, the correction procedure, and whether a TMF is a distinct file or
    a legacy name for the same thing are all asserted nowhere in this clause
    precisely because none of them has been checked. The acquirer agreement with
    the processor is likewise not in this repository. Before anyone reports
    anything, the current rules have to be obtained and read.

    DEPARTURE — "SOLELY TO PRESSURE PAYMENT" LOSES "SOLELY". The memo writes
    "shall not report or threaten to report ... solely to pressure payment". A
    reporter with a mixed motive is the ordinary case, and "solely" is the word a
    defendant reaches for. The prohibition is written on the purpose of obtaining
    payment of a disputed claim, without the qualifier.
  */
  {
    slug: 'frpa.tmf-match-reporting-consent-and-release-7-23',
    version: 1,
    instrument: 'frpa',
    kind: 'clause',
    includeWhen: null,
    number: '7.23',
    section: 'miscellaneous',
    sortKey: 230,
    heading: 'TMF/MATCH Reporting Consent and Release',
    body: 'Only a party authorized under the applicable card-network rules may submit a report to the Member Alert to Control High-risk Merchants (MATCH) database, to a Terminated Merchant File, or to a similar card-network database. A report shall be based on documented facts that satisfy the reporting criteria those rules state, shall carry the information those rules require and no more, and is subject to applicable law and to Section 4.7.\nBuyer shall not report or threaten to report Merchant or a principal of Merchant in order to obtain payment of a disputed claim under this Agreement, or because Card Receipts have declined.\nWhere the card-network rules and applicable law permit, Buyer shall identify the entity that made a report and the channel available for disputing it or requesting a correction, and shall cooperate promptly in correcting information it learns is inaccurate. Merchant and each Guarantor do not release claims for an inaccurate, unauthorized, negligent, malicious or unlawful report.',
    source: { kind: 'attorney-drafted', author: null },
    status: 'draft',
    appliesInStates: [],
    examinedBy: [{ review: 'REVIEW-01', findings: ['information-sharing-only-vs-any-third-party'] }],
  },
  {
    slug: 'frpa.state-law-riders-7-24',
    version: 1,
    instrument: 'frpa',
    kind: 'clause',
    includeWhen: null,
    number: '7.24',
    section: 'miscellaneous',
    sortKey: 240,
    heading: 'State Law Riders',
    body: 'To the extent any provision of this Agreement is prohibited or rendered unenforceable by the law of the state in which Merchant is located, including Conn. Gen. Stat. §36a-868 (which bars a waiver of a recipient’s right to notice, judicial hearing or prior court order in connection with a prejudgment remedy) and Tex. Fin. Code §398.055 (which voids confession-of-judgment and similar provisions), that provision does not apply to this Agreement and the remainder of the Agreement continues in effect. Nothing in Section 7.12 or Section 10 waives any right to notice, to a judicial hearing, or to a prior court order that the law of Merchant’s state makes non-waivable.',
    source: { kind: 'attorney-drafted', author: null },
    status: 'draft',
    appliesInStates: [],
    examinedBy: [
      {
        review: 'REVIEW-02',
        findings: [
          'frpa-7-24-answers-only-half-of-conn-gen-stat-36a-868',
          'frpa-7-24-does-not-name-the-statute-that-actually-bites',
          'frpa-7-24-misstates-what-tex-fin-code-398-055-voids',
        ],
      },
    ],
  },
  /*
    WHAT WAS WRONG. Two sentences, and the second one is the whole finding.

    "Merchant may be eligible for a renewal funding prior to full collection of
    the Purchased Amount" is fine on its own — renewal before completion is not
    inherently a defect. "Any renewal shall be documented under a new Future
    Receivables Purchase Agreement incorporating the outstanding balance from
    this Agreement" is not: read with v4's §4.15 cascade and §8.2 Carry, it
    double-commits the same pool. The old purchase stays alive and keeps
    collecting, its balance is folded into the new Purchased Amount, and the
    merchant is delivering against both. That is the mechanism REVIEW-01 records
    as `lombard-multi-position-vs-no-stack` and the memo describes as a
    "$100,000 advance" that delivers $65,000.

    WHAT CHANGED. A subsequent purchase becomes an offer, not an entitlement:
    fresh underwriting on the receipts and obligations as they then stand, a
    complete new agreement, the disclosures the law then requires, and a fresh
    acceptance. The net-proceeds sentence is the memo's and is the one that
    makes the arithmetic visible before signature — the additional cash stated
    separately from the old obligation settled, and a payoff not counted as cash
    delivered.

    DEPARTURE FROM THE MEMO — TWO LIMBS ARE POINTED AT §4.15 RATHER THAN STATED.
    The memo ends "No automatic renewal, concurrent position, or continuing
    guaranty arises from this Agreement", and requires the prior purchase to be
    "completed or expressly settled at or before the new Purchase Date". Both of
    those are true of a single-position funder and false of a funder that holds
    concurrent positions, and §4.15 is the clause `concurrentPositions` decides.
    Stating them here would put the answer in two places and make one of them
    wrong for half the profiles. The automatic-renewal and continuing-guaranty
    limbs stay, because they are true under both.

    DEPARTURE — NO REFERENCE TO SECTION 9. The memo does not make one; the draft
    that pointed the guaranty sentence at Section 9 was withdrawn because §9.2 is
    gated on `guarantyScope` and six clauses already dangle at it in a
    no-guaranty template. That gap is the `guaranty` cluster's and is recorded in
    `engine/__tests__/select-clauses.test.ts`; this clause does not add a seventh.

    UNVERIFIED. The memo's renewal analysis rests on Richmond Capital 246 AD3d
    585 and LG Funding for the proposition that reconciliation and completion
    mechanics are read as evidence of whether a transaction is a purchase or a
    loan. Nobody on this project has pulled either from an official reporter.
    Recorded here, never in a body.
  */
  {
    slug: 'frpa.renewal-eligibility-8-1',
    version: 1,
    instrument: 'frpa',
    kind: 'clause',
    /*
      Renewal eligibility presupposes renewal.
    */
    includeWhen: (facts) => facts.renewalModel !== 'none',
    number: '8.1',
    section: 'renewal',
    sortKey: 10,
    heading: 'Renewal Eligibility',
    body: 'Neither party is obliged to enter a subsequent purchase, and no renewal arises automatically from this Agreement.\nA subsequent purchase requires new underwriting on Merchant’s Card Receipts and existing obligations as they stand at that time, a new and complete agreement, every disclosure the law then requires, and Merchant’s fresh acceptance. Before Merchant accepts, Buyer shall state separately the additional cash Merchant will receive and the amount of any existing obligation to be settled out of the new consideration. A payoff is not cash delivered to Merchant.\nThis Agreement is settled or completed as Section 8.2 provides. Whether Buyer may hold this purchase and a subsequent purchase at the same time is governed by Section 4.15. No Guarantor’s obligation under this Agreement extends to a subsequent purchase.',
    source: { kind: 'attorney-drafted', author: null },
    status: 'draft',
    appliesInStates: [],
    examinedBy: [{ review: 'REVIEW-01', findings: ['lombard-multi-position-vs-no-stack'] }],
  },
  /*
    §8.2 IS THE SECOND EXHAUSTIVE PAIR. §4.15's comment in `enrollment.ts`
    carries the argument; this is the other instance and the harder one, because
    `renewalModel` has three values rather than two.

    `none` selects neither of these. `payoff-only` selects the clause below.
    `carry` selects the one after it. Every value selects exactly one §8.2, and
    the four clauses that cite §8.2 by number — §004, §7.13, §8.1 and §4.15's
    single-position half — find it in every template that has a Section 8.

    WHY A PAIR AND NOT A CLAUSE PLUS A LIMB. The old gate was
    `renewalModel === 'carry'`, which read as though Carry were the whole
    subject. It is not: the section holds a payoff method and a carry method,
    and the payoff method is the one a `payoff-only` funder needs. Gating the
    section on Carry deleted the payoff along with it. The two clauses below are
    each complete; neither is a fragment of the other.

    THE MEMO'S NARRATIVE AND THE MEMO'S TEXT DO NOT DISAGREE HERE, AND THE BRIEF
    SAYS THEY DO. Recorded because the next reader will check. The brief states
    that "the memo contradicts itself: its narrative says the design removes
    Carry, while its own §8.2 replacement text retains Carry as method (b) with a
    merchant election", and that "the current body already matches the memo's
    replacement text verbatim". Neither is so in the memo extract this cluster
    was given (`.cluster-briefs/renewal-positions.json`, entry 082). The
    two-method Deduct/Carry text with the merchant election is `current_body` —
    v4's shipped §8.2 — and `memo_replacement` opens "No prior Remaining Balance
    is carried into the new Purchased Amount" and never mentions Carry again.
    The memo document itself is not vendored in this repository or in
    `lombard-contracts`, so the JSON extract is the only text available to check
    against, and it is consistent with its own rationale.

    HOW IT IS RESOLVED, GIVEN THAT. Carry is removed from LOMBARD'S DOCUMENT and
    kept in THE LIBRARY. The owner's instruction is to adopt the memo's design in
    the funder profile, and `renewalModel: 'payoff-only'` does that. Deleting the
    Carry clause outright would leave `renewalModel: 'carry'` as a value of
    `McaFacts` with nothing behind it, which is precisely what
    `equipment: 'deferred'` was and what
    `__tests__/equipment-is-a-merchant-election.test.ts` was written about. So it
    stays, redrafted rather than preserved, for a funder that answers the
    interview that way.
  */
  {
    slug: 'frpa.rollover-methods-8-2',
    version: 1,
    instrument: 'frpa',
    kind: 'clause',
    /*
      The payoff half of the pair. Selected for a funder that settles a prior
      balance out of the new Purchase Price and never folds it into the new
      Purchased Amount.
    */
    includeWhen: (facts) => facts.renewalModel === 'payoff-only',
    number: '8.2',
    section: 'renewal',
    sortKey: 20,
    heading: 'Settlement of a Prior Purchase',
    body: 'No Remaining Balance under a prior transaction is carried into the Purchased Amount stated in Section 1.3. That Purchased Amount is the Purchase Price multiplied by the Factor Rate, and nothing is added to it.\nMerchant may separately authorize a stated part of the Purchase Price to be applied to settle an identified prior transaction, whether it is owed to Buyer or to another person. Before Merchant accepts, Buyer shall state in writing the prior transaction identified, its settlement amount as at the Purchase Date, the amounts already credited to it, any unpaid charge included in that settlement amount, any rebate or discount applied, the part of the Purchase Price to be applied to it, and the cash Merchant will actually receive. Buyer shall make any further disclosure the law requires of a refinancing, and shall not count a payoff as cash delivered to Merchant.\nOn the Purchase Date the authorized settlement fully extinguishes the identified prior transaction. Where that transaction is owed to Buyer, Buyer shall stop every instruction it has given an Approved Processor under it, close its ledger, record the settlement once in the ledger of each transaction, confirm to Merchant that no claim or collection right under it remains, and file or authorize the release of every filing that records its interest under it.\nMerchant is bound only by the offer it accepted, as fully calculated. A change to the settlement amount, to the Purchase Price or to the cash Merchant will receive requires corrected disclosures, and Merchant’s renewed acceptance where the law requires it. No use of the word “renewal” waives a rebate the law requires or permits a charge the law does not.',
    source: { kind: 'attorney-drafted', author: null },
    status: 'draft',
    appliesInStates: [],
    examinedBy: [
      {
        review: 'REVIEW-01',
        findings: [
          'frontload-refactors-old-balance',
          'frpa-undefined-capitalised-terms',
          'lombard-multi-position-vs-no-stack',
          'purchased-amount-two-formulas',
        ],
      },
    ],
  },
  /*
    THE CARRY HALF, for a funder whose profile says `renewalModel: 'carry'`.
    Lombard's does not, as of 2026-09-10, so nothing in the corpus selects this
    today. It is drafted rather than preserved, and the redraft is what makes
    keeping it defensible.

    WHAT WAS WRONG, AND IT IS ONE THING. "The outstanding Remaining Balance is
    carried into the new Purchased Amount rather than paid off." v4 never said
    what happens to the OLD agreement. Nothing terminated it, nothing closed its
    ledger, nothing stopped its split instructions — so the same balance could be
    inside the new Purchased Amount and still collectible under the old
    agreement. That is the memo's objection in full: "Carry can leave the old
    agreement alive while its remaining balance is included in a second Purchased
    Amount." It is a double-collection risk, not a disclosure quibble.

    WHAT CHANGED. A paragraph that ends the prior agreement on the new Purchase
    Date under EITHER method — instructions stopped, ledger closed, filings
    released, confirmation to Merchant, and the carried balance collected only
    under the new agreement and only once. The election survives, and it is the
    protective part of v4's drafting: the two methods produce different Purchased
    Amounts, so pricing is fixed before signature and Merchant may require the
    method it prefers.

    THE SPINE'S ARITHMETIC, AND WHY IT IS SAFE NOW. `(Purchase Price × Factor
    Rate) + Remaining Balance` is REVIEW-01's `purchased-amount-two-formulas`,
    and it stays, because under this method it is what the Purchased Amount
    actually is. What makes it survivable is that §2.6 now defines the Remaining
    Balance as a purchase-only figure — never a fee, an equipment charge, a cost
    of enforcement or an amount owed under another agreement, and nothing charged
    after the Purchase Date increases it. v4 carried whatever had accumulated;
    this carries the unpaid part of a purchase and says so in the body.

    DEPARTURE FROM v4 — THE DISCLOSURE SENTENCE IS WIDENED. v4 disclosed only
    "the amount of the new financing used to pay unpaid finance charges", and
    only "on any state disclosure that requires it". Both halves are narrower
    than the memo's list for the payoff method, and there is no reason the carry
    method should disclose less than the payoff method of the same section.

    NUMBERS. None invented. The formula and "$0.00" are v4's; "Less: Prior
    Balance(s)" is Section 1.4's own label.
  */
  {
    slug: 'frpa.rollover-carry-method-8-2',
    version: 1,
    instrument: 'frpa',
    kind: 'clause',
    includeWhen: (facts) => facts.renewalModel === 'carry',
    number: '8.2',
    section: 'renewal',
    sortKey: 20,
    heading: 'Rollover Methods',
    body: 'If Merchant has an outstanding Remaining Balance with Buyer when a subsequent purchase is made, that balance is dealt with by whichever of the following methods Merchant elects. Under both methods the Remaining Balance is the figure Section 2.6 gives, and so includes no fee, no equipment charge, no cost of enforcement and no amount owed under any other agreement.\n(a) Deduct. The Remaining Balance is settled out of the Purchase Price and appears as “Less: Prior Balance(s)” in the itemization in Section 1.4. The new Purchased Amount is the Purchase Price multiplied by the Factor Rate. Merchant receives a reduced disbursement, because part of the Purchase Price has been applied to retire the existing obligation.\n(b) Carry. The Remaining Balance is carried into the new Purchased Amount instead of being settled out of the Purchase Price, so that the new Purchased Amount is (Purchase Price × Factor Rate) + Remaining Balance. It is carried at face value and no Factor Rate is applied to it. “Less: Prior Balance(s)” in Section 1.4 is $0.00 under this method, and Merchant receives the full Net Amount Funded.\nUnder either method the prior agreement is at an end on the new Purchase Date. Buyer shall stop every instruction it has given an Approved Processor under it, close its ledger, record the amount dealt with once in the ledger of each transaction, confirm to Merchant that no claim or collection right under the prior agreement remains, and file or authorize the release of every filing that records its interest under it. A balance carried under (b) is collected only under the new agreement and only once.\nBefore Merchant accepts, Buyer shall state in writing the prior transaction identified, its Remaining Balance as at the Purchase Date, the amounts already credited to it, any unpaid charge included in that balance, any rebate or discount applied, the Purchased Amount each method produces, and the cash Merchant will actually receive under each. Buyer shall make any further disclosure the law requires of a refinancing, and shall not count a settlement of a prior balance as cash delivered to Merchant.\nThe elected method is recorded in Section 1 and the Purchased Amount in Section 1.3 is calculated on it. Buyer may propose a method when presenting the offer; Merchant may require the other, in which case Buyer shall re-issue the offer priced on the method Merchant elects. Merchant is not bound by a method it has not elected.',
    source: { kind: 'attorney-drafted', author: null },
    status: 'draft',
    appliesInStates: [],
    examinedBy: [
      {
        review: 'REVIEW-01',
        findings: [
          'frontload-refactors-old-balance',
          'frpa-undefined-capitalised-terms',
          'lombard-multi-position-vs-no-stack',
          'purchased-amount-two-formulas',
        ],
      },
    ],
  },
  {
    slug: 'frpa.voluntary-prepayment-8-3',
    version: 1,
    instrument: 'frpa',
    kind: 'clause',
    includeWhen: null,
    number: '8.3',
    section: 'renewal',
    sortKey: 30,
    heading: 'Voluntary Prepayment',
    body: 'Merchant may, at any time and without penalty, deliver to Buyer any or all of the unpaid Purchased Amount before its full collection in the ordinary course. Voluntary prepayment shall not relieve Merchant of any obligation accrued prior to the prepayment date, but shall extinguish all future remittance obligations under this Agreement upon receipt of the full Purchased Amount.',
    source: { kind: 'attorney-drafted', author: null },
    status: 'draft',
    appliesInStates: [],
    examinedBy: [
      {
        review: 'REVIEW-01',
        findings: ['defined-term-drift', 'frpa-undefined-capitalised-terms', 'undefined-money-terms'],
      },
    ],
  },
];
