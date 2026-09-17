-- The record of what was published, kept by the producer (ADR 0023 §2, ADR 0024).
--
-- Replaces the vendored *.published.json copy a caller holds today. Append-only:
-- re-publishing an instrument writes a new row and the current one is the newest,
-- so an earlier publication stays readable after it is replaced.
--
-- Additive only: one new table, no change to any existing one, no backfill.
-- Rollback: drop the table; nothing else reads it.
CREATE TABLE "BizrethinkMcaPublication" (
    "id" TEXT NOT NULL,
    "organisationId" TEXT NOT NULL,
    "teamId" INTEGER NOT NULL,
    "templateId" TEXT NOT NULL,
    "templateRevision" INTEGER NOT NULL,
    "instrument" TEXT NOT NULL,
    "documensoTemplateId" INTEGER NOT NULL,
    "envelopeId" TEXT NOT NULL,
    "widgets" JSONB NOT NULL,
    "recipients" JSONB NOT NULL,
    "fingerprint" TEXT NOT NULL,
    "publishedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "publishedByUserId" INTEGER NOT NULL,

    CONSTRAINT "BizrethinkMcaPublication_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "BizrethinkMcaPublication_teamId_instrument_publishedAt_idx"
    ON "BizrethinkMcaPublication"("teamId", "instrument", "publishedAt");

CREATE INDEX "BizrethinkMcaPublication_templateId_templateRevision_idx"
    ON "BizrethinkMcaPublication"("templateId", "templateRevision");
