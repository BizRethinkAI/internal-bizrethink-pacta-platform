# The document carries the funder's identity

Task: #276 (MCA output fidelity, Phase 1). Author: `mca-output-fidelity-20260916`.
Base: `feat/mca-field-geometry` (#277). Second PR of the stack; merge #277 first.

## Durable behavior

An assembled document now opens on a cover and is set like the real agreements.
The owner decided on 2026-09-16 that a package carries **the funder's** identity,
taken from the provider profile, as Lombard's own documents do.

- **Cover page per document:** display title, "Prepared for review. Not
  executed.", an accent rule, then letter-spaced `PREPARED BY` (the funder's
  legal name), `DOCUMENT TYPE`, `TRANSACTION` and `CONFIDENTIALITY` with
  "Private & Confidential", and a confidentiality line at the foot. The internal
  draft banner is on the cover too.
- **Page furniture:** every page of the funder's documents carries their legal
  name and address, with their website when the profile has one. The Pacta line
  (template revision, instrument, page x of y) stays beneath it. The internal
  worksheet keeps its own chrome and carries no funder identity, because it is
  Pacta's page, not theirs.
- **Typography:** 72pt margins over a 468pt measure at 10.5pt, justified, line
  height 1.45. Measured from `Lombard_FRPA_v4.pdf`, which sets 72.1pt margins,
  a 468.6pt measure and right edges clustered at 539–540.
- `buyer.website` is a new optional profile field; a saved revision without one
  renders with the line absent, not a placeholder.
- `fillMcaDraft` copies the provider's legal name, address and website onto the
  draft so the renderer prints what that revision says, rather than re-deriving.

## Page count, honestly

**36 → 39 pages**: the cover adds one and the narrower measure adds two. The real
FRPA is 23 pages with different, shorter content; our 107 authored clauses are
longer than the document they replaced. Fidelity improved and the page count went
up, which is the honest trade and not a regression.

## Validation

TDD: the cover assertion failed first (`expected 'INTERNAL DRAFT…' to contain
'PREPARED BY'`), then passed. Two assertions I had to correct rather than force:
the cover prints its labels letter-spaced, so the check compares whitespace-
stripped text; and the grid-page assertion from #277 was rewritten to be
cover-relative instead of hard-coding pages 1–2.

- `mca` suite: **103 files / 3,384 tests pass**.
- Sample rendered and read with `pdftotext -layout`: cover, funder footer on
  every body page, justified body.
- Changed files formatted; `git diff --check` clean.
- Scoped typecheck shows only the pre-existing stale-Prisma-client failures in
  this worktree, none in changed files.

## Boundaries

No AcroForm, signing token, delivery path, migration or overlay; output stays an
internal draft. No clause text, fingerprint, approval or review-link change. The
profile field is additive and optional. Tables, explainers, execution blocks,
section display names and numbering depth remain later PRs under #276.
