-- CreateTable
CREATE TABLE "BizrethinkOrganisationBilling" (
    "id" TEXT NOT NULL,
    "organisationId" TEXT NOT NULL,
    "bizrethinkInternal" BOOLEAN NOT NULL DEFAULT false,
    "trialStartedAt" TIMESTAMP(3),
    "trialEndsAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BizrethinkOrganisationBilling_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BizrethinkOrganisationBilling_organisationId_key" ON "BizrethinkOrganisationBilling"("organisationId");
