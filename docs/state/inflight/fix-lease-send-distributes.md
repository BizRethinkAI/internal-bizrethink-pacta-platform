# Lease envelopes: prepare, review, send — author handoff

Author `lease-send-20260914`; branch `fix/lease-send-distributes`, from main
`602e54599`. Assigned directly by the repository owner after the pilot lease
failed to go out. The author does not merge, deploy, consolidate STATE.md or
repair production data.

## What was wrong

Found on the first real lease (29090 Picana Ln, 2026-09-14). Both defects date
from when sending was wired; neither is a regression.

1. **"Sent" over a draft.** The `matter.send` mutation created an envelope with
   upstream `createEnvelope` — a DRAFT — and stamped the matter `sent`. Nothing
   called `sendDocument`. The review step told the landlord every signer had
   been emailed; in production the envelope was DRAFT, every recipient NOT_SENT,
   the audit log only DOCUMENT_CREATED.
2. **Signing tokens visible to signers.** The envelope's PDFs were the raw
   render. `buildEnvelopeInput` and `signature-blocks.ts` both said
   `createEnvelope` "whites the tokens out"; it does not — upstream paints them
   at upload (`extractPdfPlaceholders`), a path the lease never used. So
   `{{SIGNATURE, r1, width=160, height=44}}` and `{{DATE, r1}}` showed behind
   every widget and would have been sealed into the signed PDF. The review copy
   (`renderLeaseForReview`, read by counsel and tenants) had them too.

## The decision: prepare, review, send

The first version of this PR sent the envelope on the button press. The
repository owner wants to check an envelope before it goes out, so the lease
builder now **prepares** a draft and stops; the landlord sends it from the
envelope with upstream's own send. Nothing on the lease-builder path can call
`sendDocument`, and a source-level test holds that.

## What changed

- **Tokens.** `lease/render/white-out-signing-tokens.ts` paints each signing
  token (`{{TYPE, rN, …}}`) over its own text box. Clause variables such as
  `{{repairThresholdUsd}}` stay visible — on a review copy they show an answer is
  missing. Not upstream's `removePlaceholdersFromPDF`: that paints the field's
  box, which for a sized signature is the 160pt widget, and the token is ~200pt,
  so `ght=44}}` stayed (309 ink pixels per line measured; 0 with this). Used by
  `createEnvelopeFromMatter` before upload and by `renderLeaseForReview`.
  Placeholders are still read from the raw render; positions match to 1e-3pt.
- **Prepare.** `matter.prepare` (was `send`) keeps every gate, then
  `prepareEnvelopeFromMatter` creates the draft and records it on the matter —
  `status: 'ready'`, `envelopeId`, rule pack version — as a conditional write on
  `status: 'draft', envelopeId: null`. The loser of a double click deletes its
  own draft and is refused.
- **Discard.** `matter.discardEnvelope` → `discardPreparedEnvelope`, in one
  transaction: delete the envelope only `WHERE status = DRAFT` (a condition of
  the delete, so a send in another tab cannot be erased), then reopen the matter
  (`draft`, `envelopeId`/`rulePackVersion`/`generatedAt` null) conditional on it
  still pointing at that envelope. An envelope already deleted from the
  documents list reopens the lease too. Anything not a draft is refused.
- **Status follows the envelope.** `leaseState` takes `envelopeStatus` and
  resolves it before the matter stamp: DRAFT "Ready to send", PENDING "Out for
  signature", COMPLETED "Signed", REJECTED "Declined by a signer", CANCELLED
  "Cancelled", missing "Envelope deleted". The Leases list and the lease page
  header both read it. The review step's panel shows per-status copy; only the
  PENDING branch says anything was sent.

No overlay, schema, migration or dependency change. The two route files are
owned (added by the lease builder), not upstream. `@libpdf/core` and
`pdfjs-dist` are imported without being declared in `packages/bizrethink`,
following the existing `@prisma/client`/`zod` precedent.

## Validation

- Red first at each step: whiteout (pass-through stub, then upstream's
  paint-out), prepare/discard (9 of 10 against no-op stubs; the upload test
  already passed from the whiteout work), `leaseState` envelope cases (5), router
  and route source checks.
- Tests rasterise pages (pdfjs + @napi-rs/canvas): a painted token still
  extracts, so no text assertion can tell the PDFs apart.
- `lease/` suite 93 files, 1,068 tests. `typecheck:lease` clean; `apps/remix`
  `tsc` 0 errors. Biome clean on changed files apart from warnings already in
  `lease-document.ts`.
- Two existing source-scan tests re-anchored to `await
  prepareEnvelopeFromMatter(`; assertions unchanged.
- No Playwright scenario prepares or sends a lease; none added.

## Limits

- A CANCELLED envelope cannot be discarded, so its lease stays locked with no
  way to prepare a new one from the lease builder.
- A lease prepared before this deploy may hold PDFs with visible tokens. Discard
  it and prepare again; the page cannot tell an old draft from a new one.

## Production — after deploy, done by the owner in the UI

The pilot matter `lease_matter_kdxfitilinkibbdw` is `sent` against DRAFT
envelope `envelope_xuhhhrcmcudvihov` (document 687), whose PDFs have raw tokens.
After deploy its review step reads "The envelope is ready for you to check" —
**do not send that one.** Press *Discard and edit the lease*, then *Prepare the
envelope*, check the new draft, send it from the envelope. No database write.

## Seen, not fixed here

A full page-by-page review of the pilot package (7 documents, 29 pages) was done
outside this PR and reported to the owner. Content and layout defects it found —
including an occupancy clause that omits stored occupants, e-notice elections
with no markable fields, an execution line that refers to a date not written
above, a dropped section heading, and internal document keys in footers — are
for separate PRs.
