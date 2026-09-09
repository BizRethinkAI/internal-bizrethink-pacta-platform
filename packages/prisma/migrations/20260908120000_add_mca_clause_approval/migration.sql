-- The MCA clause library's approval record and its counsel review link.
--
-- ADR 0008 splits the MCA vertical into two surfaces. The conformity surface
-- has no approval workflow, because approving a regulator's prescribed words
-- would be a category error. These two tables serve the other surface: our own
-- contract text, in the six negotiated agreements, where approval is exactly
-- what counsel is for.
--
-- IT RECORDS, IT DOES NOT SIGN. recordedByUserId is the member of staff at the
-- keyboard; approvedByName and approvedByBarNumber are the attorney whose
-- authority the approval claims. Two people, two columns, and both pages say
-- so. Presenting the record as a signature by the attorney would be worse than
-- not having the feature.
--
-- The approval's only effect is to supply the named author that
-- assertPublishable already demands of attorney-drafted text. It is not a
-- second gate beside that one.
--
-- fingerprint is the hash of the clause as approved: the words, the heading,
-- the document's own number, the version, the agreement, the section, the
-- statute that compels it and the states whose law scopes it. It deliberately
-- excludes sortKey, because lapsing an approval over a reordering trains a
-- reviewer to re-approve without reading.
--
-- barJurisdiction is NOT NULL. BizrethinkClauseApproval recorded a bar NUMBER
-- and never which bar, so nothing could object to a Florida attorney approving
-- a North Carolina clause; that column had to be added nullable to a table that
-- already existed. There is no reason to inherit the nullability along with the
-- lesson. It holds an McaJurisdiction — a state. Which document a clause is in
-- is a different axis and lives in the instrument column.
CREATE TABLE "BizrethinkMcaClauseApproval" (
    "id" TEXT NOT NULL,
    "clauseSlug" TEXT NOT NULL,
    "clauseVersion" INTEGER NOT NULL,
    "instrument" TEXT NOT NULL,
    "fingerprint" TEXT NOT NULL,
    "approvedByName" TEXT NOT NULL,
    "approvedByBarNumber" TEXT,
    "barJurisdiction" TEXT NOT NULL,
    "recordedByUserId" INTEGER NOT NULL,
    "notes" TEXT,
    "approvedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "supersededAt" TIMESTAMP(3),

    CONSTRAINT "BizrethinkMcaClauseApproval_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "BizrethinkMcaClauseApproval_clauseSlug_idx" ON "BizrethinkMcaClauseApproval"("clauseSlug");

-- A link that lets counsel read one MCA agreement without an account.
--
-- instrument is the column ADR 0009 identified as lease-bound on the lease's
-- own review row, generalised rather than widened. A lease link is scoped by a
-- ClauseJurisdiction because a lease is one document a state decides; an MCA
-- deal is a SET of documents, and the axis that decides what goes on a link is
-- which agreement it covers. A column named jurisdiction holding an instrument
-- would be a statement about which document is being assembled, dressed as a
-- statement about which law applies.
--
-- libraryFingerprint pins the SCOPED agreement, not the whole library. A link
-- pinned to all of it would report "the agreement has changed" the moment a
-- clause in a document the reviewer never saw moved.
--
-- There is deliberately no organisationId. The library is instance content,
-- identical for every customer, and /admin/mca-library resolves no organisation
-- and touches no tenancy. The lease equivalent carries one and its router names
-- dropping it as the durable fix; this table is new, so the fix is made at
-- birth instead.
--
-- Closing is the revocation. There is no delete: the row is the record of who
-- was sent what and when.
CREATE TABLE "BizrethinkMcaLibraryReview" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'open',
    "reviewerName" TEXT NOT NULL,
    "reviewerEmail" TEXT NOT NULL,
    "instrument" TEXT NOT NULL,
    "libraryFingerprint" TEXT NOT NULL,
    "createdByUserId" INTEGER NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BizrethinkMcaLibraryReview_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "BizrethinkMcaLibraryReview_token_key" ON "BizrethinkMcaLibraryReview"("token");
CREATE INDEX "BizrethinkMcaLibraryReview_instrument_idx" ON "BizrethinkMcaLibraryReview"("instrument");
