-- DRY RUN for 2026-09-15-picana-governing-document-descriptions.sql. Reads only.
--
-- Confirms the three columns exist (i.e. #267's migration has run), that all
-- sixteen ids are this property's live governing documents, and shows what each
-- row holds now. Expect: columns_present = 3, and sixteen rows below.

\echo '=== COLUMNS (expect 3) ==='
SELECT count(*) AS columns_present
FROM information_schema.columns
WHERE table_name = 'BizrethinkDocument' AND column_name IN ('issuer', 'description', 'amendsDocumentId');

\echo ''
\echo '=== THE SIXTEEN ROWS THE SCRIPT WILL SET (expect 16) ==='
SELECT "sortOrder", id, left(label, 50) AS label
FROM "BizrethinkDocument"
WHERE "propertyId" = 'lease_property_iaicbumzvyrfnmzl' AND kind = 'hoa-governing' AND "archivedAt" IS NULL
  AND id IN (
    'bdoc_14436911c75c41d29c6f',
    'bdoc_f01907e7ea4c4e8ea0a1',
    'bdoc_5874a2109437438bbe15',
    'bdoc_5f23e4eaa35a4d5da6cf',
    'bdoc_6278e811f0af42d0be93',
    'bdoc_151f844c72d94318890f',
    'bdoc_11c6989661f54d23b7fb',
    'bdoc_f00a0c0d17c44307bbd6',
    'bdoc_3f89cd72c72447c0884c',
    'bdoc_93bf7ab408494fe6818f',
    'bdoc_d998893ee04d45dc8fb8',
    'bdoc_353908a3a92d4df2b004',
    'bdoc_95edddc1f6664a9a8b19',
    'bdoc_e2f9db259ccc40789969',
    'bdoc_3ebc0022706a4f258cdb',
    'bdoc_fcccc07afd1840b6944f'
  )
ORDER BY "sortOrder", "createdAt";

\echo ''
\echo '=== ANY LIVE GOVERNING DOCUMENT NOT IN THE SCRIPT (expect none) ==='
SELECT id, label
FROM "BizrethinkDocument"
WHERE "propertyId" = 'lease_property_iaicbumzvyrfnmzl' AND kind = 'hoa-governing' AND "archivedAt" IS NULL
  AND id NOT IN (
    'bdoc_14436911c75c41d29c6f',
    'bdoc_f01907e7ea4c4e8ea0a1',
    'bdoc_5874a2109437438bbe15',
    'bdoc_5f23e4eaa35a4d5da6cf',
    'bdoc_6278e811f0af42d0be93',
    'bdoc_151f844c72d94318890f',
    'bdoc_11c6989661f54d23b7fb',
    'bdoc_f00a0c0d17c44307bbd6',
    'bdoc_3f89cd72c72447c0884c',
    'bdoc_93bf7ab408494fe6818f',
    'bdoc_d998893ee04d45dc8fb8',
    'bdoc_353908a3a92d4df2b004',
    'bdoc_95edddc1f6664a9a8b19',
    'bdoc_e2f9db259ccc40789969',
    'bdoc_3ebc0022706a4f258cdb',
    'bdoc_fcccc07afd1840b6944f'
  );

\echo ''
\echo '=== CORRECTIONS: current values the script expects to replace ==='
SELECT "sortOrder", id, label, "documentDate"::date AS dated, coalesce(reference, '') AS reference
FROM "BizrethinkDocument"
WHERE "propertyId" = 'lease_property_iaicbumzvyrfnmzl' AND kind = 'hoa-governing' AND "archivedAt" IS NULL
  AND "sortOrder" BETWEEN 1 AND 16 AND "sortOrder" NOT IN (11)
ORDER BY "sortOrder", "createdAt";
