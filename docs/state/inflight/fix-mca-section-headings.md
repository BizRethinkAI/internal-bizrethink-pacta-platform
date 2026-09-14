# MCA parent section headings

Task #222; author `mca-section-headings-20260914`; branch
`fix/mca-section-headings`, based on main
`9e03b72d570dc00b9904974fadedeaadf3a079a3` after readability #215 and
consolidation #216. The owner assigned this presentation correction followed
by reconciliation of this author's older task records. Independent review,
merge and shipping remain with their separately authorized sessions.

## Problem and resulting behavior

The catalogue, package readers and internal PDF printed clauses such as
`1.1 Estimated Daily Holdback` without their parent `1. Funding Terms`.
Counsel's subject names also omitted the section number. The underlying
section IDs, ordering and selected clause numbers already existed.

`mca/engine/section-headings.ts` now supplies the shared presentation:

- Names preserve the existing counsel vocabulary, including `Fee Schedule`
  and the two named exhibits. No new legal text or section classification is
  authored. Numbers come from the displayed clause citations, never the
  position of a filtered list or a legacy source label.
- Consecutive items are grouped without changing their order or identities.
  Leading field groups get the number of the operative clauses in the same
  section. A section that resumes later remains in that position; repeated
  document/guarantor instances are not merged or reordered.
- A reusable-only group has its existing title without a fabricated citation.
  If a review combines different parent numbers from different selections,
  the shared title does not claim one common number. Individual citations and
  their existing alternative/context explanations remain visible. The current
  default review of all six instruments has one consistent number per section.

The staff catalogue renders instrument headings, parent section headings and
the existing rows. Filtering retains the original parent number and displays
no empty groups. Headings are outside clause/approval counts; the catalogues
still contain 210 clauses and 25 reusable records.

The shared package reader groups both its index and text, covering provider
previews and filled transaction previews. Each selected document, including
separate Permission to Release instances, starts with its own section 1.
Counsel's subject navigation and reading title use the active citation
context. All-items and decision reading add headings when entering another
section while retaining complete business alternatives and finding controls.

The internal PDF uses the same grouping with a larger parent-heading style
and keeps space for following content. It retains every selected item, field,
signature location, page marker and the separate requirements worksheet.
The existing reusable equipment guaranty-heading block remains intact; it is
source content, not silently removed as part of a presentation change.

## Validation

- Before implementation, the new existing-reader/PDF regressions failed in
  three cases: unnumbered counsel parent names and missing parent text in
  both actual PDF fixtures.
- Focused validation: 124 tests across six files covering all instruments,
  filtered and different selections, field/repeated-item order, unchanged
  saved recipes/fingerprints, counsel coverage, reference projection and
  actual unsigned PDF output.
- PDF.js splits some larger heading numbers and titles into separate text
  items. Assertions normalize extraction whitespace, still require the
  expected literal heading and its order before the child clause, and reject
  a large parent/document heading as a page's last content. Existing page
  bounds, internal marks and no-AcroForm assertions remain intact.
- The two final synthetic PDF fixtures have 37 and 69 pages. Poppler contact
  sheets for all 69 option-package pages were inspected, with detailed checks
  of the Purchase transition, equipment Guaranty and individual-report start.
  No overlap, clipping or detached parent heading was observed. Private QA
  artifacts are under `/private/tmp/pacta-mca-headings-artifacts/`.
- The unchanged before-flow baseline is executed, successful Playwright run
  [34794610436](https://github.com/BizRethinkAI/internal-bizrethink-pacta-platform/actions/runs/34794610436)
  on the exact base SHA above. Its `Run Playwright shard 1 of 1` step executed;
  it was not a documentation skip.
- Existing browser scenarios now check catalogue parent/child grouping,
  filtered numbering and empty results; numbered counsel subject/all reading;
  provider preview and filled-preview headings. Screenshot artifacts cover
  the catalogue section and counsel reading. Final-head CI supplies the after
  browser gate, broader units/builds and separate types; final verdict/run
  links belong in the PR and task, without a status-only code push.

Changed-file formatting and whitespace were checked. The edited route and
four browser files are already explicitly BizRethink-owned; no new overlay or
ownership exemption is needed. No local application build was run.

## Preserved boundaries and handoff

Clause bodies, fields, versions, selection, numbering/reference resolution,
provenance, approvals, source files, template persistence and fingerprints are
unchanged. This adds no migration, permission, signature or sending behavior.
Every generated package remains an unsigned internal draft. New layouts still
belong in the independent review; technical CI does not approve legal content.

The author is reconciling older MCA cards against actual review/merge,
consolidation and available shipping evidence. Other sessions' assignments and
active security tasks remain untouched. The owner receives a concrete relay
for the security/shipping session to complete its own outstanding task closure.
Tracking updates are GitHub records, not changes to historical research or
STATE.md. The shipping consolidator folds this note after the PR is merged.
