-- The legal entity that issues a document (ADR 0026).
--
-- Additive only: one new table, no change to any existing one, no backfill.
-- Templates saved today keep their inline entity details in the revision
-- snapshot and are unaffected; only new revisions will name an entity.
--
-- Rollback: drop the table; nothing else reads it yet.
CREATE TABLE "BizrethinkMcaEntity" (
    "id" TEXT NOT NULL,
    "organisationId" TEXT NOT NULL,
    "teamId" INTEGER NOT NULL,
    "label" TEXT NOT NULL,
    "identity" JSONB NOT NULL,
    "policy" JSONB NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdByUserId" INTEGER NOT NULL,
    "updatedByUserId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BizrethinkMcaEntity_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "BizrethinkMcaEntity_teamId_updatedAt_idx" ON "BizrethinkMcaEntity"("teamId", "updatedAt");
