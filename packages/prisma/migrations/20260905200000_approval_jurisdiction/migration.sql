-- Which bar the approving attorney is admitted in, and which jurisdiction the
-- clause belonged to when they approved it.
--
-- The table recorded a bar NUMBER and never which bar. Nothing could have
-- objected to a Florida attorney approving a North Carolina clause, and with a
-- second state next that stops being hypothetical.
--
-- Both are stored rather than derived. A clause's jurisdiction can change in a
-- later library version; what this row records is what was true when the
-- attorney signed off.
--
-- Nullable because the column is added to an existing table. Every approval
-- written from now on is required to carry both — there are zero rows today,
-- which is the only reason this is a field addition rather than a migration.
ALTER TABLE "BizrethinkClauseApproval" ADD COLUMN "clauseJurisdiction" TEXT;
ALTER TABLE "BizrethinkClauseApproval" ADD COLUMN "barJurisdiction"    TEXT;
