# Split funding letters are processor-controlled (ADR 0019)

Branch: `docs/processor-controlled-split-letters`. Base: main `d51d9fb03`.
Source: a direct instruction from the repository owner on 2026-09-15. No task
card was created. Documentation and code comments only.

## Durable decision

[ADR 0019](../../adr/0019-split-funding-letters-are-processor-controlled.md):

- A split funding letter always belongs to a specific processor and is used
  exactly as that processor supplies it.
- No generic letter exists or will be built, and a processor's form is never
  edited.
- Payzli is the first supported processor. Later processors each bring their own
  form.
- Conflicts with the FRPA are resolved in Pacta's documents, the deal facts or
  the processor choice.

**This is settled. Future sessions must not reopen it.**

## What changed

- New ADR 0019. It supersedes the Payzli entry in ADR 0008's "ours" row and the
  softer 2026-09-12 wording ("limited or no ability to change").
- `mca/clauses/README.md`, `docs/design/mca-workspace.md` and
  `mca/templates/README.md` now state the rule and link the ADR.
- The Payzli source-document header no longer says "the words are ours". The
  header is outside the body digest (`documents.ts` `BODY_MARKER`).
- Doc comments on `split-funding/letter.ts` and `split-funding/index.ts`.

No clause body, record field, fingerprint, approval, stored template, migration
or `lombard-contracts` file changed.

## Found while documenting — follow-up work, not done here

The retained Payzli text is **not verified as Payzli's form**. Compared with its
2026-09-02 import (`lombard-contracts` `f8f2718`), commits on 2026-09-05 and
2026-09-07 (`454842c`, `1a9e15d`, `c5a4b08`, `7a5dd9e` / change note 16) added:

- the Purchase Agreement recital;
- the no-deposit-account limit;
- the Purchased Amount and Completion Threshold sentences;
- the remittance block;
- the SELLER label and signer date field.

An edited revision was published as template 102 (`CONTRACT_INDEX.md`,
2026-09-06). Neither repository shows that the 09-02 text is Payzli's issued
form either.

Follow-ups for the owner or coordinator to assign:

1. Obtain Payzli's current split funding form and replace the retained text
   verbatim.
2. Re-check the FRPA against it and resolve conflicts in the FRPA.
3. Rebuild the published Payzli template.
4. Move the letter out of the clause catalogue without carrying over any
   approval.

`processorSplitAccepted` is unaffected and still separate.

## For the next state consolidation

Correct these stale STATE.md claims:

- The "The other five instruments — NOT rewritten" row lists Split Funding as an
  instrument awaiting rewrite. Under ADR 0019 it is never rewritten.
- *The Critical, answered on the paper* describes the missing processor
  acceptance block as a defect of "our" form. It is Payzli's form, and acceptance
  must be evidenced outside it.

## Validation

Focused local run in the owned package: `vitest run mca/clauses mca/templates`,
**43 files / 2,184 tests passed**. This covers the source-document body digest
and clause-text containment. No application behavior changed, so there is no
Playwright before/after pair. CI supplies the full gate.
