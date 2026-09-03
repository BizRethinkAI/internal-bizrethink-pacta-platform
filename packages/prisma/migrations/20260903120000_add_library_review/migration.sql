-- A link that lets counsel read the clause library without an account.
CREATE TABLE "BizrethinkLibraryReview" (
    "id" TEXT NOT NULL,
    "organisationId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'open',
    "reviewerName" TEXT NOT NULL,
    "reviewerEmail" TEXT NOT NULL,
    "libraryFingerprint" TEXT NOT NULL,
    "createdByUserId" INTEGER NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BizrethinkLibraryReview_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "BizrethinkLibraryReview_token_key" ON "BizrethinkLibraryReview"("token");
CREATE INDEX "BizrethinkLibraryReview_organisationId_idx" ON "BizrethinkLibraryReview"("organisationId");
