-- Additive resource controls; historical usage is conservatively initialized
-- under an owner lock on first access. No existing rows or schema are rewritten.
CREATE TABLE "BizrethinkInstanceResourcePolicy" (
  "id" TEXT NOT NULL DEFAULT 'singleton',
  "trialDocuments" INTEGER NOT NULL DEFAULT 5 CHECK ("trialDocuments" BETWEEN 0 AND 10000),
  "trialEmails" INTEGER NOT NULL DEFAULT 10 CHECK ("trialEmails" BETWEEN 0 AND 100000),
  "trialRecipients" INTEGER NOT NULL DEFAULT 10 CHECK ("trialRecipients" BETWEEN 1 AND 1000),
  "trialOrganisations" INTEGER NOT NULL DEFAULT 1 CHECK ("trialOrganisations" BETWEEN 1 AND 100),
  "updatedByUserId" INTEGER,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "BizrethinkInstanceResourcePolicy_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "BizrethinkTrialBudget" (
  "ownerUserId" INTEGER NOT NULL,
  "startedAt" TIMESTAMP(3) NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "documentsUsed" INTEGER NOT NULL DEFAULT 0 CHECK ("documentsUsed" >= 0),
  "emailsUsed" INTEGER NOT NULL DEFAULT 0 CHECK ("emailsUsed" >= 0),
  "organisationsCreated" INTEGER NOT NULL DEFAULT 0 CHECK ("organisationsCreated" >= 0),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "BizrethinkTrialBudget_pkey" PRIMARY KEY ("ownerUserId")
);
CREATE TABLE "BizrethinkTrialOrganisation" (
  "organisationId" TEXT NOT NULL,
  "ownerUserId" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "BizrethinkTrialOrganisation_pkey" PRIMARY KEY ("organisationId")
);
CREATE INDEX "BizrethinkTrialOrganisation_ownerUserId_idx" ON "BizrethinkTrialOrganisation"("ownerUserId");
CREATE TABLE "BizrethinkResourceLease" (
  "id" TEXT NOT NULL,
  "kind" TEXT NOT NULL,
  "userId" INTEGER NOT NULL,
  "organisationId" TEXT,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "BizrethinkResourceLease_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "BizrethinkResourceLease_kind_expiresAt_idx" ON "BizrethinkResourceLease"("kind", "expiresAt");
CREATE INDEX "BizrethinkResourceLease_userId_expiresAt_idx" ON "BizrethinkResourceLease"("userId", "expiresAt");
CREATE INDEX "BizrethinkResourceLease_organisationId_expiresAt_idx" ON "BizrethinkResourceLease"("organisationId", "expiresAt");
CREATE TABLE "BizrethinkEmailDomainChallenge" (
  "id" TEXT NOT NULL,
  "organisationId" TEXT NOT NULL,
  "ownerUserId" INTEGER NOT NULL,
  "domain" TEXT NOT NULL,
  "selector" TEXT NOT NULL,
  "publicKey" TEXT NOT NULL,
  "privateKey" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "lastVerifiedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "BizrethinkEmailDomainChallenge_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "BizrethinkEmailDomainChallenge_organisationId_domain_key" ON "BizrethinkEmailDomainChallenge"("organisationId", "domain");
CREATE INDEX "BizrethinkEmailDomainChallenge_ownerUserId_expiresAt_idx" ON "BizrethinkEmailDomainChallenge"("ownerUserId", "expiresAt");
CREATE TABLE "BizrethinkEmailDomainOwnership" (
  "emailDomainId" TEXT NOT NULL,
  "verifiedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "BizrethinkEmailDomainOwnership_pkey" PRIMARY KEY ("emailDomainId")
);
-- Populate only the new proof ledger. Existing rows, status and keys are unchanged.
INSERT INTO "BizrethinkEmailDomainOwnership" ("emailDomainId")
SELECT d."id" FROM "EmailDomain" d
WHERE d."status" = 'ACTIVE' OR EXISTS (SELECT 1 FROM "OrganisationEmail" e WHERE e."emailDomainId" = d."id");
