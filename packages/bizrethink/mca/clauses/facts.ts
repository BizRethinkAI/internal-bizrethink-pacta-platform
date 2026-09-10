import type { McaJurisdiction } from '../jurisdictions';

/**
 * The narrow set of facts a clause may branch on.
 *
 * DERIVED, NOT GUESSED. `clauses/types.ts` refused to ship this type early and
 * said why: *"that type should be derived from what the clauses actually branch
 * on rather than guessed at now"*, because this package had already paid once
 * for forward scaffolding — an AI config that asked for a GCP project id, a
 * location and an API key for four months before anything read any of them.
 *
 * What made it derivable was the counsel memo of 2026-09-09. Reviewing all 101
 * FRPA clauses split them three ways: 58 defects that are wrong under every
 * template, 23 that are a defect **and** conditional, and **12 that are not
 * textual fixes at all** — the memo proposes deleting or rewriting a clause
 * where the real question is whether that clause belongs in this deal. Those 12
 * are where these keys come from.
 *
 * THE STANDARD FOR ADDING ONE, inherited verbatim from the lease's
 * `ClauseFacts`: *"a clause that needs to know something not on this list is a
 * signal that the answer schema is missing a field, not a licence to reach into
 * arbitrary state."*
 *
 * THESE ARE TEMPLATE FACTS, NOT DEAL FACTS, and the distinction is load-bearing.
 * They are answered **once by a funder**, in Pacta's interview, and produce a
 * template. Per-deal values — merchant identity, the funding figures, Section 1
 * — arrive from `lombard-platform` over the API and fill widgets; they select no
 * clauses. A per-deal interview would put a human in the loop on every funding,
 * which is exactly the automation
 * [ADR 0010](../../../../docs/adr/0010-agreement-builder-lives-in-pacta.md)
 * exists to preserve.
 *
 * See [ADR 0011](../../../../docs/adr/0011-the-mca-clause-library-is-a-library.md).
 */
export type McaFacts = {
  /**
   * How money actually reaches the funder.
   *
   * Decides whether the ACH backstop clause exists at all. Also the fact the
   * Texas analysis turns on: 7 TAC §86.313 permits automatically debiting a
   * deposit account only while holding a validly perfected, FIRST-PRIORITY
   * security interest in all of the recipient's accounts receivable — and
   * "automatic" expressly includes a recipient handing over more than one
   * prewritten cheque.
   */
  collectionMethod: 'split-only' | 'ach-only' | 'split-with-ach-backstop';

  /**
   * How far a human signer is personally on the hook.
   *
   * `limited-conduct` is fraud, materially false present-fact representations
   * and intentional diversion, with business failure, insolvency and bankruptcy
   * expressly excluded. `full-performance` guarantees every representation,
   * warranty and covenant — which is what all three market forms filed as SEC
   * exhibits in 2024-2026 actually do, so the narrow version is the unusual one.
   */
  guarantyScope: 'none' | 'limited-conduct' | 'full-performance';

  /**
   * Which number the Specified Percentage is taken of.
   *
   * `net` is the card settlement actually payable to the merchant, after
   * refunds, chargebacks, separately identified taxes and gratuities payable to
   * others, and the processor's own lawful charges and reserves. `gross` is the
   * settlement before those.
   *
   * THIS IS A PRICING DECISION, NOT A DRAFTING ONE, and it is why it is a fact
   * rather than a sentence in a clause. Five adjustments sit between the two
   * numbers, and each of them moves the economic percentage. A funder who prices
   * on one base and defines the other has an agreement that collects a different
   * amount than it quoted.
   *
   * IT REACHES BEYOND THE AGREEMENT. Underwriting, the processor instruction and
   * **every state disclosure** must be computed on the same base — the finance
   * charge, the total cost, the estimated periodic payment. A mismatch here is
   * not a clause defect, it is a disclosure defect on the conformity surface
   * ([ADR 0008](../../../../docs/adr/0008-mca-is-two-surfaces-not-one.md)),
   * which is a different regulator's problem.
   */
  settlementBase: 'net' | 'gross';

  /**
   * Whether point-of-sale equipment is part of this funder's offering at all.
   *
   * Decides the equipment explainers, the §5.5 insurance clause and §4.11's
   * ranking limb — all four gates read `!== 'none'` and nothing reads more.
   *
   * IT IS NOT WHERE BUY-VERSUS-LEASE IS DECIDED. That is the merchant's, made
   * in Section 1 before signature (owner, 2026-09-10: *"Lease or buy, merchant
   * decide while signing up"*), and §002 offers both paths with a
   * no-double-charge rule between them.
   *
   * The row used to carry four values naming a funder-side model —
   * `purchased-at-funding`, `deferred`, `separate-lease`. Three were
   * indistinguishable to every gate that read them, and `deferred` stopped
   * having clause text behind it once §2.6 said the Remaining Balance never
   * includes an equipment charge: a Purchased Amount of `(Purchase Price ×
   * Factor Rate) + Equipment Cost Deferred` puts one inside it by construction.
   */
  equipment: 'none' | 'merchant-elects';

  /**
   * Whether a prior balance can be carried into a new purchase.
   *
   * `carry` is the mechanism that produces a "$100,000 advance" delivering
   * $65,000 of new cash while the new Purchased Amount still reads $140,000.
   */
  renewalModel: 'none' | 'payoff-only' | 'carry';

  /** Whether the funder may hold more than one live position against the same merchant. */
  concurrentPositions: boolean;

  /**
   * Courts or arbitration — and it decides four clauses as one bundle: the jury
   * waiver, the class waiver, the contractual limitations period and the
   * counterclaim provision.
   *
   * All three market forms pair arbitration WITH a class waiver. This corpus
   * currently holds a bare class waiver and no arbitration clause, which is the
   * weakest of the three available positions and is why the memo proposes
   * deleting four separate clauses that are really one decision.
   */
  disputeResolution: 'courts' | 'arbitration';

  /**
   * Whose courts hear a dispute.
   *
   * THE CITATION HERE WAS WRONG IN THREE PLACES UNTIL 2026-09-10, copied from
   * the 2026-09-09 memo. The venue rule is **§6.2-2234(A)**, "Place for bringing
   * action". §6.2-2236 is "Validity of noncompliant sales-based financing", has
   * no subsection (A), and says nothing about forum. Both are vendored in
   * `mca/sources/VA-Code-6.2-2228-2238.txt`, and `statutes/ct-va-obligations.ts`
   * already carried the correct one, verbatim and digest-checked. REVIEW-02 also
   * had it right; the memo is the outlier.
   *
   * Not merely a preference: Va. Code §6.2-2234(A) makes any provision
   * mandating a forum outside the Commonwealth unenforceable for covered
   * transactions, so `merchant-state` is what removes the need for a Virginia
   * variant rather than merely being conservative.
   */
  venueRule: 'funder-state' | 'merchant-state';

  /**
   * The states this template will be offered in.
   *
   * ONLY TEXAS ADDS CONTENT. Of the eleven states tracked, 7 TAC §86.310(d) is
   * the sole rule that requires words INSIDE the agreement — the OCCC complaint
   * notice, verbatim, "as a separate section or otherwise conspicuously set out".
   * Connecticut §36a-868 and Virginia §6.2-2234(A) are prohibitions, satisfied
   * by a base form that omits the terms, and the rest are separate disclosure
   * documents on the conformity surface
   * ([ADR 0008](../../../../docs/adr/0008-mca-is-two-surfaces-not-one.md)).
   *
   * So this is base-plus-Texas, not eleven of anything.
   */
  recipientStates: McaJurisdiction[];

  /** Whether a broker channel exists — decides §7.21 and whether the ISO PRA is in the set. */
  brokerChannel: boolean;

  /** Whether an individual consumer report is pulled — decides §4.3 and Exhibit C. */
  consumerReportPulled: boolean;

  /**
   * Whether the processor has actually agreed to the split.
   *
   * A UCC §9-406 notification of a PARTIAL assignment does not compel an
   * acquirer to split settlement, so a split nobody has accepted is not a
   * collection mechanism. The memo rates this Critical and holds the whole
   * Exhibit A reference on it.
   */
  processorSplitAccepted: boolean;
};

/**
 * Lombard Capital LLC's answers — the first funder profile, and today the only one.
 *
 * A PROFILE IS NOT AN INTERVIEW ANSWER. It records what this funder normally
 * does and, where it matters, why. An interview may override per template; this
 * is the default and the place the reasoning lives.
 *
 * IT USED TO DESCRIBE THE PAPER. It no longer does, and that is an owner
 * decision of 2026-09-10, not a drift.
 *
 * The old rule was that `equipment`, `renewalModel`, `concurrentPositions` and
 * `venueRule` record what v4 ships rather than what the 2026-09-09 memo
 * recommends, because *"a profile that describes a document nobody has signed
 * would make every selection disagree with the document it is supposed to
 * reproduce, and the disagreement would have surfaced as a failing fidelity
 * test"*.
 *
 * **That reason is gone.** [ADR 0012](../../../../docs/adr/0012-the-baseline-document-is-input-not-specification.md)
 * retired the fidelity tests, so nothing is trying to reproduce v4 any more,
 * and four rows were left anchored to a document the library has stopped
 * copying. The owner's instruction is to adopt the memo's recommended design,
 * which the memo itself states as one coherent set: narrow the purchased asset
 * to a percentage of net card settlements; remove deferred equipment; separate
 * fees from the collection cap; eliminate automatic Carry and concurrent Buyer
 * positions; use merchant-state venue; restrict the guaranty to the
 * signatory's own covered misconduct.
 *
 * **`equipment`, `renewalModel` and `concurrentPositions` have moved.
 * `venueRule` has not.**
 *
 * The three that moved could only move once the clauses they gate stopped
 * hiding a second rule inside the one the fact decides. `renewalModel` gated
 * the whole of §8.2, which held both methods, so `payoff-only` would have
 * dropped the Deduct method a payoff funder needs along with the Carry method
 * it does not. `concurrentPositions` gated the whole of §4.15, so `false` would
 * have deleted the multi-position rule rather than stating the opposite one,
 * and left §7.1's "Except as expressly provided in Sections 3.3, 3.4 and 4.15"
 * pointing at nothing. Both are now exhaustive pairs of clauses — see
 * `frpa/enrollment.ts` §4.15 and `frpa/miscellaneous.ts` §8.2 — so every value
 * of the fact selects exactly one clause and the fact decides a whole clause.
 *
 * `venueRule` stays at `funder-state` because the clause it describes is not
 * this cluster's and does not read it. §7.5 is `includeWhen: null` and mandates
 * New York law with New York or Pasco County, Florida forums in its body;
 * nothing in the corpus reads `venueRule` at all. Flipping the row would leave
 * the profile asserting merchant-state venue while the only venue clause in the
 * library mandates the funder's — a contradiction rather than a gap, and harder
 * to see than one. It moves with §7.5, which is `disputes-service`'s (memo 061).
 *
 * `split-only` is the value with no written history anywhere. §2.5 (the gated
 * ACH backstop) and §7.14 (a blanket debit authority) both left the paper
 * between change-notes 10 and 16 in `lombard-contracts`, and **no change note
 * records when or why**. It is recorded here as the funder's design because
 * that is what the shipped v4 does, not because a decision was found.
 */
export const LOMBARD_FACTS: McaFacts = {
  collectionMethod: 'split-only',
  /*
    UNCONFIRMED, AND THE MOST CONSEQUENTIAL UNKNOWN IN THIS ROW.

    `net` describes the clause as drafted on 2026-09-10 — `frpa.definitions`
    defines Card Receipts net of the five adjustments. It does NOT describe a
    confirmed business fact: nobody has established which base Lombard actually
    prices on.

    If Lombard prices on gross settlement, the definitions clause is wrong for
    Lombard AND every disclosure figure computed from it is wrong with it. That
    is the one question in this profile whose answer changes documents on two
    surfaces at once.
  */
  settlementBase: 'net',
  guarantyScope: 'limited-conduct',
  /* Lombard offers equipment; the merchant elects buy or lease when signing.
     v4 carried "Equipment Cost Deferred" in Section 1.3 and this row used to
     record that, on the principle retired above. §§002/003 state it as
     $0.00, so `deferred` no longer names anything the corpus can build. */
  equipment: 'merchant-elects',
  /* The memo's design: a prior balance is settled out of the new Purchase
     Price and disclosed, never folded into the new Purchased Amount. v4's §8.2
     offered Carry and this row used to record that, on the principle retired
     above. Carry survives in the library as `frpa.rollover-carry-method-8-2`,
     which this value deselects — a fact value with no clause behind it is what
     `equipment: 'deferred'` was. */
  renewalModel: 'payoff-only',
  /* v4's §4.15 affirmatively authorised concurrent Lombard positions while
     Lombard's own marketing promised no stacking — REVIEW-01's
     `lombard-multi-position-vs-no-stack`. The memo resolves it by changing the
     product, and this is that change. `frpa.single-active-position-4-15` is
     selected in its place; the cascade clause is not. */
  concurrentPositions: false,
  disputeResolution: 'courts',
  /* THE ONE ROW OF THE FOUR THAT HAS NOT MOVED, and deliberately. §7.5 mandates
     New York law and New York or Pasco County, Florida forums, in its body, with
     no gate. The memo recommends merchant-state venue, partly because Va. Code
     §6.2-2234(A) voids a non-Virginia forum for covered transactions. Moving
     this row before §7.5 is rewritten would make the profile disagree with the
     only clause on the subject. It moves with §7.5 — `disputes-service`, memo
     entry 061. */
  venueRule: 'funder-state',
  recipientStates: ['US-FL'],
  brokerChannel: true,
  consumerReportPulled: true,
  processorSplitAccepted: false,
};
