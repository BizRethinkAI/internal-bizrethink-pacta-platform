-- Whether a review link has actually been opened.
--
-- There was no way to tell. A landlord looking at a list of sent links could
-- not distinguish one the reviewer had had for a week from one that never
-- arrived, and the only remedy was to ask.
--
-- FETCHED, not read: mail scanners and link previewers open links too, so this
-- is evidence of delivery and the UI says "opened" rather than "reviewed".
--
-- It is also what makes deletion safe. A revoked link nobody ever opened and
-- nobody commented on carries no record worth keeping; every other row does.
ALTER TABLE "BizrethinkLeaseReview" ADD COLUMN "firstOpenedAt" TIMESTAMP(3);
ALTER TABLE "BizrethinkLeaseReview" ADD COLUMN "lastOpenedAt"  TIMESTAMP(3);
ALTER TABLE "BizrethinkLeaseReview" ADD COLUMN "openCount"     INTEGER NOT NULL DEFAULT 0;
