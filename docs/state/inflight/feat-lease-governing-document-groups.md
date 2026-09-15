# Governing documents grouped, described, amendments nested — author handoff

Author `lease-send-20260914`; branch `feat/lease-governing-document-groups`, from
main `8f62e1744`. Task #264; the AI-drafting follow-up is #265. Reserves additive
migration `20260915090000_bizrethink_document_issuer_description`. Independent
review is mandatory (migration; receipt wording). The author does not merge,
deploy, consolidate STATE.md or write production data.

## Why

The owner could not tell which of the pilot's sixteen governing documents was for
what: one numbered run of legal titles, nine "… Amendment to the Amended and
Restated Master Declaration", and two Community Development District resolutions
printed as "governing documents of" the association. PR #263 (tighter spacing to
fit two pages) was closed in favour of this.

## What changed

- **Data:** `BizrethinkDocument.issuer` ('association' | 'cdd' | 'other'),
  `description`, `amendsDocumentId` — three nullable TEXT columns, no backfill.
  Rollback: drop them. Plain id, no relation (ADR 0002).
- **Structure** (`lease/documents/governing-structure.ts`): groups association →
  CDD → other, headings from the property's `hoaName` / `cddName`; top-level
  documents numbered across groups, amendments lettered beneath their original
  (an amendment of an amendment nests under the original; a missing, self or
  looping link lists at top level). `governingDocumentGaps` and `amendsProblem`.
- **Receipt v3:** intro no longer attributes everything to `{{hoaName}}`; says
  descriptions are for convenience and the documents control.
  `describeGoverningDocuments` emits `[[group]]` / `[[doc]]` / `[[ref]]` line
  markup: entry line leads with number, title, description, date, download link;
  a grey reference line (recording reference · pages) beneath. `clauseBody`
  renders it — plain bold group headings, entry and reference kept together, 18pt
  indent for amendments. Condition reports keep the flat `describeDocuments`.
- **Envelope attachments** and **zip** follow the structure: labels "1a. Title —
  description"; zip entries `Issuer/01a Title.pdf`. `findGoverningDocuments` is
  the one lookup for both and returns the heading names.
- **Blocking:** a governing document without issuer or description is a
  `documentFindings` entry in `validate` (counted as blocking, shown on the review
  step) and refuses `prepare`.
- **Association documents step:** "Issued by" (names from the property),
  "What it covers" (≤160), "Amends" (other documents of the same set).
  `documents.update` validates the amends link server-side.

## Validation

- Red first: structure (8), gaps, amends (2), procedure and screen source checks,
  grouped markup (2), receipt wording (2) and rendered headings/descriptions/refs,
  attachment labels, zip naming (2), prepare/validate gate (3).
- `lease/` + `regression-tests/` 174 files / 2,036 tests; `typecheck:lease` clean;
  `apps/remix` `tsc` 0.
- Rendered the pilot receipt from stored answers plus the drafted metadata:
  three pages, MPOA group with the Declaration and ten nested amendments, then the
  guidelines; CDD group with the two resolutions.

## For the owner, after deploy

Enter issuer, description and amends for the sixteen documents (drafts from the
PDFs were given in session). Consider shortening nested amendment titles
("First Amendment") — they sit under the Declaration now. Clear the CDD name and
dates out of items 15–16's reference fields. Correct item 12's date (the document
says revised 3/26/18) and item 14's (approved 2/28/23).
