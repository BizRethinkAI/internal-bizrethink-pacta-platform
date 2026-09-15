# Approval and review integrity — A-18 and A-22

Task: [#232](https://github.com/BizRethinkAI/internal-bizrethink-pacta-platform/issues/232).
Author session: `security-approval-review-20260915`.
Base: merged main `602e54599a92cca9dde412e099991494b45188a2`.

The repository owner approved the remaining original application findings,
A-18 then A-22, in one coherent PR. Both defects were verified on that main
revision before implementation. This note records code and author validation;
it is not evidence of independent review, merge or production deployment.

## Behavior

- **A-18:** `clauseLibrary.approve` now uses the existing instance-admin tRPC
  middleware, matching MCA's global approval authority. Lease feature access
  and organisation membership alone cannot approve a global clause or replace
  its previous approval. Existing membership/feature checks remain additional
  requirements for the admin's chosen organisation.
- Approval checks all findings for the clause, including findings created
  through another organisation's share and against older clause wording.
  `listFindings` and `answerFinding` use the same global scope behind
  `adminProcedure`, so the existing admin page can see and resolve every
  blocker. Ordinary feature users cannot use those staff endpoints. Public
  counsel tokens retain their existing review scope. Share organisation IDs,
  history, approval fingerprints and admission checks remain intact.
- **A-22:** `review.submit` uses one interactive transaction. It conditionally
  claims an open, unexpired token and checks the affected-row count before
  storing any answers or comments. It then locks a draft matter without an
  envelope, rereads current answers under that lock and applies only delegated
  tenant fields. An attorney link cannot write answers. Expiry is checked
  again after locks that might have waited. Every failure rolls back the
  returned status, matter revision, answers and comments together.
- Different links for the same matter serialize their answer merges through
  the matter row. Comments-only returns also advance the matter revision so
  stale interview clients reload. Non-draft, missing or envelope-linked
  matters cannot receive a submission, using the existing inactive-link error.
- `review.revoke` now conditionally closes only an open review and checks its
  count. A revoke that loses to submission cannot overwrite `returned` and
  hide the review work; it reports that the link is already closed.

## Fork and coordination

All production changes are in the existing BizRethink-owned lease router.
No upstream file, dependency, schema, migration or legal text changes; no new
numbered overlay is needed. The new fork-owned Playwright spec is explicitly
listed in `overlays/BIZRETHINK-OWNED.txt` and the separate type gate. No shared
checkout changes, other authors' notes or settled STATE edits are included.
Active MCA package tasks #229/#230 were read before taking this scoped task.
Before publishing, task #231 / PR #233 appeared for lease sending and PDF
token cleanup. It touches the same router's imports and `matter.send`, outside
this PR's approval/submit/revoke paths. Its author owns that work. The shipping
review must preserve both changes when combining them; no review or production
repair of that separate PR is claimed here.

## Validation

- Fresh worktree, Node 24.20.0, `npm ci --no-audit`, Prisma/client generation.
- TDD A-18: four failing actual-router tests before its implementation,
  reproducing feature-user approval, ignored foreign findings and inconsistent
  staff access. The pre-existing fingerprint/admission controls also ran.
- TDD A-22: failing actual-router tests before its implementation reproduced
  success after a lost claim, writes outside the transaction, acceptance after
  lock-time expiry or matter freeze, and a losing revoke reporting success.
  The transaction double checks rollback and call boundaries; it is not a
  substitute for PostgreSQL's concurrency semantics.
- Focused final local selection: **165 tests across 13 files passed**, covering
  approval, finding scope, jurisdiction, token/review lifecycle, answer
  allowlists, conflict handling, deletion rules and source wiring.
- Separate `tsc --noEmit -p packages/bizrethink/tsconfig.typecheck.json` passed,
  including the new unit and Playwright fixtures. Changed-file formatting and
  fork discipline checked before push. No local build or production DB run.
- Playwright before gate: main `602e54599` passed
  [E2E run 34902496335](https://github.com/BizRethinkAI/internal-bizrethink-pacta-platform/actions/runs/34902496335).
  It represents this unchanged base, lockfile and test configuration. Current
  PR CI supplies the after gate, including new actual HTTP/PostgreSQL coverage
  for admin versus ordinary users, global findings, concurrent submits,
  revocation, matter freezing and separate-link answer merges. Final run links
  and results belong on the PR/task, without a status-only code push.
- `package-lock.json` is unchanged (SHA-256
  `595155df83e46f91d640df37d6158da8ce41b0d375e6c5f4584e61808baf9b7a`).
  No new local audit request was made: automatic approval review previously
  rejected transmitting the private dependency inventory. Use the existing
  advisory Security CI output to compare the accepted dependency baseline;
  a green advisory check does not establish zero findings.

## Decisions and limits

Admin-only management of global lease findings matches MCA; this does not
introduce a delegated attorney approval role or verify supplied professional
credentials. Existing organisation-stamped review links need no migration.
The admin page and response shapes remain compatible. The old source-wiring
test for an organisation-scoped answer was updated to the stronger admin
boundary, with actual middleware tests proving unauthorised calls fail.

The matter check rejects a late comments-only return as well as late answers;
review links are issued only for drafts. The checked revoke transition is part
of making that return single-use. This does not redesign lease generation,
send, deletion or ordinary interview-save transactions. Independent review
should assess the affected transaction boundaries and competing operations.

Required independent adversarial review is a fresh human-started session.
This author never merges or deploys. The shipping session owns consolidation.
A-18/A-22 code completion does not close separate R-02/R-04/R-05/R-06 work,
host capacity/isolation, historical log/vendor exposure and revocation review,
or the parked historical signup-account review. Prior batches' production
deployment was reported by the repository owner; this PR is not yet live.
