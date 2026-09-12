-- A-04: additive upload provenance only. Existing attachments use current
-- envelope permissions; no ownership is guessed for old unattached rows.
-- CreateTable
CREATE TABLE "BizrethinkPdfUpload" (
    "documentDataId" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "teamId" INTEGER,
    "fingerprint" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BizrethinkPdfUpload_pkey" PRIMARY KEY ("documentDataId")
);
