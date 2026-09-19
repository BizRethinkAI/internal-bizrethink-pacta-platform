# feat/mca-appendix-a-fees — the fee schedule is printed (#326)

`frpa.appendix-a-fees-collectible` renders as ordinary body text and says:

> A fee left blank, or not identified in the completed Appendix, is $0.00 and
> may not be charged.

The clause printed. The Appendix it points at did not. So a published FRPA
stated the rule and then carried no table, and **on the document's own terms
every fee the funder had entered was $0.00 and uncollectable**. The schedule was
collected by the entity interview, stored on the entity and attached to the
document by `compile.ts` — and then read by nothing. `feeSchedule` appeared
twice in the whole package, both in `templates/compile.ts`.

## What it prints

A labelled block per fee, under the section that already carries the heading
"Fee Schedule", after the clause that points at it. Five facts in the order the
clause names them: the fee, its amount **or** how it is calculated, who it is
payable to, what it is for, and when it is charged.

The either/or is why `ZMcaFee` is a discriminated union on `basis`. A row shows
the one the basis chooses, never both and **never a blank where the other would
be** — a blank is precisely what the clause reads as $0.00.

## Why a labelled block and not a five-column table

The first cut was five columns. Across a 468pt measure that is ~94pt each, and
"Deducted from the disbursement at funding" wraps to three lines in it. Two
things go wrong, and the test caught both:

- **A wrapped cell interleaves with its neighbours.** Extraction reads a page
  line by line, so line 1 is column 1's first line followed by column 2's first
  line and so on. The phrase is no longer present as a phrase. That is bad to
  read and worse to quote, and the clause makes the identification itself the
  thing that permits the charge — a fee a merchant cannot read back cleanly is
  the wrong artifact.
- **Hyphenation.** react-pdf hyphenates by default and "disbursement" broke as
  "disburse- ment". Disabled per `Text` with the same callback the lease
  renderer uses for its tokens.

A labelled block gives every value the full measure, so it wraps cleanly and
extracts as written.

## An empty schedule is a complete answer

"This provider charges no fees under this agreement. No fee is collectible."

Charging nothing is a real state and the commonest one. Left as an empty table a
reader has to decide whether it is empty or unfinished, and the clause already
answers that in the funder's disfavour — so the document says it outright rather
than leaving it to be inferred. A test asserts the column labels are **absent**
in that state, so an empty table cannot creep back.

## Validation

Six tests, written red first, rendering a real 37-page PDF and reading it back
with `@libpdf/core` — the same reader `injectMcaWidgets` and upstream's
placeholder extraction use, which is why the file uses it rather than pdfjs.
They cover: an amount-basis fee, a method-basis fee, all five required facts,
the empty state, the absence of a table in the empty state, and that the block
falls after the clause and under the heading.

3,723 tests in `packages/bizrethink/mca`; lint clean.

**The local typecheck's four errors are not this branch.** They are all in
`provider-templates.tsx`, #330's file, because this worktree's `node_modules`
symlinks to the main checkout — which is still at `f92abea55`, before #330
merged — so `@documenso/trpc` resolves to the pre-#330 router types. CI is the
verdict.

## Not done here

- **The cover page and running head (#327)** — the remainder of #276. Untouched.
- The itemization needs the same labelled-block primitive; it is written inline
  in the renderer rather than extracted, because one caller is not yet a
  pattern. Extracting it is the itemization's job when it arrives.
- Nothing here changes clause wording, and `assertMcaPackagePublishable` still
  refuses every package until counsel approval exists.
