# Lease elections, answers and links — author handoff

Author `lease-send-20260914`; branch `fix/lease-elections-and-answers`, stacked on
`fix/lease-send-distributes` (#233) at `f5edb6ad1`. Task #237 (PR 1a; PR 1b is
`fix/lease-document-layout`). Found by a page-by-page review of the pilot lease
package rendered from production answers. The author does not merge, deploy,
consolidate STATE.md or edit production data.

## What was wrong

1. **Occupants silently dropped.** The pilot's tenant answered "anyone else
   living there" with three names; clause 6.2 named only the two tenants.
   `hasNamedOccupants` was added to the interview after the lease was started,
   so it was never answered, and an unanswered yes/no reads as "no" — selecting
   the clause without names. The send gate counted only unfilled clause
   variables, which a selecting question never leaves.
2. **Elections not markable.** §83.505 electronic-notice addendum printed "[ ]"
   for every option; the §83.595(4) early-termination addendum gave a checkbox
   to the first tenant only. A box before an option also left a ~90pt gap once
   its token was painted out.
3. **Two attachment links 500.** Labels with an em dash went raw into
   `Content-Disposition`; header values are limited to 0xFF. Same code on the
   reviewer attachment route.

## What changed

- `lease/interview/answer-gaps.ts`: `unansweredRequired` (required, shown,
  empty — under `interviewFor` the property's state; no default, because the
  full Florida list includes NC questions) and `ignoredAnswers` (typed text or a
  "yes" behind a hidden question). `hasNamedOccupants` is required. `validate`
  adds unanswered names to `missing` and returns `ignoredAnswers` (warning on the
  review step); `prepare` refuses on unanswered.
- `lease/render/election-marks.ts`: a clause line starting
  `[[each tenant marks]] ` / `[[each landlord marks]] ` renders full width with
  a row beneath of one 120pt cell per person — name over `{{CHECKBOX, rN}}`,
  numbered like the signature blocks. Clauses without a marker render exactly as
  before. Hooked at the two `clauseBody` call sites in `lease-document.ts`.
- Clause text: `termination.early-election` v4 (every tenant marks the same
  option; marks that differ mean no fee), `notices.electronic-delivery` v2
  (speaks for whoever marks; addresses listed after the options; unused
  `landlordNames`/`tenantNames` variables removed). `tenantElectionBox` removed.
- `lease/documents/content-disposition.ts`: ASCII `filename` plus RFC 6266
  `filename*`; used by both attachment routes.

## Validation

- Red first for each: disposition helper (4) and route callers (2); answer gaps
  (5) and router wiring; elections (9 across form, markable and set-equality).
- Checked on the pilot's real answers (read-only): `unansweredRequired` →
  `hasNamedOccupants` only; `ignoredAnswers` → `authorisedOccupants` only.
  Before the state-scoped interview it also reported seven NC questions; before
  narrowing it reported a seeded `saleNoticeDays` — both fixed.
- Rendered the pilot's two election addenda and inspected them: options flush
  left, each signer's name over their cell.
- Retried the two failing production links' cause locally: `new Response` throws
  on U+2014 in a header value.
- `lease/` 95 files, 1,088 tests; `typecheck:lease` clean; `apps/remix` `tsc` 0.

## Limits and open questions

- The checkbox widget's look in the signing view was not seen in a browser; the
  landlord checks it when reviewing the prepared envelope.
- Statutory-form wording changed on both addenda, and "marks differ → no fee" is
  a drafting choice: for counsel.
- The lead-based paint disclosure (`statutory-disclosures.ts`) still prints
  "[ ]" for the landlord's statements. Not on the pilot (built 2018); not fixed.
- Clause text edits would lapse an attorney approval pinned to the old text; production has none on either clause (checked read-only).
