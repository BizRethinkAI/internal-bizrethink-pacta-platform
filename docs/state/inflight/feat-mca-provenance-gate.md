# feat/mca-provenance-gate — wire the MCA package to the provenance gate

**Branch:** `feat/mca-provenance-gate` · PR open, not merged.

## What this is

`packages/bizrethink/mca/` shipped eleven states and imported **nothing** from
`packages/bizrethink/provenance/`. `assertPublishable` therefore had no
opportunity to refuse anything in the vertical that most needs refusing. This
closes that, and adds a jurisdiction axis so one state's text cannot reach
another state's document.

Three invariant tests carry the work. They and the implementation landed in one
commit, so **the repository does not evidence the order they were written in** —
read the four mutations below as the evidence that the gate is falsifiable,
because those are reproducible and the ordering claim is not.

## Where it stands

| | |
|---|---|
| Tests | 1351 green (was 1146) — 205 added |
| Typecheck | clean, `-p packages/bizrethink/tsconfig.typecheck.json` |
| Biome | `check mca/` and `format packages/bizrethink` both clean |
| Specs wired | all eleven |

## The three invariants, and what actually enforces each

**1. Nothing publishes without verified provenance.** Every spec now carries a
`ClauseSource` and a `ClauseStatus`, so `PrescribedForm` and `ContentStatute`
satisfy `HasProvenance` structurally — the property that let `assertPublishable`
move out of the lease vertical is what makes this free. The four prescribed
forms are `regulator-prescribed-form` (two dates); the seven content-only acts
are `statute` (one). `provenance-gate.test.ts` holds **five refusals**, plus a
positive case and a draft control; the **seven** negative controls are in
`provenance-honesty.test.ts`. Deleting the guard turns the gate file red.

**2. A jurisdiction axis exists and filters.** `disclosuresFor` in
`registry.ts`, modelled on `lease/clauses/library.ts` and importing nothing from
it. **Exact equality, with no portable tier** — the lease library unions
`generic` + `US` because 35 of its clauses depend on no state's law, and nothing
here does. That is stricter than the lease filter, not a simplification of it.
110 pair assertions check that no spec is reachable from another state.

**3. Provenance is honest.** This is the half that took the work, and the half
worth reading the diff for.

## The finding: a whole-file check proves much less than it looks like

`checkAgainstSource` asked "do these words appear in the vendored file". For
California and New York that file is not one form — the regulation prescribes at
least six tables (closed-end, open-end, factoring, sales-based, lease,
asset-based) in 132,000 characters, and only the sales-based one is ours.
Measured:

- `"Repurchase Costs"` — a genuine California label, for **factoring** — passes
  as one of our rows against the whole file.
- **New York's own file contains California's phrasing of the funding-provided
  sentence**, in a later section governing a different transaction type
  (§600.11, §600.12). So the whole-file check accepts New York's form carrying
  California's words, and only the scope refuses them.

**Correcting an over-claim I made in the first report.** I described that second
bullet as the defect that shipped as templates 104/105. It is the **mirror** of
it. The shipped defect was the *California* form carrying *New York's* wording,
and New York's phrasing appears **nowhere** in the California file (verified:
zero occurrences), so a whole-file check would have **rejected** it —
`__tests__/near-identical-states.test.ts` runs exactly that assertion against
the whole California source, in this very PR, and it passes.

The shipped defect survived because **until PR #101 there was no checker at
all**, which is the account already written at the top of that test file and the
one to trust. Scoping is still worth keeping, but for the mirror direction:
hypothetical in that nobody has made that mistake yet, real in that the words
which would let it pass are genuinely in the file.

Each spec now names the `section` it was transcribed from:

| | file | section | |
|---|---|---|---|
| CA | 162,784 | 11,481 | 7.1% |
| NY | 154,033 | 11,648 | 7.6% |
| MO | 339,461 | 18,554 | 5.5% |

Verified by mutation: setting NY's `section` back to null turns two tests red,
including the one pinning the mirror direction.

## The second finding: `alsoPermitted` was never checked against the statute

`checkAgainstSource` reads a row's `label` and its `verbatim`. It never read
`alsoPermitted`, which is a claim about the regulation every bit as strong as
the other two. Now checked.

**Scoped correctly, that gap was in spec-against-statute only.**
`checkFormConformity` — which governs what a *rendered* document may contain —
has always read `alsoPermitted`, subtracting it from the remainder of an "only"
row (`conformity.ts`). The templates 104/105 defect was in a rendered document,
so this blindness is not what let it through either. The gap is real and worth
closing on its own merits; it is not the explanation for the shipped defect.

Checking it surfaced a third thing: one NY entry is not New York's wording at
all. §600.6(b)(3)(iii) requires *"a short explanation"* and supplies no words,
so that sentence is **ours**, filed under a name that claims the regulator
permits it. New field `providerDrafted` carries it with the citation that
compels it, and `unverifiableSentences` counts it — pinned at exactly one, so
the unverifiable surface cannot grow unnoticed.

## What a date is now bound to

| claim | re-executed every run |
|---|---|
| `verbatimVerifiedAt` | every label, prescribed sentence and permitted sentence still found, **within the form's own section** |
| `structureVerifiedAt` | `sourceDigest` unchanged; for `source-order` forms, labels still in the spec's order |

Digest is taken over *normalised* text: re-extracting the same PDF must not
raise a false alarm that trains people to re-stamp dates without looking, but
any change to a word does break it.

## What is NOT enforced — read this before trusting the green

- **Row order is not machine-checked for CA or NY.** Their regulations describe
  rows in a prose order that is not the table's — §914 introduces the Estimated
  Monthly Cost row last, as "insert one additional row below the fourth row",
  though the row is fifth. A source-order check reports a defect in a table that
  is correct. `structureEvidence: 'prose-described'` records this; CT and VA get
  `'source-order'` and are genuinely checked. The field is required with no
  default so the weaker reading must be chosen, not fallen into.
- **The five content-only states with no prescribed labels** (FL, GA, LA, TX,
  UT) have `verbatimVerifiedAt` backed by the digest alone. Those statutes
  prescribe no words, so there is nothing of ours to match against them. KS and
  MO dictate every label and those labels *are* checked.
- **Nothing proves a human read the regulation.** The digest proves the bytes
  have not moved. Amendment breaks it and sends it back to a person.
- **`providerDrafted` is invisible to the publish gate.** `assertPublishable`
  judges a spec's single `source`, and a per-row drafted sentence is not part of
  it — so a form can carry our own wording in a closed row and still be
  publishable. `unverifiableSentences` exists to surface that, but it is called
  only from a test, and the sole thing stopping a second drafted sentence
  appearing silently is a hard-coded expectation of exactly one. That holds a
  new sentence only until someone updates the expectation to make their suite
  green. If drafted sentences become common, this needs to move into the gate
  rather than stay a pinned count.

## For a human — two questions I could not answer

1. **California may be missing a required short explanation.**
   §914(a)(2)(C)(iii) imposes the same obligation as NY §600.6(b)(3)(iii) in the
   same words. Our NY form carries such an explanation; our CA form carries
   none. Both clauses are conditional on the financing paying down other
   obligations the provider knows about, so this is either NY saying more than
   it must or CA saying less — a question about the product, not the
   regulations. Pinned by a test so a sweep cannot smooth it over first.
   **Nothing published or changed; handing it back.**
2. Still open from the previous note: Tex. Fin. Code §398.051(a)(5)'s unlabelled
   term, and Conn. Gen. Stat. §36a-869's three-day irrevocability (a sending
   rule nothing here enforces).

## Kept from the previous note

Everything in `feat-mca-clause-library.md` still stands. The two checkers, the
"green suite is coverage not conformity" warning, and the five NY / four CA rows
that prescribe *"a short explanation"* and cannot be word-checked.
