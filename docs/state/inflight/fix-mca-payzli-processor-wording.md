# The Payzli letter carries the processor form's own wording

Author: `mca-output-fidelity-20260916`. Base: main `13ef4786f`.
**Depends on `lombard-contracts` PR #14** (commit `ecd1c6a`), which this vendors
from. Merge that first, or this file's header points at a commit on a branch.

## What changed

ADR 0019 settles that a split funding letter is the processor's form, used
exactly as supplied and never edited. The owner confirmed on 2026-09-15 that the
`lombard-api` Payzli template is the reference text. This aligns the library to
it.

- `lombard-contracts` restored the instruction paragraph to the published
  template's wording (its change note 20 carries the full reasoning). Marker set,
  widget names and page count verified unchanged there.
- The vendored copy is re-extracted from that commit, and the library pins its
  new digest with `bodiesVerifiedAt: '2026-09-17'` — the letter's seven bodies
  were re-read against the new extraction, which is what that date asserts.
- `split-funding.split-funding-instruction` carries the restored wording at
  **version 2**.

**Our three 2026-09 edits are the ones removed**: the limit of debiting to card
settlement, the sentence making the Purchased Amount informational, and the
merchant's route to stop withholding at the Completion Threshold. Each answered a
REVIEW-02 finding. Each was a change to a document that is not ours to change.

## The vendor script would have undone this

`scripts/mca/vendor-agreement.py` hard-coded *"Lombard's own executed-form
agreement — the words are ours"* into every header, which is the line #271
corrected for this file. The next re-vendor would have restored it silently. The
script now takes a per-document header for processor-controlled forms, so the
correction survives regeneration.

## Two defects left the register, and two arrived

`a-notice-can-arrive-in-time.test.ts` keeps a register of ways the authorization
on file fails our specification, with a rule: *"the day somebody rewrites the
Payzli letter this test goes red and the entry is deleted rather than left
standing as a line that can no longer fail."* That day was today.

**Gone**, because both described text our own edits had introduced:
- a sentence sweeping fees out of settlement, which §4.1 and Appendix A forbid;
- the removal of the aggregate cap.

**Arrived**, because they are true of the processor's text:
- debiting is authorised without being limited to card settlement, where §4.1
  promises no deposit-account debiting;
- withholding stops at the Purchased Amount, where §2.6 completes on the
  Completion Threshold, which may include fees.

A third is an absence no pattern can match: the letter gives the merchant no
route to stop withholding. It is recorded in `lombard-contracts` change note 20
as FRPA-side work.

**This is the trade ADR 0019 describes, made visible rather than argued.** A
conflict between a processor's letter and the FRPA is resolved in our documents,
the deal facts, or the choice of processor — never in the letter.

## A pin was re-taken, deliberately

#266 pinned Payzli field labels to three exact passages by fingerprint. Changing
the instruction passage cost it its labels, exactly as designed. The pin is
re-taken against the restored text, with the date and reason at the call site.

## Validation

- `mca` suite: **103 files / 3,398 tests pass**.
- Coverage of the vendored letter still accounts for every line.
- Digest recomputed from the new extraction, not copied.

## What this does not settle

The retained document is still not established as a form Payzli *issued* — it is
funder-drafted and addressed to a processor, and `lombard-contracts/legacy/`
holds a version with several processors' addresses stacked on one page. The
owner's confirmation is narrower and sufficient for this change: the `lombard-api`
template is the reference, and the library now matches it.

Moving the letter out of the clause catalogue, where its records still carry
`source: attorney-drafted` and approval state, remains separate work under
ADR 0019.
