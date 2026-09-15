# Lease send distributes, and signers see no tokens — author handoff

Author `lease-send-20260914`; branch `fix/lease-send-distributes`, from main
`602e54599`. Assigned directly by the repository owner after the pilot lease
failed to go out. The author does not merge, deploy, consolidate STATE.md or
repair production data.

## What was wrong

Found on the first real lease (29090 Picana Ln, 2026-09-14). Both defects date
from when sending was wired; neither is a regression.

1. **Send never sent.** The `matter.send` mutation called
   `createEnvelopeFromMatter`, which ends in upstream `createEnvelope` — a
   DRAFT — then stamped the matter `sent`. Nothing called `sendDocument`. The
   review step said "Every signer has been emailed their own link"; in
   production the envelope was DRAFT, every recipient NOT_SENT, and the audit
   log held only DOCUMENT_CREATED.
2. **Signing tokens visible to signers.** The envelope's PDFs were the raw
   render. `buildEnvelopeInput` and `signature-blocks.ts` both said
   `createEnvelope` "whites the tokens out"; it does not. Upstream paints them at
   upload (`extractPdfPlaceholders`), a path the lease never used. So
   `{{SIGNATURE, r1, width=160, height=44}}` and `{{DATE, r1}}` showed behind
   every widget, and would have been sealed into the signed PDF. The review copy
   (`renderLeaseForReview`, read by counsel and by tenants) had them too.

## What changed

- `lease/render/white-out-signing-tokens.ts` paints every **signing** token
  (`{{TYPE, rN, …}}`) with a white box over the token's own text. Clause
  variables such as `{{repairThresholdUsd}}` are left: on a review copy they are
  how a reader sees an answer is missing.
- **Not upstream's `removePlaceholdersFromPDF`.** That paints the box upstream
  reports for the field, which for a sized signature is the 160pt widget; the
  token is ~200pt, so `ght=44}}` stayed. Measured: ~300 ink pixels left per
  signature line with upstream's paint-out, 0 with this.
- `createEnvelopeFromMatter` uploads the cleaned PDF; placeholders are still
  read from the raw render (painting leaves the text, so positions match to
  1e-3pt).
- `renderLeaseForReview` returns the cleaned PDF.
- `sendEnvelopeFromMatter` creates, then `sendDocument`s. On failure the
  envelope's own status decides, inside a conditional delete:
  still DRAFT → discarded and the error thrown, matter stays a draft;
  no longer DRAFT (a step after distribution failed — email job, webhook) →
  returned as `errorAfterSending`, because a matter that does not record a live
  envelope gets a second one on the next click.
- The router stamps `sent` only after that, then reports `errorAfterSending` as
  an UNKNOWN_ERROR telling the landlord to check recipients on the envelope. The
  log line carries the envelope id and error message only.

No overlay, schema, migration or dependency change. `@libpdf/core` and
`pdfjs-dist` are imported without being declared in `packages/bizrethink`,
following the existing `@prisma/client`/`zod` precedent; both are hoisted from
upstream packages.

## Validation

- Red first. Whiteout tests failed against a pass-through stub (1,559 ink
  pixels in the first token box) and against upstream's
  `removePlaceholdersFromPDF` (309 left per signature tail). Send tests failed
  against a create-only stub (4/4). Router source tests failed against the
  unchanged router (2/2).
- Tests rasterise the page (pdfjs + @napi-rs/canvas) because a painted token
  still extracts — no text-level assertion can tell the two PDFs apart.
- `lease/` suite: 93 files, 1,059 tests pass. `typecheck:lease` clean. Two
  existing source-scan tests re-anchored from `const envelope = await
  createEnvelopeFromMatter` to `= await sendEnvelopeFromMatter(`; their
  assertions are unchanged.
- Rendered the cleaned execution pages of the lease and an addendum for four
  parties and inspected them: rules, printed names and `Date:` labels only.
- No Playwright scenario sends a lease, before or after; none added. CI runs the
  existing E2E suite.

## Production — not done here, needs the owner

The pilot matter `lease_matter_kdxfitilinkibbdw` is `sent` against envelope
`envelope_xuhhhrcmcudvihov` (document 687), which is DRAFT with raw tokens in
its PDFs. **Do not send that envelope from the document editor** — it would go
out with the tokens. After this deploys: delete the draft envelope (a draft
nobody received), set the matter back to `draft` with `envelopeId = null`, then
press Send on the review step.

## Seen, not fixed

- The page footer prints the document key, e.g.
  `PACTA · ADDENDUM:TERMINATION.EARLY-ELECTION`.
- Every document's execution block says "executed this **Lease**", including
  addenda and the flood disclosure.
