-- BizRethink data migration — seed `pro` + `business` rows in
-- SubscriptionClaim so the Stripe webhook handler can resolve them.
--
-- Why this exists: overlay 043 added PRO and BUSINESS to the TypeScript
-- INTERNAL_CLAIM_ID enum + internalClaims record, but the corresponding
-- DB rows weren't created. Documenso's stripe webhook handler does:
--
--     SELECT * FROM "SubscriptionClaim" WHERE id = <product.metadata.claimId>
--
-- and bails with a 500 if the row doesn't exist. We hit this in sandbox
-- on 2026-05-11 — Jhon Doe's $35 Pacta Pro subscription got charged in
-- Stripe but the webhook returned "Unknown error" and the claim never
-- flipped. Manual SQL fix-up worked; this migration ensures fresh
-- deploys don't repeat the mistake.
--
-- Idempotent: ON CONFLICT DO UPDATE makes manual replay safe and lets
-- us re-sync the row contents if the TypeScript shape changes later.
-- If you change `internalClaims[PRO]` or `internalClaims[BUSINESS]` in
-- packages/lib/types/subscription.ts, also update the values here so
-- future fresh deploys stay in sync. (Existing deploys keep whatever
-- row contents the SubscriptionClaim table already holds — the
-- ON CONFLICT path will refresh them on next migrate.)

INSERT INTO "SubscriptionClaim"
  (id, name, locked, "teamCount", "memberCount", "envelopeItemCount", flags, "createdAt", "updatedAt")
VALUES
  (
    'pro',
    'Pro',
    true,
    1,
    5,
    100,
    '{"allowCustomBranding": true, "hidePoweredBy": true, "emailDomains": true, "signingReminders": true, "aiEnabled": true}'::jsonb,
    NOW(),
    NOW()
  ),
  (
    'business',
    'Business',
    true,
    0,
    10,
    0,
    '{"unlimitedDocuments": true, "allowCustomBranding": true, "hidePoweredBy": true, "emailDomains": true, "embedSigning": true, "cfr21": true, "hipaa": true, "signingReminders": true, "aiEnabled": true}'::jsonb,
    NOW(),
    NOW()
  )
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  locked = EXCLUDED.locked,
  "teamCount" = EXCLUDED."teamCount",
  "memberCount" = EXCLUDED."memberCount",
  "envelopeItemCount" = EXCLUDED."envelopeItemCount",
  flags = EXCLUDED.flags,
  "updatedAt" = NOW();
