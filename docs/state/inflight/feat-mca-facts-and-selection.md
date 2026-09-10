# feat/mca-facts-and-selection — the same clauses, two different documents

**Branch:** `feat/mca-facts-and-selection`, stacked on `feat/mca-clause-kind-and-fields` (#148).
[ADR 0011](../../adr/0011-the-mca-clause-library-is-a-library.md) phase 3, plus
the minimum of phase 4 that keeps it from being scaffolding.

## Why the facts and the engine land together

`clauses/types.ts` refused to ship a facts type early, and said why: this package
had *"already paid for forward scaffolding once — the AI config asked for a GCP
project id, a location and an API key for four months before anything read any
of them, and shaped a UI around the wrong product."*

`includeWhen` on 200 records with no engine reading them is that failure exactly.
So the facts, the field, and the first consumer are one change.

## What made the facts derivable

The 2026-09-09 counsel memo split 101 FRPA clauses three ways: **58** defects
wrong under every template, **23** that are a defect *and* conditional, and **12
that are not textual fixes at all** — the memo proposes deleting or rewriting a
clause where the real question is whether it belongs in this deal. Those 12 are
where the eleven keys come from. They were not guessed.

## The bug that would have surfaced much later

`LOMBARD_FACTS` first encoded **what the memo recommends, not what v4 ships** —
wrong in four places. `equipment: 'separate-lease'` (v4 defers into the Purchased
Amount), `renewalModel: 'payoff-only'` (v4 offers Carry), `concurrentPositions:
false` (§4.15 affirmatively authorises them), `venueRule: 'merchant-state'` (v4
mandates New York or Florida).

A profile describing a document nobody has signed makes every selection disagree
with the document it is meant to reproduce. Caught by writing the test *"Lombard's
answers select the whole FRPA"* before the gates — which is what that test is
for, and it is now the load-bearing assertion in the file.

## The `[Reserved]` records are gone, and the engine is why

Four clause records held `body: '[Reserved]'` — §2.5, §5.7, §7.14, §9.3. The
engine made the problem visible: **a library assembles a document, and an
assembled document has no reserved sections**, because a clause that is not
selected simply is not there. Holding a contentless record so the output can
reproduce an artifact of *in-place editing* is backwards.

They are lines of the document, not clauses of it, and are now declared in
`FRPA_NON_CLAUSE` with the reason each actually has — `change-notes/16` for §5.7,
owner decision 6 for §9.3. **FRPA 101 → 97; library 204 → 200.**

**None of the four returns as-is.** §5.7 duplicated §5.18 and was merged into it;
§9.3 granted a lien over collateral in a schedule that does not exist. §2.5 and
§7.14 are the ACH pair and *do* belong in the library, gated on
`collectionMethod` — but they return with their **real v3 bodies**, recovered and
readable at `lombard-contracts/legacy/v3-archive/`, and that needs
`bodies-match-the-document` narrowed to the selected set first. That is the last
transcription anchor in this package and it gets its own PR.

## What changed

| | |
|---|---|
| `clauses/facts.ts` | `McaFacts` — eleven keys — and `LOMBARD_FACTS` |
| `clauses/types.ts` | `includeWhen`, **required**, `null` meaning always |
| 200 clause records | `includeWhen: null` |
| **11 clauses** | a real condition, each with the reason inline |
| `engine/select-clauses.ts` | `selectClauses` and `instrumentsFor` |
| 4 records removed | declared non-clause instead |

**`includeWhen` is required, not optional**, for the same reason `kind` is: an
optional condition lets a conditional clause be added with none and silently
reach every template. `null` is a decision a reader can see; a missing field is
not.

**Eleven gates, four facts, and one of them is the point.** `disputeResolution`
alone decides §§7.10, 7.11, 7.19 and 7.20. The memo proposes deleting each
separately; they are one decision with two authored answers, and neither is held
cleanly today — this corpus has a bare class waiver and no arbitration clause,
which is the weakest of the three available positions.

## State

```
packages/bizrethink/mca      50 files, 2079 tests passed
packages/bizrethink          164 files, 3325 tests passed
scoped typecheck             exit 0, 0 errors
biome check --write          clean
```

Node 24.20.0. The one wider failure is `regression-tests/trpc-schema-parity.test.ts`
(`TypeError: msg is not a function`, a lingui macro) — **pre-existing, verified by
stashing on #148**, and caused by `npx vitest` bypassing the build that
`turbo.json:37-39` makes tests depend on.

**Counts that moved, each with its arithmetic recorded in the test:** clauses
204 → 200; FRPA 101 → 97; findings cited 136 → 135; resolved 98 → 97, while
still-open held at 38 — which is the arithmetic confirming §9.3's finding was
`implemented` rather than outstanding.

## Not done

**Numbering is not derived yet, and `McaClause.number` still stands.** ADR 0011
phase 4 removes it, and that change has to reproduce v4's numbering exactly or
break every review locus and all five live Pacta templates. Selecting and
numbering are separable; shipping the half that is provable beats claiming both.

**No `supersedes`, no `asserts`.** The lease engine has both. This corpus has no
member for either, and a mechanism with no user is the scaffolding above.

## Still open

- The ACH pair returning, with `bodies-match-the-document` narrowed to the
  selected set. Next.
- Phase 4: numbering at assembly, `number` deleted, the fidelity test.
- `recipientStates` is the one fact that is a property of the *merchant* rather
  than the product. It works at template time only because `lombard-platform`
  already picks state-specific contracts, and only Texas adds contract content
  (7 TAC §86.310(d)). The seam to watch.
