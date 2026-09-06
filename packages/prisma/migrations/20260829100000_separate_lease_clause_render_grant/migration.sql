-- Give lock 2 its own grant, instead of borrowing a billing flag.
--
-- WHAT WAS WRONG
--
-- The lease builder has two independent locks. Lock 1 ("may you open this
-- feature?") reads BizrethinkFeatureAccess. Lock 2 ("may clause text that has
-- not been through attorney review be rendered into a document?") read
-- BizrethinkOrganisationBilling.bizrethinkInternal.
--
-- That column was created for BILLING. Its own migration
-- (20260511052729_stamp_bizrethink_internal_orgs) says so: it stamps the eight
-- organisations that predate the SaaS layer so the trial-expire sweep skips
-- them and the in-app banner reads "BizRethink Internal" rather than "Pro trial
-- active". It has never been a statement about legal review.
--
-- Reusing it made one flag carry two meanings — the same defect the lease
-- builder exists to fix, where a single securityDeposit field carried both
-- money HELD and money COLLECTED.
--
-- It had already drifted. As of 2026-08-29 seven organisations carried the
-- flag, four of them auto-created "Personal Organisation" rows, and every one
-- had silently acquired permission to render unreviewed legal text. Nothing was
-- exploitable — lock 1 had exactly one grant — but lock 2's entire job is to
-- hold when lock 1 has been got wrong, and it was weaker than its docstring.
--
-- WHAT THIS DOES
--
-- Grants the new 'lease-clause-draft-rendering' feature to the single
-- organisation that actually holds lease-builder work: org_wzsyehzolibvnxal
-- (BizRethink AI), which owns the only BizrethinkProperty and the only
-- BizrethinkLeaseMatter in production.
--
-- Deliberately NOT granted to the other six organisations carrying
-- bizrethinkInternal. They were stamped for billing reasons and none of them
-- has any lease work; migrating the flag wholesale would carry the drift
-- forward, which is the thing being fixed. They keep their billing semantics
-- and lose a permission they were never meant to have.
--
-- Everything else denies by default. No other organisation can render
-- unreviewed clause text, and lock 2 now fails closed for anyone new.

INSERT INTO "BizrethinkFeatureAccess" (
  "id", "feature", "scope", "scopeId", "enabled", "note", "createdAt", "updatedAt"
)
SELECT
  'bfa_lease_draft_' || substr(md5(o."id"), 1, 16),
  'lease-clause-draft-rendering',
  'organisation',
  o."id",
  true,
  'Split from BizrethinkOrganisationBilling.bizrethinkInternal, which is a billing flag. Revoke when the clause library is attorney-reviewed and published.',
  NOW(),
  NOW()
FROM "Organisation" o
WHERE o."id" = 'org_wzsyehzolibvnxal'
ON CONFLICT ("feature", "scope", "scopeId") DO NOTHING;
