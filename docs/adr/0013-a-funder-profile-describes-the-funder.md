# ADR 0013 — A funder profile describes the funder, not the baseline document

- **Status:** Accepted
- **Date recorded:** 2026-09-10
- **Decision date:** 2026-09-10 (owner)
- **Amends:** [ADR 0012](0012-the-baseline-document-is-input-not-specification.md), which
  retired two transcription guards and missed the third, and left `McaFacts`
  still describing `Lombard_FRPA_v4`.
- **Why it is a new ADR and not an edit:** the Governance workflow makes
  `docs/adr/` append-only. #152 amended 0012 in place and was correctly refused.
  Those amendments are restated here as decisions 1 and 2.

## Why this exists

ADR 0012 decided that the baseline document is input rather than specification,
and retired the tests that asserted fidelity to it. **It did not follow that
through into the data.** `LOMBARD_FACTS` — the only funder profile that exists —
was deliberately populated with v4's values rather than the funder's, and said so:

> *"A profile that describes a document nobody has signed would make every
> selection disagree with the document it is supposed to reproduce, and the
> disagreement would have surfaced as a failing fidelity test with no obvious
> cause."*

That was sound reasoning while the fidelity tests existed. ADR 0012 removed them,
and left four rows anchored to a document the library had stopped copying, held
there by a rule whose only justification had been deleted.

It surfaced the way these things do: the agent rewriting §§002/003 found that
`equipment: 'deferred'` had become unbuildable, because §2.6 now says the
Remaining Balance never includes an equipment charge and a Purchased Amount of
`(Purchase Price × Factor Rate) + Equipment Cost Deferred` puts one inside it by
construction. **A fact value with no clause text behind it is indistinguishable
from one that works, right up until a template is assembled from it.**

## Decision

### 1. `frpa-coverage`'s line-accounting retires with `bodies-match-the-document`

ADR 0012 named `bodies-match-the-document` and missed its mirror.
`linesNotAccountedFor` asks whether anything in the **document** is missing from
the library; `bodies-match` asks whether every **clause** is in the document.
They are one transcription guard pointed in two directions, and retiring only one
leaves the other asserting that we have PRESERVED v4 — the thing ADR 0012 decided
not to care about.

Found by the agent drafting the spine cluster, which hit the red and **refused to
silence it**, correctly: declaring the superseded lines in `FRPA_NON_CLAUSE`
would leave a check that passes by construction as the remaining 89 clauses are
rewritten, and nulling `bodiesVerifiedAt` would hide the authorised reds with it.

`letters-coverage.test.ts` and `coverage.test.ts` carry the same assertion for
the other instruments and retire the same way as those are rewritten.

### 2. ADR 0012's roles row named two placeholders that do not exist

It read *"`{{funder}}`, `{{merchant}}`, `{{processor}}`, `{{broker}}`"*. **The
placeholders are exactly three: `{{funder}}`, `{{equipmentAffiliate}}`,
`{{processor}}`**, pinned by `tenant-agnostic.test.ts`. *Merchant* and *Buyer* are
document-defined terms, not placeholders; there is no `{{merchant}}` and no
`{{broker}}`.

Found when a drafting agent tried to use them. The row is corrected here rather
than in 0012 because that file is append-only; **0012's version of that row is
wrong and this supersedes it.**

### 3. `selectClauses` completeness is the third fidelity guard, and it retires

`engine/__tests__/select-clauses.test.ts` asserted *"selects every clause of the
FRPA for the funder whose paper it is"* — `excluded.length === 0`. Its own
docstring gave the reason:

> *"`LOMBARD_FACTS` describes the paper as shipped rather than as the 2026-09-09
> memo recommends, so every clause in v4 must survive its own condition."*

That is the same premise, in the same shape, as the two guards ADR 0012 retired.
Once a profile describes the funder, a library legitimately contains clauses that
funder does not select — **that is what makes it a library rather than a
document.**

**What replaces it, and it is worth more than what it replaces:** *every
cross-reference in a selected clause points at a clause that is also selected.*
Completeness never detected an assembled document citing a section that had been
gated out; coherence does, and that is the failure mode gating actually creates.

### 4. A funder profile records the funder's design, not v4's

`McaFacts` answers *"what does this funder do"*. Where nobody has verified the
answer, **the row says so in terms** — `settlementBase` is the model, carrying
`UNCONFIRMED, AND THE MOST CONSEQUENTIAL UNKNOWN IN THIS ROW`.

For Lombard the owner's instruction is to adopt the design the 2026-09-09 memo
recommends, which the memo states as one coherent set:

> narrow the purchased asset to a percentage of net card settlements; remove
> deferred equipment from the FRPA; separate fees from the collection cap;
> eliminate automatic Carry and concurrent Buyer positions; use merchant-state
> venue; restrict the guaranty to the signatory's own covered misconduct.

### 5. `equipment` is `'none' | 'merchant-elects'`

Owner, 2026-09-10: *"Lease or buy, merchant decide while signing up."*

The funder decides whether equipment is in the offering at all. **Buy-versus-lease
is the merchant's**, elected in Section 1 before signature. The old union named a
funder-side model — `purchased-at-funding`, `deferred`, `separate-lease` — and
every gate in the corpus read `!== 'none'`, so the distinction was never read by
a clause.

**It was read by the engine, and that is where it did damage.** `instrumentsFor`
gated the Equipment Lease and Subscription instruments on
`equipment === 'separate-lease'` while the profile said `'deferred'`, so the only
funder in the library had a product whose FRPA sends the lease path to *"a
separate written agreement"* the product did not include. Found by the
typechecker after the union collapsed, not by any test.

### 6. ADR 0012's `lombard-contracts` section was stale when it was written

It records as owed: *"REVIEW-02 needs a manifest. Its dispositions live in the
prose of `change-notes/16`, so every one of its findings reads `unrecorded`, and
unknown counts as outstanding. **That is most of the clauses the approval gate
holds.**"*

**None of that is true, and it had already been fixed.** `lombard-contracts`
PR #9 derived REVIEW-02 a manifest from records that already existed.
`dispositions.test.ts` inverted its assertion at the time and says so in terms.
The register today holds **254 findings, of which 5 are `unrecorded`** — the 4
refuted in REVIEW-01 and the 1 in REVIEW-02, which is what a refuted finding
correctly gets, since no manifest names one.

A duplicate of the same stale claim sat in `approval.ts`'s
`findingsHold` docblock (*"`unrecorded` … is REVIEW-02's whole register"*) and is
corrected in the same change. Neither was load-bearing: the test and the
generated register were both right, and only the prose describing them was wrong.

**This is the staleness pattern, not an instance of bad luck.** A fact gets fixed
in one repository, the test that guards it is updated, and two or three prose
descriptions of the old state survive in files nobody re-reads — then get quoted
into an ADR as current. What still stands from that section: the six findings the
2026-09-09 memo refuted, and that the rendered documents follow the library
rather than the reverse.

## How a fact row moves

**A fact row and the clauses it gates move in the same change.** Moving a row
first deselects a clause that still carries the old text, and a profile that
selects an incoherent document is worse than one that is out of date.

This is why `equipment` moved on its own while `renewalModel`,
`concurrentPositions` and `venueRule` waited for the cluster that owns §§4.15,
8.1 and 8.2 — all four gates on `equipment` read `!== 'none'` and none of them
broke, whereas `renewalModel: 'payoff-only'` deselects the whole of §8.2
including the Deduct method the funder still needs.

### The limb problem

**A fact frequently decides a limb, and `includeWhen` only decides a clause.**
Three sightings so far: `equipment` decides *"§4.11's ranking limb"*;
`renewalModel` decides §8.2's Carry method but gates all of §8.2;
`concurrentPositions` decides §4.15's cascade but gates all of §4.15 — and the
memo does not want silence there, it wants the opposite rule stated.

**The resolution is to split the clause so that a fact decides a whole clause:**
an always-selected clause carrying what is true either way, and a gated clause
carrying the limb. Splitting moves the counts `frpa-coverage.test.ts` and
`library.test.ts` pin, which is a deliberate change and belongs in the same
commit.

## Consequences

**Three of the eleven facts were inert when this was written** — declared, and
read by nothing. `every-fact-value-is-reachable` (#150) measures this. Two are
now closed: `settlementBase` and `guarantyScope`, the latter gating §§9.2, 9.4,
9.5 and 9.6 so that a funder answering `none` stops receiving a personal guaranty
it did not ask for.

**`guarantyScope: 'full-performance'` is deliberately unauthored.** It is what all
three market forms filed as SEC exhibits in 2024–2026 do, which is precisely why
it is not a drafting agent's decision. It is a named gap, not an oversight.

**A `full-performance` or `none` funder currently assembles a broken Section 9.**
`frpa.guarantor-information-9-1` is a `field-group` that nothing gates, so such a
template still collects a guarantor's SSN for a guaranty the document does not
contain. The cross-reference property in decision 3 is what should catch this.

**The Equipment Lease and Subscription instruments are now in Lombard's suite,
and both are unreviewed.** §§002, 003 and 4.11 all defer to a separate written
agreement that nobody on this project has read.

## Questions that are closed

Do not re-derive these. Each was argued and settled; a change of mind needs an
ADR that supersedes this one. ADR 0012's table stands except where noted.

| question | answer |
|---|---|
| Does a funder profile record v4's values? | **No.** It records the funder's design, and says `UNCONFIRMED` where nobody has checked. |
| How many party placeholders are there? | **Three** — `{{funder}}`, `{{equipmentAffiliate}}`, `{{processor}}`. ADR 0012's row named four and two of them do not exist. |
| Does `selectClauses` select every FRPA clause for Lombard? | **No, and it should not.** A library contains clauses a given funder does not buy. |
| Is completeness of selection a test we keep? | **No.** Replaced by cross-reference coherence. |
| Does the funder choose buy-versus-lease? | **No.** The funder chooses whether equipment is offered; the merchant elects at signing. |
| May a fact row move before the clauses it gates? | **No.** Same change, or the profile selects a document with a hole in it. |
| What do we do when a fact decides a limb? | **Split the clause** so the fact decides a whole clause, and move the pinned counts in the same commit. |
| Does REVIEW-02 still need a manifest? | **No.** `lombard-contracts` PR #9 gave it one. 5 findings of 254 are `unrecorded`, and all 5 are refuted findings, which is correct. ADR 0012 records the opposite. |

## What this does not change

- [ADR 0008](0008-mca-is-two-surfaces-not-one.md) stands. **Conformity is
  untouched** — nothing here applies to `mca/sources/`, `mca/content/` or
  `mca/prescribed/`.
- [ADR 0009](0009-counsel-is-parallel-not-a-gate.md) stands.
- [ADR 0012](0012-the-baseline-document-is-input-not-specification.md) stands
  except for the roles row corrected in decision 2. Its **Questions that are
  closed** table is still binding.
- The digest assertion, `agreementDigest(file) === digest`, survives all three
  retirements. It catches a vendored document changing underneath us and has
  never been about clause bodies.
- **Nothing in the library is reviewed.** Every rewritten clause keeps
  `author: null` and `assertPublishable` refuses it. That gate is why drafting
  proceeds without counsel in the room.
