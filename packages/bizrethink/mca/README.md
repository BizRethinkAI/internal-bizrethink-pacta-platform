# MCA clause library

Second vertical beside `lease/`. Phase 1 is here: the conformity checker, with
no clause content behind it yet.

## What this checker does and does not do

**It records comparisons. It does not make them.**

That distinction is the most important thing on this page, because a growing
green test suite reads like convergence on correctness and is not. Every
assertion here pins a comparison a person already made between our text and a
regulator's. A third state whose prescribed sentence differs in a way nobody has
noticed will pass every test in this directory, because the tests only know
about the divergences they were told about.

Concretely: the check that New York must not carry California's APR wording
exists because someone read 10 CCR §914 and 23 NYCRR §600.6 side by side and
found the defect. The test makes that finding permanent. It would not have found
it.

So the count of passing tests is a measure of coverage, never of conformity. The
statutes still have to be read.

## The two checks

`checkFormConformity(spec, rendered)` — does a form we built match the spec we
wrote? Row count, prescribed labels, verbatim text, and additions to a row the
regulation closes with *"shall include only"*.

`checkAgainstSource(spec, sourceText)` — does the **spec** match the statute?
This is the one Georgia and Texas needed and lacked: both forms faithfully
implemented specs derived from secondary summaries that were broadly right and
wrong in the particulars. A library that only checks form-against-spec is a tidy
way of being confidently incorrect.

## Rules for adding content

1. **Primary text only.** `sources/` holds regulations, never summaries. Two
   summaries in the contracts repo carry `SUPERSEDED` banners for this reason.
2. **A spec is not evidence.** Anything asserting a prescribed label or sentence
   must pass `checkAgainstSource` against a vendored file.
3. **Never reconcile two states.** Where prescribed texts are near-identical,
   pin the divergence with an assertion rather than a comment. See
   `__tests__/near-identical-states.test.ts` — the deduplication guard there is
   deliberate and must not be tidied away.
4. **Unexamined text enters as draft.** 47 of 140 clauses in the Lombard
   agreements have never been reviewed by anyone (see
   `lombard-contracts/MCA-CLAUSE-LIBRARY-PHASE0.md`). None looks dangerous,
   which is what the inherited documents looked like before REVIEW-01 found 207
   defects in them.

## If an assembler ever arrives

The Lombard documents are DOCX → PDF with AcroForm widgets injected, which
sidesteps the react-pdf `lineHeight` compounding bug patched on main
(`patches/@react-pdf+layout+5.2.0.patch`) — worth knowing if that changes.

More importantly: **this fork deliberately does not flatten AcroForm widgets**
(overlays 018 and 040, with a regression test pinning it). An assembler that
assumes flattening will fight the fork.
