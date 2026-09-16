# Section 1 prints as a grid

Task: #276 (MCA output fidelity, Phase 1). Author: `mca-output-fidelity-20260916`.
Base: main `df696e26d`. First PR of the Phase 1 stack.

## Durable behavior

A completed field now carries a span, and two half-width fields share a row, as
the real Lombard documents print them. Every field previously rendered as a
full-width stacked label-over-value row.

- `mca/render/field-layout.ts` resolves a span from the binding, label and kind:
  an address takes the measure, a short answer pairs, and an unclassified field
  defaults to `half` so it joins the grid. `FULL_WIDTH` and `HALF_WIDTH` are
  readable exception lists.
- `fieldRows` pairs consecutive halves only. **It never reorders to fill a row**,
  so two fields sit together because the document prints them together.
- `transactions/server-only/pdf.ts` renders each row as two cells, each keeping
  its own rule, so a short answer no longer gets a page-wide rule.

**Span is presentation and deliberately lives outside `ClauseField`.** That type
is in the clause fingerprint, so a column width there would lapse approvals and
stale counsel review links whenever a blank moved. No fingerprint, approval,
review link, clause body, binding or legal wording changes here.

## What this did and did not move

The funding grid now fits the pages it introduces: its labels sit on pages 1–2,
where they previously ran to a third page. **Total page count moved 37 → 36 only.**
The inflation against the real document's 23 pages is body typography (11pt
ragged-right over a 516pt measure) and our longer clause text, not the fields.
Typography is the next PR in this stack; an earlier draft of this PR asserted
`numPages <= 30`, which was a hoped-for number rather than a measured one, and
the assertion was replaced with one that measures the grid itself.

## Validation

TDD: `mca/render/field-layout.test.ts` failed with no module, then 9 passed. The
PDF assertion failed on real geometry first — `expected 395.18 to be 431.93`,
two labels on different baselines — then passed.

- `mca` suite: **103 files / 3,383 tests pass**.
- Changed files formatted with Biome; `git diff --check` clean.
- Sample rendered from `filledDraftFixture` and inspected with `pdftotext
  -layout`: pairs across the row, addresses alone, `[not designated]` preserved.
- Scoped typecheck reports only pre-existing failures from a stale generated
  Prisma client in this worktree (`amendsDocumentId`,
  `bizrethinkInstanceResourcePolicy`, `bizrethinkVerifiedOnboarding`), none in
  changed files. CI generates the client and is the real gate.

## Boundaries

No AcroForm, signing token, delivery path, migration or overlay. Output stays an
internal draft. Section display names, numbering depth, cover page, party chrome,
tables, explainers and execution blocks are later PRs in #276.
