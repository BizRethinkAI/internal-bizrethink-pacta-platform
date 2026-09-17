# The funder states its own fees

Task: #276 follow-on (Phase 3, third unlock). Author:
`mca-output-fidelity-20260916`. Base: main `df696e26d`. Independent of #277–#281,
#282 and #283.

## Durable behavior

A funder now enters its own fees, and Appendix A prints them.

**No contract language was drafted for this.** `frpa.appendix-a-fees-collectible`
already says Buyer may charge only a fee the completed Appendix identifies
*"by its name, its dollar amount or a lawful calculation method, the person to
whom it is paid, what it is for, and when it is charged"*, and that anything
unlisted *"is $0.00 and may not be charged"*. The schema is those five
attributes; `basis` is a discriminated union because the clause says amount **or**
method, not both.

- `policy.fees` takes up to twenty rows. Every row needs a payee, a purpose and
  a timing, and either an amount (same dollar shape the transaction layer
  validates) or a method.
- The FRPA carries the schedule; the equipment, subscription, ISO and release
  documents get an empty one, because they charge under their own terms and the
  processor's letter is not ours to price.
- **An empty schedule prints as "No fee is identified in this Appendix."** The
  blank is the operative fact, so it is stated rather than shown as an empty
  table.
- The provider interview repeats fee rows, following the transaction
  interview's existing pattern.

## What this closes

Before this, every funder's Appendix was empty, so by the clause's own terms
**every fee was $0.00** — the document promised to charge nothing while the
funder expected to charge an origination fee. Fees existed only as a single
free-text itemization line, which the itemization grid prints but the Appendix
never authorised.

## Validation

TDD: seven schema/compile assertions failed first, then two rendered-PDF ones.

- `mca` suite: **103 files / 3,382 tests pass**.
- Sample rendered and read with `pdftotext -layout`: two fees, the amount set
  right, the method wrapped in its own column, and each fee's payee, purpose and
  timing beneath it.
- The provider fixture gained an explicit `fees: []`, which is what a provider
  charging nothing looks like; a service test compared a parsed profile against
  the raw fixture and would otherwise have been loosened instead.
- Changed files formatted; `git diff --check` clean.

## Refreshed onto the merged batch

Merged main at `13ef4786f` (the renderer stack plus #282). Three conflicts:

- `profile.ts` — the fee field beside #282's `disputeResolution` enum, kept both.
- `pdf.ts` — my fee styles and helper against the stack's execution grid and
  cover chrome. Rather than splicing conflict markers through a renderer, I took
  main's file and re-applied the three fee changes onto it: the styles, the
  helper, and one call site before the execution section.
- `pdf.test.ts` — both sides appended describes. Rebuilt from main's file plus my
  fee block and its three imports, for the same reason.

Verified by rendering, not only by the suite: the Appendix prints its fee with
the payee/purpose/timing line, and the stack's cover page is still there. 104
files / 3,409 tests pass on the merged revision.

## Not in this change

Fee amounts are fixed at template time, which is what the clause requires
("Buyer may not create a fee, or vary a fee, after Merchant signs"). Factor
rate, term and reconciliation cadence remain deal fields, not policy. Governing
law remains unoffered pending a statutory walk.
