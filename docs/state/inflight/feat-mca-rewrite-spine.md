# feat/mca-rewrite-spine — rewriting the FRPA, and the fact model that had to move with it

**Branch:** `feat/mca-rewrite-spine`, PR #152, now based on `main` (#151 merged
2026-09-10). The drafting under [ADR 0012](../../adr/0012-the-baseline-document-is-input-not-specification.md)
and [ADR 0013](../../adr/0013-a-funder-profile-describes-the-funder.md).

**28 of 97 FRPA clauses rewritten.** 58 test files, 2158 tests, typecheck 0.
Nothing here is reviewed: every clause keeps `author: null` and
`assertPublishable` refuses all 28.

## What has landed

| commit | what |
|---|---|
| `e3175f01f` | wave 1 — the spine (8), reconciliation, default-remedies, representations |
| `03058943c` | wave 2 — guaranty (10), enrollment (10) |
| `854964e2d` | `equipment` becomes a merchant election; the profile stops describing v4 |
| `4933d23de` | ADR 0013 |
| `0c9d4e895` | ADR 0012's stale `lombard-contracts` section, corrected |

**In flight:** `renewal-positions` (§§004, 4.15, 5.16, 7.13, 8.1, 8.2), which also
carries the three remaining fact rows.

## The structural finding this exists to fix

> **The purchased asset and the payment base are different assets.** The granting
> clause sold all cash, cheque, ACH and card receipts; collection was a fixed
> percentage of card settlements; reconciliation could reach the broader universe.

`Card Receipts` is now defined once — net card settlement actually payable to
Merchant, after refunds, chargebacks, separately identified taxes and gratuities
payable to others, and the processor's own lawful charges and reserves. **Those
five were the silent movers**: each could shift the economic percentage with no
amendment and no disclosure. `Receipts` and `Daily Receipts` bridge to it, which
is how eight clauses reach the fifteen they never edit.

## The fact model was the real defect

Three of eleven facts were **inert** — declared in `McaFacts`, read by nothing.
A fact that nothing gates on is a hardcode wearing a fact's clothes, and it is
invisible until a template is assembled from it.

- **`settlementBase`** — added on the owner's call; net vs gross is a pricing
  decision, per org, and it reaches the conformity surface because every state
  disclosure must compute on the same base. `LOMBARD_FACTS` says `net` and says
  loudly that this describes the clause as drafted, **not a confirmed business
  fact**.
- **`guarantyScope`** — closed in wave 2. §§9.2, 9.4, 9.5, 9.6 gate on
  `limited-conduct`; §§10.2, 10.4 on `!== 'none'`. Before this a funder
  answering `none` still got a personal guaranty.
- **`equipment`** — `'none' | 'merchant-elects'`. Owner: *"Lease or buy, merchant
  decide while signing up."*

**`equipment` was hiding a missing product.** `instrumentsFor` gated the Equipment
Lease and Subscription instruments on `equipment === 'separate-lease'` while the
profile said `'deferred'` — so the only funder in the library had a suite whose
FRPA sends the lease path to *"a separate written agreement"* the product did not
include. **Found by the typechecker, not a test**, when collapsing the union made
the comparison provably empty. Both instruments are now in Lombard's suite and
**both are unreviewed**.

## Three fidelity guards, all retired

ADR 0012 retired two and missed the third; ADR 0013 catches it.

1. `bodies-match-the-document`'s body assertions — **the digest assertion survives**
   and is not part of the retirement.
2. `frpa-coverage`'s line-accounting — the same guard pointed the other way.
3. **`selectClauses` completeness** — *"selects every clause of the FRPA for the
   funder whose paper it is"*. Its own docstring says the property holds *because*
   the profile describes v4 rather than the memo, which is exactly the premise the
   owner reversed. Replaced by **cross-reference coherence**: every cross-reference
   in a selected clause points at a clause that is also selected.

Four drafting agents were told the completeness invariant was sacred before the
owner's decision made it wrong. That reversal is in ADR 0013 so it is not
re-argued.

## The limb problem — three sightings, one rule

**A fact frequently decides a limb; `includeWhen` only decides a clause.**
`equipment` decides §4.11's ranking limb; `renewalModel` decides §8.2's Carry
method but gates all of §8.2; `concurrentPositions` decides §4.15's cascade but
gates all of §4.15 — and the memo wants the opposite rule *stated* there, not
silence.

Rule, now in ADR 0013: **split the clause so a fact decides a whole clause**, and
move the counts `frpa-coverage` and `library.test.ts` pin in the same commit.

**A fact row and the clauses it gates move in the same change.** This is why
`equipment` moved alone and `renewalModel`, `concurrentPositions`, `venueRule`
wait for the cluster that owns §§4.15, 8.1, 8.2.

## What the set-level assertions found that no brief named

Both are cases where asserting over the **set** beat reading clauses one at a time.

- **§7.21** makes each Guarantor indemnify Buyer for all losses *"resulting from
  any act or omission by any ISO"* — unlimited personal liability for a broker the
  guarantor did not choose and whose agreement with Buyer they have never seen.
  The memo does not raise it. → `data-and-channel`.
- **`frpa.guarantor-information-9-1`** is an ungated `field-group`, so a
  `guarantyScope: 'none'` template still collects a guarantor's SSN for a guaranty
  the document does not contain. The new coherence property should catch it.

## Departures worth a second look

- **Deferred equipment is zeroed out.** §2.6 says the Remaining Balance never
  includes an equipment charge, and `(Purchase Price × Factor Rate) + Equipment
  Cost Deferred` puts one inside it by construction. Equipment can still be funded
  out of the Purchase Price; what goes is applying the factor and *then* adding the
  goods price on top.
- **§4.6's notice is a condition, not a promise** — *"An act taken without that
  notice is not authorized by this Section"*. The memo's version leaves an
  unnoticed act effective.
- **`guarantyScope: 'full-performance'` is deliberately unauthored.** It is what
  all three market forms filed as SEC exhibits do, which is precisely why it is not
  a drafting agent's decision. A named gap.
- **The memo contradicts itself on Carry** — its narrative says the design removes
  it; its own §8.2 replacement text keeps it as a merchant election.
  `renewal-positions` must resolve it and say which way.

## Owed

- **`every-fact-value-is-reachable` (#150)** enumerates the `equipment` union and
  must drop the two retired values when it merges; it also needs `settlementBase`.
- **`examinedBy` over-claims** on every rewritten clause. REVIEW-01 and REVIEW-02
  read the *old* text and `ReviewId` admits no third value, so there is no honest
  way to record that the 2026-09-09 memo informed these. **Giving the memo an
  identity in the review vocabulary would close this and the six refuted
  dispositions below at once.**
- **Six findings the memo refuted** still need corrected dispositions in
  `lombard-contracts`. (The REVIEW-02 manifest gap ADR 0012 records is **already
  closed** — see ADR 0013 §6.)
- **`frpa.holdback-explainer` still has `kind: 'clause'`** although ADR 0011 and
  the memo both treat it as an explainer.
- **§4.13 needs three Section 1 grid rows** that do not exist — offer expiry,
  outstanding conditions, latest funding date. Same shape as §2.3's Exhibit A and
  §5.11's permitted prior interests. **Form changes, not drafting.**
- **The UCC-1 collateral description must be re-checked** against §4.10 as
  rewritten. A filing drafted against v4 describes more than the clause now
  authorises. Operations, not drafting.
- **The `No legal-advice language` gate's comment-exclusion regex** only skips
  lines starting with `//`, `*` or `/*`, so it fires on the bare-indented
  continuation lines the drafting comments use. Deciding whether to widen it is
  deliberately separate from making our own text pass.

## Still to draft

`data-and-channel` (9), `fees-and-money` (6), `miscellaneous` (12),
`disputes-service` (11). **All four touch `miscellaneous.ts`, so they run one at a
time**, not in parallel.
