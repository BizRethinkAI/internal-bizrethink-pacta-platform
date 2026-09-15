# Governing documents delivered visibly, with one download — author handoff

Author `lease-send-20260914`; branch `fix/lease-governing-document-delivery`,
stacked on `fix/lease-occupants-and-initials` (#255). Assigned directly by the
repository owner after reviewing the prepared pilot envelope's attachments
(2026-09-15). Reserves overlay **091**. The author does not merge, deploy,
consolidate STATE.md or edit production data.

## What was wrong

- The Receipt of Governing Documents had the tenant acknowledge receiving
  sixteen documents and never said where they were. The only route was an
  unlabelled "Attachments" item under Actions in the signing sidebar (v2), with
  no count; nothing in the signed PDF led back to them.
- Sixteen documents meant sixteen separate links ("not very user friendly").
- With sixteen entries both upstream attachment panels broke: the sender's panel
  let every URL run past its edge (`truncate` on an inline `<a>` does nothing),
  neither list scrolled, and the signer's panel cut labels to one line — seven
  Declaration amendments share their first forty characters.

## What changed

- **Receipt v2** (`hoa.governing-documents-receipt`): a paragraph naming every
  route — each document's link, one link for all, Attachments on the signing
  page — and a paper copy on request. Wording is for counsel.
- **Linked list:** `describeDocuments(documents, 'hoa-governing', { matterId })`
  ends each item with `— [[link download|URL]]` and adds "All N documents in one
  download:" with the URL as its own line (so a printed copy carries an address
  someone can type). `hydrateMatter` passes the lease id when it has one. Only
  governing documents are linked; a move-in report never is.
- **Renderer:** `clauseBody` renders `[[link text|url]]` as a react-pdf `Link`
  (accent, underlined). Text carrying a link is not hyphenated — the first render
  split "down-load" and inserted a hyphen into the printed URL. Clauses without a
  link render exactly as before.
- **Download all:** `/lease-attachment/:matterId/all` (owned route, listed in
  `BIZRETHINK-OWNED.txt`) zips every governing document, stored not recompressed,
  named `NN Label.pdf` in receipt order. `findGoverningDocuments` holds the
  recorded-instruments-only, property-or-lease scope. Built in memory (~12MB on
  the pilot). `attachmentContentDisposition` added beside the inline variant.
- **Envelope attachments:** the download-all link comes first when there is more
  than one document ("All 16 documents, in one download").
- **Overlay 091:** sender panel — URL `block truncate`, labels wrap, list scrolls;
  signer panel — labels wrap, list scrolls, `trigger` may be a function receiving
  the count; the v2 signing sidebar shows "Attachments (N)".

## Validation

- Red first: 11 tests (bundle names and zip round-trip, download-all route,
  attachment ordering, linked list, receipt wording, clickable links in the PDF,
  links surviving `whiteOutSigningTokens`, lease id wiring, both panels).
- `lease/` + `regression-tests/` 173 files / 2,016 tests; `typecheck:lease`
  clean; `apps/remix` `tsc` 0. Overlay patch reverse-applies cleanly.
- Rendered the pilot receipt from its stored answers: 3 pages, 17 link
  annotations (16 + all), no hyphenated link, signature page without initials.

## Limits

- Link annotations survive our whiteout; not verified through upstream sealing.
  The download-all URL is also printed as text for that reason.
- The zip is assembled per request with no rate limit beyond the capability URL;
  the documents are public records, but a large set costs memory per request.
- Existing prepared envelopes carry the old attachment list and receipt; the pilot
  must be discarded and prepared again after deploy.
