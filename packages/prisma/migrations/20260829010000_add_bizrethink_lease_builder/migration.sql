-- BizRethink lease builder — properties and matters.
--
-- A property is set up once; leases are created against it. That shape is the
-- point rather than convenience: the 2026 lease on 29090 Picana Ln continued a
-- tenancy begun under a different manager, and because nothing linked the two,
-- a $6,300 deposit already held had to be described in prose on page 22 while
-- the summary table said $0.00. `supersedesMatterId` is what lets a renewal
-- know what came before it.
--
-- Answers are JSON. Their shape is owned by the interview definition in
-- packages/bizrethink/lease/interview/steps.ts, and a lease executed under one
-- version of the clause library must still render years later exactly as it was
-- signed — which columns would fight rather than help.
--
-- Purely additive: two new tables and their indexes. No existing table, column
-- or row is touched.

CREATE TABLE "BizrethinkProperty" (
    "id" TEXT NOT NULL,
    "organisationId" TEXT NOT NULL,
    "createdByUserId" INTEGER NOT NULL,
    "label" TEXT NOT NULL,
    "addressLine" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL DEFAULT 'FL',
    "postalCode" TEXT NOT NULL,
    "county" TEXT NOT NULL,
    "propertyType" TEXT NOT NULL,
    "yearBuilt" INTEGER,
    "hasPool" BOOLEAN NOT NULL DEFAULT false,
    "hasHoa" BOOLEAN NOT NULL DEFAULT false,
    "hoaName" TEXT,
    "includedAppliances" TEXT,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BizrethinkProperty_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "BizrethinkProperty_organisationId_idx" ON "BizrethinkProperty"("organisationId");

CREATE TABLE "BizrethinkLeaseMatter" (
    "id" TEXT NOT NULL,
    "organisationId" TEXT NOT NULL,
    "teamId" INTEGER NOT NULL,
    "createdByUserId" INTEGER NOT NULL,
    "propertyId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "jurisdiction" TEXT NOT NULL DEFAULT 'US-FL',
    "facts" JSONB NOT NULL,
    "money" JSONB NOT NULL,
    "values" JSONB NOT NULL,
    "customClauses" JSONB NOT NULL DEFAULT '[]',
    "currentStepId" TEXT,
    "supersedesMatterId" TEXT,
    "rulePackVersion" INTEGER,
    "generatedAt" TIMESTAMP(3),
    "envelopeId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BizrethinkLeaseMatter_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "BizrethinkLeaseMatter_organisationId_status_idx"
    ON "BizrethinkLeaseMatter"("organisationId", "status");

CREATE INDEX "BizrethinkLeaseMatter_propertyId_idx" ON "BizrethinkLeaseMatter"("propertyId");
