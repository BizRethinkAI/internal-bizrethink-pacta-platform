-- The review loop: sending a lease out to be read before it is signed.
--
-- One mechanism, two audiences, governed differently. An ATTORNEY reviews for
-- defects, so their comments block the send until each has been given a
-- disposition — an unresolved defect note that does not block is the silence
-- this repo keeps being bitten by. A TENANT reviews their own tenancy, so
-- their comments never block; a tenant comment is a negotiating position, not
-- a defect report, and blocking on it would hand the counterparty a veto over
-- the landlord's own document.
--
-- Dispositions are append-only once set. A dismissal reason that can be edited
-- afterwards is not evidence of anything.

CREATE TABLE "BizrethinkLeaseReview" (
  "id"              TEXT NOT NULL,
  "matterId"        TEXT NOT NULL,
  "audience"        TEXT NOT NULL,
  "token"           TEXT NOT NULL,
  "status"          TEXT NOT NULL DEFAULT 'open',
  "reviewerName"    TEXT NOT NULL,
  "reviewerEmail"   TEXT NOT NULL,
  "answersHash"     TEXT NOT NULL,
  "createdByUserId" INTEGER NOT NULL,
  "expiresAt"       TIMESTAMP(3),
  "returnedAt"      TIMESTAMP(3),
  "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"       TIMESTAMP(3) NOT NULL,

  CONSTRAINT "BizrethinkLeaseReview_pkey" PRIMARY KEY ("id")
);

-- Unique because the token is the sole lookup key for the unauthenticated
-- review route; a duplicate would make one link resolve to two reviews.
CREATE UNIQUE INDEX "BizrethinkLeaseReview_token_key" ON "BizrethinkLeaseReview"("token");
CREATE INDEX "BizrethinkLeaseReview_matterId_idx" ON "BizrethinkLeaseReview"("matterId");

CREATE TABLE "BizrethinkReviewComment" (
  "id"                    TEXT NOT NULL,
  "reviewId"              TEXT NOT NULL,
  "clauseSlug"            TEXT,
  "body"                  TEXT NOT NULL,
  "authorName"            TEXT NOT NULL,
  "disposition"           TEXT NOT NULL DEFAULT 'pending',
  "dispositionReason"     TEXT,
  "dispositionedAt"       TIMESTAMP(3),
  "dispositionedByUserId" INTEGER,
  "createdAt"             TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "BizrethinkReviewComment_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "BizrethinkReviewComment_reviewId_idx" ON "BizrethinkReviewComment"("reviewId");
