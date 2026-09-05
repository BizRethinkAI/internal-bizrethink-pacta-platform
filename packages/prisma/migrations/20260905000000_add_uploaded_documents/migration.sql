-- Documents a human uploaded, as opposed to documents this system generated.
--
-- Everything else in the lease package is assembled from clauses. A recorded
-- declaration and a photographic condition report are not: they exist before
-- the lease does, and no amount of drafting produces them.
--
-- Owner is exactly one of propertyId / matterId, enforced in code rather than
-- by constraint so the check reads in one place with the reason next to it. A
-- declaration belongs to the property and outlives every tenancy on it; a
-- condition report records one tenancy at one moment.
--
-- documentDataId points at upstream's "DocumentData" with no foreign key, per
-- the convention for every Bizrethink table: the reverse relation would have
-- to be declared on an upstream model. Deletion is handled in code.
CREATE TABLE "BizrethinkDocument" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT,
    "matterId" TEXT,
    "kind" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "reference" TEXT,
    "documentDate" TIMESTAMP(3),
    "documentDataId" TEXT NOT NULL,
    "contentType" TEXT NOT NULL DEFAULT 'application/pdf',
    "sizeBytes" INTEGER NOT NULL,
    "pageCount" INTEGER,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "organisationId" TEXT NOT NULL,
    "uploadedByUserId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "archivedAt" TIMESTAMP(3),

    CONSTRAINT "BizrethinkDocument_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "BizrethinkDocument_propertyId_idx" ON "BizrethinkDocument"("propertyId");
CREATE INDEX "BizrethinkDocument_matterId_idx" ON "BizrethinkDocument"("matterId");
CREATE INDEX "BizrethinkDocument_organisationId_idx" ON "BizrethinkDocument"("organisationId");
