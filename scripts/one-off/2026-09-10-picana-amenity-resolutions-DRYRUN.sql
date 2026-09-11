-- DRY RUN. Reads only. Run this first and read the output.
--
-- Kept alongside the applied script because the register it inspects is the
-- one a tenant signs a receipt for, and the next amendment recorded against
-- this property needs the same three checks before anything is written.
--
-- Shows exactly what 2026-09-10-picana-amenity-resolutions.sql will change:
-- the register for 29090 Picana Ln before, and the three rows it touches.
--
-- Run the two uploads FIRST (Resolution 2026-04 and the 4-page Resolution
-- 2026-05). Nothing here uploads; it only orders, archives and re-dates.

\echo '=== REGISTER NOW (archived rows excluded) ==='
SELECT "sortOrder", label, reference, "documentDate"::date, "pageCount"
FROM "BizrethinkDocument"
WHERE "propertyId" = 'lease_property_iaicbumzvyrfnmzl' AND "archivedAt" IS NULL
ORDER BY "sortOrder", "createdAt";

\echo ''
\echo '=== 1. WILL RE-DATE: Community Amenity Guidelines -> 2020-01-31 ==='
\echo '(the attached file was created 31 Jan 2020; 26 Mar 2018 is unsupported)'
SELECT id, label, "documentDate"::date AS current_date_on_record, "pageCount"
FROM "BizrethinkDocument"
WHERE "propertyId" = 'lease_property_iaicbumzvyrfnmzl'
  AND "archivedAt" IS NULL
  AND label = 'Community Amenity Guidelines';

\echo ''
\echo '=== 2. WILL ARCHIVE: the bare 3-page rule, superseded by Res 2026-05 ==='
\echo '(sets archivedAt only; nothing is destroyed)'
SELECT id, label, "pageCount", "sortOrder"
FROM "BizrethinkDocument"
WHERE "propertyId" = 'lease_property_iaicbumzvyrfnmzl'
  AND "archivedAt" IS NULL
  AND label LIKE 'Suspension and Termination of Access Rule%'
  AND "pageCount" = 3;

\echo ''
\echo '=== 3. WILL REORDER: the two newly uploaded resolutions ==='
\echo '(uploads land at sortOrder 0 by schema default and sort to the front)'
SELECT id, label, "sortOrder" AS current_sort, "pageCount",
       CASE
         WHEN label ILIKE '%2026-04%' THEN 15
         WHEN label ILIKE '%2026-05%' THEN 16
       END AS will_become
FROM "BizrethinkDocument"
WHERE "propertyId" = 'lease_property_iaicbumzvyrfnmzl'
  AND "archivedAt" IS NULL
  AND (label ILIKE '%2026-04%' OR label ILIKE '%2026-05%')
  AND "pageCount" = 4;

\echo ''
\echo '=== EXPECTED: 1 row in each of the three blocks above, 2 in the third ==='
\echo 'If any block is empty, do NOT run the apply script - the labels differ.'
