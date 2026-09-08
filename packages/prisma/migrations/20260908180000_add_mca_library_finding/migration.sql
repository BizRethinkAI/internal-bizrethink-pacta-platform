-- What counsel says back, on the MCA review link.
--
-- The link shipped read-only, and the router and mca/review/link.ts both
-- defended that: findings from the two adversarial document reviews live in
-- lombard-contracts manifests, and a second Pacta-side register of the same
-- findings would drift from the first. That argument is about the reviews it
-- names. It does not reach this table. Nothing recorded here is a second copy
-- of anything — a row is only ever created through a review token, it is
-- attributable to the reviewer named on that link, and no manifest has ever
-- held one. One register per origin, and the review page labels the origin.
--
-- reviewId cascades on delete. The row is meaningless without the link that
-- carries the reviewer's identity, and an orphaned finding is one nobody can
-- attribute or answer.
--
-- authorName and authorEmail are COPIED from the review rather than joined.
-- The row is the record of who said what and it has to survive the review being
-- closed. They are never taken from the caller: a caller who could name
-- themselves could name somebody else.
--
-- clauseFingerprint is the clause as counsel READ it — with the tenant's party
-- names resolved, because {{funder}} is not what was on her screen. An answer
-- to a finding against different words is an answer to a different question.
--
-- answeredAt, answer and answeredByUserId are null together while the finding
-- is outstanding. Both halves are required to clear it: a timestamp with no
-- text would make this as fast to bypass as to satisfy. An unanswered row
-- blocks approval of that clause — see counselFindingsHold in
-- mca/clauses/approval.ts. Without that rule the textarea is decorative, which
-- is precisely how the lease equivalent shipped and passed CI.
CREATE TABLE "BizrethinkMcaLibraryFinding" (
    "id" TEXT NOT NULL,
    "reviewId" TEXT NOT NULL,
    "clauseSlug" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "authorName" TEXT NOT NULL,
    "authorEmail" TEXT NOT NULL,
    "clauseFingerprint" TEXT NOT NULL,
    "answeredAt" TIMESTAMP(3),
    "answer" TEXT,
    "answeredByUserId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BizrethinkMcaLibraryFinding_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "BizrethinkMcaLibraryFinding_reviewId_idx" ON "BizrethinkMcaLibraryFinding"("reviewId");
CREATE INDEX "BizrethinkMcaLibraryFinding_clauseSlug_idx" ON "BizrethinkMcaLibraryFinding"("clauseSlug");

ALTER TABLE "BizrethinkMcaLibraryFinding"
    ADD CONSTRAINT "BizrethinkMcaLibraryFinding_reviewId_fkey"
    FOREIGN KEY ("reviewId") REFERENCES "BizrethinkMcaLibraryReview"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
