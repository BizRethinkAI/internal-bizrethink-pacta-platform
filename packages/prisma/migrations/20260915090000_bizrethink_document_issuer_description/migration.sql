-- Governing documents grouped by issuer, described, amendments nested (task #264).
-- Additive only: three nullable columns, no backfill, no constraint on existing rows.
-- Rollback: drop the three columns; nothing else reads them.
ALTER TABLE "BizrethinkDocument" ADD COLUMN "issuer" TEXT;
ALTER TABLE "BizrethinkDocument" ADD COLUMN "description" TEXT;
ALTER TABLE "BizrethinkDocument" ADD COLUMN "amendsDocumentId" TEXT;
