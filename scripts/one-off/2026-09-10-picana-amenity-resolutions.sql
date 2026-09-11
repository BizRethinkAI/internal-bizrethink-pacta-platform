-- APPLIED 2026-09-10. Recorded here as what ran, not as something to run again.
-- Re-running is harmless — every UPDATE is guarded on an exact row count and
-- steps 1, 2 and 4 would now match 0 rows, aborting the transaction — but
-- there is no reason to.
--
-- Register housekeeping for 29090 Picana Ln, after the two CDD resolutions
-- were uploaded through the governing-documents editor.
--
--   ./scripts/bizrethink-db-query.sh prod --write \\
--     -f scripts/one-off/2026-09-10-picana-amenity-resolutions.sql
--
-- NO REORDERING HERE, and that is a correction. `attachLeaseDocument` sets
-- `sortOrder: (last?.sortOrder ?? -1) + 1` (attach-document.ts:116), so an
-- upload APPENDS. The schema default of 0 never applies. The two resolutions
-- landed at 15 and 16 on their own, which is where they belong.
--
-- FOUR CHANGES, none destructive:
--   1+2. Give the two uploads real labels and dates. They arrive named after
--        the file ("EST_2026-04") with no date, because the upload route falls
--        back to the filename and the District's scans carry no useful metadata.
--     3. Archive the bare 3-page Suspension and Termination of Access Rule. The
--        District sent the adopting instrument, Resolution 2026-05, which
--        carries the same rule as its Exhibit A. Soft: sets archivedAt only.
--     4. Re-date "Community Amenity Guidelines" to 2020-01-31. The register
--        said 26 Mar 2018; the attached PDF was created 31 Jan 2020 and is 18
--        pages, matching the register's own count. The receipt addendum the
--        tenant SIGNS recites that date.
--
-- Gaps in sortOrder are harmless: `describeDocuments` numbers the receipt by
-- POSITION, so archiving row 14 renumbers what follows on its own.
--
-- Every statement is scoped to this property and to archivedAt IS NULL, and
-- guarded on an exact row count. A failed guard rolls the whole thing back.

BEGIN;

DO $$
DECLARE
  touched integer;
BEGIN
  UPDATE "BizrethinkDocument"
     SET label          = 'Resolution 2026-04 — Adopting Amenity Rates, Fees and Deposits',
         reference      = 'Estancia at Wiregrass Community Development District; adopted 16 December 2025',
         "documentDate" = TIMESTAMP '2025-12-16 00:00:00',
         "updatedAt"    = NOW()
   WHERE "propertyId" = 'lease_property_iaicbumzvyrfnmzl'
     AND "archivedAt" IS NULL AND label = 'EST_2026-04' AND "pageCount" = 4;
  GET DIAGNOSTICS touched = ROW_COUNT;
  IF touched <> 1 THEN
    RAISE EXCEPTION 'Step 1 matched % rows for EST_2026-04, expected 1.', touched;
  END IF;

  UPDATE "BizrethinkDocument"
     SET label          = 'Resolution 2026-05 — Adopting Amenity Suspension and Termination Rules',
         reference      = 'Estancia at Wiregrass Community Development District; law implemented ss. 120.69, 190.011, 190.012, Fla. Stat.',
         "documentDate" = TIMESTAMP '2025-12-16 00:00:00',
         "updatedAt"    = NOW()
   WHERE "propertyId" = 'lease_property_iaicbumzvyrfnmzl'
     AND "archivedAt" IS NULL AND label = 'EST_2026-05' AND "pageCount" = 4;
  GET DIAGNOSTICS touched = ROW_COUNT;
  IF touched <> 1 THEN
    RAISE EXCEPTION 'Step 2 matched % rows for EST_2026-05, expected 1.', touched;
  END IF;

  UPDATE "BizrethinkDocument"
     SET "archivedAt" = NOW(), "updatedAt" = NOW()
   WHERE "propertyId" = 'lease_property_iaicbumzvyrfnmzl'
     AND "archivedAt" IS NULL
     AND label LIKE 'Suspension and Termination of Access Rule%'
     AND "pageCount" = 3;
  GET DIAGNOSTICS touched = ROW_COUNT;
  IF touched <> 1 THEN
    RAISE EXCEPTION 'Step 3 archived % rows, expected 1.', touched;
  END IF;

  UPDATE "BizrethinkDocument"
     SET "documentDate" = TIMESTAMP '2020-01-31 00:00:00', "updatedAt" = NOW()
   WHERE "propertyId" = 'lease_property_iaicbumzvyrfnmzl'
     AND "archivedAt" IS NULL
     AND label = 'Community Amenity Guidelines'
     AND "documentDate" <> TIMESTAMP '2020-01-31 00:00:00';
  GET DIAGNOSTICS touched = ROW_COUNT;
  IF touched <> 1 THEN
    RAISE EXCEPTION 'Step 4 re-dated % rows, expected 1.', touched;
  END IF;

  RAISE NOTICE 'All four steps applied.';
END $$;

COMMIT;

\echo ''
\echo '=== THE REGISTER AS THE RECEIPT ADDENDUM WILL PRINT IT ==='
SELECT row_number() OVER (ORDER BY "sortOrder", "createdAt") AS printed_as,
       label, "documentDate"::date, "pageCount"
FROM "BizrethinkDocument"
WHERE "propertyId" = 'lease_property_iaicbumzvyrfnmzl' AND "archivedAt" IS NULL
ORDER BY "sortOrder", "createdAt";
