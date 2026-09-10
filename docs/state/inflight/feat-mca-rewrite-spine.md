# feat/mca-rewrite-spine — the first drafting, and the eight clauses everything else stands on

**Branch:** `feat/mca-rewrite-spine`, stacked on `docs/adr-0012-v4-is-input` (#151).
The first work under [ADR 0012](../../adr/0012-the-baseline-document-is-input-not-specification.md).

## What these eight are for

The counsel memo of 2026-09-09 names one structural finding above all others, and
this cluster exists to fix it:

> **The purchased asset and the payment base are different assets.** The granting
> clause sells all cash, cheque, ACH and card receipts; collection is a fixed
> percentage of card settlements; reconciliation can reach the broader universe.

That mismatch is the recharacterisation vector, the undisclosed catch-up claim
and the ordinary-course dispute generator at once. Fixed here, roughly fifteen
clauses this cluster does not touch stop conflicting.

Drafted first and alone because every other cluster works against these defined
terms.

## What changed

`frpa.holdback-explainer`, `frpa.granting-clause` (preamble); `frpa.definitions`,
§§2.1, 2.2, 2.3, 2.4, 2.6 (purchase).

**`Card Receipts` is defined once** — the net card settlement actually payable to
Merchant, after refunds, chargebacks, separately identified taxes and gratuities
payable to others, and the processor's own lawful charges and reserves. **Those
five were the silent movers**: each could shift the economic percentage with no
amendment and no disclosure. `Receipts` and `Daily Receipts` bridge to it, which
is how eight clauses reach the fifteen they never edit.

The granting clause now sells the Specified Percentage of Card Receipts and says
what it does not sell. The delivery cap no longer floats.

`__tests__/one-settlement-base.test.ts` — 25 assertions, **written first and red
on every one** before the bodies existed.

## `settlementBase` is now a fact, not a comment

Owner's call: net versus gross is a **template-builder interview question**, per
org. It is a pricing decision, not a drafting one — five adjustments sit between
the two numbers and each moves the economic percentage.

**It reaches beyond the agreement.** Underwriting, the processor instruction and
**every state disclosure** must compute on the same base. A mismatch is not a
clause defect, it is a disclosure defect on the conformity surface — a different
regulator's problem.

`LOMBARD_FACTS.settlementBase` is `'net'`, and the comment says loudly that this
**describes the clause as drafted, not a confirmed business fact.** Nobody has
established which base Lombard prices on. If it is gross, the definitions clause
is wrong for Lombard and every disclosure figure computed from it is wrong with
it.

**Nothing gates on it yet.** Closing that means splitting the Card Receipts
definition out of `frpa.definitions` into its own selectable clause with a net
and a gross variant. The whole definitions clause must **not** be duplicated —
that is the twins problem.

## Both transcription guards retired

`bodies-match-the-document` went red on exactly the eight rewritten clauses, as
ADR 0012 authorises. Its body-containment and number-beside-heading assertions
are retired; **the digest assertion survives** — it catches a vendored `.docx`
changing underneath us and is not about bodies.

**`frpa-coverage`'s line-accounting went with it, and that is a correction to the
ADR.** It asks the mirror question — is anything in the *document* missing from
the library — and retiring only one leaves the other asserting that we preserved
v4. The drafting agent hit the red, **refused to silence it**, and named both
cheap silencers as worse: declaring the superseded lines in `FRPA_NON_CLAUSE`
leaves a check that passes by construction as the other 89 clauses are rewritten;
nulling `bodiesVerifiedAt` hides the authorised reds too. Amended into ADR 0012.

`letters-coverage.test.ts` and `coverage.test.ts` carry the same assertion for
the other instruments and retire the same way as those are rewritten.

## Two corrections to ADR 0012 found by drafting it

1. **The roles row listed four placeholders; there are three.** `PARTY_ROLES` is
   `funder`, `equipmentAffiliate`, `processor`. There is no `{{merchant}}` and no
   `{{broker}}` — *Merchant* and *Buyer* are document-defined terms. Corrected,
   or every later cluster hits the same wall.
2. The `frpa-coverage` retirement above.

## The instruction the agent refused, and why it was right

The brief said to gate §2.3 on `processorSplitAccepted`. The agent wrote it, ran
it, and removed it:

- it broke *"selects every clause of the FRPA for the funder whose paper it is"*.
  `LOMBARD_FACTS.processorSplitAccepted` is **false** — correctly; nobody has
  countersigned. Holding both would mean falsifying the fact or shipping a
  template with no collection mechanism.
- **gating the clause out yields worse paper, not safer paper.** The defect is
  operational, and the memo's actual fix — Buyer obtains the processor's written
  acceptance before funding — is now in the body, where it binds.

The gap is real and recorded: a template can be assembled whose split nobody has
agreed to. The day countersigned acceptances exist, the fact flips and a gate
becomes free.

## Handoff — what the next nine clusters must honour

1. **§6.2.1 versus the definitions — a deliberate contradiction.** *"The Specified
   Percentage does not increase on an Event of Default"* contradicts §6.2.1's rise
   to 100%. The memo's position is that a default increase is itself a
   recharacterisation vector. **Section 6 cluster owns the resolution.**
2. **§4.1 versus §2.6.** §4.1 adds Appendix A fees to the Remaining Balance; §2.6
   now says the Remaining Balance never includes a fee. **Enrollment cluster.**
   §6.3's 25% enforcement-cost cap is untouched — what moved is collection through
   the sweep, not the entitlement.
3. **§5.17 versus §2.4.** §5.17 still forbids adding an account. **Representations.**
4. **§§3.1–3.4 reconcile against a base that moved under them.** Re-read every
   deadline and credit mechanic against the new definitions first.
5. **§4.10 / UCC-1.** The grant is now narrower than §4.10 reads — the collateral
   description on any live filing must be re-checked, and underwriting with it.
6. **Exhibit A must be re-drafted to §2.3's specification.** Both REVIEW-02 Payzli
   findings resolve once the letter's stop figure and §2.6's Remaining Balance are
   the same number, which they now are.
7. **§7.16** is load-bearing for §2.4's interruption remittance.
8. **§4.15's cascade** now cascades on a purchase-only Remaining Balance.

## State

51 test files, **1746 tests**, typecheck exit 0, biome clean, Node 24.20.0.

## Owed

- **`every-fact-value-is-reachable` needs `settlementBase` in its matrix and
  `settlementBase:gross` (and `:net`) in `GAPS`.** That test is on #150's branch,
  not this one, so the update lands when #150 merges.
- **`examinedBy` now over-claims on these eight.** REVIEW-01 and REVIEW-02 read
  the *old* text. `ReviewId` admits only those two values, so there is no honest
  way to record that the 2026-09-09 memo informed these. Rule 1 keeps the field
  non-empty; it no longer means what it says here.
- **`frpa.holdback-explainer` still has `kind: 'clause'`** although ADR 0011 and
  the memo both treat it as an explainer.
- **Nothing here is reviewed.** All eight keep `author: null`, and
  `assertPublishable` refuses them. That gate is why drafting proceeds without
  counsel in the room.
