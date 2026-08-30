-- The landlord, and where the landlord accepts notice, held on the property.
--
-- None of it changes between tenancies. Re-asking it on every lease is how an
-- interview earns a reputation for being tedious, and six of the eight
-- questions on the interview's first step were already answered by this row.
--
-- COPIED into a matter at creation, never referenced live. A lease that read
-- its party list from here would have its signers silently rewritten whenever
-- this row was edited — and party order decides where signature fields land,
-- so the damage would be a lease countersigned by the wrong person with
-- nothing red anywhere.
--
-- Property-level rather than organisation-level: it legitimately differs, a
-- different entity owning a different property or a manager receiving notice
-- for one and not another. Organisation-level with a per-property override is
-- more machinery than two properties justify.

ALTER TABLE "BizrethinkProperty" ADD COLUMN "landlords" JSONB NOT NULL DEFAULT '[]';
ALTER TABLE "BizrethinkProperty" ADD COLUMN "noticeName" TEXT;
ALTER TABLE "BizrethinkProperty" ADD COLUMN "noticeAddress" TEXT;
