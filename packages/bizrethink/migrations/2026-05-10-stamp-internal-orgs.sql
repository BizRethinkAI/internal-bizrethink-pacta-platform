-- ─────────────────────────────────────────────────────────────────────────
-- BizRethink data migration — stamp existing 8 orgs as internal
-- ─────────────────────────────────────────────────────────────────────────
--
-- Run this against PROD after deploying:
--   1. Overlay 041 (routes new orgs to PRO+trial)
--   2. Overlay 043 (adds PRO + BUSINESS tiers + aiEnabled flag)
--   3. Migration 20260511015534_add_bizrethink_organisation_billing
--
-- Why this exists: overlay 041 changes the default tier for NEW orgs from
-- BIZRETHINK to PRO+trial. Existing 8 orgs were all created under overlay 002
-- (BIZRETHINK claim). Their existing OrganisationClaim is preserved — they
-- stay on BIZRETHINK. But the new BizrethinkOrganisationBilling table is
-- empty for them, which means the trial-expire-sweep cron (Phase 2) would
-- otherwise see them as "no row → external, no trial set → no action."
--
-- This migration stamps `bizrethinkInternal=true` on all 8 existing orgs so
-- the cron explicitly skips them. Also creates the corresponding billing
-- row (1:1 with Organisation).
--
-- Idempotent: ON CONFLICT DO UPDATE means re-running won't duplicate rows.
--
-- Verified org IDs from prod (2026-05-10):
--   pacta              shwet@bizrethink.ai (Personal renamed to Pacta Ink)
--   bizrethink         BizRethink AI team org
--   mfg                Circular Payments (MFG entity) team org
--   morgcap            Circular Pay (MORG CAP entity) team org
--   pacta              (same as above — `Pacta Ink` Personal)
--   org_rcsltz...      shwet@circularpayments.com (Personal)
--   org_zabki...       jamie@circularpayments.com (Personal, CircularPay team)
--   lbliurlax...       deleted-account@sign.bizrethink.ai (defunct but kept)
--   ltkuuwlx...        serviceaccount@sign.bizrethink.ai (service account)
--
-- Run as:
--   ./scripts/bizrethink-db-query.sh prod --write \
--     -f packages/bizrethink/migrations/2026-05-10-stamp-internal-orgs.sql
--
-- Or via Coolify Postgres terminal: paste the body of this file at the
-- documenso=# prompt.

INSERT INTO "BizrethinkOrganisationBilling" (
  "id",
  "organisationId",
  "bizrethinkInternal",
  "trialStartedAt",
  "trialEndsAt",
  "createdAt",
  "updatedAt"
)
SELECT
  gen_random_uuid()::text,
  o."id",
  true,            -- bizrethinkInternal
  NULL,            -- trialStartedAt (internal orgs aren't on trial)
  NULL,            -- trialEndsAt
  NOW(),
  NOW()
FROM "Organisation" o
WHERE o."url" IN (
  'pacta',
  'bizrethink',
  'mfg',
  'morgcap',
  'lbliurlaxxxczmwl',
  'ltkuuwlxzosekcuw',
  'org_rcsltznsawwttdry',
  'org_zabkiubuwfrslivo'
)
ON CONFLICT ("organisationId") DO UPDATE
SET
  "bizrethinkInternal" = true,
  "trialStartedAt"     = NULL,
  "trialEndsAt"        = NULL,
  "updatedAt"          = NOW();

-- Verify the stamp.
SELECT
  o."url",
  o."name",
  b."bizrethinkInternal",
  b."trialStartedAt",
  b."trialEndsAt"
FROM "Organisation" o
LEFT JOIN "BizrethinkOrganisationBilling" b ON b."organisationId" = o."id"
ORDER BY o."createdAt";
