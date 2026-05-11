-- BizRethink data migration — stamp the 8 production orgs that existed
-- pre-overlay-041 as `bizrethinkInternal=true`.
--
-- Context: overlay 041 changed the default tier for newly-created orgs
-- from BIZRETHINK to PRO+trial. The 8 existing orgs (Personal-renamed,
-- BizRethink AI, MFG, MORG CAP, plus team-member personals + service
-- accounts) need to keep their BIZRETHINK semantics. The
-- BizrethinkOrganisationBilling row tells the trial-expire-sweep cron
-- (Phase 2) to skip them and lets the in-app banner show
-- "BizRethink Internal" instead of "Pro trial active".
--
-- Idempotent: ON CONFLICT DO UPDATE makes manual replay safe. Prisma's
-- migration tracking will skip this on subsequent deploys anyway.
--
-- New internal orgs added in the future: don't add them here. Add them
-- via the admin override panel (Phase 3) or a fresh one-shot migration.
-- This file is the "bootstrap the 8 orgs that predate the SaaS layer"
-- moment, not an ongoing flagging mechanism.

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
  true,
  NULL,
  NULL,
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
