-- ADR 0026: a template is one entity's version of one document type.
--
-- The template names the entity that issues it, and each revision carries a
-- COPY of that entity rather than a reference — revisions are immutable and
-- publishing names one, so editing an entity must never rewrite a document
-- that already went out.
--
-- NO DEFAULT AND NO BACKFILL. ADR 0026 §8: the templates saved today are test
-- data and will be superseded. Production was verified empty before this was
-- written (zero BizrethinkMcaTemplate rows, zero revisions), so there is
-- nothing to migrate and nothing to guess. If this fails on an environment
-- holding rows, that is the correct outcome: a template with no entity cannot
-- be compiled, and inventing one would put a name we made up into a legal
-- document.
ALTER TABLE "BizrethinkMcaTemplate" ADD COLUMN "entityId" TEXT NOT NULL;

-- The revision's copy of the entity replaces its copy of the provider profile.
-- Renamed rather than added beside it: ADR 0026 §8 rules out dual-shape
-- compatibility, and a column holding either shape is how that starts.
ALTER TABLE "BizrethinkMcaTemplateRevision" DROP COLUMN "profile";
ALTER TABLE "BizrethinkMcaTemplateRevision" ADD COLUMN "entity" JSONB NOT NULL;
