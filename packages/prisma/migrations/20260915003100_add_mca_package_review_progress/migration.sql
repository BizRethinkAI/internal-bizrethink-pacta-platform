ALTER TABLE "BizrethinkMcaPackageReview"
  ADD COLUMN "teamId" INTEGER,
  ADD COLUMN "organisationId" TEXT,
  ADD COLUMN "templateId" TEXT,
  ADD COLUMN "templateVersion" INTEGER,
  ADD COLUMN "reviewedTargetIds" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "completedAt" TIMESTAMP(3);
ALTER TABLE "BizrethinkMcaPackageReview" ADD CONSTRAINT "BizrethinkMcaPackageReview_scope_check" CHECK (
  ("teamId" IS NULL AND "organisationId" IS NULL AND "templateId" IS NULL AND "templateVersion" IS NULL AND "snapshot"->>'kind' = 'library')
  OR ("teamId" IS NOT NULL AND "organisationId" IS NOT NULL AND "templateId" IS NOT NULL AND "templateVersion" IS NOT NULL AND "templateVersion" > 0 AND "snapshot"->>'kind' = 'provider')
);
CREATE INDEX "BizrethinkMcaPackageReview_teamId_templateId_templateVersion_idx" ON "BizrethinkMcaPackageReview"("teamId", "templateId", "templateVersion");
