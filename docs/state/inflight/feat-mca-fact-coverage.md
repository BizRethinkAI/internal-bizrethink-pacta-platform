# feat/mca-fact-coverage — three of the eleven facts do nothing

**Branch:** `feat/mca-fact-coverage`. One new test file. No clause, type or engine
change.

## What this started as, and why it changed

The plan was to bring the ACH backstop clause back — §2.5, gated on
`collectionMethod`, with its real v3 body. It is the clause that best proves the
library's premise: text Lombard does not select and another funder would.

**Two things stopped it, and both are the rules working.**

### The history I said was missing is in the review register

Three PRs, the ADR and `docs/STATE.md` all say some version of *"no change note
records when or why §2.5 and §7.14 left the paper."* The change notes do not
carry it. **The review register does**, and I never searched there:

> `b4-ach-backstop-instrument-still-in-suite` — REVIEW-01, severity **blocker**,
> disposition **implemented**
>
> locus: *"B.17 ACH Debit Authorization (companion instrument to FRPA v4; **FRPA
> §2.5 and Exhibit B are the [Reserved] stubs it points at**)"*
>
> *"A pre-signed ACH debit authorisation for collecting the advance still exists
> in the contract suite, described in its own metadata as signed on every FRPA
> deal, even though the FRPA clause that was supposed to trigger it (§2.5) is now
> [Reserved]."*

So §2.5 was **already reserved when REVIEW-01 ran**, and that review found and
removed the orphaned companion instrument still pointing at it. The ACH backstop
was deliberately removed as part of the split-funding-only design. Not lost
history — history I asserted was absent without looking everywhere.

Three related findings sit beside it: `disclosures-ach-receipts-contradict-frpa`,
`ca-ach-program-fee-disclosed-nowhere`, and
`sub-no-collection-channel-unbounded-setoff` (*"The ACH authorization and
bank-detail block were stripped from this template and nothing replaced them"*).

### Rule 1 blocks the clause anyway

`examinedBy` is required and non-empty, because *"a clause library seeded from
unexamined text launders that text into apparent authority."* REVIEW-01 examined
§2.5's **absence** and the orphaned instrument. Neither review read the v3 body
as clause text. Entering it would be precisely the laundering the rule exists to
prevent.

## What landed instead

`engine/__tests__/every-fact-value-is-reachable.test.ts` — the test
[ADR 0011](../../adr/0011-the-mca-clause-library-is-a-library.md) names and
argues for, measuring what the library can actually offer.

A value is **authored** when at least one clause or instrument is selected under
it that is not selected under some sibling value. Measured across all six
instruments: **14 of 26 values are unauthored.**

Five are honest absences — `equipment: 'none'` selects no equipment clauses, and
that is the entire content of the answer.

**Nine are real gaps, and three whole facts are inert:**

| gap | what is missing |
|---|---|
| `guarantyScope` — all three values | nothing gates on it. §9.2 and the guaranty block are always selected: a `none` funder gets a personal guaranty they did not ask for |
| `venueRule` — both values | §7.5 always mandates the funder's state. `merchant-state` has a legal consequence, not a preference — Va. Code §6.2-2236(A) voids a non-Virginia forum |
| `processorSplitAccepted` — both values | nothing reads it. Exhibit A issues either way |
| `disputeResolution: 'arbitration'` | the four waivers drop and nothing replaces them |
| `collectionMethod: 'ach-only'` | drops the Split Funding Authorization and puts no collection mechanism in its place |

**This is a finding about my own change.** #149 declared eleven facts and wired
four. ADR 0011 estimated three unbacked values; the real number is nine. The test
found it in the change that introduced it, which is the only good time.

## Two decisions in how it asserts

**Pinned, not failed.** A red build on a gap everybody already knows about is a
build people learn to ignore. The set is pinned in two named lists, so adding an
arbitration clause makes the test fail and the fix is deleting a line and saying
why — the discipline `FRPA_LOCUS_EXCLUSIONS` uses.

**The metric counts instruments as well as clauses**, and the first version did
not. It reported `brokerChannel` and `collectionMethod` as unbacked when both are
used — by `instrumentsFor`, which decides whether the ISO PRA and the Split
Funding Authorization are in the deal at all. A measurement missing a whole axis
produces a gap list nobody can trust.

**One blind spot, asserted rather than hidden.** `split-only` and
`split-with-ach-backstop` produce an identical document today, because the ACH
clause does not exist. Neither shows as unauthored, because each differs from
`ach-only`. A second test pins that equality so the blind spot is a recorded fact.

## Reverted before committing

`McaTenant` briefly gained a `facts` field, to let
`bodies-match-the-document` narrow to the clauses a tenant's answers select.
Without the ACH clause it has no user, and a field with no user is the forward
scaffolding `clauses/types.ts` warns about. Reverted.

## State

51 test files, **2081 tests**, scoped typecheck exit 0, biome clean, on Node
24.20.0.

## What this makes concrete for whoever closes the gaps

Nine values need authored clauses, and **authoring is not transcription** — no
Lombard or CircularPayments document contains an arbitration clause, a
merchant-state venue clause or a full-performance guaranty. So
`bodies-match-the-document` must narrow to the selected set before any of them
can land. That is the last transcription anchor and it is now the blocking
dependency for the entire gap list, not just for the ACH clause.

## Still open

- The record correction: ADR 0011 and `docs/STATE.md` both say the §2.5 history is
  unrecorded. It is in the review register. Not fixed here — it belongs with the
  STATE.md staleness work rather than in a test PR.
- Phase 4: numbering at assembly, `number` deleted.
