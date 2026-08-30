-- One provider, one key.
--
-- `/admin/ai` collected a GCP project ID, a location AND an API key. Those
-- belong to two different products: the Gemini API authenticates with a key
-- and nothing else, while Vertex proper needs a project, a location and a
-- service account. Collecting all three meant at least two fields could never
-- be load-bearing.
--
-- None of them were. The model was forward scaffolding added 2026-05-01 for an
-- upstream AI feature that never shipped — its own commit message says "NO
-- upstream consumer reads these vars yet" — and nothing read it until the
-- clause drafter.
--
-- The existing key is carried across before the old columns are dropped. It
-- was encrypted with the same instance key, so it decrypts unchanged. In
-- production the table is empty, but a lossy migration that happens to be
-- harmless today is still a lossy migration.

ALTER TABLE "BizrethinkInstanceAiConfig" ADD COLUMN "provider" TEXT NOT NULL DEFAULT 'gemini';
ALTER TABLE "BizrethinkInstanceAiConfig" ADD COLUMN "apiKey" TEXT;

UPDATE "BizrethinkInstanceAiConfig" SET "apiKey" = "vertexApiKey" WHERE "vertexApiKey" IS NOT NULL;

ALTER TABLE "BizrethinkInstanceAiConfig" DROP COLUMN "vertexProjectId";
ALTER TABLE "BizrethinkInstanceAiConfig" DROP COLUMN "vertexLocation";
ALTER TABLE "BizrethinkInstanceAiConfig" DROP COLUMN "vertexApiKey";
