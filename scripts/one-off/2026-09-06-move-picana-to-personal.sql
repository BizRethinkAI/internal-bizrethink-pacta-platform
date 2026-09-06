-- APPLIED 2026-09-06. Recorded here as what ran, not as something to run again.
-- Re-running is harmless — every UPDATE is guarded on the SOURCE organisation,
-- so all three row counts would come back 0 and the block would abort — but
-- there is no reason to.
--
-- Move 29090 Picana Ln and its lease out of the company organisation.
--
-- The property is personal; the lease names four natural persons and the
-- company appears nowhere in the agreement. It was simply created in the wrong
-- organisation.
--
-- SAFE ONLY WHILE NOTHING IS SIGNED. envelopeId is NULL and there are zero
-- envelopes in the source org today. Once matter.send succeeds, Envelope.teamId
-- is fixed and there is no code path to move an envelope between teams — the
-- matter and its signed envelope would live in different organisations
-- permanently. Guard 1 below refuses to run if that has happened.
--
-- FOUR THINGS MOVE, NOT TWO:
--   1. the property
--   2. the matter — organisationId AND teamId together
--   3. the 15 documents, which carry their own organisationId
--   4. the lease-clause-draft-rendering grant
--
-- Reviews (5) and comments (3) are keyed by matterId/reviewId and follow
-- without being touched. Stored files are addressed by an S3 key containing no
-- organisation or team, so no bytes move. Review links keep working either way:
-- token routes scope by matterId, never by organisation. (At the time this ran
-- none was open — four closed, one returned with Harsha's three comments.)
--
-- WHY teamId MATTERS. matter.send passes matter.teamId straight into
-- createEnvelope. Moving the organisation alone would leave the matter pointing
-- at team 5 in the company org, and the signed envelope for a personal lease
-- would be created back inside BizRethink AI — at the one moment that is
-- expensive to undo.
--
-- WHY THE GRANT MOVES RATHER THAN BEING COPIED. 52 clauses are status 'draft'
-- with zero approvals, so lease-clause-draft-rendering is what allows the lease
-- to be sent at all. Migration 20260829100000 exists because its predecessor
-- flag drifted onto seven organisations, each silently permitted to render
-- un-lawyered legal text; its closing line is "lock 2 now fails closed for
-- anyone new". After this runs the source organisation holds no lease work, so
-- leaving it granted would recreate exactly that drift.
--
-- BEFORE RUNNING: close any browser tab open on /t/bizrerink-api/leases. That
-- loader hands the client a stale organisationId, membership still passes, and
-- a write from the open page would land on the old organisation.
--
-- Run with:  ./scripts/bizrethink-db-query.sh prod --write -f scripts/one-off/2026-09-06-move-picana-to-personal.sql

DO $$
DECLARE
  dst_org  text := 'org_nkzrmhochvhmbwnt';           -- Personal Organisation (/o/personal)
  dst_team int  := 3;                                 -- Ambika & Shwet Prabhat (/t/prabhat)
  src_org  text := 'org_wzsyehzolibvnxal';           -- BizRethink AI
  prop_id  text := 'lease_property_iaicbumzvyrfnmzl'; -- 29090 Picana Ln
  mat_id   text := 'lease_matter_kdxfitilinkibbdw';
  n int;
BEGIN
  -- Guard 0. There are NO foreign keys on any Bizrethink* table (ADR 0002), so
  -- nothing but these checks would catch a wrong id.
  IF dst_org = src_org THEN
    RAISE EXCEPTION 'destination equals source'; END IF;

  IF NOT EXISTS (SELECT 1 FROM "Organisation" WHERE id = dst_org) THEN
    RAISE EXCEPTION 'destination organisation % does not exist', dst_org; END IF;

  IF NOT EXISTS (SELECT 1 FROM "Team" WHERE id = dst_team AND "organisationId" = dst_org) THEN
    RAISE EXCEPTION 'team % is not in organisation %', dst_team, dst_org; END IF;

  IF (SELECT "ownerUserId" FROM "Organisation" WHERE id = dst_org)
     <> (SELECT "ownerUserId" FROM "Organisation" WHERE id = src_org) THEN
    RAISE EXCEPTION 'destination organisation has a different owner'; END IF;

  -- Guard 1. Nothing signed. This is the whole reason the move is cheap.
  IF EXISTS (SELECT 1 FROM "BizrethinkLeaseMatter"
             WHERE id = mat_id AND "envelopeId" IS NOT NULL) THEN
    RAISE EXCEPTION 'matter has an envelope; moving it would split a signed envelope from its matter'; END IF;

  IF EXISTS (SELECT 1 FROM "Envelope" e JOIN "Team" t ON t.id = e."teamId"
             WHERE t."organisationId" = src_org) THEN
    RAISE EXCEPTION 'source organisation unexpectedly has envelopes'; END IF;

  -- 1. The property.
  UPDATE "BizrethinkProperty"
     SET "organisationId" = dst_org, "updatedAt" = NOW()
   WHERE id = prop_id AND "organisationId" = src_org;
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 1 THEN RAISE EXCEPTION 'property: expected 1 row, got %', n; END IF;

  -- 2. The matter. Organisation AND team, never one without the other.
  UPDATE "BizrethinkLeaseMatter"
     SET "organisationId" = dst_org, "teamId" = dst_team, "updatedAt" = NOW()
   WHERE id = mat_id AND "organisationId" = src_org AND "propertyId" = prop_id;
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 1 THEN RAISE EXCEPTION 'matter: expected 1 row, got %', n; END IF;

  -- 3. The 15 documents. This column IS the authorization boundary: the
  --    documents.list/update/remove procedures check organisationId alone and
  --    never verify the propertyId belongs to the caller's organisation.
  UPDATE "BizrethinkDocument"
     SET "organisationId" = dst_org, "updatedAt" = NOW()
   WHERE "organisationId" = src_org
     AND ("propertyId" = prop_id OR "matterId" = mat_id);
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 15 THEN RAISE EXCEPTION 'documents: expected 15 rows, got %', n; END IF;

  -- 4. Lock 2 follows the work.
  INSERT INTO "BizrethinkFeatureAccess"
    (id, feature, scope, "scopeId", enabled, note, "createdAt", "updatedAt")
  VALUES
    ('bfa_lease_draft_' || substr(md5(dst_org), 1, 16),
     'lease-clause-draft-rendering', 'organisation', dst_org, true,
     'Moved with 29090 Picana Ln from org_wzsyehzolibvnxal on 2026-09-06. Revoke when the clause library is attorney-reviewed and published.',
     NOW(), NOW())
  ON CONFLICT (feature, scope, "scopeId") DO NOTHING;

  -- 5. And is revoked where the work no longer is.
  DELETE FROM "BizrethinkFeatureAccess"
   WHERE feature = 'lease-clause-draft-rendering'
     AND scope = 'organisation' AND "scopeId" = src_org;

  -- Guard 2. Nothing left split across organisations.
  IF EXISTS (
    SELECT 1 FROM "BizrethinkDocument" d
     LEFT JOIN "BizrethinkProperty" p ON p.id = d."propertyId"
     LEFT JOIN "BizrethinkLeaseMatter" m ON m.id = d."matterId"
     WHERE d."organisationId" <> COALESCE(p."organisationId", m."organisationId")
  ) THEN RAISE EXCEPTION 'orphan: a document disagrees with its owner'; END IF;

  IF EXISTS (
    SELECT 1 FROM "BizrethinkLeaseMatter" m
     JOIN "BizrethinkProperty" p ON p.id = m."propertyId"
     WHERE m."organisationId" <> p."organisationId"
  ) THEN RAISE EXCEPTION 'orphan: matter and property disagree'; END IF;

  IF EXISTS (
    SELECT 1 FROM "BizrethinkLeaseMatter" m
     JOIN "Team" t ON t.id = m."teamId"
     WHERE t."organisationId" <> m."organisationId"
  ) THEN RAISE EXCEPTION 'orphan: matter team is in another organisation'; END IF;

  RAISE NOTICE 'moved property + matter + 15 documents + lock 2 to % (team %)', dst_org, dst_team;
END $$;
