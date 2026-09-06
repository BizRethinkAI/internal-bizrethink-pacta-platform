-- What an attorney said about one clause, and whether anybody answered.
--
-- THE ASYMMETRY THIS FIXES. A tenant can comment on every clause of a lease and
-- have each comment tracked to a disposition. Counsel — whose review is the
-- critical path for the whole product, and without which no lease may reach a
-- third party — had a read-only page: clauses, approved/unapproved badges, and
-- no way to say anything. Findings arrived by email and somebody retyped them
-- into a system that had nowhere to put them.
--
-- A finding is not a comment. A tenant's comment is a negotiating position and
-- does not block. An attorney's finding is a defect report against text we are
-- asserting is lawful, so it blocks the clause until answered.
--
-- clauseFingerprint is stored for the same reason the review stores
-- libraryFingerprint: an answer to a finding against text that has since moved
-- is answering a different question.
--
-- answeredAt and answer are both required to clear a finding. A timestamp with
-- no text would make the mechanism as fast to bypass as to satisfy.
CREATE TABLE "BizrethinkLibraryFinding" (
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

    CONSTRAINT "BizrethinkLibraryFinding_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "BizrethinkLibraryFinding_reviewId_idx" ON "BizrethinkLibraryFinding"("reviewId");
CREATE INDEX "BizrethinkLibraryFinding_clauseSlug_idx" ON "BizrethinkLibraryFinding"("clauseSlug");

-- Cascade: the review row is the record of who was sent what, and it is never
-- deleted in normal operation (closing is the revocation). If it ever is, its
-- findings have no meaning without it.
ALTER TABLE "BizrethinkLibraryFinding"
    ADD CONSTRAINT "BizrethinkLibraryFinding_reviewId_fkey"
    FOREIGN KEY ("reviewId") REFERENCES "BizrethinkLibraryReview"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
