-- 29090 Picana Ln: who issued each governing document, what it covers, and
-- what it amends — the three fields added by #267 (task #264).
--
-- RUN ONLY AFTER #267 IS DEPLOYED. The columns are created by migration
-- 20260915090000 at container start; before that, this fails on the first
-- UPDATE and the transaction rolls back with nothing written.
--
--   ./scripts/bizrethink-db-query.sh prod -f scripts/one-off/2026-09-15-picana-governing-document-descriptions-DRYRUN.sql
--   ./scripts/bizrethink-db-query.sh prod --write \
--     -f scripts/one-off/2026-09-15-picana-governing-document-descriptions.sql
--
-- WHERE THE WORDS CAME FROM. Drafted in session by reading each PDF (twelve are
-- scans, read as page images) and accepted by the repository owner on
-- 2026-09-15. Each is a topic, not a statement of legal effect; the receipt says
-- the documents themselves control. Item 4 (Third Amendment) was drafted from 6 of
-- its 12 pages.
--
-- AMENDS. The nine amendments and the Second Supplement amend or supplement the
-- Amended and Restated Master Declaration, so they are listed beneath it.
--
-- REGISTER CORRECTIONS, also accepted by the owner on 2026-09-15 (second block):
--   a. Items 2–11: short titles. They are listed beneath the Declaration now, so
--      "First Amendment" reads fully; the recording reference still identifies
--      each one on the line beneath.
--   b. Item 13: its own heading is "Usage Policies from the Community Amenity
--      Guidelines" — a one-page excerpt, not a separate set of guidelines.
--   c. Item 14: dated 2023-02-28, the board approval on the document.
--   d. Items 15–16: reference cleared. Those resolutions are not recorded
--      instruments; the reference held the District's name (now the issuer
--      heading) and a statutory citation.
-- Each correction is guarded on the value it replaces, so a row edited in the
-- UI since this was written aborts the run instead of being overwritten.
--
-- NOT CHANGED: the Community Amenity Guidelines stay dated 2020-01-31 — the
-- 2026-09-10 script set that deliberately from the attached file's creation date
-- and page count.
--
-- Every UPDATE is scoped to this property, to archivedAt IS NULL and to one id,
-- and guarded on an exact row count; a failed guard rolls everything back.
-- Re-running aborts at the first correction (its old value is gone): run once.

BEGIN;

DO $$
DECLARE
  touched integer;
BEGIN
  -- 1. Amended and Restated Master Declaration
  UPDATE "BizrethinkDocument"
     SET issuer = 'association', description = 'core community rules, assessments and use restrictions', "amendsDocumentId" = NULL, "updatedAt" = NOW()
   WHERE id = 'bdoc_14436911c75c41d29c6f' AND "propertyId" = 'lease_property_iaicbumzvyrfnmzl' AND kind = 'hoa-governing' AND "archivedAt" IS NULL;
  GET DIAGNOSTICS touched = ROW_COUNT;
  IF touched <> 1 THEN
    RAISE EXCEPTION 'Item 1 (Amended and Restated Master Declaration) matched % rows, expected 1.', touched;
  END IF;

  -- 2. First Amendment
  UPDATE "BizrethinkDocument"
     SET issuer = 'association', description = 'golf carts and low-speed vehicles', "amendsDocumentId" = 'bdoc_14436911c75c41d29c6f', "updatedAt" = NOW()
   WHERE id = 'bdoc_f01907e7ea4c4e8ea0a1' AND "propertyId" = 'lease_property_iaicbumzvyrfnmzl' AND kind = 'hoa-governing' AND "archivedAt" IS NULL;
  GET DIAGNOSTICS touched = ROW_COUNT;
  IF touched <> 1 THEN
    RAISE EXCEPTION 'Item 2 (First Amendment) matched % rows, expected 1.', touched;
  END IF;

  -- 3. Second Amendment
  UPDATE "BizrethinkDocument"
     SET issuer = 'association', description = 'adds the Phase 2A plat and its common areas', "amendsDocumentId" = 'bdoc_14436911c75c41d29c6f', "updatedAt" = NOW()
   WHERE id = 'bdoc_5874a2109437438bbe15' AND "propertyId" = 'lease_property_iaicbumzvyrfnmzl' AND kind = 'hoa-governing' AND "archivedAt" IS NULL;
  GET DIAGNOSTICS touched = ROW_COUNT;
  IF touched <> 1 THEN
    RAISE EXCEPTION 'Item 3 (Second Amendment) matched % rows, expected 1.', touched;
  END IF;

  -- 4. Third Amendment
  UPDATE "BizrethinkDocument"
     SET issuer = 'association', description = 'drainage areas, fences, and villa lot walls and upkeep', "amendsDocumentId" = 'bdoc_14436911c75c41d29c6f', "updatedAt" = NOW()
   WHERE id = 'bdoc_5f23e4eaa35a4d5da6cf' AND "propertyId" = 'lease_property_iaicbumzvyrfnmzl' AND kind = 'hoa-governing' AND "archivedAt" IS NULL;
  GET DIAGNOSTICS touched = ROW_COUNT;
  IF touched <> 1 THEN
    RAISE EXCEPTION 'Item 4 (Third Amendment) matched % rows, expected 1.', touched;
  END IF;

  -- 5. Second Supplement
  UPDATE "BizrethinkDocument"
     SET issuer = 'association', description = 'adds Phase 2B1 land to the community', "amendsDocumentId" = 'bdoc_14436911c75c41d29c6f', "updatedAt" = NOW()
   WHERE id = 'bdoc_6278e811f0af42d0be93' AND "propertyId" = 'lease_property_iaicbumzvyrfnmzl' AND kind = 'hoa-governing' AND "archivedAt" IS NULL;
  GET DIAGNOSTICS touched = ROW_COUNT;
  IF touched <> 1 THEN
    RAISE EXCEPTION 'Item 5 (Second Supplement) matched % rows, expected 1.', touched;
  END IF;

  -- 6. Fourth Amendment
  UPDATE "BizrethinkDocument"
     SET issuer = 'association', description = 'adds Phases 3A and 3B; villa lot maintenance', "amendsDocumentId" = 'bdoc_14436911c75c41d29c6f', "updatedAt" = NOW()
   WHERE id = 'bdoc_151f844c72d94318890f' AND "propertyId" = 'lease_property_iaicbumzvyrfnmzl' AND kind = 'hoa-governing' AND "archivedAt" IS NULL;
  GET DIAGNOSTICS touched = ROW_COUNT;
  IF touched <> 1 THEN
    RAISE EXCEPTION 'Item 6 (Fourth Amendment) matched % rows, expected 1.', touched;
  END IF;

  -- 7. Fifth Amendment
  UPDATE "BizrethinkDocument"
     SET issuer = 'association', description = 'landscaping and irrigation changes on villa lots', "amendsDocumentId" = 'bdoc_14436911c75c41d29c6f', "updatedAt" = NOW()
   WHERE id = 'bdoc_11c6989661f54d23b7fb' AND "propertyId" = 'lease_property_iaicbumzvyrfnmzl' AND kind = 'hoa-governing' AND "archivedAt" IS NULL;
  GET DIAGNOSTICS touched = ROW_COUNT;
  IF touched <> 1 THEN
    RAISE EXCEPTION 'Item 7 (Fifth Amendment) matched % rows, expected 1.', touched;
  END IF;

  -- 8. Sixth Amendment
  UPDATE "BizrethinkDocument"
     SET issuer = 'association', description = 'Phase 2B1 common areas and gated neighborhoods', "amendsDocumentId" = 'bdoc_14436911c75c41d29c6f', "updatedAt" = NOW()
   WHERE id = 'bdoc_f00a0c0d17c44307bbd6' AND "propertyId" = 'lease_property_iaicbumzvyrfnmzl' AND kind = 'hoa-governing' AND "archivedAt" IS NULL;
  GET DIAGNOSTICS touched = ROW_COUNT;
  IF touched <> 1 THEN
    RAISE EXCEPTION 'Item 8 (Sixth Amendment) matched % rows, expected 1.', touched;
  END IF;

  -- 9. Seventh Amendment
  UPDATE "BizrethinkDocument"
     SET issuer = 'association', description = 'residential use and villa/townhome building rules', "amendsDocumentId" = 'bdoc_14436911c75c41d29c6f', "updatedAt" = NOW()
   WHERE id = 'bdoc_3f89cd72c72447c0884c' AND "propertyId" = 'lease_property_iaicbumzvyrfnmzl' AND kind = 'hoa-governing' AND "archivedAt" IS NULL;
  GET DIAGNOSTICS touched = ROW_COUNT;
  IF touched <> 1 THEN
    RAISE EXCEPTION 'Item 9 (Seventh Amendment) matched % rows, expected 1.', touched;
  END IF;

  -- 10. Eighth Amendment
  UPDATE "BizrethinkDocument"
     SET issuer = 'association', description = 'start-up contribution paid when a lot is sold', "amendsDocumentId" = 'bdoc_14436911c75c41d29c6f', "updatedAt" = NOW()
   WHERE id = 'bdoc_93bf7ab408494fe6818f' AND "propertyId" = 'lease_property_iaicbumzvyrfnmzl' AND kind = 'hoa-governing' AND "archivedAt" IS NULL;
  GET DIAGNOSTICS touched = ROW_COUNT;
  IF touched <> 1 THEN
    RAISE EXCEPTION 'Item 10 (Eighth Amendment) matched % rows, expected 1.', touched;
  END IF;

  -- 11. Ninth Amendment
  UPDATE "BizrethinkDocument"
     SET issuer = 'association', description = 'leasing rules: minimum term, parking, tenant registration', "amendsDocumentId" = 'bdoc_14436911c75c41d29c6f', "updatedAt" = NOW()
   WHERE id = 'bdoc_d998893ee04d45dc8fb8' AND "propertyId" = 'lease_property_iaicbumzvyrfnmzl' AND kind = 'hoa-governing' AND "archivedAt" IS NULL;
  GET DIAGNOSTICS touched = ROW_COUNT;
  IF touched <> 1 THEN
    RAISE EXCEPTION 'Item 11 (Ninth Amendment) matched % rows, expected 1.', touched;
  END IF;

  -- 12. Community Amenity Guidelines
  UPDATE "BizrethinkDocument"
     SET issuer = 'association', description = 'clubhouse, pool and fitness rules; renter privileges', "amendsDocumentId" = NULL, "updatedAt" = NOW()
   WHERE id = 'bdoc_353908a3a92d4df2b004' AND "propertyId" = 'lease_property_iaicbumzvyrfnmzl' AND kind = 'hoa-governing' AND "archivedAt" IS NULL;
  GET DIAGNOSTICS touched = ROW_COUNT;
  IF touched <> 1 THEN
    RAISE EXCEPTION 'Item 12 (Community Amenity Guidelines) matched % rows, expected 1.', touched;
  END IF;

  -- 13. MPOA Community Facility Guidelines
  UPDATE "BizrethinkDocument"
     SET issuer = 'association', description = 'summary of amenity usage rules and guest limits', "amendsDocumentId" = NULL, "updatedAt" = NOW()
   WHERE id = 'bdoc_95edddc1f6664a9a8b19' AND "propertyId" = 'lease_property_iaicbumzvyrfnmzl' AND kind = 'hoa-governing' AND "archivedAt" IS NULL;
  GET DIAGNOSTICS touched = ROW_COUNT;
  IF touched <> 1 THEN
    RAISE EXCEPTION 'Item 13 (MPOA Community Facility Guidelines) matched % rows, expected 1.', touched;
  END IF;

  -- 14. Enforcement Policies
  UPDATE "BizrethinkDocument"
     SET issuer = 'association', description = 'violation notices, fines and suspensions', "amendsDocumentId" = NULL, "updatedAt" = NOW()
   WHERE id = 'bdoc_e2f9db259ccc40789969' AND "propertyId" = 'lease_property_iaicbumzvyrfnmzl' AND kind = 'hoa-governing' AND "archivedAt" IS NULL;
  GET DIAGNOSTICS touched = ROW_COUNT;
  IF touched <> 1 THEN
    RAISE EXCEPTION 'Item 14 (Enforcement Policies) matched % rows, expected 1.', touched;
  END IF;

  -- 15. Resolution 2026-04
  UPDATE "BizrethinkDocument"
     SET issuer = 'cdd', description = 'amenity rates, fees and deposits', "amendsDocumentId" = NULL, "updatedAt" = NOW()
   WHERE id = 'bdoc_3ebc0022706a4f258cdb' AND "propertyId" = 'lease_property_iaicbumzvyrfnmzl' AND kind = 'hoa-governing' AND "archivedAt" IS NULL;
  GET DIAGNOSTICS touched = ROW_COUNT;
  IF touched <> 1 THEN
    RAISE EXCEPTION 'Item 15 (Resolution 2026-04) matched % rows, expected 1.', touched;
  END IF;

  -- 16. Resolution 2026-05
  UPDATE "BizrethinkDocument"
     SET issuer = 'cdd', description = 'suspension of amenity access for rule violations', "amendsDocumentId" = NULL, "updatedAt" = NOW()
   WHERE id = 'bdoc_fcccc07afd1840b6944f' AND "propertyId" = 'lease_property_iaicbumzvyrfnmzl' AND kind = 'hoa-governing' AND "archivedAt" IS NULL;
  GET DIAGNOSTICS touched = ROW_COUNT;
  IF touched <> 1 THEN
    RAISE EXCEPTION 'Item 16 (Resolution 2026-05) matched % rows, expected 1.', touched;
  END IF;

END $$;

DO $$
DECLARE
  touched integer;
BEGIN
  -- a. Item 2: title
  UPDATE "BizrethinkDocument"
     SET label = 'First Amendment', "updatedAt" = NOW()
   WHERE id = 'bdoc_f01907e7ea4c4e8ea0a1' AND "propertyId" = 'lease_property_iaicbumzvyrfnmzl' AND "archivedAt" IS NULL
     AND label = 'First Amendment to the Amended and Restated Master Declaration';
  GET DIAGNOSTICS touched = ROW_COUNT;
  IF touched <> 1 THEN
    RAISE EXCEPTION 'Title fix for item 2 matched % rows, expected 1.', touched;
  END IF;

  -- a. Item 3: title
  UPDATE "BizrethinkDocument"
     SET label = 'Second Amendment', "updatedAt" = NOW()
   WHERE id = 'bdoc_5874a2109437438bbe15' AND "propertyId" = 'lease_property_iaicbumzvyrfnmzl' AND "archivedAt" IS NULL
     AND label = 'Second Amendment to the Amended and Restated Master Declaration';
  GET DIAGNOSTICS touched = ROW_COUNT;
  IF touched <> 1 THEN
    RAISE EXCEPTION 'Title fix for item 3 matched % rows, expected 1.', touched;
  END IF;

  -- a. Item 4: title
  UPDATE "BizrethinkDocument"
     SET label = 'Third Amendment', "updatedAt" = NOW()
   WHERE id = 'bdoc_5f23e4eaa35a4d5da6cf' AND "propertyId" = 'lease_property_iaicbumzvyrfnmzl' AND "archivedAt" IS NULL
     AND label = 'Third Amendment to the Amended and Restated Master Declaration';
  GET DIAGNOSTICS touched = ROW_COUNT;
  IF touched <> 1 THEN
    RAISE EXCEPTION 'Title fix for item 4 matched % rows, expected 1.', touched;
  END IF;

  -- a. Item 5: title
  UPDATE "BizrethinkDocument"
     SET label = 'Second Supplement (Phase 2B1)', "updatedAt" = NOW()
   WHERE id = 'bdoc_6278e811f0af42d0be93' AND "propertyId" = 'lease_property_iaicbumzvyrfnmzl' AND "archivedAt" IS NULL
     AND label = 'Second Supplement to the Amended and Restated Master Declaration (Phase 2B1)';
  GET DIAGNOSTICS touched = ROW_COUNT;
  IF touched <> 1 THEN
    RAISE EXCEPTION 'Title fix for item 5 matched % rows, expected 1.', touched;
  END IF;

  -- a. Item 6: title
  UPDATE "BizrethinkDocument"
     SET label = 'Fourth Amendment', "updatedAt" = NOW()
   WHERE id = 'bdoc_151f844c72d94318890f' AND "propertyId" = 'lease_property_iaicbumzvyrfnmzl' AND "archivedAt" IS NULL
     AND label = 'Fourth Amendment to the Amended and Restated Master Declaration';
  GET DIAGNOSTICS touched = ROW_COUNT;
  IF touched <> 1 THEN
    RAISE EXCEPTION 'Title fix for item 6 matched % rows, expected 1.', touched;
  END IF;

  -- a. Item 7: title
  UPDATE "BizrethinkDocument"
     SET label = 'Fifth Amendment', "updatedAt" = NOW()
   WHERE id = 'bdoc_11c6989661f54d23b7fb' AND "propertyId" = 'lease_property_iaicbumzvyrfnmzl' AND "archivedAt" IS NULL
     AND label = 'Fifth Amendment to the Amended and Restated Master Declaration';
  GET DIAGNOSTICS touched = ROW_COUNT;
  IF touched <> 1 THEN
    RAISE EXCEPTION 'Title fix for item 7 matched % rows, expected 1.', touched;
  END IF;

  -- a. Item 8: title
  UPDATE "BizrethinkDocument"
     SET label = 'Sixth Amendment', "updatedAt" = NOW()
   WHERE id = 'bdoc_f00a0c0d17c44307bbd6' AND "propertyId" = 'lease_property_iaicbumzvyrfnmzl' AND "archivedAt" IS NULL
     AND label = 'Sixth Amendment to the Amended and Restated Master Declaration';
  GET DIAGNOSTICS touched = ROW_COUNT;
  IF touched <> 1 THEN
    RAISE EXCEPTION 'Title fix for item 8 matched % rows, expected 1.', touched;
  END IF;

  -- a. Item 9: title
  UPDATE "BizrethinkDocument"
     SET label = 'Seventh Amendment', "updatedAt" = NOW()
   WHERE id = 'bdoc_3f89cd72c72447c0884c' AND "propertyId" = 'lease_property_iaicbumzvyrfnmzl' AND "archivedAt" IS NULL
     AND label = 'Seventh Amendment to the Amended and Restated Master Declaration';
  GET DIAGNOSTICS touched = ROW_COUNT;
  IF touched <> 1 THEN
    RAISE EXCEPTION 'Title fix for item 9 matched % rows, expected 1.', touched;
  END IF;

  -- a. Item 10: title
  UPDATE "BizrethinkDocument"
     SET label = 'Eighth Amendment', "updatedAt" = NOW()
   WHERE id = 'bdoc_93bf7ab408494fe6818f' AND "propertyId" = 'lease_property_iaicbumzvyrfnmzl' AND "archivedAt" IS NULL
     AND label = 'Eighth Amendment to the Amended and Restated Master Declaration';
  GET DIAGNOSTICS touched = ROW_COUNT;
  IF touched <> 1 THEN
    RAISE EXCEPTION 'Title fix for item 10 matched % rows, expected 1.', touched;
  END IF;

  -- a. Item 11: title
  UPDATE "BizrethinkDocument"
     SET label = 'Ninth Amendment (Leasing)', "updatedAt" = NOW()
   WHERE id = 'bdoc_d998893ee04d45dc8fb8' AND "propertyId" = 'lease_property_iaicbumzvyrfnmzl' AND "archivedAt" IS NULL
     AND label = 'Ninth Amendment to the Amended and Restated Master Declaration (Leasing)';
  GET DIAGNOSTICS touched = ROW_COUNT;
  IF touched <> 1 THEN
    RAISE EXCEPTION 'Title fix for item 11 matched % rows, expected 1.', touched;
  END IF;

  -- b. Item 13: title
  UPDATE "BizrethinkDocument"
     SET label = 'Usage Policies from the Community Amenity Guidelines', "updatedAt" = NOW()
   WHERE id = 'bdoc_95edddc1f6664a9a8b19' AND "propertyId" = 'lease_property_iaicbumzvyrfnmzl' AND "archivedAt" IS NULL
     AND label = 'MPOA Community Facility Guidelines';
  GET DIAGNOSTICS touched = ROW_COUNT;
  IF touched <> 1 THEN
    RAISE EXCEPTION 'Title fix for item 13 matched % rows, expected 1.', touched;
  END IF;

  -- c. Item 14: approval date
  UPDATE "BizrethinkDocument"
     SET "documentDate" = TIMESTAMP '2023-02-28 00:00:00', "updatedAt" = NOW()
   WHERE id = 'bdoc_e2f9db259ccc40789969' AND "propertyId" = 'lease_property_iaicbumzvyrfnmzl' AND "archivedAt" IS NULL
     AND "documentDate" IS NULL;
  GET DIAGNOSTICS touched = ROW_COUNT;
  IF touched <> 1 THEN
    RAISE EXCEPTION 'Date fix for item 14 matched % rows, expected 1.', touched;
  END IF;

  -- d. Item 15: reference cleared
  UPDATE "BizrethinkDocument"
     SET reference = NULL, "updatedAt" = NOW()
   WHERE id = 'bdoc_3ebc0022706a4f258cdb' AND "propertyId" = 'lease_property_iaicbumzvyrfnmzl' AND "archivedAt" IS NULL
     AND reference LIKE 'Estancia at Wiregrass Community Development District%';
  GET DIAGNOSTICS touched = ROW_COUNT;
  IF touched <> 1 THEN
    RAISE EXCEPTION 'Reference fix for item 15 matched % rows, expected 1.', touched;
  END IF;

  -- d. Item 16: reference cleared
  UPDATE "BizrethinkDocument"
     SET reference = NULL, "updatedAt" = NOW()
   WHERE id = 'bdoc_fcccc07afd1840b6944f' AND "propertyId" = 'lease_property_iaicbumzvyrfnmzl' AND "archivedAt" IS NULL
     AND reference LIKE 'Estancia at Wiregrass Community Development District%';
  GET DIAGNOSTICS touched = ROW_COUNT;
  IF touched <> 1 THEN
    RAISE EXCEPTION 'Reference fix for item 16 matched % rows, expected 1.', touched;
  END IF;

END $$;

COMMIT;

-- What the receipt will now group and describe.
SELECT "sortOrder", issuer, CASE WHEN "amendsDocumentId" IS NULL THEN '' ELSE 'nested' END AS amends,
       left(label, 55) AS label, "documentDate"::date AS dated, coalesce(reference, '') AS reference, description
FROM "BizrethinkDocument"
WHERE "propertyId" = 'lease_property_iaicbumzvyrfnmzl' AND kind = 'hoa-governing' AND "archivedAt" IS NULL
ORDER BY "sortOrder", "createdAt";
