# Parties execute side by side

Task: #276 (MCA output fidelity, Phase 1). Author: `mca-output-fidelity-20260916`.
Base: `feat/mca-tables-and-explainers` (#279). Fourth and last PR of the Phase 1
stack; merge #277, #278, #279 first.

## Durable behavior

The execution page is a grid of parties rather than a stack of bordered boxes.
Two parties share a row — `M E R C H A N T` beside `B U Y E R`, letter-spaced as
the real documents set them — each with the party name and the four lines a
signer completes: Signature, Printed Name, Title, Date.

**A guarantor always takes the full width, alone.** Burying a guaranty beside the
party it guarantees is what let the real document's guaranty reach a natural
person without saying so; a separate block is what makes the next such reach
visible. `executionRows` enforces it: a role matching `/guarantor/i` never pairs.

The copy stays unsigned. Rules, never signing tokens, and the page still says no
signature is collected or applied.

## Validation

TDD: the role label was absent first (`expected undefined to be defined`), then
passed. Two test corrections, both my assertion being wrong rather than the code:

- letter-spaced labels come back one glyph per item from PDF.js, so the test
  groups runs into rows before matching;
- the guarantor row picks up a stray glyph from the page, so the assertion is
  geometric — its runs occupy one column — instead of exact text.

- `mca` suite: **103 files / 3,391 tests pass**.
- Sample rendered from `allOptionsDraftFixture` and read with `pdftotext
  -layout`: merchant beside buyer, merchant beside equipment provider on the
  equipment document, guarantor blocks full width.
- Changed files formatted; `git diff --check` clean.

## Phase 1 is complete after this

Delivered across #277–#280: the field grid, cover and party chrome, the real
measure and justification, the money column, and the execution grid. What
remains for document fidelity is Phase 2 — real section names in place of
title-cased slugs, and numbering deeper than two positional levels.

No AcroForm, signing token, delivery path, migration, overlay, clause text,
fingerprint or approval change in any of the four.
