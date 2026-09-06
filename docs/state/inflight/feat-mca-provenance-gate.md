# feat/mca-provenance-gate — wire the MCA package to the provenance gate

**Branch:** `feat/mca-provenance-gate` · PR open, not merged.

## What this is

`packages/bizrethink/mca/` shipped eleven states and imported **nothing** from
`packages/bizrethink/provenance/`. `assertPublishable` therefore had no
opportunity to refuse anything in the vertical that most needs refusing. This
closes that, and adds a jurisdiction axis so one state's text cannot reach
another state's document.

Three invariant tests were written first and confirmed red before any
implementation.

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
are `statute` (one). Seven negative controls construct specs that must be
refused, so deleting the guard turns the file red.

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
  sentence**, in a later section governing a different transaction type. So the
  whole-file check accepts New York's form carrying California's words. *That is
  the defect that shipped as templates 104/105.* The check that was supposed to
  catch it could not have.

Each spec now names the `section` it was transcribed from:

| | file | section | |
|---|---|---|---|
| CA | 162,784 | 11,481 | 7.1% |
| NY | 154,033 | 11,648 | 7.6% |
| MO | 339,461 | 18,554 | 5.5% |

Verified by mutation: setting NY's `section` back to null turns two tests red,
including the one pinning the shipped defect.

## The second finding: the field the defect lived in was never checked

`checkAgainstSource` reads a row's `label` and its `verbatim`. It never read
`alsoPermitted` — and the CA/NY funding-provided sentence, the one that shipped
wrong, is an `alsoPermitted` entry on row 0 of both forms. The one field the
checker skipped is the one the defect was in. Now checked.

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
