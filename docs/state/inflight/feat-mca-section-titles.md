# Sections carry the name the document gives them

Task: #276 follow-on (Phase 2, first half). Author: `mca-output-fidelity-20260916`.
Base: `feat/mca-execution-blocks` (#280). Merge #277–#280 first.

## Durable behavior

Section headings read `Section 3: Purchase and Sale of Future Receivables` where
they read `3. Purchase` before. Title-casing an identifier was never a name:
`service` printed "Service" for a section about waiving personal service of
process, and `default` printed "Default" for events of default and remedies.

- `SECTION_NAMES` in `mca/engine/section-headings.ts` names every section, **keyed
  by instrument**, because the same identifier means different things: `guaranty`
  is the FRPA's personal guaranty of performance and the equipment lease's
  personal guaranty; `agreement` is a lease in one document and a subscription in
  another.
- `hasMcaSectionName` backs a test that fails when any section an instrument
  actually uses has no name, so a new section cannot quietly fall back to its
  slug. "Preamble" happens to match its slug and is still a real name, which is
  why the test checks the entry rather than comparing strings.
- `groupMcaSections(items, instrument?)` and `mcaSectionHeading(section, items,
  instrument?)` take the instrument; rendered draft items do not carry one, so
  `pdf.ts` passes the document's. The legacy counsel reader passes
  `view.instrument.id`.
- The heading still refuses to invent a citation: an unnumbered or mixed
  selection prints the name alone.

Presentation only. No clause text, field, fingerprint, approval or review-link
change; numbering is untouched.

## Six existing assertions changed, and why

The display format changed, so tests pinning the old one were updated rather than
worked around: `section-headings` (three), `numbered-review`, `package-navigation`
and `pdf` (two). Each keeps its original intent — the same section, the same
citation, the new name.

## Validation

TDD: four new assertions failed first (`sections with no name of their own`,
then the named expectations), then passed.

- `mca` suite: **103 files / 3,395 tests pass**.
- Rendered sample reads `Section 1: Merchant and Funding Information` through
  `Section 8: Miscellaneous`.
- Scoped typecheck is clean for this package once the generated Prisma client is
  regenerated; the remaining 157 errors are missing Playwright types in the
  worktree, all under `app-tests/`.
- Changed files formatted; `git diff --check` clean.

## What is deliberately not here

**Numbering depth.** Citations are still positional and two-level, so a clause's
number can move between packages, where the real documents cite 6.2.2 and 3.2(b).
That changes what a citation means, touches stored review fingerprints and needs
the owner's decision before it is built.
