# Occupants asked once, no initials on signature pages, link to send — author handoff

Author `lease-send-20260914`; branch `fix/lease-occupants-and-initials`, from main
`190576a10`. Assigned directly by the repository owner after reviewing the first
envelope prepared with the new flow (`envelope_tanewlnoakcsiimy`, 2026-09-15).
The author does not merge, deploy, consolidate STATE.md or edit production data.

## What was wrong

1. **The occupants question was asked twice.** "Is anyone else going to live
   there?" (yes/no, required since #238) was followed — only after a yes — by
   "Anyone else living there, by name?", whose help still said "Leave blank if
   it is only the tenants".
2. **Initials under the signatures.** #239 put an initials line in every
   addendum page foot, including the last page, which carries the signature
   blocks — so each signer initialled the page they sign on. The prepared pilot
   envelope has 11 initials fields per signer; 5 are on signature pages.
3. **No visible Send.** A DRAFT envelope's summary page offers only Edit; Send
   Document is in the editor header and sidebar. The lease page linked to the
   summary page.

## What changed

- `authorisedOccupants`: label "Full names of everyone else who will live
  there", help without "leave blank", `required: true`. It is shown only after
  a yes, so a yes with no names now blocks preparing (via `unansweredRequired`).
  The label stands alone in the outstanding-answers list and on the tenant's
  review link, which is why it is a full phrase rather than "Their full names".
- `lease-document.ts` footer: the initials line is a `View` with a `render` prop
  that returns nothing when `subPageNumber === subPageTotalPages`. Sub-page
  counters count within the document's own `Page`, so this is right in the
  per-document envelope PDFs and in the combined review copy. The body's
  reserved foot height is unchanged, so pagination does not move.
  `@react-pdf` types a View's render props without `subPageTotalPages`; the
  runtime passes it (cast, commented, held by the rendered-PDF test).
- Lease page, DRAFT envelope: button "Review and send the envelope" →
  `/t/:team/documents/:id/edit`; copy names Send Document at the top right.

## Validation

- Red first: 8 tests (initials per page on two fixtures, labels, six signers;
  occupants label/required/gate; editor link).
- `lease/` + `regression-tests/` 170 files / 1,998 tests; `typecheck:lease` clean;
  `apps/remix` `tsc` 0 (after regenerating the Prisma client for main's models).
- Rendered the pilot's Early Termination Addendum and Receipt: initials line on
  page 1, none on the signature page.

## Production — after deploy, by the owner in the UI

The prepared pilot envelope was built before this and carries initials fields on
its signature pages. On the lease: Discard and edit the lease → confirm the
occupant names → Prepare the envelope → Review and send the envelope.
