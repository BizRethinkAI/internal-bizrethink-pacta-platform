# feat/mca-rewrite-spine — rewriting the FRPA, and the fact model that had to move with it

**Branch:** `feat/mca-rewrite-spine`, PR #152, now based on `main` (#151 merged
2026-09-10). The drafting under [ADR 0012](../../adr/0012-the-baseline-document-is-input-not-specification.md)
and [ADR 0013](../../adr/0013-a-funder-profile-describes-the-funder.md).

**34 of 99 FRPA clause records rewritten, 2 added.** 57 test files, 2172 tests,
typecheck 0, Governance clean.

Nothing here is reviewed. Every clause is `status: 'draft'` with `author: null`
and zero counsel approvals exist. **`assertPublishable` does not refuse them** —
it returns early on anything not `published`, and the surfaces call it on a
hypothetical to display what *would* be wrong. What actually keeps this text away
from a merchant is that **no render or assembly path exists in `mca/` yet.** The
first thing that path must do is fail closed on `assertPublishable`; see ADR 0013.

## What has landed

| commit | what |
|---|---|
| `e3175f01f` | wave 1 — the spine (8), reconciliation, default-remedies, representations |
| `03058943c` | wave 2 — guaranty (10), enrollment (10) |
| `854964e2d` | `equipment` becomes a merchant election; the profile stops describing v4 |
| `4933d23de` | ADR 0013 |
| `0c9d4e895` | ADR 0012's stale `lombard-contracts` section, corrected |
| `923b97be9` | §9.1 stops collecting a guarantor's SSN with no guaranty in the document |
| `2903976ed` | renewal-positions (6 rewritten, 2 added); completeness retires, coherence replaces it |

**Next:** `data-and-channel` (9), `fees-and-money` (6), `miscellaneous` (12),
`disputes-service` (11).

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

**Four** of eleven facts were inert — declared in `McaFacts`, read by nothing.
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
- **`venueRule`** — **still inert, and deliberately so.** Nothing in the corpus
  reads it; §7.5 is ungated and hard-codes New York law with New York and Pasco
  County, Florida forums. The renewal cluster was told to flip it to
  `merchant-state` and **refused**: that would leave the profile asserting one
  venue while the only venue clause mandates the other, and a contradiction is
  harder to see than a hole. → `disputes-service`, with §7.5's body.

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
   owner reversed. Replaced by **cross-reference coherence** across nine funder
   profiles. **The replacement was red on real defects the retired one could never
   see**: §7.1 carving out a §4.15 that `concurrentPositions: false` had deleted,
   and §004 pointing at a §8.2 that `renewalModel: 'payoff-only'` had deselected.
4. A fourth, found by the same cluster: `library.test.ts`'s *"numbers each
   numbered clause once within an instrument"* rests on the same premise and
   cannot survive alternatives. Inverted to *"shares a clause number only between
   conditional clauses"*, which still catches a copy-pasted ungated duplicate.

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
- **`frpa.guarantor-information-9-1`** was an ungated `field-group`, so a
  `guarantyScope: 'none'` template collected a guarantor's name, home address and
  SSN for a guaranty the document did not contain. **Fixed** (`923b97be9`), after
  verifying the defect by selecting at each value rather than trusting the report.
  The `full-performance` half is unfixed and registered: §9.1 plus §§10.2/10.4
  with no guaranty between them.

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
- **The memo does NOT contradict itself on Carry — I did.** I briefed the renewal
  cluster that the memo's narrative removes Carry while its §8.2 replacement text
  retains it, and that the library body already matched that replacement. Both
  false. The memo marks the Deduct/Carry text **`DELETE — entire current clause`**;
  its `INSERT` opens *"No prior Remaining Balance is carried into the new
  Purchased Amount"*. The body matched the deleted text because the library was a
  verbatim transcription of v4 — which is what the memo was deleting. I grepped
  for "Carry", found a block, and never read the marker above it. **The agent
  refused the premise and asked to be checked; it was right.**

## Owed

- **`every-fact-value-is-reachable` (#150)** enumerates the `equipment` union and
  must drop the two retired values when it merges; it also needs `settlementBase`.
- **`examinedBy` over-claims** on every rewritten clause: it cites reviews that
  read the *predecessor* text. **A third `ReviewId` for the memo would NOT fix
  this** — the memo read that same old text, so it would make three reviews claim
  to have read text none of them read. The field answers *"who audited the slot"*,
  not *"who read this body"*. What is actually missing is **provenance for the
  current body** — which memo entry it came from and whether we adopted, adapted
  or departed. Roughly a dozen DEPARTURE notes live only in prose comments nobody
  can query.
- **Six findings the memo refuted** still need corrected dispositions in
  `lombard-contracts`. **No vocabulary change is needed** — `rejected` already
  exists in `FindingDisposition` and REVIEW-01 already uses it once. Data fix plus
  regenerate the register. (The REVIEW-02 manifest gap ADR 0012 records is
  **already closed** — see ADR 0013 §6.)
- **§7.1's carve-out for §4.15 is now empty**, §7.9 → §6.3.1 dangles, and §4.16 →
  §6.1.1 dangles twice over (a Plaid outage is expressly not an Event of Default
  under the rewritten §6.1). All three are registered in `KNOWN_GAPS` with quotes,
  and each belongs to a cluster still to run.
- **§004's `«25»` row label** becomes "Prior transaction treatment" — a
  `lombard-contracts` form change, handed back, not made.
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

`disputes-service` carries the `venueRule` flip together with §7.5's body.
`data-and-channel` owns §7.21, the unlimited guarantor indemnity for an ISO's
conduct.
