# Funding figures read down a column

Task: #276 (MCA output fidelity, Phase 1). Author: `mca-output-fidelity-20260916`.
Base: `feat/mca-document-chrome` (#278). Third PR of the stack; merge #277 then
#278 first.

## Durable behavior

Consecutive currency fields leave the grid and set as a money column: label
left, figure right, every figure flush to the measure. The real §1.4 sets the
funding figures that way so they can be compared down the column; as half-width
grid cells they landed wherever the pairing put them.

`fieldBlocks` in `mca/render/field-layout.ts` decides this in explicit passes:

1. each field is money (currency) or grid;
2. **a rate bridges** — one non-currency field between two runs of figures, such
   as an origination fee percentage beside the fee it produces, joins the
   column, because that is how the real documents set it. Two such fields are
   ordinary answers and do not bridge;
3. **a column of one is a field, not a table** — a single figure among ordinary
   answers stays in the grid and keeps its pairing.

Presentation only, as in #277: no clause text, field model, fingerprint,
approval or review-link change.

## The explainers were not a gap

An earlier assessment said the plain-language explainers ("What is the Estimated
Daily Holdback?") were modelled but never rendered, and recommended drawing
them. **That was wrong and no work was done on it.** Those records are
`kind: 'guidance'` with `uses: ['interview']` (`mca/reusable/records.ts:200-233`),
which ADR 0015 deliberately keeps out of the contract; the substance is already
a numbered clause (1.1 Estimated Daily Holdback) and renders today. The other
`reading` field on `McaTemplateItem` is the numbered legal reading for counsel,
not an explainer.

## Validation

TDD throughout: `fieldBlocks is not a function`, then the bridge assertion
(`expected 'grid' to be 'money'`), then the PDF column. Two test corrections,
both because the assertion was wrong rather than the code:

- the first PDF selector treated any itemization-labelled row as a figure and
  caught a percentage field, which is text;
- the second matched a neighbouring grid label as a figure, so it now requires
  the value to be set flush to the measure.

One implementation correction: the passes originally demoted single-figure
columns before the bridge could run, so everything fell back to the grid.

- `mca` suite: **103 files / 3,390 tests pass**.
- Sample rendered and read with `pdftotext -layout`: six itemization rows, one
  right edge, the rate row inside the column.
- Changed files formatted; `git diff --check` clean.

## Boundaries

No AcroForm, signing token, delivery path, migration or overlay; output stays an
internal draft. Execution blocks, section display names and numbering depth
remain under #276 and Phase 2.
