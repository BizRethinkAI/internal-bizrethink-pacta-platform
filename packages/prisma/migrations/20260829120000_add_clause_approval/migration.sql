-- Attorney sign-off on the clause library.
--
-- The library is TypeScript, so a reviewing attorney cannot edit a clause's
-- `status` in code. The approval lives here and overrides what the code says.
--
-- That inversion creates exactly one dangerous failure: if an approval
-- survived a text edit, changing a clause would silently inherit sign-off on
-- words the attorney never read, and nothing would be red — the clause would
-- simply start rendering as reviewed. So an approval is pinned to a
-- `fingerprint`, a hash of everything a signer actually reads (body, heading,
-- version, and the condition deciding whether the clause appears at all).
-- Any change lapses it back to unreviewed.
--
-- No unique constraint on clauseSlug: a superseded approval is kept rather
-- than overwritten, so the record of who approved which words survives an
-- edit. Currency is decided by the fingerprint, not by being the only row.

CREATE TABLE "BizrethinkClauseApproval" (
  "id"                  TEXT NOT NULL,
  "clauseSlug"          TEXT NOT NULL,
  "clauseVersion"       INTEGER NOT NULL,
  "fingerprint"         TEXT NOT NULL,
  "approvedByName"      TEXT NOT NULL,
  "approvedByBarNumber" TEXT,
  "approvedByUserId"    INTEGER NOT NULL,
  "notes"               TEXT,
  "approvedAt"          TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "supersededAt"        TIMESTAMP(3),

  CONSTRAINT "BizrethinkClauseApproval_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "BizrethinkClauseApproval_clauseSlug_idx" ON "BizrethinkClauseApproval"("clauseSlug");
