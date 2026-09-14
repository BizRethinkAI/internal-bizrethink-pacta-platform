-- Additive lifecycle receipt. Existing accounts are not classified by absence
-- of memberships: that may represent a deliberate leave/deletion.
CREATE TABLE "BizrethinkVerifiedOnboarding" (
    "userId" INTEGER NOT NULL,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "BizrethinkVerifiedOnboarding_pkey" PRIMARY KEY ("userId")
);
