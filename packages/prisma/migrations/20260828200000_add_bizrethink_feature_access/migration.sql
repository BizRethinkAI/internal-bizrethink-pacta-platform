-- BizRethink — per-organisation / per-user feature gating.
--
-- Lock 1 of 2 for the lease builder. Deny by default: absence of a row means
-- no access. A `user`-scoped row wins over an `organisation`-scoped one in
-- both directions, so one person can be granted ahead of their org or revoked
-- without disabling the team. See packages/bizrethink/server-only/feature-access.ts
--
-- Feature-generic so the next gated feature reuses the table rather than
-- adding another.
--
-- Purely additive: creates one new table and its indexes. Touches no existing
-- table, column or row, so there is nothing here to roll back beyond dropping
-- the table.

CREATE TABLE "BizrethinkFeatureAccess" (
    "id" TEXT NOT NULL,
    "feature" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "scopeId" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "grantedByUserId" INTEGER,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BizrethinkFeatureAccess_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "BizrethinkFeatureAccess_feature_scope_scopeId_key"
    ON "BizrethinkFeatureAccess"("feature", "scope", "scopeId");

CREATE INDEX "BizrethinkFeatureAccess_feature_scope_idx"
    ON "BizrethinkFeatureAccess"("feature", "scope");
