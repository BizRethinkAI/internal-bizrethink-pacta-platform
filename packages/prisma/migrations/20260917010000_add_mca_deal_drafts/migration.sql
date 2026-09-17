-- ADR 0022: an MCA deal is saved input, never a saved document.
--
-- Additive: one table, two indexes, no change to any existing row. Rolling the
-- application back leaves the table in place and harmless; dropping it destroys
-- teams' in-progress deals, so a rollback does not drop it.
CREATE TABLE "BizrethinkMcaDeal" (
    "id" TEXT NOT NULL,
    "organisationId" TEXT NOT NULL,
    "teamId" INTEGER NOT NULL,
    "templateId" TEXT NOT NULL,
    "templateRevision" INTEGER NOT NULL,
    "label" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "input" JSONB NOT NULL,
    "createdByUserId" INTEGER NOT NULL,
    "updatedByUserId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BizrethinkMcaDeal_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "BizrethinkMcaDeal_teamId_updatedAt_idx" ON "BizrethinkMcaDeal"("teamId", "updatedAt");
CREATE INDEX "BizrethinkMcaDeal_templateId_idx" ON "BizrethinkMcaDeal"("templateId");
