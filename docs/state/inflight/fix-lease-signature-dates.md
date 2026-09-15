# Whole signing dates on the lease — author handoff

Author `lease-send-20260914`; branch `fix/lease-signature-dates`, from main
`466b0f71c`. Task #269. The author does not merge, deploy or consolidate STATE.md.

## What was wrong

The first pilot envelope (`envelope_sovzcxlcbuhvniia`, 2026-09-15) showed each
signing date as "2026-09". There were two causes:

- **Upstream defaults.** The lease set no `dateFormat` or `timezone`, so dates
  used upstream's `yyyy-MM-dd hh:mm a` in UTC.
- **Field size.** The DATE field was sized from the text `{{DATE, r1}}`, about
  58 × 11pt. Upstream draws the date at 12pt with 6pt of side padding and clips
  it to the field, so only "2026-09" fit.

The same renderer draws the sealed PDF, so the signed copy would have kept the
cut-off date. The owner deleted the envelope. The matter
`lease_matter_kdxfitilinkibbdw` is back in draft with no envelope.

## What changed

- **`buildEnvelopeInput`** sets `meta: { dateFormat: 'MM/dd/yyyy', timezone:
  'America/New_York' }`. Eastern covers every supported state (FL, NC) except
  Florida's western panhandle, which is on Central time. The code comment records
  that limit.
- **The signature block** emits
  `{{DATE, rN, width=96, height=16}}` (`DATE_WIDGET`).
- **Overlay 092** makes `parseFieldMetaFromPlaceholder` parse `width`/`height` as
  numbers for every field type. Before this only SIGNATURE had its own branch, so
  overlay 034's size override got the string "96" for a DATE.
- **`visible-ink.ts`** now treats any sized token as sized. The whiteout check
  covers the whole date token text, not just the 96pt widget.

## Validation

- **Red first:**
  - the envelope meta test;
  - the sized DATE token test;
  - the extracted DATE widget test (96 × 16), which fails with overlay 092
    stashed (`expected '96' to be 96`).
- **Wrapping:** the date test also requires a DATE field for each of r1–r4, so a
  wrapped token that does not extract fails the test.
- **Suites:**
  - `lease/` + `regression-tests/`: 174 files, 2,038 tests.
  - `typecheck:lease` clean.
  - `apps/remix` tsc: 0 errors.
- **Visual:** pilot signature pages (lease p15, each addendum p2) rendered with
  the widget boxes drawn and "09/15/2026" set at 12pt. Each date sits after
  "Date:", inside its column.

## After merge and deploy (owner)

Lease page → Reopen the lease if offered → Prepare the envelope → Review the
envelope and check that a date field is full width → Send the envelope.
