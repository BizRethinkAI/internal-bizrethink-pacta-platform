import type { McaClause } from '../types';

/**
 * Section 6 — events of default and remedies.
 *
 * ALL FOUR ARE AUTHORED. Rewritten on 2026-09-10 under
 * [ADR 0012](../../../../../docs/adr/0012-the-baseline-document-is-input-not-specification.md)
 * together with §4.12, which lives in `enrollment.ts` and is the fifth clause of
 * this cluster because it granted remedies from twenty pages away.
 *
 * §6.1 AND §6.2 HAD TO MOVE TOGETHER, and that is the counsel memo's central
 * finding here. v4's §6.2.1 accelerated and raised the Specified Percentage to
 * 100% of card settlement proceeds for five enumerated triggers — the limb
 * everybody looked at. One limb below, §6.2.5 let Buyer instruct the processor
 * to remit *"all or any portion"* of settlement, **without notice to Merchant or
 * any Guarantor**, under an irrevocable power of attorney, on ANY Event of
 * Default. Editing the visible acceleration clause and leaving that in place
 * produces a document that reads reformed and collects identically.
 *
 * `__tests__/remedies-reach-no-further.test.ts` is what holds the five together:
 * no remedy reaches beyond the Purchased Receipts actually generated, and
 * business failure is not a default. It was red on 46 of its 51 assertions
 * before these bodies existed. The five it was already green on are the
 * assertions that v4's three good ideas SURVIVE — the overriding
 * bankruptcy/business-failure exclusion, the actual-and-reasonable cost
 * standard, and the refusal of any contractual rate of interest.
 */
export const FRPA_DEFAULT: McaClause[] = [
  /*
    WHAT WAS WRONG. Fifteen limbs, opening with "Merchant shall violate any term
    or covenant in this Agreement". Every covenant in Sections 4 and 5 was
    therefore an Event of Default, so a late financial statement under §5.2 and a
    fraud sat on the same footing, and both reached the Guaranty through §9.2's
    "all of the warranties and covenants". That is REVIEW-01's
    `default-on-any-term-no-cure-no-materiality`, `no-cure-period-anywhere` and
    `guaranty-covers-every-covenant` at once.

    Six of the fifteen are worse than broad — they are defaults on the merchant's
    BUSINESS rather than on its conduct, and each one converts a purchase of
    future receipts into recourse for the thing Buyer supposedly bought the risk
    of: 6.1.6/6.1.7 (using or changing a deposit account), 6.1.9 (any act
    reducing collateral value), 6.1.10 (default under any other agreement with
    Buyer), 6.1.13 (taking additional financing), 6.1.15 (interrupting or
    suspending the business). §2.4 as rewritten by the spine says in terms that a
    good-faith change of account or processor is NOT a default; until this
    rewrite §6.1.6 and §6.1.7 said the opposite in the same document.

    Two more were internally contradictory. 6.1.4 defaulted on a sale that §5.18
    expressly permits (`frpa-6-1-4-defaults-on-a-sale-5-18-expressly-permits`),
    and 6.1.5 defaulted on giving the very bulk-sale notice §6.4 COMPELS
    (`frpa-6-4-compels-the-notice-6-1-5-makes-a-default`).

    WHAT CHANGED. Three limbs, all of them misconduct, all of them requiring
    intent: fraud, intentional diversion of receipts that have actually arisen,
    and knowingly selling the same receipts twice. "Nothing else is an Event of
    Default" closes the list, and a separate paragraph names the seventeen things
    that are not one, because a closed list a reader has to infer is not closed
    in practice — REVIEW-01 raised `reconciliation-switched-off-by-any-breach`
    against a document that never said reconciliation survived a breach either.

    THE BEST SENTENCE IN THIS CONTRACT IS PRESERVED WORD FOR WORD. The overriding
    Bankruptcy and Business Failure paragraph is v4's, unchanged, including
    "Notwithstanding anything in this Agreement to the contrary" and its reach to
    "any liability of any Guarantor". It is the only sentence in the document
    that overrides the whole document, and it is what stops
    `bankruptcy-carveout-defeated-by-5-9`,
    `guaranty-reaches-business-failure` and
    `frpa-9-4-creates-guarantor-liability-on-merchant-bankruptcy` from being true
    of Section 6. The test asserts the exact string; a prose improvement that
    quietly narrowed its reach is the regression nothing else would catch.

    A REFUTATION, RECORDED BECAUSE THE REGISTER IS WRONG.
    `guarantor-termination-notice-is-default` is carried on both §6.1 and §6.2,
    and on §6.2 it overstates. Guarantor termination WAS an Event of Default
    under 6.1.3, but 6.1.3 is **not** one of §6.2.1's five enumerated
    acceleration triggers (6.1.4, 6.1.5, 6.1.8, 6.1.13, 6.1.14), so the direct
    link from a guarantor's notice to a 100% sweep did not exist. The finding is
    right about §6.1 and wrong about §6.2. Both halves are moot now — the notice
    is expressly not a default and there is no acceleration to trigger — but the
    correction is recorded rather than buried, because a register that
    over-claims is how a later reader stops trusting the ones that are right.

    THE PLAID DEFAULT RESOLVES BY DELETION.
    `frpa-plaid-default-not-enumerated-in-61` observed that §4.16 declares a
    failure to maintain the Plaid connection to be a default that §6.1 never
    enumerated. No covenant failure is an Event of Default now, so the mismatch
    is gone; §4.16's own sentence saying otherwise is `data-and-channel`'s.

    DEPARTURES FROM THE MEMO. Four, all of them additions.
    (1) The memo's not-a-default list has six items. This one has seventeen,
        adding the six business-and-account defaults the memo's rationale names
        in prose but its replacement text does not close: bank or processor
        failure, addition or replacement of an account or processor under §2.4,
        additional financing, a fall in collateral value, a collection below the
        Estimated Daily Holdback, and a loss of information access. Leaving them
        to "nothing else is an Event of Default" would have been enough as a
        matter of construction and not enough as a matter of what a merchant can
        point at.
    (2) The limbs are lettered (a), (b), (c) so that a cross-reference has
        somewhere to land. §9.2 currently points at "Section 6.1.8", which this
        rewrite deletes; the guaranty cluster must repoint it at Section 6.1(b).
    (3) The final paragraph says a covenant breach does not SUSPEND Section 3.
        The memo does not say it. `reconciliation-switched-off-by-any-breach` is
        the finding, and §3.1 as rewritten lets a request be made while an Event
        of Default is alleged; saying it in both places is how the two clauses
        stop disagreeing.
    (4) Records, and the inference drawn from their absence. Neither is in the
        memo's replacement; both are in the paragraph below, because §3.3 was
        rewritten to depend on this clause after the memo was written.

    §3.3 NOW LEANS ON THIS CLAUSE, AND THAT CHANGED WHAT IT HAD TO SAY. The
    reconciliation cluster deleted §3.3's five-Workday withdrawal-and-default
    mechanism and replaced it with a single limit: Buyer may pursue a remedy in
    respect of Merchant's records **only for conduct that independently satisfies
    this Section**. That deletion is only as strong as this list of limbs — a
    §6.1 with any limb a missing document or a slow answer could trip would undo
    it from this side. Two sentences were added for that reason:

      - a failure or delay in giving Buyer records or information is named in
        terms as not an Event of Default, rather than left to "nothing else is";
      - "Incomplete information is not evidence of the conduct described in (a),
        (b) or (c)", which answers the other half of the same move. §3.3 says
        Buyer "shall not presume fraud, diversion or concealment from incomplete
        information"; a clause that closed the default and left the inference
        open would let an unproveable fraud allegation do the work the deleted
        mechanism used to do.

    THE DEFINED TERMS THIS CLAUSE ALMOST CREATED. An earlier draft said "a request
    for Reconciliation or an Adjustment under Section 3", capitalised, which is
    how v4 wrote them. Neither is a defined term any more — the reconciliation
    cluster dropped both, because nothing in the six instruments defined either
    and `frpa.definitions` does not. Capitalising them here would have recreated
    `frpa-undefined-capitalised-terms` in the act of fixing a different finding,
    and this clause carries that finding.

    UNVERIFIED AUTHORITY. The memo's narrowing rests on its authorities [A1–A4],
    which the standing brief identifies as Richmond Capital, 246 AD3d 585,
    Apollo Funding, 241 AD3d 1508, NewCo, 250 AD3d 1641, and LG Funding. NOBODY
    ON THIS PROJECT HAS PULLED ANY OF THEM FROM THE OFFICIAL REPORTERS, and the
    memo's own authority table is not in `lombard-contracts`, so the mapping from
    [A1]–[A4] to those four names is itself unverified. No citation appears in
    any clause body.
  */
  {
    slug: 'frpa.events-of-default-6-1',
    version: 1,
    instrument: 'frpa',
    kind: 'clause',
    /*
      THIS WAS `null` UNTIL 2026-09-11, AND THAT IS WHAT MADE SECTION 6 DECIDE
      THE GUARANTY. See the note above the record below. The gate is the
      complement of that record's, so every template gets one §6.1 and no
      template gets two; `guarantyScope: 'none'` takes this one, because a
      funder with no Guarantor still needs an Events of Default clause and the
      denial is trivially true where there is no Guarantor to deny.
    */
    includeWhen: (facts) => facts.guarantyScope !== 'full-performance',
    number: '6.1',
    section: 'default',
    sortKey: 10,
    heading: 'Events of Default',
    body: 'An Event of Default occurs only if Merchant (a) commits fraud in procuring or performing this Agreement; (b) intentionally diverts, conceals or transfers Purchased Receipts that have actually arisen, for the purpose of preventing their delivery to Buyer; or (c) knowingly sells or grants another person a conflicting interest in the same Purchased Receipts, for the purpose of defeating Buyer’s ownership. Nothing else is an Event of Default.\nNotice and Opportunity to Cure. Buyer shall give Merchant written notice identifying the conduct and the facts Buyer relies on. Where the conduct is capable of cure, no Event of Default occurs unless it remains uncured ten (10) Workdays after Merchant receives that notice, and Buyer shall exercise no remedy under Section 6.2 before that period has run. Buyer may apply to a court for temporary relief in accordance with applicable law.\nWhat is not an Event of Default. None of the following is itself an Event of Default, and none of them gives Buyer any remedy under this Section 6: a decline in or an absence of Card Receipts; a delay in payment by Merchant’s customers; an ordinary loss of the business; a good-faith closure, suspension, relocation, dissolution or sale of the business; Merchant’s insolvency, or a bankruptcy filing by or against Merchant; the failure, outage or withdrawal of service of a Bank or an Approved Processor; a loss of access to information or to a system; a collection below the Estimated Daily Holdback; a reconciliation request under Section 3, an adjustment to the Estimated Daily Holdback under Section 3.4, or a good-faith dispute; a failure or delay in giving Buyer records or information requested under this Agreement; a notice of termination or non-renewal given by a Guarantor; the addition or replacement of an Approved Bank Account or an Approved Processor under Section 2.4; additional financing taken by Merchant; a fall in the value of any Collateral; and a default by Merchant under any other agreement, including another agreement with Buyer.\nBankruptcy and Business Failure. Notwithstanding anything in this Agreement to the contrary, neither the filing of a voluntary or involuntary petition under Title 11 of the United States Code, nor Merchant’s insolvency, nor the cessation of Merchant’s business for lack of revenue, shall constitute an Event of Default or give rise to any remedy under this Section 6 or to any liability of any Guarantor.\nCovenants that are not Events of Default. Merchant’s covenants in this Agreement, including those in Sections 4 and 5, remain covenants, and a breach of one is an Event of Default only where it is conduct described in (a), (b) or (c) above. A breach that is not an Event of Default may support proportionate lawful relief for proven direct loss under Section 6.2; it does not make the uncollected Purchased Amount payable, does not suspend Merchant’s rights under Section 3, and does not create liability for any Guarantor. Incomplete information is not evidence of the conduct described in (a), (b) or (c). Buyer bears the risk that Purchased Receipts may never arise. This Section controls any inconsistent term of this Agreement and of any document incorporated into it, subject to mandatory law.',
    source: { kind: 'attorney-drafted', author: null },
    status: 'draft',
    appliesInStates: [],
    examinedBy: [
      {
        review: 'REVIEW-01',
        findings: [
          'bankruptcy-carveout-defeated-by-5-9',
          'default-on-any-term-no-cure-no-materiality',
          'defined-term-drift',
          'frpa-plaid-default-not-enumerated-in-61',
          'frpa-undefined-capitalised-terms',
          'guarantor-termination-notice-is-default',
          'guaranty-covers-every-covenant',
          'guaranty-reaches-business-failure',
          'no-cure-period-anywhere',
          'reconciliation-switched-off-by-any-breach',
        ],
      },
      {
        review: 'REVIEW-02',
        findings: [
          'frpa-6-1-4-defaults-on-a-sale-5-18-expressly-permits',
          'frpa-6-4-compels-the-notice-6-1-5-makes-a-default',
          'frpa-9-4-creates-guarantor-liability-on-merchant-bankruptcy',
        ],
      },
    ],
  },
  /*
    THE SAME SECTION, FOR THE FUNDER WHO TAKES THE WIDE GUARANTY.

    WHAT WAS WRONG, AND IT WAS WRONG IN A CLAUSE NOBODY LOOKS AT FOR IT. The
    record above is the whole of §6.1 and was ungated, so it was in every
    template. It ends "This Section controls any inconsistent term of this
    Agreement and of any document incorporated into it, subject to mandatory
    law", and four sentences earlier it says a breach that is not an Event of
    Default "does not create liability for any Guarantor". An Event of Default
    is one of three kinds of misconduct. Read together those two sentences say a
    guarantor answers for those three and for nothing else, WHATEVER SECTION 9
    SAYS.

    That is the right rule for `guarantyScope: 'limited-conduct'` and it is the
    product's one genuinely better-than-market term. It is the wrong rule for
    `full-performance`, where the owner decided on 2026-09-11 that the guaranty
    reaches every representation, warranty and covenant — which is what all
    three MCA forms filed as SEC exhibits in 2024-2026 do.
    `frpa.full-performance-guaranty-9-2` says so openly, "whether or not that
    failure is an Event of Default", and §6.1 then overrode it. The wide guaranty
    was text the document contradicted twenty pages later, and
    `__tests__/a-full-recourse-guaranty-is-still-a-purchase.test.ts` pinned the
    contradiction with a block written to go red the day it was closed.

    WHY A PAIR RATHER THAN AN EDIT, AND WHY NOT A GATED SENTENCE. Deleting the
    denial outright takes it away from the narrow template, where it is the
    point. Keeping it takes the wide guaranty away from the funder who bought
    it. The fact decides a whole clause, so
    [ADR 0013](../../../../../docs/adr/0013-a-funder-profile-describes-the-funder.md)
    settles the shape: one section number, two records, opposite rules, mutually
    exclusive gates, exactly one selected for every value of the fact. It is the
    §4.15 / §8.2 / §§9.2-9.6 shape. ADR 0013 rejects limb granularity in terms,
    so gating the sentence inside one clause was not available and was not tried.
    `__tests__/one-section-6-1-per-document.test.ts` states the partition over
    every value of the fact and reconstructs this body from the one above by
    swapping the single sentence, which is what stops the two drifting.

    THE BANKRUPTCY / INSOLVENCY / BUSINESS-FAILURE CARVE-OUT IS UNCHANGED HERE,
    AND THAT IS DRAFTING JUDGEMENT RATHER THAN A FUNDER PREFERENCE. It is v4's
    own paragraph, verbatim, including its reach to "any liability of any
    Guarantor". A guaranty that pays when the business simply fails is the
    single strongest argument that the transaction was a loan, which is the
    characterisation this entire document is built to defend — and every market
    form guarantees covenants while still excluding business failure, so keeping
    it costs the wide product nothing it actually wanted. §9.2's wide record
    already excludes the same events and points here for each of them; this is
    the clause they point at, and if it moved they would point at nothing.

    WHAT REPLACED THE GUARANTOR SENTENCE. Under full recourse a covenant breach
    that is not an Event of Default can reach a Guarantor — that is the decision
    — but only for the same thing Merchant answers for. §6.2 gives Buyer, for
    such a breach, "proportionate judicial relief for proven direct loss" and
    nothing else, and already says "A claim against a Guarantor may be brought
    only as Section 9.2 permits". So the replacement caps the guarantor claim at
    that same relief, on the same proof, routes it through §9.2, and denies in
    terms that any breach makes the uncollected Purchased Amount payable by a
    Guarantor. A guaranty OF THE MONEY is the recharacterisation vector, and it
    is denied here as well as in §9.2 because §6.1 is the clause that claims to
    control.

    THE HOUSE PATTERN, FOLLOWED RATHER THAN INVENTED. §§4.10, 4.12, 6.2, 6.3,
    7.4 and 7.9 all reach a Guarantor the same way: they cap and point at §9.2,
    they never grant. A §6.1 that granted would be a second guaranty living
    outside Section 9, which is the defect
    `__tests__/personal-liability-is-section-9-only.test.ts` exists to catch and
    which this record is deliberately drafted to stay clear of — no concession
    was needed in that file.

    NOT DRAFTED, AND REPORTED RATHER THAN INVENTED. A cure period for a covenant
    breach that is not an Event of Default. §6.1's ten Workdays run on conduct
    capable of cure that would otherwise BE an Event of Default; §6.2 gives "at
    least ten (10) Workdays to cure" for a non-default covenant breach. Neither
    is a period this record may set, and inventing one would be a commercial
    value nobody decided. The same gap is recorded above
    `frpa.full-performance-guaranty-9-2`.

    §6.4 CARRIES THE SAME SENTENCE AND IS NOT FIXED HERE. "A failure or delay in
    giving a notice under this Section ... does not create liability for any
    Guarantor" is in `frpa.required-notifications-6-4`, which is ungated. Read
    against a guaranty of every covenant it carves §6.4's own notice covenant
    out of the guaranty. It is a narrowing rather than a contradiction — §9.2
    forbids a clause that EXPANDS the Guaranty, not one that limits it — and it
    is a different record answering a different question, so it is reported
    rather than edited.

    EXAMINED BY. The same findings as the record above, because it is the same
    section and every one of them was raised against this text too. A split that
    dropped them would make the wide template look reviewed where the narrow one
    is not.

    UNVERIFIED AUTHORITY. Unchanged from the record above: the narrowing rests
    on the memo's [A1-A4], which the standing brief identifies as Richmond
    Capital, Apollo Funding, NewCo and LG Funding. NOBODY ON THIS PROJECT HAS
    PULLED ANY OF THEM FROM THE OFFICIAL REPORTERS. No citation appears in any
    body.
  */
  {
    slug: 'frpa.full-performance-events-of-default-6-1',
    version: 1,
    instrument: 'frpa',
    kind: 'clause',
    /* The complement of the record above. Between them the section is always present. */
    includeWhen: (facts) => facts.guarantyScope === 'full-performance',
    number: '6.1',
    section: 'default',
    sortKey: 10,
    heading: 'Events of Default',
    body: 'An Event of Default occurs only if Merchant (a) commits fraud in procuring or performing this Agreement; (b) intentionally diverts, conceals or transfers Purchased Receipts that have actually arisen, for the purpose of preventing their delivery to Buyer; or (c) knowingly sells or grants another person a conflicting interest in the same Purchased Receipts, for the purpose of defeating Buyer’s ownership. Nothing else is an Event of Default.\nNotice and Opportunity to Cure. Buyer shall give Merchant written notice identifying the conduct and the facts Buyer relies on. Where the conduct is capable of cure, no Event of Default occurs unless it remains uncured ten (10) Workdays after Merchant receives that notice, and Buyer shall exercise no remedy under Section 6.2 before that period has run. Buyer may apply to a court for temporary relief in accordance with applicable law.\nWhat is not an Event of Default. None of the following is itself an Event of Default, and none of them gives Buyer any remedy under this Section 6: a decline in or an absence of Card Receipts; a delay in payment by Merchant’s customers; an ordinary loss of the business; a good-faith closure, suspension, relocation, dissolution or sale of the business; Merchant’s insolvency, or a bankruptcy filing by or against Merchant; the failure, outage or withdrawal of service of a Bank or an Approved Processor; a loss of access to information or to a system; a collection below the Estimated Daily Holdback; a reconciliation request under Section 3, an adjustment to the Estimated Daily Holdback under Section 3.4, or a good-faith dispute; a failure or delay in giving Buyer records or information requested under this Agreement; a notice of termination or non-renewal given by a Guarantor; the addition or replacement of an Approved Bank Account or an Approved Processor under Section 2.4; additional financing taken by Merchant; a fall in the value of any Collateral; and a default by Merchant under any other agreement, including another agreement with Buyer.\nBankruptcy and Business Failure. Notwithstanding anything in this Agreement to the contrary, neither the filing of a voluntary or involuntary petition under Title 11 of the United States Code, nor Merchant’s insolvency, nor the cessation of Merchant’s business for lack of revenue, shall constitute an Event of Default or give rise to any remedy under this Section 6 or to any liability of any Guarantor.\nCovenants that are not Events of Default. Merchant’s covenants in this Agreement, including those in Sections 4 and 5, remain covenants, and a breach of one is an Event of Default only where it is conduct described in (a), (b) or (c) above. A breach that is not an Event of Default may support proportionate lawful relief for proven direct loss under Section 6.2; it does not make the uncollected Purchased Amount payable and does not suspend Merchant’s rights under Section 3. Where Section 9.2 guarantees the covenant breached, a claim against a Guarantor is limited to that same proportionate lawful relief for that same proven direct loss, on the same proof, and is brought only as Section 9.2 permits; no breach of this Agreement, and no Event of Default, makes the uncollected Purchased Amount payable by a Guarantor. Incomplete information is not evidence of the conduct described in (a), (b) or (c). Buyer bears the risk that Purchased Receipts may never arise. This Section controls any inconsistent term of this Agreement and of any document incorporated into it, subject to mandatory law.',
    source: { kind: 'attorney-drafted', author: null },
    status: 'draft',
    appliesInStates: [],
    examinedBy: [
      {
        review: 'REVIEW-01',
        findings: [
          'bankruptcy-carveout-defeated-by-5-9',
          'default-on-any-term-no-cure-no-materiality',
          'defined-term-drift',
          'frpa-plaid-default-not-enumerated-in-61',
          'frpa-undefined-capitalised-terms',
          'guarantor-termination-notice-is-default',
          'guaranty-covers-every-covenant',
          'guaranty-reaches-business-failure',
          'no-cure-period-anywhere',
          'reconciliation-switched-off-by-any-breach',
        ],
      },
      {
        review: 'REVIEW-02',
        findings: [
          'frpa-6-1-4-defaults-on-a-sale-5-18-expressly-permits',
          'frpa-6-4-compels-the-notice-6-1-5-makes-a-default',
          'frpa-9-4-creates-guarantor-liability-on-merchant-bankruptcy',
        ],
      },
    ],
  },
  /*
    WHAT WAS WRONG. Two collection routes to the same place, drafted a paragraph
    apart, only one of which anybody was watching.

    §6.2.1 declared the full uncollected Purchased Amount "due and payable in
    full immediately" and raised the Specified Percentage to 100% of card
    settlement proceeds. That is `acceleration-defeats-indefinite-term`: an
    agreement with no maturity date that a default converts into a fixed sum due
    on a fixed date HAS a maturity date, and a purchase whose collection rate
    changes on breach is a loan accelerating.

    §6.2.5 then let Buyer notify the processor and "direct such processor to make
    payment to Buyer of all or any portion of the amounts received", "without
    notice to Merchant or Guarantor(s)", under "an irrevocable power of attorney
    coupled with an interest". No trigger list, no cure, no cap, no copy to the
    merchant. It reaches the same 100% as §6.2.1 on ANY Event of Default —
    which, under old §6.1.1, meant any breach of any covenant.

    The lead-in made it worse by saying the remedies "are cumulative and not
    exclusive, and shall be in addition to any other rights ... provided by law
    or equity", which is `remedy-stack-exceeds-the-debt` — the stack of §6.2.1,
    §6.2.3's fees, §6.3's costs, §6.3.1's interest and Appendix A's flat fees can
    total more than the balance being collected.

    CROSS-REFERENCE 1, AND HOW IT RESOLVES. The spine left a deliberate
    contradiction: `frpa.definitions` says the Specified Percentage "does not
    increase on an Event of Default"; §6.2.1 raised it to 100%. **The definitions
    win and the increase is deleted.** Three reasons, in order of weight.

    (1) A collection rate that changes on breach is a recharacterisation vector
        in its own right, independent of the acceleration beside it. The economics
        of a true sale do not know whether the seller has breached; the economics
        of a loan do.
    (2) 100% of card settlement proceeds is not 100% of the purchased asset. The
        granting clause sells the Specified Percentage of Card Receipts and says
        Buyer "owns nothing else"; Merchant's retained share is expressly outside
        the sale. A remedy that takes it is Buyer collecting property it never
        bought, which no default converts into property it did buy.
    (3) It is the only resolution that leaves one settlement base. Any surviving
        default increase would have to be measured against something, and the two
        candidates — "card settlement proceeds" and Card Receipts — are the
        mismatch `one-settlement-base.test.ts` exists to prevent.

    WHAT CHANGED. Judicial relief, for proved conduct and proved loss, bounded by
    what was actually generated. Collection after default is the same split as
    before default, at the same percentage, with a copy of every processor
    instruction going to Merchant at the same time — which is what closes §6.2.5
    without leaving Buyer no lawful way to keep collecting what it owns.
    Recovery attributable to the purchased pool credits the Remaining Balance
    dollar for dollar, so a recovery cannot both be paid and be collected again
    through the split.

    DEPARTURES FROM THE MEMO. Five.
    (1) The memo says the Specified Percentage does not increase "on default".
        Written here as "on an Event of Default", to match the defined term the
        definitions clause uses. The looser phrase would leave a reader asking
        whether an uncured covenant breach counts.
    (2) The memo permits an instruction "subject to the processor's signed
        agreement and valid prior rights". §2.3 as rewritten already requires
        Buyer to obtain each Approved Processor's written acceptance before the
        Purchase Date and already carries the one aggregate cap, so this clause
        points at §§2.3 and 2.4 rather than restating a weaker version of them.
        A second, softer statement of the same requirement is how two clauses
        start disagreeing.
    (3) The memo's list of what the Agreement does not authorize is expanded by
        one item: collection of Merchant's retained share or of any non-card
        receipt. `default-collection-reaches-cash-and-checks` is the finding, and
        v4's own §6.2.1 already carried a partial version of this sentence — one
        of the few places v4 was ahead of the memo.
    (4) Every base this clause names is named explicitly — Card Receipts or
        Purchased Receipts — and never bare "Receipts" relying on the
        definitions bridge. The reconciliation cluster found why it matters: §3.1
        reconciled against "the Receipts that Merchant collected", a GROSS
        number, while Buyer collects on Card Receipts, net of refunds,
        chargebacks and the processor's charges. Reconciling a net collection
        against a gross base manufactures a permanent apparent under-collection
        in Buyer's favour, every month, on every deal — and the bridge would have
        hidden that rather than fixed it. A remedy whose reach cannot be read off
        the page is the same defect in a more expensive place.
    (5) "Costs are governed solely by Section 6.3" is kept, and §6.2.3's separate
        fee entitlement is deleted rather than narrowed. §6.2.3 charged fees on
        any judgment, §6.3 capped them, and Appendix A charged a third rate —
        `three-inconsistent-attorney-fee-formulas`. One entitlement, in one place.

    A CONTRADICTION THIS CLAUSE DELIBERATELY CREATES. "This Agreement authorizes
    no ... signing of process in Merchant's name" and "Buyer holds no power of
    attorney for the purposes of this Section" are inconsistent with §4.6, which
    still appoints Buyer attorney-in-fact "with full authority to take any action
    or execute any instrument or document" on any violation of any term. §4.6 is
    the `enrollment` cluster's and cannot be edited here. It is stated as a live
    conflict rather than softened, exactly as the spine stated this cluster's.

    NO GATE, AND THIS IS A DEPARTURE FROM THE BRIEF. The brief marks §6.2
    `action: both` with `fact: collectionMethod`, i.e. rewrite AND gate.
    `includeWhen` stays `null`, because every value of that fact needs a remedies
    clause and this is the only one in the library: a gate true for `split-only`
    would assemble an FRPA with **no Section 6.2 at all** for an ACH funder,
    which is worse paper, not safer paper. The honest alternative is a second,
    ACH-shaped remedies clause — a new slug, which `library.test.ts` (200) and
    `frpa-coverage.test.ts` (97) both pin, and which this cluster may not add
    without editing a test to make it pass. The body is written to be true under
    every value instead: it forbids a deposit-account debit **as a remedy**,
    while ordinary ACH collection, if a funder ever has it, lives in §2 and §4.1
    and is not a remedy at all. Recorded for the brief-writer to overrule.

    UNVERIFIED AUTHORITY. The memo cites [A1–A4, A7, A12] here — per the standing
    brief, Richmond Capital, 246 AD3d 585, Apollo Funding, 241 AD3d 1508, NewCo,
    250 AD3d 1641, LG Funding, Principis and Grafton. NONE HAS BEEN PULLED FROM
    THE OFFICIAL REPORTERS BY ANYBODY ON THIS PROJECT, and the memo's authority
    table is not in `lombard-contracts`, so which letter is which case is itself
    an assumption. The memo's own position is that NY decisions do not
    categorically prohibit acceleration; the narrowing here is therefore a
    deliberate choice to sit inside the case law rather than at its edge, not a
    statement that acceleration is unlawful.
  */
  {
    slug: 'frpa.remedies-6-2',
    version: 1,
    instrument: 'frpa',
    kind: 'clause',
    includeWhen: null,
    number: '6.2',
    section: 'default',
    sortKey: 20,
    heading: 'Remedies',
    body: 'After an Event of Default and the expiry of any cure period given by Section 6.1, Buyer may seek lawful judicial relief to recover the Purchased Receipts actually generated and wrongfully withheld, and proven direct damages caused by the conduct described in Section 6.1. Buyer must establish the conduct, causation and the amount of its loss. The uncollected Purchased Amount is not automatically due, is not made due by an Event of Default, and is not agreed liquidated damages. No remedy in this Agreement compensates Buyer for Card Receipts that were never generated, and Buyer may not recover the same loss twice. An amount Buyer recovers on account of the Purchased Receipts is credited to the Remaining Balance dollar for dollar under Section 2.6.\nCollection is unchanged by default. The Specified Percentage does not increase on an Event of Default, and no Event of Default converts this Agreement into an obligation to pay a fixed sum on a fixed date. Buyer’s only means of collection remains the one established by Sections 2.3 and 2.4 — the Specified Percentage of Card Receipts, through an Approved Processor, subject to the single aggregate cap in Section 2.3. Buyer may give an Approved Processor accurate instructions to continue that remittance, and shall send Merchant a copy of each such instruction at the same time. Buyer may not instruct an Approved Processor to remit all of Merchant’s card settlement proceeds, or any share greater than the Specified Percentage of Card Receipts, and may not redirect funds committed to another creditor or factor without legally sufficient consent or assignment.\nWhat this Agreement does not authorize. This Agreement authorizes no debit of any deposit account of Merchant, no collection of Merchant’s retained share of Card Receipts or of any non-card receipt, no confession of judgment, and no signing of process in Merchant’s name. Buyer holds no power of attorney for the purposes of this Section and may take no self-help remedy. Enforcement of the security interest granted by Section 4.10 is confined to that Section and to the requirements of Article 9 of the Uniform Commercial Code, of judicial process, and of applicable bankruptcy law. A claim against a Guarantor may be brought only as Section 9.2 permits.\nWhat survives enforcement. Merchant’s right to a reconciliation, and to an adjustment of the Estimated Daily Holdback, under Section 3, Buyer’s refund and accounting obligations, the Completion Threshold and the aggregate cap in Section 2.3, and every defence available to Merchant under applicable law, all remain in effect while an Event of Default is continuing and while Buyer is enforcing. Where Merchant breaches a covenant that is not an Event of Default, Buyer’s only remedy is proportionate judicial relief for proven direct loss, sought after written notice and at least ten (10) Workdays to cure; such a claim does not accelerate Card Receipts that have not been generated, does not expand the Guaranty and does not suspend Section 3. The rights this Section gives Buyer are its only rights on an Event of Default, and no other provision of this Agreement adds to them. Costs of enforcement are governed solely by Section 6.3.',
    source: { kind: 'attorney-drafted', author: null },
    status: 'draft',
    appliesInStates: [],
    examinedBy: [
      {
        review: 'REVIEW-01',
        findings: [
          'acceleration-defeats-indefinite-term',
          'attorneys-fees-two-different-rates',
          'charges-scattered-outside-fee-schedule',
          'default-collection-reaches-cash-and-checks',
          'default-on-any-term-no-cure-no-materiality',
          'guarantor-termination-notice-is-default',
          'liquidated-damages-plus-actual-costs',
          'remedy-stack-exceeds-the-debt',
          'three-inconsistent-attorney-fee-formulas',
        ],
      },
      {
        review: 'REVIEW-02',
        findings: [
          'frpa-4-12-reopens-the-acceleration-6-2-closed',
          'frpa-6-4-compels-the-notice-6-1-5-makes-a-default',
        ],
      },
    ],
  },
  /*
    WHAT WAS RIGHT, AND SURVIVES. Three things, and the redraft is worse paper if
    it loses any of them: costs limited to what was actually incurred and is
    reasonable; ONE aggregate ceiling of 25% across every cost-bearing provision,
    with no double recovery; and no contractual rate of interest, in a document
    that says it is not a loan. The last sentence of §6.3.1 is kept verbatim.

    THE 25% CEILING IS UNTOUCHED BY THE SPINE. What moved is collection through
    the sweep, not the entitlement. v4 measured it against "the undelivered
    Purchased Amount"; this says "the Remaining Balance", which §2.6 now defines
    as the Purchased Amount less every amount credited to it. Same number, one
    defined term instead of an undefined phrase — REVIEW-01's
    `undefined-money-terms` in its smallest form.

    WHAT WAS WRONG. Four things.
    (1) "shall pay to Buyer, on demand". A cost is owed when it is adjudicated or
        agreed, not when it is invoiced; on-demand payment makes Buyer the judge
        of its own fee.
    (2) "administrative or filing fees" and "collection-agency commissions" pull
        in internal overhead and a percentage surcharge — the same money as
        `liquidated-damages-plus-actual-expenses`, arriving as a cost rather than
        as damages.
    (3) "this Agreement, the Guaranty, or any related agreement" reaches every
        document in the file, and "Each Merchant and Guarantor" makes every
        guarantor liable for every cost including those of claims against
        somebody else.
    (4) §6.3.1 fixed prejudgment interest at "the statutory rate provided by the
        law of the forum". Which law supplies the rate, and from what date, is
        not the forum's to decide by contract.

    WHAT CHANGED BEYOND THE MEMO — TWO ADDITIONS, AND THEY ARE THE ONES THAT
    CONNECT THIS CLAUSE TO THE SPINE.
    (1) Costs "do not increase the Purchased Amount or the Remaining Balance".
        §2.6 says the Remaining Balance never includes a fee or a cost of
        enforcement; without this sentence §6.3 is the clause that would put one
        there, and the two would disagree the day a cost was awarded.
    (2) Costs "may not be collected through the processor split under Section
        2.3". Collecting a fee through the split takes it out of the purchased
        pool, which both lengthens the agreement and defeats §2.3's single
        aggregate cap. The memo says it; it is repeated here as a cross-reference
        rather than a slogan because §2.3 is where the cap lives.

    A CONTRADICTION THIS CLAUSE CREATES, AND WHOSE IT IS. §7.9's indemnity charges
    interest "at the rate set forth in Section 6.3.1, from the date of demand
    until paid in full", which is `indemnity-charges-interest-document-denies`.
    §6.3.1 now supplies no rate and says a demand creates no right to interest,
    so §7.9's sentence points at nothing. §7.9 belongs to the `guaranty` cluster.

    NOT DONE HERE. `frpa-arbitration-clauses-with-no-arbitration-agreement`,
    `orphan-arbitration-references` and `orphan-arbitration-twenty-day-bar` are
    carried on this clause by the register and are not about it — they are the
    FRPA's references to an arbitration agreement it does not contain, which is
    the `disputes-service` cluster's `disputeResolution` decision. Nothing in
    this redraft mentions arbitration, which is the whole of what this cluster
    can honestly do about them.
  */
  {
    slug: 'frpa.costs-of-collection-6-3',
    version: 1,
    instrument: 'frpa',
    kind: 'clause',
    includeWhen: null,
    number: '6.3',
    section: 'default',
    sortKey: 30,
    heading: 'Costs of Collection',
    body: 'To the extent permitted by law, Merchant shall reimburse Buyer’s reasonable and necessary external attorneys’ fees, court costs and collection expenses, documented and actually incurred, to establish and enforce a valid claim under Section 6.2 or to defend a third-party claim covered by Section 7.9, and only in the amount awarded by a court of competent jurisdiction or expressly agreed in a written settlement. No internal overhead, employee time, unearned commission, percentage surcharge, cost allocated to an unsuccessful claim, or duplicate charge is recoverable, and in no event shall Buyer recover the same cost or expense more than once. Buyer shall give Merchant an itemized statement and the supporting invoices before any amount under this Section is payable. A Guarantor is liable only for the costs attributable to a valid claim against that Guarantor under Section 9.2. Any mandatory right of Merchant or of a Guarantor to recover fees reciprocally is preserved.\nOne ceiling. The aggregate of all enforcement costs and expenses recoverable from Merchant and any Guarantor under this Agreement and every document incorporated into it — including this Section, Section 4.10, Section 7.9 and Appendix A — shall not exceed twenty-five percent (25%) of the Remaining Balance immediately before the conduct giving rise to the valid claim. That ceiling is not an agreed fee, is not a liquidated amount, and is not evidence that a charge below it is reasonable. Costs and expenses under this Section do not increase the Purchased Amount or the Remaining Balance, and may not be collected through the processor split under Section 2.3.\n6.3.1 Prejudgment and Postjudgment Interest\nPrejudgment and postjudgment interest is recoverable only if, from the date and at the rate, that applicable law authorizes or a court orders. No contractual rate and no default rate accrues under this Agreement, and an invoice or a demand for payment creates no right to interest. This Agreement is not a loan and Buyer does not charge interest on it.',
    source: { kind: 'attorney-drafted', author: null },
    status: 'draft',
    appliesInStates: [],
    examinedBy: [
      {
        review: 'REVIEW-01',
        findings: [
          'attorneys-fees-two-different-rates',
          'charges-scattered-outside-fee-schedule',
          'frpa-arbitration-clauses-with-no-arbitration-agreement',
          'indemnity-charges-interest-document-denies',
          'interest-charges-inside-a-not-a-loan',
          'liquidated-damages-plus-actual-costs',
          'liquidated-damages-plus-actual-expenses',
          'orphan-arbitration-references',
          'orphan-arbitration-twenty-day-bar',
          'remedy-stack-exceeds-the-debt',
          'three-inconsistent-attorney-fee-formulas',
        ],
      },
    ],
  },
  /*
    WHAT WAS WRONG. The clause was unperformable, and its breach was a default.

    v4 required written notice of a Title 11 filing "within twenty-four (24)
    hours". §7.3 makes notice effective on RECEIPT, by certified mail or
    overnight courier. Certified mail does not arrive within 24 hours, so no
    merchant could comply by the only channel the document gave them — that is
    `frpa-6-4-24-hour-notice-cannot-be-given-under-7-3`, and it is not strictness,
    it is a trap. It compounded: the seven-day sale notice this clause COMPELS
    was itself an Event of Default under old §6.1.5
    (`frpa-6-4-compels-the-notice-6-1-5-makes-a-default`).

    AND THE REAL RISK IS NOT THE DEADLINE. A missed bankruptcy notice that
    triggers a default is indirect recourse against bankruptcy — the thing §6.1's
    overriding paragraph exists to refuse. A clause can defeat that paragraph by
    making the NOTICE of the bankruptcy the breach rather than the bankruptcy.

    WHAT CHANGED. Prompt notice, with an ordinary expectation of three Workdays
    "where that is practicable", on a channel that can carry it. Failure or delay
    is not a default, accelerates nothing, earns Buyer no charge, and creates no
    guarantor liability. Buyer's stay compliance is Buyer's own obligation and
    does not depend on Merchant's notice, which is the point of knowing at all.

    DEPARTURES FROM THE MEMO. Two.
    (1) The memo routes the notice through §7.3 and calls it "the revised
        operational notice channel". §7.3 has not been revised — it belongs to
        the `miscellaneous` cluster, which is drafting in the same wave as this
        one — so a bare reference would re-create the defect if that revision
        lands narrow or lands late. This clause carries its own carve-out:
        notwithstanding §7.3, email to the address in Section 1, effective WHEN
        SENT. Receipt-based effectiveness is precisely what made 24 hours
        impossible. §3.2 already carries the same carve-out for a Reconciliation
        request, so the pattern is the document's own.
    (2) The memo's "Failure or delay in notice does not itself accelerate any
        amount or create guarantor liability" is extended to say it is not an
        Event of Default and earns Buyer no charge. Appendix A prices notice
        failures; without the second half, the fee schedule reopens what this
        clause closes.

    UNVERIFIED AUTHORITY. The memo cites [A19] here. It is not in
    `lombard-contracts` and nobody has read it. Recorded so a reviewer looks it
    up rather than inherits it.
  */
  {
    slug: 'frpa.required-notifications-6-4',
    version: 1,
    instrument: 'frpa',
    kind: 'clause',
    includeWhen: null,
    number: '6.4',
    section: 'default',
    sortKey: 40,
    heading: 'Required Notifications',
    body: 'Merchant shall notify Buyer under Section 7.3 promptly after Merchant learns of a filing under Title 11 of the United States Code by or against Merchant, and ordinarily within three (3) Workdays where that is practicable, so that Buyer can comply with the automatic stay and with any other applicable law. Merchant shall give Buyer reasonable advance notice of a planned sale of the kind described in Section 5.18, ordinarily seven (7) calendar days where that is practicable. Notwithstanding Section 7.3, a notice under this Section may be sent by email to the address stated in Section 1 and is effective when sent.\nA failure or delay in giving a notice under this Section is not an Event of Default, does not accelerate any amount, does not entitle Buyer to any charge, and does not create liability for any Guarantor. Buyer shall comply independently with any stay, court order or other legal restriction of which it has notice, whether or not Merchant gives notice under this Section.',
    source: { kind: 'attorney-drafted', author: null },
    status: 'draft',
    appliesInStates: [],
    examinedBy: [
      {
        review: 'REVIEW-02',
        findings: [
          'frpa-6-4-24-hour-notice-cannot-be-given-under-7-3',
          'frpa-6-4-compels-the-notice-6-1-5-makes-a-default',
        ],
      },
    ],
  },
];
