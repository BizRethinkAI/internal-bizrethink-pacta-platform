import type { McaClause } from '../types';

/**
 * Sections 7 and 8 — miscellaneous, renewal and rollover.
 *
 * Bodies are the words the shipped document prints.
 * `__tests__/frpa-coverage.test.ts` additionally asserts that NOTHING in the
 * document is missing from the library — the direction that fails silently.
 */
export const FRPA_MISCELLANEOUS: McaClause[] = [
  /*
    A CARVE-OUT THAT RESOLVES AND MEANS NOTHING.

    WHAT WAS WRONG. "Except as expressly provided in Sections 3.3, 3.4 and 4.15,
    no modification, amendment, waiver, or consent ... shall be effective unless
    the same shall be in writing and signed by both parties."

    The three exceptions were the places v4 let one party move a term without the
    other's signature: §3.3's deemed withdrawal of a reconciliation request,
    §3.4's unilateral adjustment of the Estimated Daily Holdback, and §4.15's
    automatic cascade of collections between concurrent positions. All three have
    been rewritten out of existence — §3.3 now says "a request that is incomplete
    remains open", §3.4's update "is informational" and "does not alter the
    Specified Percentage", and under `concurrentPositions: false` the cascade
    clause is not selected at all.

    So the sentence is worse than wrong: it is CORRECT AND EMPTY. Every number in
    it resolves, `select-clauses.test.ts` sees nothing, and a reader meets an
    exception to the signature rule and goes looking for the power it protects.
    The brief hands this over as *"the reference resolves and means nothing"*,
    and a resolving reference to nothing is the failure mode that check cannot
    catch by construction.

    WHAT CHANGED. The rule is stated over the terms that are priced, so a reader
    can tell an amendment from an administration. Reconciliation and correction
    are named as what they are — the performance of terms this Agreement already
    contains — rather than as exceptions to the signature rule. And a subsequent
    purchase is named as a separate agreement, because that is the other way a
    "modification" arrives: §8.1 and §7.13 both already say a further purchase is
    separately offered, disclosed and signed.

    THE GUARANTOR LIMB IS THE MEMO'S AND IS THE ONE WITH A PARTY IN IT. An
    amendment between Buyer and Merchant that enlarges what a Guarantor owes is
    an amendment binding somebody who is not at the table.

    NOT GATED, AND THE BRIEF ASKED FOR ONE. `action: both`, `fact: renewalModel`.
    Refused under ADR 0013's diagnostic — *"if two limbs bind different parties
    or answer different questions, the fact is wrong, not the granularity"* —
    and here it does not even get that far, because there are no two limbs. The
    question this clause answers is *what does it take to change a priced term*,
    and the answer is a signed writing under every renewal model. `renewalModel`
    decides how a PRIOR BALANCE is dealt with in a NEW agreement (§8.2); it
    decides nothing about amending this one. A gate would produce two clauses
    saying the same thing, or one clause absent for `renewalModel: 'none'`, which
    is a template with no amendment rule.

    DEPARTURE FROM THE MEMO — NO CITATION TO SECTION 8. The memo's design has a
    renewal be a new agreement, and saying so here is useful. It is said without
    naming §8.1 or §8.2, because both are gated on `renewalModel !== 'none'` and
    a citation would dangle in a no-renewal template. The fifth cluster in a row
    to hit that shape; the register in `select-clauses.test.ts` is where the
    ones that could not be avoided live.

    DEPARTURE — "PURCHASED-RECEIPTS BASE" BECOMES THE DEFINED TERM. The memo
    writes "purchased-receipts base"; `frpa.definitions` calls it Card Receipts
    and says so once. A second name for the settlement base is the defect
    `one-settlement-base.test.ts` exists to prevent.
  */
  {
    slug: 'frpa.modifications-amendments-7-1',
    version: 1,
    instrument: 'frpa',
    kind: 'clause',
    includeWhen: null,
    section: 'miscellaneous',
    sortKey: 10,
    heading: 'Modifications; Amendments',
    body: 'A change to the Purchase Price, the Purchased Amount, the Specified Percentage, the Card Receipts on which the Specified Percentage is taken, a fee, or any other substantive term of this Agreement requires a written amendment signed by Merchant and Buyer, together with any disclosure or renewed acceptance applicable law then requires. An amendment that enlarges a Guarantor’s obligation also requires that Guarantor’s own signed consent, and no amendment binds a person who has not signed it.\nA reconciliation, a correction of an amount collected in error, and an updated Estimated Daily Holdback perform terms this Agreement already contains. They are not amendments. Section [[section:reconciliation]] states what each of them does, and none of them changes the Specified Percentage, the Purchased Amount or any other priced term. Updating an informational estimate changes no obligation of either party.\nA subsequent purchase is a separate agreement, separately offered, disclosed, signed and funded. It is not an amendment of this one. This Agreement is not amended by a processor’s form, by an application, by a document an independent sales organization supplies, or by a course of dealing.',
    source: { kind: 'attorney-drafted', author: null },
    status: 'draft',
    appliesInStates: [],
    examinedBy: [{ review: 'REVIEW-02', findings: ['frpa-7-1-has-no-except-as-expressly-provided-carve-out'] }],
  },
  /*
    THE ECONOMICS ARE SALEABLE. THE MERCHANT'S RIGHTS ARE NOT SEVERABLE FROM
    THEM.

    WHAT WAS WRONG. "Buyer may assign, transfer, or sell its rights to receive
    the Purchased Amount OR DELEGATE ITS DUTIES hereunder, either in whole or in
    part. Merchant may not assign this Agreement without Buyer's prior written
    consent, which consent may be withheld in Buyer's SOLE DISCRETION."

    `frpa-7-2-permits-delegation-of-the-reconciliation-duty` is the finding, and
    the word that carries it is "delegate". Section 3 is the merchant's only
    protection against over-collection, and it is a set of duties owed by Buyer:
    acknowledge within one Workday, reconcile monthly whether or not asked,
    refund within five Workdays, give a written calculation and a named person
    who will review it. A clause permitting Buyer to hand those to somebody else
    — with no requirement that the somebody else be capable of them, and no
    statement that Buyer stays answerable — makes the whole of §3 assignable to a
    party the merchant never chose.

    The asymmetry in the second sentence is the same defect facing the other way.
    A merchant selling its business cannot novate, at the absolute discretion of
    a counterparty with no stated criteria, while §5.18 contemplates exactly that
    sale and requires notice of it.

    WHAT CHANGED. Buyer may sell the interest; the assignee takes it subject to
    this Agreement, to Merchant's defences and to the reconciliation, correction
    and refund rights, and no transfer raises an amount or a percentage. Notice
    identifying the assignee, the effective date, the servicing contact and any
    changed payment instruction — before where practicable, promptly after
    otherwise — and Merchant may keep dealing with Buyer until it has that
    notice. Delegation is permitted and does NOT discharge: a novation needs
    Merchant's express written agreement naming the substitute. A partial
    assignment uses one servicing interface, and the §2.3 aggregate cap keeps
    running across every holder. Merchant's own transfer moves from sole
    discretion to consent not unreasonably withheld.

    DEPARTURE 1 — THE AGGREGATE CAP IS CARRIED ACROSS HOLDERS. The memo says a
    partial assignment "may not multiply Merchant's costs". The worse
    multiplication is of the CAP: two holders each collecting to the Purchased
    Amount is the §2.3 defect reached by a different route, and §2.3's cap is
    written across processors rather than across assignees. Stated here so the
    two are one cap.

    DEPARTURE 2 — "MERCHANT MAY CONTINUE TO DEAL WITH BUYER UNTIL IT RECEIVES
    THAT NOTICE." Not in the memo. Without it, "prompt notice after the
    transfer" leaves a merchant who paid or reconciled with the assignor in the
    interval exposed on a transaction it had no way to know about.

    DEPARTURE 3 — NO CITATION TO SECTION 9. The memo does not make one; neither
    does this. §9.2 is gated on `guarantyScope` and already carries six dangling
    citations in a no-guaranty template.

    UNVERIFIED. Whether an assignee of an interest in accounts takes subject to
    the account debtor's defences, and on what conditions, is governed by UCC
    §9-404 and the mandatory rules of Article 9 as enacted. Nobody on this
    project has read either. The clause states the position as a contract term
    between the parties, which does not depend on the answer.
  */
  {
    slug: 'frpa.assignment-7-2',
    version: 1,
    instrument: 'frpa',
    kind: 'clause',
    includeWhen: null,
    section: 'miscellaneous',
    sortKey: 20,
    heading: 'Assignment',
    body: 'Buyer may assign or transfer its interest in the Purchased Receipts to a person lawfully entitled to hold it. The assignee takes subject to this Agreement, to Merchant’s defenses and claims, to Merchant’s reconciliation, correction and refund rights under Section [[section:reconciliation]], and to applicable law. No transfer increases an amount or a percentage payable by Merchant, adds an obligation, or interrupts servicing.\nBuyer shall give Merchant notice before a transfer where that is practicable, and otherwise promptly after it, identifying the assignee, the effective date, the servicing contact, and any changed payment instruction. Merchant may continue to deal with Buyer until it receives that notice, and is not in breach for having done so.\nBuyer may delegate a duty under this Agreement, and delegation does not discharge Buyer. Buyer remains responsible for its own prior acts and for the performance of every duty it delegates, unless Merchant expressly agrees in writing to a novation that names the substitute and releases Buyer.\nWhere the interest is assigned in part, Buyer and each assignee shall give Merchant a single servicing and collection interface. A partial assignment shall not multiply Merchant’s costs, its points of contact, or the number of persons entitled to collect, and the aggregate cap in Section [[clause:frpa.primary-collection-split-funding-via-approved-processor-2-3]] continues to apply once across every holder.\nMerchant may assign this Agreement in connection with a transfer of its business of the kind described in Section [[clause:frpa.change-of-name-or-location-or-sale-or-closing-of-business-5-18]], with Buyer’s consent, which Buyer shall not unreasonably withhold, condition or delay.',
    source: { kind: 'attorney-drafted', author: null },
    status: 'draft',
    appliesInStates: [],
    examinedBy: [{ review: 'REVIEW-02', findings: ['frpa-7-2-permits-delegation-of-the-reconciliation-duty'] }],
  },
  /*
    THE CLAUSE THAT SWITCHED OTHER CLAUSES OFF.

    WHAT WAS WRONG. "All notices, requests, consents, demands, and other
    communications hereunder shall be delivered by certified mail, return receipt
    requested ... and shall become effective ONLY UPON RECEIPT."

    Three defects in one sentence, and none of them is visible while the sentence
    is read on its own.

    (1) ONE MANDATORY METHOD. Certified mail is not an option, it is the whole
        list. An email a servicer actually reads is not a notice.
    (2) EFFECT WITHHELD UNTIL DELIVERY. The sender does the sending; the postal
        service decides when the sender has performed.
    (3) "ALL ... COMMUNICATIONS HEREUNDER" reaches every request under Section 3,
        every consent, every revocation and — because nothing excluded it —
        judicial process.

    WHAT THAT COST, WHICH IS FOUR CLAUSES AND COUNTING. `reconciliation-right-
    conditioned-into-near-nullity` (REVIEW-01) is §3's timetable running on a
    letter. `frpa-6-4-24-hour-notice-cannot-be-given-under-7-3` (REVIEW-02) is a
    notice due within a day. §4.14's three-CALENDAR-day cancellation right was
    found by `fees-and-money` and by no review. §7.18's "revoke by any reasonable
    means" against "send it to the address in Section 7.3" was found by
    `data-and-channel`. Four agents, four local fixes, four "notwithstanding
    Section 7.3" carve-outs, and nobody counted.

    THE SWEEP, AND WHY IT IS A TEST RATHER THAN A LIST. `__tests__/a-notice-can-
    arrive-in-time.test.ts` runs the question over the whole corpus: which
    clauses put a communication on a clock, and does the Agreement supply a
    channel that clock can travel on. Under v4's §7.3 the answer names twelve
    clauses and at least four of them are real defects nobody had found —
    **§2.4, §4.13, §5.18 and §8.3**:

      - §2.4 lets Merchant replace an Approved Processor "on notice to Buyer" and
        requires notice "promptly after learning of an unplanned interruption".
        A right exercisable only when a letter lands is not exercisable during
        the interruption it exists for, and §7.16 meanwhile obliges Merchant to
        remit within three Workdays. Same shape as §4.14 exactly.
      - §4.13 lets Merchant terminate for a missed funding date "by notice". In
        transit, Buyer can fund late and defeat it.
      - §5.18 requires "reasonable advance notice" of a change of name, processor
        or location. §6.4 carves out its own sale notice; §5.18's does not.
      - §8.3 has Buyer "promptly" give a settlement quotation carrying "the date
        through which the quotation holds good". Requested and answered by
        certified mail, a quotation can expire in transit — in a clause that
        also says Buyer "shall not require a period of notice".

    A FIFTH CARVE-OUT WOULD HAVE BEEN THE WRONG FIX, and that is the finding.
    Every one of these was written by an agent who read the clause carefully and
    did not read §7.3 at the same time. The defect is not in any of them; it is
    in the channel, so the channel is what changed.

    WHAT CHANGED. Four things. Scope is limited to the administration of this
    Agreement and judicial process is sent to §7.12 and Section 10 expressly.
    Four channels, none mandatory. **Effective when sent**, with the email
    exception that matters — the sender who is told it bounced has not given
    notice and must send it again. And a precedence rule: where another provision
    measures from receipt or states its own method, that provision governs.

    "EFFECTIVE WHEN SENT" RATHER THAN THE MEMO'S DEEMED-RECEIPT RULE — DEPARTURE
    1, AND THE ONE THAT MATTERS. The memo writes "effective on actual receipt; an
    email is deemed received on the next Workday after transmission". That is the
    conventional drafting and it is nearly good enough. It is not good enough for
    §4.14, whose deadline is the third CALENDAR day: a merchant emailing on day
    three has, under the memo's rule, given notice on day four. The three
    existing carve-outs all chose "effective when sent" for exactly this reason
    and they were right. A rule that disagrees with the four clauses written
    against it is the rule that is wrong.

    WHAT HAPPENS TO THE FOUR CARVE-OUTS. They become REDUNDANT AND STAY TRUE, and
    the brief is explicit that they are not to be deleted. §3.2, §4.14, §6.4 and
    §7.18 each say "notwithstanding Section 7.3" and then supply a channel this
    Section now supplies anyway. Two reasons they stay. Their authors wrote
    clauses that work whatever §7.3 says, and that independence is worth more
    than the tidiness of removing it. And §7.18's is not in fact redundant: it
    adds "by any reasonable means, including by replying STOP", which is wider
    than the four methods here, and it makes a revocation effective on RECEIPT,
    which the precedence rule in this Section preserves. `a-notice-can-arrive-in-
    time.test.ts` asserts all four still carve out, so a later reader cannot
    quietly re-couple them.

    DEPARTURE 2 — §6.1'S CURE PERIOD IS PROTECTED RATHER THAN OVERRIDDEN. §6.1
    runs ten Workdays from when Merchant RECEIVES the default notice, which is
    more favourable to Merchant than "when sent" and is deliberate. The
    precedence sentence is what keeps it, and it is not in the memo.

    DEPARTURE 3 — THE DEFAULT NOTICE GOES BY TWO ROUTES. The memo's, kept: the
    one notice whose consequence is the loss of the business is the one that
    should not depend on a single channel. It points at §6.1 for content rather
    than restating the identification requirement.

    NOT FIXED HERE, AND HANDED OVER. §7.5's last sentence makes a certified
    letter into "valid and lawful service of process", which is this clause's
    defect seen from the other end, in the governing-law clause where nobody
    looks for a service rule. §7.5 is `disputes-service`'s (memo 061). Conceded,
    with an owner, in `a-notice-can-arrive-in-time.test.ts`.
  */
  {
    slug: 'frpa.notices-7-3',
    version: 1,
    instrument: 'frpa',
    kind: 'clause',
    includeWhen: null,
    section: 'miscellaneous',
    sortKey: 30,
    heading: 'Notices',
    body: 'This Section governs a notice, a request, a consent and any other communication between the parties about the administration of this Agreement. It does not govern service of process or any other judicial process, which Section [[clause:frpa.service-of-process-7-12]] and Section [[section:service]] govern. Nothing in this Section substitutes for valid service of process or is evidence that service has been made.\nThe postal address and the email address of each party are stated in the Merchant and Funding Information grid. Buyer shall maintain a working servicing email address and either a servicing portal or a servicing telephone number, and shall tell Merchant promptly when either changes. A party may change its own contact details by a communication given under this Section.\nA communication under this Section may be given by email to the address stated in the Merchant and Funding Information grid, by a submission through a servicing portal Buyer makes available which that portal acknowledges, by a recognized overnight carrier, or by certified mail, return receipt requested. It is effective when it is sent. An email is not effective if the sender receives a delivery-failure message or otherwise knows it did not arrive, and the sender shall then send it again by another method stated in this Section. Neither party may require a communication under this Agreement to be given by certified mail, or by any one method, as a condition of its effect; and a communication the other party actually received is not ineffective because of the method used to send it.\nWhere another provision of this Agreement measures a period from receipt, states its own method, or makes a communication effective on a different event, that provision governs. A request under Section [[section:reconciliation]] and a revocation under Section [[clause:frpa.communications-recording-and-premises-access-7-18]] may be made by the methods those Sections state.\nA notice asserting an Event of Default shall identify the conduct and the facts Buyer relies on and shall state the cure Buyer requires, as Section [[clause:frpa.events-of-default-6-1]] provides, and shall be sent both by email and by one other method stated in this Section.',
    source: { kind: 'attorney-drafted', author: null },
    status: 'draft',
    appliesInStates: [],
    examinedBy: [
      { review: 'REVIEW-01', findings: ['reconciliation-right-conditioned-into-near-nullity'] },
      { review: 'REVIEW-02', findings: ['frpa-6-4-24-hour-notice-cannot-be-given-under-7-3'] },
    ],
  },
  /*
    A ROUTINE NONWAIVER CLAUSE WITH ONE SENTENCE THAT REOPENS SECTION 6.

    WHAT WAS WRONG. Two things, and the memo rates the clause Low because
    neither is dramatic. It ran one way — "No failure ON THE PART OF BUYER" —
    so a merchant's forbearance was a waiver and Buyer's was not. And it ended
    "The remedies provided hereunder are CUMULATIVE AND NOT EXCLUSIVE of any
    remedies provided by law or equity."

    That second sentence is the one worth the rewrite. `default-remedies` spent
    a clause closing §6.2 to a stated list, and §4.12 says in terms that nothing
    "makes Buyer's remedies cumulative of any remedy Section 6.2 does not give".
    A cumulative-remedies sentence in the miscellaneous section reopens all of
    it, and it is the shape a court reads as the parties having agreed to it.

    WHAT CHANGED. Reciprocal. A waiver has to be signed and waives only what it
    says. Remedies stay inside Section 6, with the no-double-recovery rule
    stated rather than implied.

    DEPARTURE FROM THE MEMO — NO "SECTIONS 6 AND 9". The memo writes "subject to
    Sections 6 and 9". §9.2 is gated on `guarantyScope`, and under
    `guarantyScope: 'none'` the whole of Section 9 is absent — a citation of
    "Section 9" is already in `select-clauses.test.ts`'s register from four other
    clauses and this one does not add a fifth. The limit is stated by naming the
    Guaranty rather than its section number, which is true whether or not there
    is one.
  */
  {
    slug: 'frpa.waiver-of-remedies-7-4',
    version: 1,
    instrument: 'frpa',
    kind: 'clause',
    includeWhen: null,
    section: 'miscellaneous',
    sortKey: 40,
    heading: 'Waiver of Remedies',
    body: 'A party’s delay in exercising a right under this Agreement, or its failure to exercise one, is not a waiver of that right, and a single or partial exercise does not prevent a further lawful exercise of that right or the exercise of another. A waiver is effective only if it is in writing and signed by the party giving it, and it waives only what it says.\nEvery remedy under this Agreement remains subject to Section [[section:default]] and to applicable law. No remedy is cumulative of one that Section [[clause:frpa.remedies-6-2]] does not give, as Section [[clause:frpa.remedies-4-12]] states, and no loss may be recovered twice. A claim against a Guarantor is limited by the Guaranty and is not enlarged by this Section.',
    source: { kind: 'attorney-drafted', author: null },
    status: 'draft',
    appliesInStates: [],
    examinedBy: [{ review: 'REVIEW-02', findings: [] }],
  },
  /*
    ONE CLAUSE THAT CHOSE A STATE, A FORUM, AN ASSIGNMENT RULE AND A METHOD OF
    SERVICE — AND WAS WRONG ON ALL FOUR.

    WHAT WAS WRONG. Four separate defects sharing a paragraph.

    (1) NEW YORK LAW FOR A FLORIDA BUYER FUNDING OUT-OF-STATE MERCHANTS.
        `ny-law-below-gol-5-1401-threshold`. The memo and REVIEW-01 agree that
        the choice is not automatically bad below New York's safe-harbour
        threshold — the ordinary relationship and conflicts analysis simply
        continues to apply, and on a small advance to an out-of-state merchant
        from a Florida buyer there may be nothing to relate the deal to New
        York. The memo's own point, which the brief tells this cluster not to
        conflate: GOL §5-1401 (choice of LAW) and §5-1402 (choice of FORUM) have
        DIFFERENT thresholds, $250,000 and $1,000,000. UNVERIFIED — neither
        section is vendored, and REVIEW-01 records its own quotation as
        "statutory text from memory; counsel to verify".

    (2) A FORUM BUYER ALONE PICKED, FROM TWO. "shall, IF BUYER SO ELECTS, be
        instituted in any court sitting in New York State or in Pasco County,
        Florida (the 'Acceptable Forums')". That election is the second half of
        `counterclaim-waiver-flips-by-forum`: New York makes every counterclaim
        permissive and Florida makes a transaction-related one compulsory, so
        the SAME §7.20 was an absolute bar in one Acceptable Forum and a nullity
        in the other, and the party choosing between them was the plaintiff.

    (3) AN ASSIGNMENT RULE THAT ALREADY CONTRADICTED §7.2, AND NO BRIEF NAMED
        IT. This clause said Merchant may not assign without consent "which
        consent may be withheld in Buyer's SOLE DISCRETION". §7.2 as rewritten
        moved that to consent "not unreasonably withheld". Two rules over one
        subject, live in the corpus since wave 2 — the §10.1/§10.2 failure shape
        exactly. The rule is now stated once, in §7.2, and this Section points
        at it.

    (4) A SERVICE RULE IN THE GOVERNING-LAW CLAUSE. "mailing by certified or
        registered mail ... will constitute valid and lawful service of process
        against them, without the necessity for service by any other means."
        `a-notice-can-arrive-in-time.test.ts` conceded this sentence to this
        cluster by name; the concession is deleted in the same change, which is
        what that register exists to force.

    WHAT CHANGED. Binding effect and successors stay and the assignment rule
    goes to §7.2. The governing law and the forum both become the state of
    Merchant's principal place of business. Article 9's mandatory perfection and
    priority rules are stated to govern themselves, because a choice-of-law
    sentence cannot displace them. Judicial process goes to §10.1. And the
    Section says in terms that it is not a waiver of service, of a jurisdictional
    objection or of a mandatory rule about where an action must be brought.

    WHY MERCHANT-STATE IS NOT MERELY "THE CONSERVATIVE NATIONAL ANSWER".
    VERIFIED, from `mca/sources/VA-Code-6.2-2228-2238.txt`. Va. Code
    §6.2-2234(A), "Place for bringing action": *"any cause of action arising
    under such contract or agreement shall be brought in a court in the
    Commonwealth. Any provision in the contract or agreement mandating that such
    action be brought outside the Commonwealth shall be unenforceable."* And
    §6.2-2228 defines "Recipient" as *"a person whose principal place of
    business is in the Commonwealth"*. So for every transaction Virginia covers,
    the merchant's state IS Virginia, and a merchant-state rule satisfies
    §6.2-2234(A) BY CONSTRUCTION rather than by a rider. That is why §7.24's
    Virginia paragraph stops being an override and becomes a restatement.

    THE MEMO'S VIRGINIA CITATION IS WRONG AND THIS CLUSTER DOES NOT REPEAT IT.
    The memo cites §6.2-2236(A). §6.2-2236 is "Validity of noncompliant
    sales-based financing", has no subsection (A), and says nothing about forum.
    `facts.ts` had copied the error three times and is corrected; the correct
    citation is §6.2-2234(A) and it appears only here, in a comment.

    DEPARTURE 1 — THE VIRGINIA SENTENCE IS NOT REPEATED IN THIS CLAUSE. The
    memo's replacement writes "For a transaction subject to Virginia Code
    Section 6.2-2234, any action shall be brought in the Commonwealth of
    Virginia." §7.24 already says that, in the rider clause where a state rule
    belongs. Writing it here as well would be the two-rules-over-one-subject
    defect this very clause was carrying at (3). This Section states the general
    rule and yields to §7.24; §7.24 keeps the precedence claim it made
    deliberately, and now nothing contradicts it.

    DEPARTURE 2 — THE STATUTORY CITATION IS NOT IN THE BODY. House rule, and the
    same call §7.24 made about Tex. Fin. Code §398.055: a citation in a
    merchant-facing sentence is a statement about the law rather than about the
    paper. The rule is written as a rule; the authority is here.

    THE GATE WAS REFUSED, AND `venueRule` IS FLIPPED ANYWAY. The brief marks
    this `both` on `venueRule`. Refused, on three grounds, in the order ADR 0013
    asks them.

      - **The fact decides a limb, not the clause.** This Section answers three
        questions — who is bound and may transfer, which substantive law
        governs, and where an action is brought. `venueRule` answers the third.
        Gating the whole record on it would take the binding-effect and
        governing-law rules away from a `funder-state` template as well.
      - **The exhaustive-pair shape fails on its own stated criterion.** ADR
        0013: §4.15's and §8.2's pairs are *"opposite rules that share a section
        number and almost no words"*. A funder-state §7.5 and a merchant-state
        §7.5 would share every word but two sentences. That is a VARIABLE, not
        two rules — and `McaClause` deliberately has no `variables` field.
      - **The funder-state arm cannot be drafted at all.** `McaFacts` has no
        field naming the funder's state. `venueRule` asks "whose courts" without
        supplying whose. `facts.ts` states the standard for that case: *"a clause
        that needs to know something not on this list is a signal that the answer
        schema is missing a field."*

    So `includeWhen` stays `null`, and the row moves with the clause as ADR 0013
    requires — `LOMBARD_FACTS.venueRule` is now `merchant-state`, which is what
    this body says. The row remains INERT: nothing reads it. Closing that
    properly needs either a `funderState` field plus a variables mechanism, or
    the row deleted — an owner decision, reported as a gap. What is no longer
    true is `renewal-positions`' reason for refusing the flip: the profile and
    the only clause on the subject now agree.
  */
  {
    slug: 'frpa.binding-effect-governing-law-venue-and-jurisdiction-7-5',
    version: 1,
    instrument: 'frpa',
    kind: 'clause',
    includeWhen: null,
    section: 'miscellaneous',
    sortKey: 50,
    heading: 'Binding Effect; Governing Law, Venue, and Jurisdiction',
    body: 'This Agreement binds the parties and their permitted successors and assigns, and is for their benefit. Section [[clause:frpa.assignment-7-2]] states when an interest under this Agreement may be transferred, by whom, and on what terms, and nothing in this Section permits a transfer that Section does not.\nSubject to mandatory federal law and to applicable conflict-of-laws rules, the substantive law of the state of Merchant’s principal place of business stated in the Merchant and Funding Information grid governs this Agreement. An action arising under this Agreement shall be brought in a state court of competent jurisdiction in that state, or in a federal court of competent jurisdiction sitting in that state. Neither party may require the other to bring or defend such an action anywhere else, and nothing in this Section selects a court that lacks subject-matter jurisdiction. Section [[clause:frpa.state-law-riders-7-24]] states the forum rule that applies where the law of a particular state fixes one, and this Section yields to it.\nPerfection, the effect of perfection or non-perfection, and the priority of a security interest are governed by the mandatory rules of the Uniform Commercial Code that apply to them. This Section does not vary those rules and does not choose the law that decides them.\nService of a summons, a complaint or other judicial process is governed by Section [[clause:frpa.section-10-1]]. Nothing in this Section makes a mailing, an email or any other communication into service of process. This Section is not a waiver of valid service, of a jurisdictional objection, of a mandatory rule about where an action must be brought, or of any protection applicable law does not permit to be given up.',
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
  /*
    A SURVIVAL CLAUSE THAT DESCRIBED COMPLETION, IN A DOCUMENT WHERE COMPLETION
    IS DEFINED ONCE.

    WHAT WAS WRONG. "All representations, warranties, and covenants herein shall
    survive ... and shall continue in full force until the Completion Threshold
    is attained AND ALL AMOUNTS THEN DUE HAVE BEEN PAID."

    `frpa-7-6-and-4-2-contradict-the-2-6-completion-test`. §2.6 says the
    Completion Threshold "is the only test of completion, and it governs wherever
    another provision of this Agreement describes completion differently". The
    words after "and" describe a different one. Under v4 they described a
    materially different one, because v4's Remaining Balance was "the Purchased
    Amount PLUS ANY FEES CHARGED under Section 4.1 and Appendix A": an unpaid fee
    kept every covenant, every authorization and every collection power alive
    after the purchase had been delivered in full. `fees-and-money` closed that
    route at §4.1 and Appendix A; this is the third door.

    The first half was wrong in the other direction. "All representations ...
    shall survive ... and shall continue in full force" turns a statement about
    the facts at the Purchase Date into a promise about the facts every day
    afterwards — the defect `representations-are-present-fact` exists for, and
    the §5 lead-in now says a present-fact statement is not a continuing covenant
    unless it says so.

    WHAT CHANGED. Representations speak as the §5 lead-in says and no longer.
    Completion ends the collection authority and does not extinguish an accrued
    claim, which runs for whatever limitation period applicable law gives it. The
    duties that must outlive the deal to work at all are named — reconciliation
    and refund, the final ledger, the lien releases, confidentiality and data
    protection, and dispute resolution — and nothing else survives.

    DEPARTURE 1 — THE SURVIVING LIST IS NAMED WITH SECTION NUMBERS. The memo
    lists the duties in prose. Named here, because "lawful confidentiality and
    data-protection duties" is the kind of phrase that is argued about, and §4.7
    and §4.8 are the clauses that actually contain them.

    DEPARTURE 2 — "DISPUTE-RESOLUTION PROVISIONS" IS WRITTEN WITHOUT A CITATION.
    Which clauses those are is `disputeResolution`'s answer, not this clause's:
    §§7.10, 7.11 and 7.20 are gated on `courts` and §7.26 on `arbitration`, so a
    citation would dangle in one template or the other. Described by subject
    instead. (§7.19 left that group on 2026-09-11 and is now ungated, which does
    not change this reasoning for the other four.)

    DEPARTURE 3 — CANCELLATION AND TERMINATION ARE ADDED TO "COMPLETION". §2.2
    and §4.14 both end this Agreement without the Remaining Balance reaching
    zero, and a survival clause that only contemplates completion says nothing
    about the case where a merchant cancelled on day three.
  */
  {
    slug: 'frpa.survival-of-representations-7-6',
    version: 1,
    instrument: 'frpa',
    kind: 'clause',
    includeWhen: null,
    section: 'miscellaneous',
    sortKey: 60,
    heading: 'Survival of Representations',
    body: 'A representation in this Agreement speaks as the lead-in to Section [[section:representations]] provides and no further. Completion does not turn a statement about the facts as they stood on a stated date into a continuing warranty about the facts afterwards.\nThe Completion Threshold in Section [[clause:frpa.completion-threshold-2-6]] ends Buyer’s right to receive Purchased Receipts and ends every authorization given to collect them. It does not extinguish an accrued claim of either party, which remains enforceable for the limitation period applicable law gives it.\nThe following survive completion, cancellation or other lawful termination, and only so far as is necessary to give them effect: reconciliation, correction and refund under Section [[section:reconciliation]] and Section [[clause:frpa.completion-threshold-2-6]]; the final ledger and the release of every filing that records Buyer’s interest; the confidentiality duties in Section [[clause:frpa.confidentiality-4-8]] and the information-protection duties in Section [[clause:frpa.protection-of-information-4-7]]; and the provisions of this Agreement governing how a dispute between the parties is resolved.\nNo survival provision enlarges an obligation, revives a collection right, creates recourse against Merchant for Card Receipts that were never generated, or enlarges the Guaranty.',
    source: { kind: 'attorney-drafted', author: null },
    status: 'draft',
    appliesInStates: [],
    examinedBy: [{ review: 'REVIEW-02', findings: ['frpa-7-6-and-4-2-contradict-the-2-6-completion-test'] }],
  },
  /*
    TWO STATUTES, THE SAME DEFECT, AND OPPOSITE CONSEQUENCES. THAT IS THE WHOLE
    OF THIS CLAUSE.

    WHAT WAS WRONG. "the validity, legality, and enforceability of any other
    provision contained herein SHALL NOT IN ANY WAY BE AFFECTED OR IMPAIRED."
    Unconditional. A promise this Agreement is not in a position to make.

    THE THREE STATUTES, ALL VENDORED, ALL READ. They are written as rules about
    what a contract may CONTAIN, and two of the three take the provision while
    the third takes the contract:

      - **Va. Code §6.2-2234(C)** (`VA-Code-6.2-2228-2238.txt`): *"No sales-based
        financing contract shall contain any confession by judgment provision or
        any similar provision. Any such provision in the contract shall be
        unenforceable."* — the PROVISION.
      - **Conn. Gen. Stat. §36a-868** (`CT-CGS-36a-861-872.txt`): *"No commercial
        financing contract ... shall contain any provision waiving a recipient's
        right to notice, judicial hearing or prior court order ... Any such
        provision ... shall be unenforceable."* — the PROVISION.
      - **Tex. Fin. Code §398.055** (`TX-Fin-Code-Ch-398.txt`): *"A commercial
        sales-based financing contract that CONTAINS a confession of judgment
        provision or any similar provision is void and unenforceable."* — the
        CONTRACT.

    VERIFIED, each quoted from the vendored file. The same defect that costs one
    clause in Virginia and Connecticut costs the whole agreement in Texas, and no
    severability language can reach across that: a savings clause is a term of
    the contract the statute has already voided. §7.24 gets this right and says
    so — *"a provision the law forbids this Agreement to contain is one that
    must not be written into it, not one to be severed under Section 7.7
    afterwards"* — and this Section is the other end of that sentence.

    WHAT CHANGED. Severance is available only so far as applicable law permits
    and only where it does not defeat the essential lawful bargain. Savings
    language is expressly denied the power to preserve a contract the law makes
    void in whole. No provision may be read down so as to permit a prohibited
    charge, waiver or collection practice — which is the other way a savings
    clause is used, to keep an over-wide term alive at its maximum lawful width.
    And the operative duty is stated where it belongs: leave the provision out
    of the form.

    DEPARTURE FROM THE MEMO — THE MEMO'S LAST SENTENCE IS POINTED AT §7.24
    RATHER THAN REPEATED. The memo writes "Buyer shall omit prohibited terms
    from the form before presenting it for signature." §7.24's first paragraph
    already imposes that duty, with the determination of which law applies in
    front of it. Both are kept, because this is the clause a reader reaches for
    when a term has already gone wrong, but this one names §7.24 instead of
    restating the whole duty.

    NOT ARGUED IN THE BODY, AND IT IS THE REASON THIS IS RATED A BLOCKER. Nothing
    in a clause can make a Texas transaction safe. The rider mechanism is what
    keeps the prohibited term out of a Texas form in the first place, and
    `frpa.texas-occc-notice-7-25` is the worked example of the shape. Whether a
    Lombard transaction into Texas is commercial sales-based financing under
    Chapter 398 at all is a question for counsel and the business, and §7.25's
    note records it.
  */
  {
    slug: 'frpa.severability-7-7',
    version: 1,
    instrument: 'frpa',
    kind: 'clause',
    includeWhen: null,
    section: 'miscellaneous',
    sortKey: 70,
    heading: 'Severability',
    body: 'A provision of this Agreement that is held invalid or unenforceable may be severed only so far as applicable law permits, and only where severing it does not defeat the essential lawful bargain between the parties. Where it is severed, the remainder continues in effect. This Section states no wider rule than that.\nNo severability or savings language in this Agreement preserves this Agreement where applicable law makes the entire contract void. No provision of this Agreement is to be rewritten, narrowed or read down so as to permit a charge, a waiver or a collection practice that applicable law prohibits, and a provision so read down is severed instead.\nA provision applicable law forbids this Agreement to contain is a provision to be left out of the form before it is presented for signature, and not one to be cured afterwards. Section [[clause:frpa.state-law-riders-7-24]] states that duty, states that this Section cures no prohibited term, and states which law Buyer must determine before making a specific offer.',
    source: { kind: 'attorney-drafted', author: null },
    status: 'draft',
    appliesInStates: [],
    examinedBy: [{ review: 'REVIEW-01', findings: ['frpa-severability-text-under-entire-agreement'] }],
  },
  /*
    ELEVEN WORDS OF MERGER OVER A SUITE OF SIX DOCUMENTS.

    THE BRIEF'S PREMISE IS FALSE AND THE TRUE VERSION IS DIFFERENT, NOT SMALLER.
    The brief says *"§7.8's merger clause currently incorporates five unseen
    instruments"*. It incorporates none: v4's §7.8 is "This Agreement embodies
    the entire agreement between Merchant and Buyer and supersedes all prior
    agreements and understandings relating to the subject matter hereof", and
    that is the whole of it. The phrase "attached and incorporated by reference"
    appears exactly twice in `Lombard_FRPA_v4.txt`, both times in an EXHIBIT —
    Exhibit A and Exhibit C — never in §7.8.

    So the defect is the opposite shape. The FRPA refers to documents it does not
    incorporate, incorporates two it does not attach, and states no hierarchy
    anywhere, while the merger clause asserts that this one document is all of
    it. Read literally, §7.8 says the Split Funding Authorization the money
    actually moves through is not part of the deal.

    AND THE SUITE IS LARGER THAN ANY REVIEW SAW. `instrumentsFor(LOMBARD_FACTS)`
    now returns six instruments. The Equipment Lease and the Subscription entered
    this product in THIS branch — the assertion in `select-clauses.test.ts` used
    to say the opposite, on the reasoning that "v4 defers equipment into the
    Purchased Amount rather than leasing it" — so neither review, and neither
    counsel memo, read them as part of Lombard's package. They are unreviewed in
    that role.

    WHAT CHANGED. The package is listed and closed: the completed Section 1,
    these terms, Appendix A, each exhibit actually delivered before signature,
    the Guaranty if one is signed, and any state rider delivered before
    acceptance. A precedence order, because six documents drafted separately WILL
    conflict and the merchant should not have to argue about which wins. A
    firewall sentence for the separate agreements. And the two things a merger
    clause must not be allowed to do: erase a required disclosure, or exclude
    liability for what was said to get the signature.

    THE PRECEDENCE ORDER IS THE MEMO'S, WITH ITS MIDDLE TIER MADE CONCRETE. The
    memo says "the nonrecourse, collection-cap, reconciliation, and guaranty
    limits control inconsistent ancillary authorizations". Written as the
    provisions doing that work, because "the nonrecourse limits" is not a term
    this Agreement defines and the sentence has to be applied by a servicer.

    DEPARTURE 1 — THE SPLIT FUNDING AUTHORIZATION IS NAMED AS AN ANCILLARY
    INSTRUCTION, AT THE BOTTOM. Not in the memo, and it is the whole point of
    having an order: the vendored Payzli letter presently says withholding runs
    past the Purchased Amount "because Seller's obligations under the Purchase
    Agreement may include fees in addition". That contradicts §2.6 and §4.1, and
    without a precedence rule the party reading it is a processor with no copy of
    this Agreement.

    DEPARTURE 2 — "NO UNSEEN OR LATER-ADDED DOCUMENT IS INCORPORATED" GAINS A
    ROUTE. The memo's sentence forbids addition absolutely. A document can be
    added — by an amendment under §7.1, signed by both parties. Otherwise the
    merger clause forbids the parties from agreeing to anything else in writing,
    which is not what anybody means by it.

    DEPARTURE 3 — NO CITATION TO SECTION 9. "The Guaranty if one is signed" is
    true under every value of `guarantyScope` and cites nothing.
  */
  {
    slug: 'frpa.entire-agreement-7-8',
    version: 1,
    instrument: 'frpa',
    kind: 'clause',
    includeWhen: null,
    section: 'miscellaneous',
    sortKey: 80,
    heading: 'Entire Agreement',
    body: 'This Agreement consists of the completed the Merchant and Funding Information grid, these terms, the Fee Schedule, each exhibit identified in the Merchant and Funding Information grid and given to Merchant in full before signature, the Guaranty if one is signed, and any state rider given to Merchant before it accepted. Nothing else is part of it. A document referred to but not given to Merchant is not incorporated, and no document is added afterwards except by an amendment under Section [[clause:frpa.modifications-amendments-7-1]].\nWhere two of those documents conflict, the first of the following that applies controls: a mandatory rule of applicable law; an applicable state rider; the provisions of this Agreement that limit recourse to the Purchased Receipts, that cap the cost of enforcement, that give Merchant reconciliation and refund rights, and that limit the Guaranty; then these general terms; then an ancillary authorization or instruction, including a Split Funding Authorization. A processor’s, a bank’s or a service provider’s own form does not vary this Agreement.\nA separate equipment lease, a separate subscription agreement, and an agreement between Buyer and an independent sales organization are different contracts. None of them creates an Event of Default under this Agreement, adds to the Collateral, adds a fee under this Agreement, or creates or enlarges a guaranty, and this Agreement creates no cross-default with any of them.\nEvery disclosure applicable law requires shall be given as that law requires, shall describe the transaction as it is actually agreed, and shall be kept with the executed documents. This Section does not waive a disclosure or a statutory right, and does not exclude liability for fraud, for a misrepresentation applicable law does not permit to be excluded, or for the breach of an offer that binds Buyer.',
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
    section: 'miscellaneous',
    sortKey: 90,
    heading: 'Indemnification',
    body: 'Merchant shall indemnify Buyer only for the portion of a third-party claim finally determined by a court, or resolved in a written settlement Merchant has approved, to have been directly caused by Merchant’s fraud or intentional diversion of Purchased Receipts. Buyer shall give Merchant prompt written notice of the claim, shall cooperate reasonably, and shall permit Merchant to defend it with competent counsel. Merchant shall not settle a claim in a way that imposes an admission or a non-monetary duty on Buyer, or that fails to release Buyer, without Buyer’s consent, which shall not be unreasonably withheld. Late notice reduces Merchant’s liability only to the extent of the resulting material prejudice.\nThis indemnity does not cover the negligence, fraud, willful misconduct or violation of law of Buyer or of its representatives, a penalty imposed for their conduct, the ordinary failure of future receipts to arise, or a first-party claim by Buyer, which is governed by Section [[clause:frpa.remedies-6-2]]. It creates no independent Guarantor liability, and a claim against a Guarantor may be brought only as the separately signed Guaranty of Performance permits. Costs are recoverable only under Section [[clause:frpa.costs-of-collection-6-3]], including its single aggregate ceiling, and interest accrues only as Section [[clause:frpa.prejudgment-and-postjudgment-interest]] permits. No amount under this Section increases the Purchased Amount, the Remaining Balance or the Specified Percentage, and no loss may be recovered twice.',
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
  /*
    THE THIRD AND LAST RECITAL OF SOMETHING THAT DID NOT HAPPEN.

    WHAT WAS WRONG. "THE PARTIES HERETO ACKNOWLEDGE THAT EACH MAKES THIS WAIVER
    ... ONLY AFTER EXTENSIVE CONSIDERATION OF THE RAMIFICATIONS OF THIS WAIVER
    WITH THEIR ATTORNEYS." §7.22 contemplates a signer who is offered counsel and
    declines; §9.6 made the same recital and was rewritten for it. As of wave 6
    §7.22 says in terms that *"no recital elsewhere in this Agreement is evidence
    that it did"*, which named this sentence without being able to reach it.
    `frpa-7-10-jury-waiver-recites-what-7-22-contemplates-is-false`.

    WHAT DID NOT CHANGE, AND THE OWNER'S INSTRUCTION AGAINST THE MEMO. The memo's
    disposition is to delete the waiver from the national form, on the ground
    that predispute jury waivers vary by forum. They do — and the variation cuts
    one way, in one state. **Grafton** is UNVERIFIED; nobody on this project has
    pulled it from an official reporter. What it is cited for is that a
    contractual jury waiver made before a dispute arises is not given effect in
    California STATE court absent statutory authorisation. It says nothing about
    Florida, New York or Texas, and deleting the clause nationally to answer one
    state's rule gives away the waiver in the other ten.

    WHAT CHANGED. The waiver stays, mutual, and limits ITSELF: it operates only
    to the extent the law of the forum gives effect to a predispute waiver, and
    where that law does not, the Section has no effect and each party keeps the
    right. The recital goes, and is replaced by a pointer to §7.22 — which
    records what each signer was actually given and actually offered, and is
    therefore the only place in the document where a statement about counsel can
    be true.

    WHY THIS IS NOT GATED ON `recipientStates`, THOUGH §7.25 IS. §7.25's
    predicate partitions cleanly because the OCCC notice is an ADDITION that a
    Texas document needs and no other document does. A California carve-out is
    not that shape: `recipientStates` is a list, so a template offered in
    California AND Florida would lose the waiver in Florida too, and the answer
    a jury waiver needs is per-FORUM at the time of suit, not per-template at
    the time of drafting. A merchant in one state can be sued in another. The
    self-limiting sentence answers the question where it is actually asked.

    NOT DECIDED HERE, AND IT IS A REAL GAP. **Conspicuousness.** v4 set this
    clause in capitals; this rewrite does not, following the rule §10.4 settled
    — capitals are for a disclosure a regulator requires to be conspicuous, and
    spending them elsewhere devalues the one that needs them (7 TAC §86.310(d)).
    A jury waiver is nevertheless the classic place a court asks whether the term
    was conspicuous, and no vendored authority in this repository fixes what is
    required. Inventing a typographic convention is not a drafting decision.
    Reported as an open question for counsel: capitals, bold, a separate
    initial, or nothing.

    DEPARTURE FROM THE MEMO — THE MEMO'S SECOND SENTENCE IS KEPT AND MOVED. "No
    party represents that it consulted an attorney unless it actually did so" is
    the memo's and is right; written here as a flat statement that no party
    represents it, with §7.22 named, because a conditional recital is still a
    recital.
  */
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
    section: 'miscellaneous',
    sortKey: 100,
    heading: 'Jury Trial Waiver',
    body: 'Each party waives trial by jury in an action arising out of or relating to this Agreement, to the extent the law of the forum gives effect to a waiver of that right made before a dispute has arisen. Where the law of the forum does not give effect to such a waiver, this Section has no effect and each party retains its right to trial by jury.\nThis waiver is mutual and is limited to the parties to this Agreement. It reaches no right of a person who has not signed this Agreement, and it does not reach a claim applicable law requires to be tried to a jury.\nNo party represents that it consulted an attorney before signing this Agreement. Section [[clause:frpa.attorney-review-7-22]] states what each signer was given and what each was offered, and this Section adds no acknowledgement to it.',
    source: { kind: 'attorney-drafted', author: null },
    status: 'draft',
    appliesInStates: [],
    examinedBy: [{ review: 'REVIEW-02', findings: ['frpa-7-10-jury-waiver-recites-what-7-22-contemplates-is-false'] }],
  },
  /*
    THE CLAUSE THE MEMO REMOVED WITHOUT ASKING THE QUESTION UNDERNEATH IT.

    WHAT WAS WRONG, AND IT IS SMALLER THAN THE REGISTER IMPLIES. The library
    body is one sentence: a mutual class waiver with an "except where prohibited
    by law or against public policy" proviso. The proviso is real, and the memo
    says so: the clause is not categorically unlawful.

    **THE DOCUMENT IS NOT WHAT REVIEW-01 READ.** `class-waiver-forfeits-own-
    recovery` is written against a §7.11 with two further limbs — the prevailing
    party recovers no fees in a class action "NOTWITHSTANDING ANY OTHER PROVISION
    IN THIS AGREEMENT", and a party who participates as a class member "WILL NOT
    SUBMIT A CLAIM OR OTHERWISE PARTICIPATE IN ANY RECOVERY". Those are the
    limbs that make the finding, and they are the ones REVIEW-01 said to delete.
    They are already gone from `Lombard_FRPA_v4.docx`; the finding was
    implemented, and the register carries it forward against a sentence it no
    longer describes. Checked against the source .docx, not against the memo.

    WHAT REMAINS WRONG IS STRUCTURAL, NOT TEXTUAL. A standalone class waiver
    with no arbitration agreement behind it is the weakest of the three
    positions available, and `facts.ts` says why: all three MCA forms filed as
    SEC exhibits in 2024-2026 pair a class waiver WITH arbitration, and this
    corpus holds the waiver and no arbitration clause. The waiver's
    enforceability then turns entirely on the forum, which under the old §7.5
    Buyer alone chose.

    WHAT CHANGED. The memo's replacement, adopted: no party waives a class,
    collective, representative or public-enforcement right applicable law gives
    it, and the availability and form of any such proceeding is the court's to
    determine. Two sentences added — a participant keeps its own share of a
    recovery and any statutory fee right, which is the half of REVIEW-01's
    finding worth stating affirmatively so the deleted limbs cannot come back;
    and enforcement cost goes to §6.3, which holds the only entitlement and the
    only ceiling.

    THE HEADING CHANGES, for §7.13's reason and not §7.23's. §7.23 kept a
    misleading heading deliberately, so that a reader told about a provision
    could find it. Here the heading names a waiver that no longer exists in any
    form, and a reader who finds "Class Action Waiver" and reads a clause that
    waives nothing has been told the opposite of the truth twice.

    DECIDED, AND NOT HERE. **Whether this should be an arbitration product at
    all** was reported as a gap on 2026-09-10 — the owner's note being explicit
    that the memo removes the waiver on a correct ground and then never asks the
    question, and that for a small-dollar B2B product across eleven states it is
    a first-order choice with pricing and enforceability consequences. The owner
    answered it on 2026-09-11 by offering both: `frpa.arbitration-7-26` is the
    `arbitration` answer, and this clause remains the `courts` one.

    **THE CLASS RULE IS THEREFORE ONE RULE PER DOCUMENT, IN TWO PLACES.** This
    clause waives nothing and is selected under `courts`; §7.26 arbitrates on an
    individual basis and is selected under `arbitration`. They are never in the
    same document, which is what makes that arrangement safe, and
    `an-arbitration-clause-is-one-forum-rule.test.ts` asserts the count rather
    than trusting it. The individual-basis limb lives inside §7.26 rather than in
    a second §7.11 because it is the SCOPE of the arbitration agreement, not a
    separate promise. One VERIFIED fact that drove it: Va. Code §6.2-2234(B)
    (vendored) bars a covered contract from requiring face-to-face arbitration
    outside the jurisdiction of the recipient's principal place of business, and
    requires the PROVIDER to pay the arbitrators' fees and the administrative
    fees of the proceeding. An arbitration product carries that cost in Virginia
    by statute, and §7.26 carries it nationally.
  */
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
    section: 'miscellaneous',
    sortKey: 110,
    heading: 'Class and Representative Proceedings',
    body: 'No party waives a right to bring, to defend, or to take part in a class, collective, representative or public-enforcement proceeding that applicable law permits. Whether such a proceeding is available, and in what form, is for the court to determine under applicable law and its own rules.\nA party that takes part in such a proceeding keeps whatever share of a recovery the proceeding awards it, and keeps any right to costs or to a fee award that applicable law gives it. Nothing in this Agreement requires a party to give up either.\nSection [[clause:frpa.costs-of-collection-6-3]] governs what Buyer may recover from Merchant for enforcement, and this Section adds nothing to it and takes nothing from it.',
    source: { kind: 'attorney-drafted', author: null },
    status: 'draft',
    appliesInStates: [],
    examinedBy: [{ review: 'REVIEW-01', findings: ['class-waiver-forfeits-own-recovery'] }],
  },
  /*
    THE SENTENCE THAT TURNS AN UNREAD LETTER INTO A DEFAULT JUDGMENT.

    WHAT WAS WRONG. "SERVICE HEREUNDER SHALL BE COMPLETE UPON MERCHANT'S ACTUAL
    RECEIPT OF PROCESS **OR UPON BUYER'S RECEIPT OF THE RETURN THEREOF BY THE
    UNITED STATES POSTAL SERVICE AS REFUSED OR UNDELIVERABLE** ... SERVICE BY
    BUYER TO THE LAST KNOWN ADDRESS SHALL BE SUFFICIENT. MERCHANT WILL HAVE
    THIRTY (30) CALENDAR DAYS AFTER SERVICE HEREUNDER IS COMPLETE IN WHICH TO
    RESPOND."

    Undeliverable mail counts as service, and the clock to respond starts from
    the moment the envelope comes back. REVIEW-01 reached the same place from
    the commitments side — `service-without-notice-vs-commitment-9` — and its
    observation is the one worth keeping: Pass 1 scored the published "no
    confession of judgment" commitment **Honored** *without examining §7.12 or
    Section 10 at all*. Nobody wrote a confession of judgment. Four clauses
    between them built the thing a confession of judgment is banned to prevent.

    REVIEW-01's own fix was narrower than this — keep "AS REFUSED" and drop "OR
    UNDELIVERABLE", because refusal is the merchant's own act and
    undeliverability often is not. That is a good distinction and it is not
    enough: the thirty-day response period, the last-known-address rule and the
    blanket email consent each survive it.

    THE MEMO'S SIXTH REFUTATION IS ADOPTED, AND THE REGISTER IS WRONG WITHOUT
    IT. `service-without-notice-vs-commitment-9` reads the service scheme as
    "functionally adjacent to a confession of judgment". **A consensual
    email-service arrangement is not in itself a confession of judgment**, and
    some consensual service mechanisms are given effect. Nothing in this rewrite
    asserts otherwise. The clause goes on the narrower ground that these
    particular mechanisms — completion on non-delivery, sufficiency of a stale
    address, and a contractual response period — are how a judgment is entered
    against somebody who never learned of the case.

    WHAT CHANGED. Judicial process is sent to §10.1 and to nothing else, which
    is the consolidation the memo asks for and which §7.3 already relies on when
    it routes process to "Section 7.12 and Section 10". The three mechanisms are
    denied by name. The response period becomes the one procedural law or the
    court gives. The address duty survives — a merchant should keep its address
    current — but is stripped of its consequence: failing to do so does not make
    an invalid service valid.

    DEPARTURE 1 — THE ADDRESS DUTY IS KEPT AND POINTED AT §10.5. The memo's
    replacement drops it entirely. It is a real and useful obligation, it is
    §10.5's subject after the consolidation, and stating it in one place with a
    cross-reference is what stops §7.12 and §10.5 becoming two rules that drift.

    DEPARTURE 2 — THE OBJECTION SENTENCE IS WRITTEN AS A NOUN. The memo writes
    that a returned mailing does not "waive any objection to it". Written as
    "This Agreement contains no waiver of an objection to service", matching
    §7.24's construction, because the verb form reads as though the parties are
    doing the waiving somewhere and this sentence is carving out of it.

    THE CAPITALS ARE GONE, for §10.4's reason.
  */
  {
    slug: 'frpa.service-of-process-7-12',
    version: 1,
    instrument: 'frpa',
    kind: 'clause',
    includeWhen: null,
    section: 'miscellaneous',
    sortKey: 120,
    heading: 'Service of Process',
    body: 'Service of a summons, a complaint or other judicial process on any party is governed by Section [[clause:frpa.section-10-1]], and by no other provision of this Agreement.\nAn operational notice given under Section [[clause:frpa.notices-7-3]], an email that is not acknowledged, and a mailing that is returned, refused or undeliverable are not service of process under this Agreement and are not evidence that service was made. Delivery to an address a party has stopped using is not service. This Agreement contains no waiver of an objection to service.\nThe time a party has to respond to a proceeding is the time the applicable procedural law or an order of the court gives it. This Agreement neither shortens that time nor starts it running on an event of its own.\nEach party shall keep current the addresses it gives in this Agreement, as Section [[clause:frpa.section-10-5]] provides. A failure to do so does not make an otherwise invalid service valid.',
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
    section: 'miscellaneous',
    sortKey: 130,
    heading: 'No Master Agreement; No Right of First Refusal',
    body: 'This Agreement is not a master agreement for future funding, and it creates no right of first refusal in Buyer over any sale of receipts Merchant may wish to make. Neither party is obliged to enter a further purchase, and no schedule, addendum or acceptance of an offer varies this Section.\nEvery subsequent purchase must be separately offered, disclosed, documented and accepted, and must satisfy Section [[clause:frpa.renewal-eligibility-8-1]]. No Purchased Amount and no Remaining Balance under a prior transaction is automatically deducted from the Purchase Price of a new one; a prior transaction is dealt with only as Section [[clause:frpa.rollover-methods-8-2]] provides and only where Merchant has authorized it.',
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
    section: 'miscellaneous',
    sortKey: 150,
    heading: 'Reporting',
    body: 'Buyer may report accurate information about Merchant’s performance of this Agreement to a reporting organization that Buyer has specifically identified, for a lawful purpose Buyer has disclosed, and only as Section [[clause:frpa.protection-of-information-4-7]] and applicable law permit. Before furnishing information about an individual that a recipient may use in a consumer report, Buyer shall establish the authority applicable law requires for it and shall meet the accuracy, adverse-action and dispute duties that apply to the furnisher of it.\nBuyer shall not report the non-generation of Purchased Receipts as a delinquent or past-due fixed debt. This Agreement fixes no payment and no maturity date, so an absence of Card Receipts is not a missed payment; only the conduct described in Section [[clause:frpa.events-of-default-6-1]](b) may be reported as a diversion, and a reasonably substantiated dispute shall be identified as disputed wherever applicable law or the recipient’s rules require.\nMerchant, and an individual whose information was furnished, may request the recipient’s identity and the process for correcting the information, and Buyer shall give both. No raw account data, no credentials and no information unrelated to Merchant’s performance of this Agreement may be furnished. This Section authorizes no marketing and no general disclosure to a trade body.',
    source: { kind: 'attorney-drafted', author: null },
    status: 'draft',
    appliesInStates: [],
    examinedBy: [{ review: 'REVIEW-01', findings: ['information-sharing-only-vs-any-third-party'] }],
  },
  /*
    "PROCEEDS OF THE PURCHASED AMOUNT" — A FACE AMOUNT HAS NO PROCEEDS.

    WHAT WAS WRONG. "In the event that Merchant, OR ANY OF MERCHANT'S RESPECTIVE
    DIRECTORS, OFFICERS, EMPLOYEES, AGENTS, SUBCONTRACTORS, OR AFFILIATES
    receives or comes into possession of any PROCEEDS OF THE PURCHASED AMOUNT,
    Merchant shall ... IMMEDIATELY SEGREGATE and hold such proceeds IN EXPRESS
    TRUST for Buyer's sole and exclusive benefit."

    Four defects. The Purchased Amount is a number — the ceiling on what Buyer
    collects — and a number generates no proceeds, so the clause has no subject
    until a reader supplies one, and every reader supplies the widest one. It
    binds directors, officers, employees, agents, subcontractors and affiliates,
    none of whom signed. It declares an express trust over receipts that do not
    exist yet, which is `default-collection-reaches-cash-and-checks` in its
    second location and is memo entry 006 wearing different words: a label
    cannot create ownership of a future receivable, and if it did it would make
    the transaction something other than a sale of specific receipts. And
    "immediately segregate and hold" is a freeze on an account the merchant runs
    a business out of.

    §2.4 AND §3.1 BOTH DEPEND ON THIS CLAUSE, AND THE BRIEF SAYS SO: do not
    narrow it. §2.4 — "While an interruption continues, Merchant shall account
    for the Purchased Receipts it actually receives and shall remit them under
    Section 7.16." §3.1 — "A documented failure to remit Purchased Receipts that
    were actually generated is dealt with under Section 7.16." Both survive: the
    interruption case is precisely the case where a Purchased Receipt reaches
    Merchant because the split was not running, and it is the first sentence.

    WHAT CHANGED, AND WHAT IS NOT NARROWED. The subject is the Purchased Receipt
    — the Specified Percentage of an identified Card Receipt Merchant actually
    received — and the duty is to record it separately and deliver it with the
    settlement reference. What is REMOVED is the whole-account freeze, the
    express trust, the non-signatories, and the reach into Merchant's retained
    share and non-card money. What is ADDED is the other half of a remittance
    duty: Buyer credits it promptly and does not also collect it through the
    split, which is the double-recovery §2.3 and §2.6 are otherwise silent about
    in this direction.

    DEPARTURE 1 — "BUSINESS DAYS" BECOMES "WORKDAYS". `frpa.definitions` defines
    Workday and every other period in this Agreement counts in them. v4 used
    "business days" here and nowhere near a definition of it.

    DEPARTURE 2 — THE CLOCK RUNS FROM AVAILABILITY, NOT RECEIPT. The memo's
    "within three Workdays after the funds become available", kept deliberately
    against v4's "within three (3) business days of such receipt". A settlement
    credited but not yet available is not money the merchant can send.

    DEPARTURE 3 — THE TRUST QUESTION IS SENT TO THE LAW RATHER THAN ANSWERED.
    The memo's, and it is the honest position: whether Buyer owns an identifiable
    proceed, and whether any trust arises, is a question of Article 9 and of the
    law of the relevant state. The clause says the parties' labels do not decide
    it. UNVERIFIED: nobody on this project has read UCC §9-315 or any state's
    law on the point.
  */
  {
    slug: 'frpa.return-of-buyer-proceeds-7-16',
    version: 1,
    instrument: 'frpa',
    kind: 'clause',
    includeWhen: null,
    section: 'miscellaneous',
    sortKey: 160,
    heading: 'Return of Buyer Proceeds',
    body: 'If Merchant receives Purchased Receipts that an Approved Processor should have remitted to Buyer, Merchant shall record them separately and deliver that purchased share to Buyer within three (3) Workdays after the funds are available to Merchant, with the settlement reference that identifies them. Section [[clause:frpa.approved-bank-account-2-4]] requires this of Purchased Receipts Merchant receives while an interruption in the split continues, and Section [[clause:frpa.merchant-s-right-to-reconciliation-3-1]] sends a documented failure to remit to this Section.\nThis duty reaches only the Specified Percentage of Card Receipts that Merchant actually received and that can be identified. It does not reach Merchant’s retained share, a non-card receipt, a sum Merchant never received, or an amount already credited to the Purchased Amount. It does not require Merchant to segregate, freeze, or stop using any account, and it binds no person who has not signed this Agreement.\nBuyer shall credit each delivery to the Remaining Balance promptly and shall not collect the same amount twice; an amount delivered under this Section is not also collected through the split under Section [[clause:frpa.primary-collection-split-funding-via-approved-processor-2-3]]. Ownership of a Card Receipt, the tracing of its proceeds, and whether any trust arises are determined by applicable law, and no description in this Agreement decides them. Nothing in this Section obliges Merchant to pay for a receipt that was never generated.',
    source: { kind: 'attorney-drafted', author: null },
    status: 'draft',
    appliesInStates: [],
    examinedBy: [{ review: 'REVIEW-01', findings: ['default-collection-reaches-cash-and-checks'] }],
  },
  /*
    RETAINED, UNCHANGED, AND THE REASON IS THAT THE REAL CONTENT IS NOT TEXT.

    The memo's only RETAIN in this cluster, and its rationale is a list of
    operational controls rather than a drafting note: *"Preserve signer identity,
    capacity, document version, timing, consent/attribution evidence, required
    disclosure signatures, and a downloadable complete copy. This clause does not
    cure missing assent or satisfy every separate statutory delivery
    requirement."*

    The owner's note goes further — *"Pacta should be able to evidence every one
    of those — worth confirming we actually can"* — and that is a platform
    question. It is answered here as a record of what was CHECKED, because the
    alternative is to answer it by drafting, which would put a claim about
    Pacta's capabilities into a merchant-facing sentence.

    WHAT WAS CHECKED, on 2026-09-10, by reading this repository. Not by running
    the platform, and not by reading a signed envelope.

    EVIDENCED TODAY, on the face of the code:
      - **Signer identity as asserted, and timing.** Every audit entry carries
        `recipientEmail`, `recipientName`, `recipientId` and `recipientRole`
        (`packages/lib/types/document-audit-logs.ts`), with `ipAddress` and
        `userAgent`, and the event vocabulary includes `EMAIL_SENT`,
        `DOCUMENT_OPENED`, `DOCUMENT_FIELD_INSERTED` and `DOCUMENT_COMPLETED`.
      - **Substitution of the document after sending.** There is an
        `ENVELOPE_ITEM_PDF_REPLACED` event, so a swapped PDF is a recorded act
        rather than an invisible one.
      - **A downloadable complete copy.** `packages/lib/server-only/htmltopdf/`
        holds `get-certificate-pdf.ts` and `get-audit-logs-pdf.ts`, and the fork
        signs the finished PDF cryptographically (CAdES / PKCS#7, per the project
        CLAUDE.md), which is what makes the copy checkable rather than merely
        downloadable.

    NOT EVIDENCED, OR NOT CHECKED — and the first of these is the one this
    cluster's own work depends on:
      - **CAPACITY.** The platform records a recipient's ROLE IN AN ENVELOPE —
        signer, approver, viewer, cc — and nothing records the legal capacity in
        which a human signed: as an officer of Merchant, or personally as
        Guarantor. `frpa.execution` as rewritten turns on exactly that
        distinction, and one natural person commonly signs in both. There is no
        field for it. **This is a gap, not an unknown.**
      - **A separate, affirmative consent to transact electronically**, with the
        disclosures such a consent requires, stored as its own artifact. Nothing
        in this repository was found that captures one. Not established either
        way; not assumed.
      - **The document version the signer actually saw**, pinned to the moment of
        consent as distinct from the completed PDF. Not checked.
      - **Identity beyond control of an email address.** Recipient action and
        access auth exist as configurable fields; whether any Lombard envelope
        uses them is a deployment question nobody here has asked.

    UNVERIFIED. Nobody on this project has read 15 U.S.C. §7001 (E-SIGN) or any
    state's UETA, and no conclusion about what either requires is stated in this
    clause or drawn here. The memo's closing sentence is the one to keep in mind
    and is not drafted around: this clause does not cure missing assent and does
    not satisfy a separate statutory delivery requirement — §7.8 and
    `frpa.execution` carry the delivery duties instead.
  */
  {
    slug: 'frpa.electronic-signatures-7-17',
    version: 1,
    instrument: 'frpa',
    kind: 'clause',
    includeWhen: null,
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
    section: 'miscellaneous',
    sortKey: 180,
    heading: 'Communications, Recording, and Premises Access',
    body: 'Buyer may contact Merchant, and a Guarantor separately identified for the purpose, to administer and lawfully service this Agreement, by a method applicable law permits. Where an automated call, an artificial or prerecorded voice call, or a text message requires consent, Buyer shall obtain that consent from the person legally entitled to provide it for the specified number, and shall record when and how it was given.\nA recipient may revoke consent at any time by any reasonable means, including by replying STOP to a text message, by telephone, or in writing; a revocation is effective when Buyer receives it, and Section [[clause:frpa.notices-7-3]] does not apply to it. Buyer shall honor a revocation within the period applicable law allows. Servicing or collecting this Agreement does not by itself preserve consent, and after a revocation Buyer shall use only a method that is lawful without it.\nMarketing consent, if Buyer asks for it, shall be obtained separately, shall identify the caller and the number the contact will come from, shall carry the disclosures applicable law requires, and shall be optional and not a condition of funding or of any term of it. This Agreement supplies no blanket do-not-call override and no consent for an unnamed affiliate.\nBefore recording a call, Buyer shall give the notice applicable law requires and obtain the consent applicable law requires from each participant, and shall offer an unrecorded alternative where that is practicable. A signature to this Agreement is not the consent of a person who has not given it.\nBuyer may enter Merchant’s premises only with reasonable advance notice and Merchant’s contemporaneous consent, or under an order of a court of competent jurisdiction, and in no case by force, by disruption of Merchant’s business, or by a breach of the peace. Section [[clause:frpa.remedies-6-2]] states what Buyer may do on an Event of Default and that Buyer takes no self-help remedy.',
    source: { kind: 'attorney-drafted', author: null },
    status: 'draft',
    appliesInStates: [],
    examinedBy: [{ review: 'REVIEW-01', findings: ['tcpa-consent-not-revocable-as-promised'] }],
  },
  /*
    A CLOCK THAT RAN IN ONE DIRECTION, AND A NUMBER THIS CLUSTER COULD NOT
    CONFIRM.

    WHAT WAS WRONG. "Each **Merchant and Guarantor** agrees that any claim ...
    that is not asserted **against Buyer** within one (1) year after its accrual
    will be time-barred and forever waived". One year, running only against the
    merchant and the human who signed for it, covering every kind of claim, with
    a carve-out — "except to the extent such limitation is prohibited by
    applicable law" — that saves only a claim whose period a statute expressly
    makes non-waivable. `one-year-limitations-one-sided`. REVIEW-01 rates the
    clause as probably enforceable in isolation and says the cost is cumulative:
    it is one more provision running one way in a document full of them.

    THE TWO-YEAR PERIOD IS THE OWNER'S COMMERCIAL DECISION OF 2026-09-11. IT IS
    NOT COUNSEL'S RECOMMENDATION AND IT HAS NO VERIFIED SOURCE.

    That sentence is the record, and it is written plainly because the previous
    draft of this clause refused the figure for exactly the right reason and the
    refusal must not now be quietly forgotten. What was checked, and what the
    check found:

      - The 2026-09-09 memo is not vendored in this repository or in
        `lombard-contracts`. What exists of it are the `memo_rationale` and
        `memo_replacement` fields in `.cluster-briefs/`.
      - **Memo entry 075's replacement text fixes no period at all.** It says
        the periods applicable law supplies apply and that "This Agreement does
        not shorten them".
      - The string "two-year" appears in exactly ONE place across all nine
        cluster briefs: an owner's note on that entry. It was subsequently
        attributed to the memo by an orchestrator's brief; **that attribution is
        false**, and an agent verified it by reading the briefs.
      - REVIEW-01's own fix for `one-year-limitations-one-sided` says "make it
        mutual" and names no number either.

    So the figure is adopted as a **commercial term the owner chose**, on
    2026-09-11, with that provenance stated rather than dressed up as authority.
    It is the only figure this clause has been given and none was invented
    around it. **A shortened limitation period is a term counsel has not
    reviewed and that costs the merchant**, and it is the kind of term a state
    commercial-financing statute may decline to give effect to — which is what
    the carve-out in the second paragraph is for.

    WHAT CHANGED. The mutual period is stated, and the three things the previous
    draft got right survive it unchanged: the period runs against every party
    alike; the law's accrual, tolling and discovery rules apply to it; and a
    claim applicable law does not permit to be shortened or given up is
    unaffected. **The carve-out is not narrowed by the period** — it says in
    terms that the two years do not apply to such a claim — because a carve-out
    that merely "survives" a new operative rule is a carve-out arguable both
    ways.

    DEPARTURE FROM THE MEMO — THE CARVE-OUT IS WIDER THAN THE OLD ONE AND IS
    STATED AFFIRMATIVELY. v4's proviso saved a claim only "to the extent such
    limitation is prohibited"; REVIEW-01's consequence paragraph is that this
    may not save claims under state commercial-financing statutes whose periods
    are not expressly declared non-waivable. Written instead as: a claim
    applicable law does not permit to be shortened or given up is unaffected,
    whoever brings it.

    **THE GATE GOES, AND THAT IS THE SECOND CHANGE HERE.** `facts.ts` says
    `disputeResolution` *"decides four clauses as one bundle"*, and this record
    used to drop under arbitration with the other three. Tested against ADR
    0013's diagnostic rather than assumed:

      - The fact answers WHERE a claim is heard. This Section answers HOW LONG
        there is to bring it. *"If the two limbs bind different parties or
        answer different questions, the gate is misattributed rather than too
        coarse"*, and the fix is `includeWhen: null` plus a cross-reference.
      - The previous draft's own note conceded the rule was "true under
        arbitration too" and called its absence there "a redundancy rather than
        a hole". **That was true of a clause that only disclaimed. It stopped
        being true the moment this clause states an operative period**: a gated
        §7.19 would give an arbitration template no period at all, which is the
        funder losing the term it has just decided to have, in the forum where a
        stale claim is most likely to land.
      - The alternative — restating the period inside §7.26 — is a duplicate
        clause and two rules on one subject, which ADR 0013's diagnostic
        excludes and which is the defect §7.5 and §7.24 were rewritten out of.

    So this record is ungated and §7.26 cites it. The last sentence of the body
    — "This Section applies to a claim however it is heard" — is what makes the
    rule reach arbitration WITHOUT citing §7.26, which is gated and which an
    ungated clause may not name.

    **THREE OTHER TESTS ENCODE THE OLD FOUR-CLAUSE BUNDLE AND MOVE WITH THIS**:
    `a-default-judgment-needs-a-served-defendant.test.ts`'s `BUNDLE` inventory,
    its assertion that this clause shortens nothing, and
    `select-clauses.test.ts`'s list of what an arbitration funder drops. The
    first and third are registers of a design decision and the decision changed;
    the second asserted the previous owner decision and is replaced by an
    assertion of this one, not deleted. **`clauses/facts.ts` still describes the
    bundle as four clauses and is not this change's file — reported.**

    THE HEADING IS UNCHANGED FROM THE PREVIOUS DRAFT'S. "Limitation of Actions"
    is accurate for a clause that now does state a period, and renaming it back
    to "Contractual Statutes of Limitations" would be the v4 heading for the v4
    machinery, which is not what this is.
  */
  {
    slug: 'frpa.contractual-statutes-of-limitations-7-19',
    version: 1,
    instrument: 'frpa',
    kind: 'clause',
    /*
      NOT THE BUNDLE'S. A limitation period applies in arbitration too, so the
      `courts` gate was a misattributed fact rather than a coarse one. See the
      note above.
    */
    includeWhen: null,
    section: 'miscellaneous',
    sortKey: 190,
    heading: 'Limitation of Actions',
    body: 'A claim arising out of or relating to this Agreement shall be brought within two (2) years after the claim accrues. That period runs against every party alike, whoever brings the claim and whoever it is brought against, and neither party has a longer or a shorter period than the other.\nThe accrual rule and any tolling or discovery rule that applicable law supplies apply to that period. A claim that applicable law does not permit to be shortened or given up is unaffected by this Agreement, and the period stated above does not apply to it. This Agreement shortens no other period, and no other provision of this Agreement shortens one.\nThis Section applies to a claim however it is heard.',
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
  /*
    THE SAME SENTENCE MEANT OPPOSITE THINGS IN THE TWO FORUMS BUYER COULD PICK
    BETWEEN.

    WHAT WAS WRONG, AND IT IS HALF WHAT THE REGISTER SAYS. The library body
    preserves a counterclaim "arising out of the same transaction or occurrence
    as Buyer's claim", so it is not the total bar `counterclaim-waiver-flips-by-
    forum` describes; that finding is written against an earlier text preserving
    only what "under applicable rules of civil procedure, is compulsory". The
    fix landed. What remains is the second half of the finding, and it is
    entirely §7.5's doing: New York makes every counterclaim permissive and
    Florida makes a transaction-related one compulsory, so the exception was
    generous in one Acceptable Forum and empty in the other — and §7.5 gave the
    choice between them to Buyer, the party who would be the plaintiff.
    UNVERIFIED: REVIEW-01 quotes N.Y. CPLR 3019(a) and Fla. R. Civ. P. 1.170(a)
    and records "Rule texts stated from memory; counsel to verify wording."

    So the forum election is the defect, and it is fixed in §7.5. What is left
    here is the residue the memo correctly rates Moderate: forcing every other
    claim into a separate proceeding costs both parties money, obscures the
    defences a merchant has, and buys Buyer nothing a procedural rule would not
    give it.

    WHAT CHANGED. The memo's replacement, adopted and made two-sided in fact as
    well as in form: each party may assert a defence, a setoff, a recoupment and
    a counterclaim so far as the procedural law of the court permits, and this
    Agreement requires nothing to be brought separately. A sentence added for
    the compulsory-counterclaim case, because that rule cuts against the party
    who fails to plead and a form should not leave a merchant to discover it.

    DEPARTURE 1 — "DEFENCES" IS SPELLED AS §5.1, §6.2 AND §9.4 SPELL IT. One
    spelling per document; §9.4's note settled this.

    DEPARTURE 2 — §6.3 IS NAMED. The memo does not name it. Four clauses about
    litigation are the obvious place for a second enforcement-cost entitlement
    to appear, and `a-fee-is-a-debt-not-a-purchase.test.ts` asserts that §6.3
    holds the only one and the only ceiling. Naming §6.3 and adding nothing is
    the safest form of saying so.

    THE HEADING CHANGES for the §7.13 reason: there is no counterclaim waiver
    here to be found under that name.
  */
  {
    slug: 'frpa.counterclaim-waiver-7-20',
    version: 1,
    instrument: 'frpa',
    kind: 'clause',
    /*
      Same bundle. Under arbitration the rules of the forum govern instead.
    */
    includeWhen: (facts) => facts.disputeResolution === 'courts',
    section: 'miscellaneous',
    sortKey: 200,
    heading: 'Defences, Setoff, and Counterclaims',
    body: 'Each party may assert a defence, a setoff, a recoupment and a counterclaim so far as the applicable procedural law of the court permits. This Agreement requires no claim to be brought as a separate proceeding, and no provision of this Agreement causes a party to give up a claim it does not assert in a particular action.\nWhere the procedural law of the court makes a counterclaim compulsory, that law governs and this Agreement neither enlarges nor reduces its effect.\nSection [[clause:frpa.costs-of-collection-6-3]] governs the cost of enforcement. Nothing in this Section adds a cost, a remedy or an entitlement to either party.',
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
    section: 'miscellaneous',
    sortKey: 210,
    heading: 'Independent Sales Organizations and Brokers',
    body: 'the Merchant and Funding Information grid shall identify any independent sales organization, broker or marketing affiliate involved in this transaction (an “ISO”), its role, what it is paid, who pays it, and any disclosure applicable law requires. An ISO may be an independent contractor of Buyer, and that description does not waive any responsibility of Buyer arising from an ISO’s actual or apparent authority, from Buyer’s own conduct, or under applicable law. Buyer is not bound by a promise or representation of an ISO that is not contained in this Agreement and is not otherwise legally attributable to Buyer.\nBuyer shall maintain reasonable controls over the channel it engages, including onboarding, verification of any licensing or registration applicable law requires, training, monitoring, complaint handling, and compensation.\nMerchant and Guarantor do not indemnify Buyer, or any person associated with Buyer, for an act or omission of an ISO. Section [[clause:frpa.indemnification-7-9]] states the only indemnity Merchant gives under this Agreement.\nBuyer shall require by contract that an ISO it engages charge or collect from Merchant no compensation beyond what is expressly permitted, disclosed and agreed under applicable law; the commission Buyer pays is that ISO’s entire compensation for a transaction Buyer funds. Merchant is not required to pay an ISO anything as a condition of this Agreement, and may notify Buyer of a request for such a payment. Buyer shall investigate a reported unauthorized charge promptly, and shall refund a substantiated unauthorized charge collected by an ISO Buyer engaged within ten (10) Workdays after it is substantiated, without requiring Merchant to recover from the ISO first. Buyer may separately pursue the ISO. Nothing in this Section disclaims a representation legally attributable to Buyer, or limits a claim for deception or for an unauthorized fee.',
    source: { kind: 'attorney-drafted', author: null },
    status: 'draft',
    appliesInStates: [],
    examinedBy: [
      { review: 'REVIEW-01', findings: ['iso-channel-vs-never-cold-call'] },
      { review: 'REVIEW-02', findings: ['iso-a6-and-frpa-7-21-give-different-answers-about-a-merchant-paid-fee'] },
    ],
  },
  /*
    A RECITAL THAT TWO OTHER CLAUSES CONTRADICT, IN OPPOSITE DIRECTIONS.

    WHAT WAS WRONG. The first sentence is fine and is kept in substance: an
    opportunity to consult counsel, or a choice not to. The second is not —
    "further acknowledges that it has NOT RELIED ON ANY REPRESENTATION by Buyer
    or ANY THIRD PARTY that is not set forth in this Agreement." A blanket
    nonreliance recital, obtained at signature, about statements the signer heard
    before signature, from a channel Buyer selected and pays. §7.21 as
    `data-and-channel` rewrote it says the opposite in terms: a disclaimer does
    not reach "a representation legally attributable to Buyer".

    TWO FINDINGS, AND THEY POINT AT DIFFERENT CLAUSES.

    (1) `frpa-4-8-conditions-the-counsel-review-7-22-promises`. §7.22 recites a
        free opportunity to consult counsel; v4's §4.8 let a merchant show this
        Agreement to an adviser only if the adviser FIRST AGREED IN WRITING to be
        bound by Buyer's confidentiality terms. A lawyer asked to sign a
        funder's NDA before reading a client's contract is a lawyer who is not
        consulted. `representations` fixed §4.8 — it now carries an express
        exception for an attorney, accountant or other professional adviser,
        with no undertaking to Buyer — so this clause points at §4.8 rather than
        restating it, and the promise and its former condition are read
        together.

    (2) `frpa-7-10-jury-waiver-recites-what-7-22-contemplates-is-false`. §7.10
        recites in capitals that the jury waiver was made "ONLY AFTER EXTENSIVE
        CONSIDERATION OF THE RAMIFICATIONS OF THIS WAIVER WITH THEIR ATTORNEYS",
        while this clause contemplates a signer who chose not to consult anybody.
        On every signing where nobody called a lawyer, one of the two is a false
        recital that the signature attests to. **§7.10 is `disputes-service`'s
        (memo 061) and is not touched.** What this clause does instead is state
        the rule once and generally — "no recital elsewhere in this Agreement is
        evidence that counsel was consulted" — which is correct whether §7.10 is
        kept, rewritten or deleted with the arbitration decision.

    WHAT CHANGED. The opportunity is stated as a fact about what was actually
    delivered, so it can be checked: the complete documents, including exhibits,
    appendix and disclosures. The nonreliance sentence is deleted rather than
    narrowed — narrowing leaves a clause that reads as though it works. And the
    acknowledgement is expressly not a waiver of fraud, of a non-waivable right,
    of a required disclosure, or of a statement attributable to Buyer.

    DEPARTURE FROM THE MEMO — THE §4.8 CROSS-REFERENCE IS ADDED. The memo does
    not make it. Without it the finding is closed in §4.8 alone, and a reader of
    §7.22 has no way to know the condition that used to sit on the promise has
    gone.
  */
  {
    slug: 'frpa.attorney-review-7-22',
    version: 1,
    instrument: 'frpa',
    kind: 'clause',
    includeWhen: null,
    section: 'miscellaneous',
    sortKey: 220,
    heading: 'Attorney Review',
    body: 'Merchant and each Guarantor have been given the complete transaction documents, including every exhibit, the Appendix and every disclosure, and a reasonable opportunity to read them, ask questions and consult independent counsel before signing. Section [[clause:frpa.confidentiality-4-8]] does not restrict a disclosure made to an attorney, an accountant or another professional adviser for that purpose.\nEach of them may choose whether to consult counsel, and choosing not to costs nothing under this Agreement. No party represents that counsel was consulted unless that occurred, and no recital elsewhere in this Agreement is evidence that it did.\nThis acknowledgement does not waive a claim for fraud or misrepresentation, a right applicable law does not permit to be waived, a required disclosure, or a statement legally attributable to Buyer.',
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
    section: 'miscellaneous',
    sortKey: 230,
    heading: 'TMF/MATCH Reporting Consent and Release',
    body: 'Only a party authorized under the applicable card-network rules may submit a report to the Member Alert to Control High-risk Merchants (MATCH) database, to a Terminated Merchant File, or to a similar card-network database. A report shall be based on documented facts that satisfy the reporting criteria those rules state, shall carry the information those rules require and no more, and is subject to applicable law and to Section [[clause:frpa.protection-of-information-4-7]].\nBuyer shall not report or threaten to report Merchant or a principal of Merchant in order to obtain payment of a disputed claim under this Agreement, or because Card Receipts have declined.\nWhere the card-network rules and applicable law permit, Buyer shall identify the entity that made a report and the channel available for disputing it or requesting a correction, and shall cooperate promptly in correcting information it learns is inaccurate. Merchant and each Guarantor do not release claims for an inaccurate, unauthorized, negligent, malicious or unlawful report.',
    source: { kind: 'attorney-drafted', author: null },
    status: 'draft',
    appliesInStates: [],
    examinedBy: [{ review: 'REVIEW-01', findings: ['information-sharing-only-vs-any-third-party'] }],
  },
  /*
    THE DEPLOYMENT SURFACE FOR ELEVEN STATES, AND IT MISSTATED THE ONE WITH THE
    WORST CONSEQUENCE.

    Three findings, all REVIEW-02, one of them the only `blocker` in this
    cluster. Each is verified below against vendored primary text rather than
    against the memo, and **two of the memo's own premises turned out to be
    wrong** — see VERIFICATION.

    (1) `frpa-7-24-misstates-what-tex-fin-code-398-055-voids` (blocker). v4 said
        §398.055 "voids confession-of-judgment and similar provisions" and then
        supplied the remedy: the offending provision "does not apply to this
        Agreement and the remainder of the Agreement continues in effect." The
        statute voids the CONTRACT. Severance is the one outcome it forecloses,
        so a clause promising it is worse than silence — it tells the reader the
        risk is handled.

    (2) `frpa-7-24-answers-only-half-of-conn-gen-stat-36a-868`. The section has
        two limbs: a contract SHALL NOT CONTAIN a prejudgment-remedy waiver, and
        any such provision shall be unenforceable. Disapplying a provision
        answers the second. The first is a rule about what may be written down,
        it is subject to commissioner action under §36a-872(b) (referencing
        §§36a-50 and 36a-52), and no severance clause answers it.

    (3) `frpa-7-24-does-not-name-the-statute-that-actually-bites`, whose locus is
        "7.24 ... read against 7.5". §7.5 mandates New York or Pasco County,
        Florida. For a Virginia recipient that is a provision mandating that an
        action be brought outside the Commonwealth.

    VERIFICATION — WHAT WAS OPENED, AND WHAT THE BRIEF GOT WRONG. The brief says
    both statutes are "not vendored" and instructs marking them UNVERIFIED. Both
    ARE vendored, and one of the memo's citations is to the wrong section.

      - **Tex. Fin. Code §398.055 is vendored**, in
        `mca/sources/TX-Fin-Code-Ch-398.txt`: *"UNENFORCEABILITY OF CERTAIN
        CONTRACT PROVISIONS. A commercial sales-based financing contract that
        contains a confession of judgment provision or any similar provision is
        void and unenforceable."* VERIFIED, and it confirms finding (1): the
        subject of "void and unenforceable" is the CONTRACT.
      - **The Virginia venue rule is vendored**, in
        `mca/sources/VA-Code-6.2-2228-2238.txt`, and it is **§6.2-2234(A)**, not
        the §6.2-2236(A) the memo, the brief and `clauses/facts.ts` all cite:
        *"any cause of action arising under such contract or agreement shall be
        brought in a court in the Commonwealth. Any provision in the contract or
        agreement mandating that such action be brought outside the Commonwealth
        shall be unenforceable."* §6.2-2236 is a different section — "Validity of
        noncompliant sales-based financing" — with no subsection (A) and nothing
        about forum. `mca/statutes/ct-va-obligations.ts` already carries the
        correct citation as `va-venue-in-the-commonwealth`, digest-checked
        against the vendored file by `ct-va-statutes.test.ts`, and REVIEW-02's
        own finding text gets it right too. **The memo is the outlier.**
      - Va. Code **§6.2-2234(C)** separately prohibits a confession of judgment
        and makes such a PROVISION unenforceable — the opposite consequence from
        Texas's, which is precisely why one severance sentence cannot serve both.
      - Conn. Gen. Stat. §36a-868 is vendored in `mca/sources/CT-CGS-36a-861-
        872.txt` and reads as finding (2) describes.

    WHAT CHANGED. The clause stops being a severance clause and becomes the
    thing its heading claims: the rule that a rider is chosen BEFORE the offer.
    Severance is left to §7.7 and is expressly not the answer to a prohibited
    term. The Connecticut containment limb and the Texas whole-contract
    consequence are both answered the only way they can be — by stating what
    this Agreement does not contain, which §6.2 and §4.6 already make true. The
    Virginia forum rule is stated as an operative term with priority.

    DEPARTURE 1 — NO STATUTORY CONCLUSION IN THE BODY. The memo's text says
    "the parties acknowledge that Texas Finance Code Section 398.055 makes a
    contract containing such a provision void and unenforceable". That is a
    conclusion about the law stated in a merchant-facing sentence, which the
    brief forbids and which the Governance workflow's `No legal-advice language`
    grep would catch. The conclusion is recorded here, verified, and the body
    states the fact about the paper instead: this Agreement contains none.

    DEPARTURE 2 — THE VIRGINIA SENTENCE DOES NOT DESCRIBE §7.5. The memo writes
    "actions shall be brought in Virginia as required by Section 7.5". §7.5 does
    not require that; it requires the opposite. The sentence states the rule and
    claims priority over "any different forum provision of this Agreement,
    including Section 7.5", which is true today and stays true whatever
    `disputes-service` does with §7.5. **The conflict is handed over, not
    resolved here.** `venueRule` remains `funder-state` and is not flipped; the
    correct citation for the comment above `venueRule` in `clauses/facts.ts`
    is §6.2-2234(A), and that file is not this cluster's to edit.

    DEPARTURE 3 — THE CALIFORNIA APR RULE IS STATED WITHOUT ITS CITATION. The
    memo names Cal. Fin. Code §22806. That section is NOT vendored —
    `mca/sources/CA-10CCR-900-956.txt` is the regulation, not the Financial Code
    — so the rule is written conditionally ("Where a state requires ...") and the
    citation stays here. UNVERIFIED: nobody on this project has read §22806.

    DEPARTURE 4 — TEXAS IS SPLIT OUT INTO ITS OWN SECTION. See the record below.

    THE GATE, AND WHY IT IS NOT ON THIS CLAUSE. The brief marks this `both` on
    `recipientStates`. This half is NOT gated: every duty in it — determine the
    applicable law, deliver the disclosures, attach the rider, omit what the law
    forbids — is owed by Buyer in every state, including Florida, which is the
    only state in `LOMBARD_FACTS`. What is gated is the Texas notice, and it is a
    separate record because §86.310(d) requires it "as a separate section or
    otherwise conspicuously set out from surrounding written material".
  */
  {
    slug: 'frpa.state-law-riders-7-24',
    version: 1,
    instrument: 'frpa',
    kind: 'clause',
    includeWhen: null,
    section: 'miscellaneous',
    sortKey: 240,
    heading: 'State Law Riders',
    body: 'Before Buyer makes a specific offer, Buyer shall determine which state’s law applies to the transaction, shall give the disclosures that law requires in the form and at the time it requires, shall obtain any signature it requires on them, and shall attach the applicable state rider before this Agreement is executed. Buyer shall omit any provision that applicable law forbids this Agreement to contain. No party waives a statutory right, and this Section cures no prohibited term: a provision the law forbids this Agreement to contain is one that must not be written into it, not one to be severed under Section [[clause:frpa.severability-7-7]] afterwards.\nThis Agreement contains no confession of judgment or comparable provision, as Section [[clause:frpa.remedies-6-2]] and Section [[clause:frpa.power-of-attorney-4-6]] state, and it contains no waiver of a right to notice, to a judicial hearing or to a prior court order in connection with a prejudgment remedy. Nothing in Section [[clause:frpa.service-of-process-7-12]] or Section [[section:service]] is such a waiver.\nWhere Merchant’s principal place of business is in Virginia and this Agreement is sales-based financing under Virginia law, a cause of action arising under this Agreement shall be brought in a court in the Commonwealth of Virginia. This paragraph governs over any different forum provision of this Agreement, including Section [[clause:frpa.binding-effect-governing-law-venue-and-jurisdiction-7-5]].\nWhere applicable law requires an annual percentage rate to be stated whenever a charge, a pricing metric or a financing amount is stated for a specific offer, Buyer shall state it, using the words “annual percentage rate” or “APR”, from the time the specific offer is made and throughout the application process.\nThis Agreement authorizes no debit of any deposit account of Merchant. Where a protection applicable law gives Merchant is more favorable to Merchant than a provision of this Agreement, that protection controls.',
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
    THE ONLY RULE IN ELEVEN STATES THAT PUTS WORDS INSIDE THE AGREEMENT.

    A NEW RECORD, SPLIT OUT OF §7.24, and the split is the substance rather than
    a filing convenience. 7 TAC §86.310(d), vendored verbatim in
    `mca/sources/TX-7TAC-86-310-313.txt`: *"A contract for services under Texas
    Finance Code, Chapter 398 must contain the following statement AS A SEPARATE
    SECTION OR OTHERWISE CONSPICUOUSLY SET OUT FROM SURROUNDING WRITTEN MATERIAL"*.
    Folding the notice into §7.24's fifth paragraph, among four other states'
    rules, is the arrangement that rule exists to forbid.

    THE WORDS ARE THE REGULATOR'S AND ARE NOT REWRITTEN. This is the conformity
    surface of ADR 0008 reaching into the clause library: ADR 0012 says the
    baseline DOCUMENT is input rather than specification, and none of that
    applies to text a state wrote. `__tests__/a-notice-can-arrive-in-time.test.ts`
    re-matches the notice against the vendored adopted rule on every run through
    `containsPrescribedText`, with a paraphrase as the negative control, so a
    tidy-up of the address or a rewording is red rather than invisible.

    THE COMMISSION ENDORSED EXACTLY THIS STRUCTURE in its response to comments,
    quoted in the vendored file's header: *"If providers wish to use the same
    contract for multiple states, they might consider including the OCCC notice
    in a state-specific provision for Texas transactions."*

    A SEPARATE DISCLOSURE DOES NOT SATISFY IT, which is the owner's note and the
    reason this is not left to `mca/content/`. §86.310(a)-(c) govern the
    DISCLOSURES; §86.310(d) governs the CONTRACT. Texas's disclosure obligations
    live on the other surface and are a different set of rules — note that the
    Finance Commission expressly declined to adopt a model disclosure form, so
    Texas prescribes content there and layout nowhere.

    THE GATE, AND WHAT "PARTITION" MEANS FOR A `string[]`. ADR 0013 says a fact
    may only gate a whole clause and that the values of a fact must partition the
    clauses it gates. `recipientStates` is `McaJurisdiction[]` — a list, not an
    enum — so "one clause per value" is not available: there are 2^11 values and
    a template may be offered in several states at once. What partitions is the
    PREDICATE. `recipientStates.includes('US-TX')` is true or false, those two
    answers are exhaustive and disjoint, and they select this clause or do not.

    IT IS AN ADDITION, NOT AN ALTERNATIVE, and that is the §7.21 shape rather
    than the §4.15 shape. §7.21 is gated on `brokerChannel` with no replacement,
    because a funder with no broker channel has no ISO; a transaction outside
    Texas has no OCCC, so the clause is genuinely absent rather than differently
    worded. §7.24 is ungated and carries every duty that is owed in every state,
    so `false` leaves no hole.

    APPLYING THE DIAGNOSTIC RATHER THAN THE GATE. *"If two limbs bind different
    parties or answer different questions, the fact is wrong, not the
    granularity."* Here the two limbs answer different questions and bind
    different people — §7.24 tells BUYER what to do before it makes an offer;
    this notice tells the RECIPIENT that a state agency exists and how to reach
    it, in the agency's own words, and imposes no duty on anybody. That is the
    signal to split, and splitting is what the diagnostic asks for when the fact
    is genuinely a whole-clause question. It is a whole-clause question here
    because the clause is the notice.

    IT IS §7.25, NOT A SECOND §7.24. Two records sharing a number is the §4.15
    and §8.2 arrangement, and it is only safe because those pairs are mutually
    exclusive. This one is selected ALONGSIDE §7.24, so sharing the number would
    give a Texas document two §7.24s and make every cross-reference to §7.24
    ambiguous — the failure `select-clauses.test.ts`'s one-clause-per-number
    assertion exists for.

    EXAMINED BY. REVIEW-02, carrying the two §7.24 findings that are about Texas
    and the statute §7.24 failed to name. The record is new; the findings were
    raised against the text it is split out of, which is the same basis on which
    `frpa.rollover-carry-method-8-2` carries §8.2's.

    NOT DECIDED HERE. Whether a Lombard transaction into Texas is "commercial
    sales-based financing" under Chapter 398, and whether Lombard is a registered
    provider under §398.052, are questions for counsel and for the business.
    `LOMBARD_FACTS.recipientStates` is `['US-FL']`, so this clause is not in
    Lombard's template today. UNVERIFIED, and worth stating: 7 TAC §86.313 makes
    an automatic deposit-account debit lawful only while the provider holds a
    validly perfected FIRST-PRIORITY security interest in all of the recipient's
    accounts receivable, and §4.10 expressly disclaims any priority warranty —
    so a Texas deployment on anything but `collectionMethod: 'split-only'` needs
    that read properly first.
  */
  {
    slug: 'frpa.texas-occc-notice-7-25',
    version: 1,
    instrument: 'frpa',
    kind: 'clause',
    includeWhen: (facts) => facts.recipientStates.includes('US-TX'),
    section: 'miscellaneous',
    sortKey: 250,
    heading: 'Texas Transactions: Office of Consumer Credit Commissioner Notice',
    body: 'This Section applies where this Agreement is a contract for services under Texas Finance Code Chapter 398.\nThe Office of Consumer Credit Commissioner (OCCC) is a state agency that enforces certain laws that apply to this contract. If a complaint cannot be resolved by contacting the provider, a commercial sales-based financing recipient can contact the OCCC to file a complaint. OCCC address: 2601 N. Lamar Blvd., Austin, Texas 78705. Phone: (800) 538-1579. Website: occc.texas.gov.',
    source: { kind: 'attorney-drafted', author: null },
    status: 'draft',
    appliesInStates: ['US-TX'],
    requiredBy: '7 TAC §86.310(d)',
    examinedBy: [
      {
        review: 'REVIEW-02',
        findings: [
          'frpa-7-24-does-not-name-the-statute-that-actually-bites',
          'frpa-7-24-misstates-what-tex-fin-code-398-055-voids',
        ],
      },
    ],
  },
  /*
    THE CLAUSE FOUR OTHER CLAUSES ALREADY REFERRED TO, AND WHICH DID NOT EXIST.

    `disputeResolution: 'arbitration'` selected NO merchant-facing clause at all
    until 2026-09-11. It dropped §§7.10, 7.11, 7.19 and 7.20 and put nothing in
    their place. REVIEW-01 raised the document half of this three times —
    `frpa-arbitration-clauses-with-no-arbitration-agreement`,
    `orphan-arbitration-references`, `orphan-arbitration-twenty-day-bar` — v4
    carried sentences that assumed an arbitration it never contained. This is
    the owner's decision of 2026-09-11 to contain one.

    **WHY THE OLD POSITION WAS THE WEAKEST OF THE THREE**, in `facts.ts`'s own
    words: all three MCA forms filed as SEC exhibits in 2024-2026 pair
    arbitration WITH a class waiver, and this corpus held a bare class waiver and
    no arbitration. An arbitration clause that then dropped the class waiver
    would get the worst of both — so the individual-basis limb is inside this
    clause rather than beside it, and §7.11 (which under `courts` waives nothing)
    is simply not selected here. One rule per subject per document.

    ─── what Virginia requires, read rather than summarised ───────────────────

    VERIFIED, from `mca/sources/VA-Code-6.2-2228-2238.txt`. Va. Code
    **§6.2-2234(B)** — "Place for bringing action ...; certain fees paid by
    provider; confessions of judgment prohibited":

      *"Where a contract between a provider or broker and recipient contains an
      arbitration provision, such contract shall not require face-to-face
      arbitration proceedings outside the jurisdiction where the recipient's
      principal place of business is located."* The statute makes a provision
      requiring that unenforceable, and continues: *"The provider shall pay any
      arbitrators' expenses or fees or any other expenses or administrative fees
      incurred in the conduct of the arbitration proceedings."*

    Both are drafted NATIONALLY, so Virginia is satisfied by construction rather
    than by a rider — the device §7.5 already uses for §6.2-2234(A), and the
    reason §7.24's Virginia paragraph is a restatement rather than an override.
    An arbitration product carries the fee cost in Virginia by statute; carrying
    it everywhere costs the same in Virginia and removes a state variant.

    **THE VENUE RULE IS §6.2-2234(A), NOT §6.2-2236(A).** The 2026-09-09 memo
    cites the latter; §6.2-2236 is "Validity of noncompliant sales-based
    financing", has no subsection (A) and says nothing about forum. The error was
    copied into four places in this repository before being corrected on
    2026-09-10. It is not repeated here.

    ─── the partition, tested rather than assumed ─────────────────────────────

    §§7.10, 7.11, 7.19 and 7.20 were the `courts` bundle. ADR 0013's diagnostic
    was applied to each rather than to the bundle:

      - **§7.10, the jury waiver.** A jury waiver is meaningless once no judge
        hears the case. Genuinely absent under arbitration — the §7.21/§7.25
        shape, an absence rather than an alternative. Gate correct, unchanged.
      - **§7.11, class proceedings.** Same question, opposite answers, so the
        rule belongs to whichever forum the funder chose. The arbitration answer
        lives in this clause because an individual-basis limb IS the scope of the
        arbitration agreement, and splitting it into a second §7.11 would put two
        clauses in the same document talking about class proceedings the moment
        anyone misread the gates. Gate correct, unchanged.
      - **§7.20, defences and counterclaims.** §7.20 defers to "the applicable
        procedural law of the court"; in arbitration the rules governing the
        arbitration do that work, and this clause says so. Gate correct,
        unchanged.
      - **§7.19, the limitation period. THE GATE WAS WRONG.** See the note above
        §7.19: a limitation period applies in arbitration too, the fact answers
        WHERE a claim is heard while §7.19 answers HOW LONG there is to bring it,
        and ADR 0013's answer to a misattributed fact is `includeWhen: null` plus
        a cross-reference rather than a duplicate clause. §7.19 is now ungated and
        the last paragraph of this clause cites it.

    ─── what this clause deliberately does not say ────────────────────────────

    **NO FORUM RULE AND NO GOVERNING-LAW RULE.** §7.5 puts both in the merchant's
    state; §7.24 claims priority over "any different forum provision of this
    Agreement, including Section 7.5". A third rule on that subject is the defect
    §7.5 itself was carrying, and it is the defect REVIEW-01's
    `counterclaim-waiver-flips-by-forum` measures the cost of. This clause points
    at both and adds nothing, and
    `__tests__/an-arbitration-clause-is-one-forum-rule.test.ts` asserts that the
    set of clauses fixing a law or a court is IDENTICAL under both values of the
    fact — so a sentence sneaking in here is red even if it agrees with §7.5.

    **NO ADMINISTRATOR AND NO RULE SET ARE NAMED, AND THAT IS A REPORTED GAP
    RATHER THAN A DRAFTING CHOICE.** Which administrator, on which rules, at
    what filing fee, is a commercial decision with a price attached, and the
    standing rule is not to invent one. What the clause does instead is make the
    agreement self-executing without one: the parties agree in writing, and
    failing that either may ask a court to appoint the arbitrator, which is the
    ordinary statutory fallback. **A named administrator and rule set is the
    single largest thing counsel or the owner still owes this clause.**

    ALSO NOT DRAFTED, for the same reason and reported with it: a small-claims
    carve-out, an opt-out window, a threshold below which a claim is decided on
    documents, and any allocation of the party's own legal costs beyond §6.3.
    Every one of them is a number or a named forum.

    **THE CONSEQUENCE IS STATED, NOT BURIED.** "decided by that arbitrator and
    not by a judge or a jury, and the grounds on which a court may set an award
    aside are narrow" is a statement about what the paper does. It is not advice
    and it draws no conclusion about enforceability — the house rule §7.24
    settled.
  */
  {
    slug: 'frpa.arbitration-7-26',
    version: 1,
    instrument: 'frpa',
    kind: 'clause',
    /*
      The other half of `disputeResolution`. It is the whole clause rather than a
      limb of one — a funder that litigates has no arbitration agreement at all,
      which is the §7.21 shape — and it is cited by no ungated clause, which is
      the direction that would dangle.
    */
    includeWhen: (facts) => facts.disputeResolution === 'arbitration',
    section: 'miscellaneous',
    sortKey: 260,
    heading: 'Arbitration',
    body: 'A dispute between the parties arising out of or relating to this Agreement, or to its formation, breach or termination, shall be resolved by final and binding arbitration before a single arbitrator. A dispute decided in arbitration is decided by that arbitrator and not by a judge or a jury, and a court reviews an award only on the grounds the law governing arbitration allows. This Section reaches Merchant, Buyer and each Guarantor, and reaches no person who is not a party to this Agreement.\nThe parties shall agree in writing on the arbitration administrator and on the rules that govern the arbitration. Where they have not agreed by the time a demand for arbitration is made, either party may apply to a court of competent jurisdiction to appoint the arbitrator, as the law governing arbitration permits.\nAn arbitration proceeding conducted in person shall take place in the jurisdiction where the principal place of business Merchant gives in the Merchant and Funding Information grid is located. Merchant is not required to attend a proceeding in person anywhere else, and may agree to a different place only in writing and only after the dispute has arisen. Buyer shall pay the arbitrator’s fees and expenses and the administrative fees of the arbitration, whoever brings the claim. Section [[clause:frpa.costs-of-collection-6-3]] governs what Buyer may recover from Merchant for enforcement, and this Section adds nothing to it and takes nothing from it.\nAn arbitration under this Section proceeds on an individual basis. A claim may not be arbitrated as a class, a collective or a representative proceeding, and the arbitrator may not consolidate the claims of more than one merchant or award relief to a person who is not a party to the arbitration. Where a court holds that requirement invalid as to a particular claim, that claim shall be decided by a court and this Section does not apply to it.\nThis Section does not waive a right that applicable law does not permit to be waived. It does not reach a public-enforcement proceeding brought by or on behalf of a governmental authority, and it does not prevent a party from complaining to, or giving information to, a governmental or regulatory authority.\nEach party may assert a defence, a setoff, a recoupment and a counterclaim in the arbitration so far as the rules governing it permit, and this Agreement requires no claim to be brought as a separate proceeding.\nSection [[clause:frpa.binding-effect-governing-law-venue-and-jurisdiction-7-5]] states the law that governs this Agreement and the court an action is brought in, and this Section changes neither. A court in that state hears an application to compel or to stay an arbitration and enters judgment on an award. Section [[clause:frpa.state-law-riders-7-24]] states the forum rule that applies where the law of a particular state fixes one, and this Section yields to it. Section [[clause:frpa.contractual-statutes-of-limitations-7-19]] states the period within which a claim must be brought, and it applies to a claim in arbitration as it does to a claim in a court.',
    source: { kind: 'attorney-drafted', author: null },
    status: 'draft',
    appliesInStates: [],
    examinedBy: [
      {
        review: 'REVIEW-01',
        findings: [
          'frpa-arbitration-clauses-with-no-arbitration-agreement',
          'orphan-arbitration-references',
          'orphan-arbitration-twenty-day-bar',
          'class-waiver-forfeits-own-recovery',
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
    section: 'renewal',
    sortKey: 10,
    heading: 'Renewal Eligibility',
    body: 'Neither party is obliged to enter a subsequent purchase, and no renewal arises automatically from this Agreement.\nA subsequent purchase requires new underwriting on Merchant’s Card Receipts and existing obligations as they stand at that time, a new and complete agreement, every disclosure the law then requires, and Merchant’s fresh acceptance. Before Merchant accepts, Buyer shall state separately the additional cash Merchant will receive and the amount of any existing obligation to be settled out of the new consideration. A payoff is not cash delivered to Merchant.\nThis Agreement is settled or completed as Section [[clause:frpa.rollover-methods-8-2]] provides. Whether Buyer may hold this purchase and a subsequent purchase at the same time is governed by Section [[clause:frpa.single-active-position-4-15]]. No Guarantor’s obligation under this Agreement extends to a subsequent purchase.',
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
    section: 'renewal',
    sortKey: 20,
    heading: 'Settlement of a Prior Purchase',
    body: 'No Remaining Balance under a prior transaction is carried into the Purchased Amount stated in the Funding Terms grid. That Purchased Amount is the Purchase Price multiplied by the Factor Rate, and nothing is added to it.\nMerchant may separately authorize a stated part of the Purchase Price to be applied to settle an identified prior transaction, whether it is owed to Buyer or to another person. Before Merchant accepts, Buyer shall state in writing the prior transaction identified, its settlement amount as at the Purchase Date, the amounts already credited to it, any unpaid charge included in that settlement amount, any rebate or discount applied, the part of the Purchase Price to be applied to it, and the cash Merchant will actually receive. Buyer shall make any further disclosure the law requires of a refinancing, and shall not count a payoff as cash delivered to Merchant.\nOn the Purchase Date the authorized settlement fully extinguishes the identified prior transaction. Where that transaction is owed to Buyer, Buyer shall stop every instruction it has given an Approved Processor under it, close its ledger, record the settlement once in the ledger of each transaction, confirm to Merchant that no claim or collection right under it remains, and file or authorize the release of every filing that records its interest under it.\nMerchant is bound only by the offer it accepted, as fully calculated. A change to the settlement amount, to the Purchase Price or to the cash Merchant will receive requires corrected disclosures, and Merchant’s renewed acceptance where the law requires it. No use of the word “renewal” waives a rebate the law requires or permits a charge the law does not.',
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
    referenceId: 'frpa.rollover-methods-8-2',
    includeWhen: (facts) => facts.renewalModel === 'carry',
    section: 'renewal',
    sortKey: 20,
    heading: 'Rollover Methods',
    body: 'If Merchant has an outstanding Remaining Balance with Buyer when a subsequent purchase is made, that balance is dealt with by whichever of the following methods Merchant elects. Under both methods the Remaining Balance is the figure Section [[clause:frpa.completion-threshold-2-6]] gives, and so includes no fee, no equipment charge, no cost of enforcement and no amount owed under any other agreement.\n(a) Deduct. The Remaining Balance is settled out of the Purchase Price and appears as “Less: Prior Balance(s)” in the Itemization of Net Amount Funded grid. The new Purchased Amount is the Purchase Price multiplied by the Factor Rate. Merchant receives a reduced disbursement, because part of the Purchase Price has been applied to retire the existing obligation.\n(b) Carry. The Remaining Balance is carried into the new Purchased Amount instead of being settled out of the Purchase Price, so that the new Purchased Amount is (Purchase Price × Factor Rate) + Remaining Balance. It is carried at face value and no Factor Rate is applied to it. “Less: Prior Balance(s)” in the Itemization of Net Amount Funded grid is $0.00 under this method, and Merchant receives the full Net Amount Funded.\nUnder either method the prior agreement is at an end on the new Purchase Date. Buyer shall stop every instruction it has given an Approved Processor under it, close its ledger, record the amount dealt with once in the ledger of each transaction, confirm to Merchant that no claim or collection right under the prior agreement remains, and file or authorize the release of every filing that records its interest under it. A balance carried under (b) is collected only under the new agreement and only once.\nBefore Merchant accepts, Buyer shall state in writing the prior transaction identified, its Remaining Balance as at the Purchase Date, the amounts already credited to it, any unpaid charge included in that balance, any rebate or discount applied, the Purchased Amount each method produces, and the cash Merchant will actually receive under each. Buyer shall make any further disclosure the law requires of a refinancing, and shall not count a settlement of a prior balance as cash delivered to Merchant.\nThe elected method is recorded in the Merchant and Funding Information grid and the Purchased Amount in the Funding Terms grid is calculated on it. Buyer may propose a method when presenting the offer; Merchant may require the other, in which case Buyer shall re-issue the offer priced on the method Merchant elects. Merchant is not bound by a method it has not elected.',
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
    "WITHOUT PENALTY" IS THE DEFECT, AND IT READS AS A CONCESSION.

    WHAT WAS WRONG. "Merchant may, at any time and without penalty, deliver ...
    any or all of the unpaid Purchased Amount" tells a merchant nothing it needs
    to know. The question a merchant asks before paying early is *does this save
    me money*, and on a factor-rate purchase the answer is normally no: the
    discount was priced into the Purchased Amount at the outset and early
    delivery does not reduce it. "Without penalty" reads as though it does. The
    memo's rationale is exactly this — disclose the full-face economics rather
    than borrowing a loan's vocabulary for reassurance.

    SECOND, IT STATED A COMPLETION TEST OF ITS OWN. "Shall extinguish all future
    remittance obligations under this Agreement upon receipt of the full
    Purchased Amount." §2.6 says the Completion Threshold "is the only test of
    completion, and it governs wherever another provision of this Agreement
    describes completion differently", so this sentence was the provision §2.6
    was written to override. It now points at §2.6 instead of restating it, and
    the figure it names is the Remaining Balance — which §2.6 defines and which,
    since the spine, contains no fee.

    THIRD, "PREPAYMENT" IS LOAN VOCABULARY IN A DOCUMENT WHOSE §2.1 SAYS THIS IS
    NOT A LOAN. `defined-term-drift` and `frpa-undefined-capitalised-terms` are
    both carried on this clause, and "the unpaid Purchased Amount" was a fourth
    name for a figure §2.6 defines. The heading is "Early Completion" and the
    body uses the defined term throughout.

    DEPARTURE FROM THE MEMO — ONE, AND IT IS THE QUOTATION. The memo asks for "a
    dated written settlement quote showing credits, any discount or rebate, and
    the exact amount that ends collection". Added: the date through which the
    quotation holds good. A quotation with a date of issue and no expiry is one a
    merchant cannot safely act on, because collection continues while the money
    is in transit and the figure moves under them. It is a disclosure duty, not a
    commercial term, and no period is fixed.

    NO DAY COUNT AND NO DISCOUNT IS INVENTED. "Unless Section 1 expressly
    provides a discount" leaves the commercial answer where it belongs — in the
    completed Section 1 — and the mandatory-rebate carve-out is the memo's.

    THE SECTION 8 TRAP THE BRIEF NAMES, AND IT IS REAL. This clause is ungated
    while §8.1 and both §8.2s are gated on `renewalModel`, so a bare "Section 8"
    reference from anywhere in the corpus resolves against this clause even in a
    template that has no renewal provisions at all. Nothing cites a bare "Section
    8" today; the body below cites §2.6 and §1 and nothing in Section 8, and any
    later cluster wanting the renewal machinery must cite §8.1 or §8.2 by
    subsection. Reported: under `renewalModel: 'none'` an assembled document has
    a Section 8 containing only §8.3, which is a numbering question ADR 0011
    phase 4 owns rather than a drafting one.
  */
  {
    slug: 'frpa.voluntary-prepayment-8-3',
    version: 1,
    instrument: 'frpa',
    kind: 'clause',
    includeWhen: null,
    section: 'renewal',
    sortKey: 30,
    heading: 'Early Completion',
    body: 'Merchant may deliver all or part of the Remaining Balance to Buyer early. Buyer shall charge nothing for doing so and shall not require a period of notice.\nDelivering early does not change the amount. Unless the Merchant and Funding Information grid expressly provides a discount for early completion, or applicable law requires a rebate, completing early requires the full Remaining Balance and does not reduce the purchase discount already priced into the Purchased Amount. Buyer shall state that plainly in its offer and in every disclosure applicable law requires, and shall not describe early completion as a saving where it is not one.\nOn Merchant’s request Buyer shall promptly give Merchant a dated written settlement quotation showing the Remaining Balance, every amount credited to it, any discount or rebate applied, the exact amount that ends collection, and the date through which the quotation holds good.\nEarly completion is Merchant’s option and not an obligation on any date. When Buyer receives the amount its quotation states, this Agreement reaches the Completion Threshold, and Section [[clause:frpa.completion-threshold-2-6]] governs what Buyer shall then do and by when.',
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
