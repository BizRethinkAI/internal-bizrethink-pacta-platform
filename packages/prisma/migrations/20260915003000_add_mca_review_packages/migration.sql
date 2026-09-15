CREATE TABLE "BizrethinkMcaPackageReview" (
  "id" TEXT NOT NULL, "token" TEXT NOT NULL, "status" TEXT NOT NULL DEFAULT 'open',
  "reviewerName" TEXT NOT NULL, "reviewerEmail" TEXT NOT NULL,
  "snapshot" JSONB NOT NULL, "fingerprint" TEXT NOT NULL, "createdByUserId" INTEGER NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "BizrethinkMcaPackageReview_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "BizrethinkMcaPackageReview_token_key" ON "BizrethinkMcaPackageReview"("token");
CREATE TABLE "BizrethinkMcaPackageFinding" (
  "id" TEXT NOT NULL, "reviewId" TEXT NOT NULL, "targetIds" TEXT[] NOT NULL,
  "packageFingerprint" TEXT NOT NULL, "body" TEXT NOT NULL,
  "authorName" TEXT NOT NULL, "authorEmail" TEXT NOT NULL,
  "answer" TEXT, "answeredAt" TIMESTAMP(3), "answeredByUserId" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "BizrethinkMcaPackageFinding_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "BizrethinkMcaPackageFinding_reviewId_fkey" FOREIGN KEY ("reviewId") REFERENCES "BizrethinkMcaPackageReview"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "BizrethinkMcaPackageFinding_reviewId_idx" ON "BizrethinkMcaPackageFinding"("reviewId");
CREATE INDEX "BizrethinkMcaPackageFinding_targetIds_idx" ON "BizrethinkMcaPackageFinding" USING GIN ("targetIds");
