-- Additive team-owned provider templates; no existing data or envelopes are changed.
CREATE TABLE "BizrethinkMcaTemplate" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "organisationId" TEXT NOT NULL,
  "teamId" INTEGER NOT NULL,
  "label" TEXT NOT NULL,
  "currentRevision" INTEGER NOT NULL DEFAULT 1,
  "createdByUserId" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL
);
CREATE TABLE "BizrethinkMcaTemplateRevision" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "templateId" TEXT NOT NULL,
  "version" INTEGER NOT NULL,
  "profile" JSONB NOT NULL,
  "snapshot" JSONB NOT NULL,
  "fingerprint" TEXT NOT NULL,
  "createdByUserId" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "BizrethinkMcaTemplateRevision_templateId_fkey" FOREIGN KEY ("templateId")
    REFERENCES "BizrethinkMcaTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "BizrethinkMcaTemplate_teamId_updatedAt_idx" ON "BizrethinkMcaTemplate"("teamId", "updatedAt");
CREATE UNIQUE INDEX "BizrethinkMcaTemplateRevision_templateId_version_key" ON "BizrethinkMcaTemplateRevision"("templateId", "version");
