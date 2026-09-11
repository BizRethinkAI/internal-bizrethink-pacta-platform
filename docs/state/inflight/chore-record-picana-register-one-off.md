# chore/record-picana-register-one-off

Records a one-off that already ran against prod, per the convention
`2026-09-06-move-picana-to-personal.sql` set: an applied migration is committed
as what ran, not as something to run again.

## What ran

Four guarded UPDATEs on `BizrethinkDocument` for 29090 Picana Ln, after the two
Estancia CDD resolutions of 16 December 2025 were uploaded through the
governing-documents editor:

1. Labelled and dated Resolution 2026-04 (Amenity Rates, Fees and Deposits).
2. Labelled and dated Resolution 2026-05 (Suspension and Termination Rules).
3. Archived the bare 3-page Suspension and Termination of Access Rule, which
   Resolution 2026-05 carries as its Exhibit A. Soft: `archivedAt` only.
4. Re-dated "Community Amenity Guidelines" from 2018-03-26 to 2020-01-31. The
   attached PDF was created 31 Jan 2020 and is 18 pages, matching the register's
   own count. **The receipt addendum the tenant signs recites that date**, so a
   wrong one is a wrong recital in an executed document.

Register is 16 entries, correctly ordered. Nothing was destroyed.

## Why no reordering step, which is a correction

An earlier reading of `BizrethinkDocument.sortOrder Int @default(0)` concluded
that uploads land at 0 and always need manual reordering. **That is wrong.**
`attachLeaseDocument` sets `sortOrder: (last?.sortOrder ?? -1) + 1`
(`attach-document.ts:116`), so an upload appends and the schema default never
applies. The two resolutions landed at 15 and 16 unaided.

The belief came from a grep that missed `server-only/`, and was only disproved
by uploading a file and looking. Worth recording because the same inference is
easy to make again from the schema alone.

`governing-document-editor.tsx` does not expose `sortOrder`, though
`documents.update` accepts it — so a deliberate reshuffle still needs a write.
Gaps are harmless: `describeDocuments` numbers the receipt by position.
