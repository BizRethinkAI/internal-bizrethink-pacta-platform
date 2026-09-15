-- Repair the promotion-era default only when the saved provider identity agrees
-- with its stored scope. Preserve snapshots, tokens, findings and review history.
-- One atomic statement prevents a partial backfill if unexpected data fails validation.
DO $$
BEGIN
  LOCK TABLE "BizrethinkMcaPackageReview" IN ACCESS EXCLUSIVE MODE;

  UPDATE "BizrethinkMcaPackageReview"
  SET "kind" = 'provider'
  WHERE "kind" = 'library'
    AND "snapshot"->>'kind' = 'provider'
    AND "snapshot"->>'schemaVersion' = '2'
    AND "teamId" IS NOT NULL
    AND "organisationId" IS NOT NULL
    AND "templateId" IS NOT NULL
    AND "templateVersion" > 0
    AND "snapshot"->'provider'->>'templateId' = "templateId"
    AND "snapshot"->'provider'->>'revision' = "templateVersion"::TEXT;

  ALTER TABLE "BizrethinkMcaPackageReview"
    DROP CONSTRAINT "BizrethinkMcaPackageReview_scope_check";
  ALTER TABLE "BizrethinkMcaPackageReview"
    ADD CONSTRAINT "BizrethinkMcaPackageReview_scope_check" CHECK ((
      ("kind" = 'library' AND "snapshot"->>'kind' = 'library'
        AND "teamId" IS NULL AND "organisationId" IS NULL
        AND "templateId" IS NULL AND "templateVersion" IS NULL)
      OR
      ("kind" = 'provider' AND "snapshot"->>'kind' = 'provider'
        AND "teamId" IS NOT NULL AND "organisationId" IS NOT NULL
        AND "templateId" IS NOT NULL AND "templateVersion" IS NOT NULL
        AND "templateVersion" > 0)
    ) IS TRUE);
END $$;
