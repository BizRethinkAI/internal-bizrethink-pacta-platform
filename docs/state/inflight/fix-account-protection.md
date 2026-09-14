# Account protection — A-15, A-16 and R-03

Assigned by the repository owner to author `security-queue-20260914`, task #217.
First of the approved four-bucket sequence; base main
`9e03b72d570dc00b9904974fadedeaadf3a079a3`. Independent review, merge,
consolidation and shipping remain separate. No production operation occurred.

## Behavior

- **A-15:** `validateSessionToken` reads the primary database and rejects disabled
  accounts before renewal or returning a user. This covers optional sessions,
  leaf loaders, files and account routes as well as tRPC. `disableUser` deletes
  sessions in the same transaction as the existing disabled flag and other
  credential revocations. Re-enabling does not revive deleted sessions. Requests
  already authorized before a disable commit are not retroactively cancelled.
- **A-16:** session-only setup can change only an active account's unconfirmed
  enrollment. An enabled factor must first be disabled through the existing
  factor-proof endpoint. Enable and disable writes are conditional on the
  exact secret proved, preventing a stale request from changing a replacement.
  Recovery validation locks and rereads the current primary user row, checks
  active/enabled state, removes the code and returns success only after commit.
  Concurrent submission has one winner. Viewing codes returns the current
  remaining set, excluding a code used as that request's proof.
- **R-03:** onboarding rechecks the current active, verified email inside a
  user-row transaction lock. It locks pending invites, inserts membership and
  its assigned group, and marks acceptance together. Historical existing
  memberships are retained without role changes while pending status is repaired.
  An invite error rolls back the whole reconciliation, preserving a retry path.
  Personal organisation, initial team and trial bookkeeping use the existing
  constructors within that same transaction; a failure leaves no partial unit.
  A still-valid completed verification link retries without verifying again.
  Successful authentication retries recorded unfinished onboarding, including
  after the link expires. A durable receipt is created atomically with email
  proof and marked complete in the membership/fallback transaction. Completed
  onboarding cannot recreate workspaces deliberately left or deleted.

## Decisions and limits

- Existing recovery codes stay encrypted at rest in their current format. This
  avoids an unrequested migration and preserves the existing remaining-code
  screen. They are now single-use; this is not a claim that codes are hashed.
  No new recovery mechanism, reset bypass or new configuration is introduced.
- Login reconciles matching pending invitations created before email verification for an active
  account, consistent with the fork's automatic invitation onboarding. Later
  invitations retain their normal acceptance flow. It also
  repairs historical membership-with-pending-status without changing roles.
- Reconciliation failures do not undo email verification or prevent a valid
  login. They emit a fixed diagnostic without the email, token or raw exception.
  A later login or completed-token request retries. A malformed invitation can
  keep onboarding pending until its organisation data is repaired; no failed
  invite is silently consumed or replaced with a fallback workspace.
- Database onboarding is atomic. Administrator notification is best effort after
  commit; email delivery is not exactly-once and no outbox is claimed. Existing
  optional Stripe customer creation remains an external side effect of the
  upstream constructor, outside database rollback guarantees. No billing flags,
  claim values or trial lengths change here; quotas/expiry belong to task #219.
- Existing auth routes represent several error codes with HTTP 500; the tests
  require the exact denial code and lack of authority, and preserve that existing
  response contract. New setup/conditional-write conflicts use HTTP 400.
- Additive migration `20260914130000_add_verified_onboarding_receipt` creates
  `BizrethinkVerifiedOnboarding` from owned schema additions. No upstream model
  changes or existing-row backfill. Missing receipts on legacy orgless accounts
  do not prove unfinished onboarding: login repairs concrete eligible pending
  invites, but never guesses that a missing workspace should be recreated.
  A still-valid completed verification link permits explicit historical retry.
  Once recorded complete, that link also cannot recreate a deleted workspace.
  Rolling back application code can leave the additive table in place.
- No dependency change, credential access, production query, host change,
  state consolidation or deployment. No unrelated audit bucket is included.

## Fork durability

`overlays/087-account-protection.patch` contains all upstream edits, including
shared session/disable/MFA hooks, verification/login calls, optional constructor
transaction parameters and the revised completed-token regression. Lifecycle
policy is owned in `server-only/account-mfa.ts`; transaction composition is in
`server-only/account-transaction.ts`; reconciliation remains in the existing
owned invitation module. Constructor data/group defaults are reused, not copied.
The new owned HTTP test is exactly declared in `overlays/BIZRETHINK-OWNED.txt`
and the separate type gate. Recheck these hooks during an upstream auth or
organisation refactor, retaining earlier overlays and the verified-email boundary.

## Validation and handoff

- TDD commit `f7e430318`: seven behavior failures with four passing controls
  before implementation, covering disabled sessions/revocation, enabled setup,
  recovery replay/concurrency/disabled snapshots and completed-token retry.
- Expanded invitation regressions were checked against the original merged
  helper: 12 failed / 7 passed. The new login hook does not exist in that base;
  those missing-hook failures are distinct from the reproduced partial-write
  and identity failures. The implemented selection passes.
- Local focused validation: 10 owned files / 130 tests and two upstream caller
  files / 17 tests passed; separate TypeScript and changed-file formatting pass.
- Twelve HTTP/PostgreSQL cases cover disabled live cookies and re-enable,
  both MFA setup paths, one concurrent recovery winner, remaining-code display,
  verified concurrent claims, later-invite failure rollback/retry, historical
  membership repair, one fallback workspace, full constructor rollback and
  unverified/disabled denial. Discovery succeeded; execution belongs to PR CI.
- Before Playwright: [main run 34794610436](https://github.com/BizRethinkAI/internal-bizrethink-pacta-platform/actions/runs/34794610436)
  on the exact base. The shard actually executed; it was not a docs-only skip.
  PR CI supplies broad builds/tests/types and after Playwright. Final verdicts
  and any author repairs are recorded on the PR and task without status-only
  source pushes.
- Production audit remains six accepted entries: `GHSA-ggr8-5vv4-36mx` via
  Prisma config and `GHSA-87mf-gv2c-c62c` via OpenAPI generation, same paths as
  the accepted register; 3 high / 3 moderate / 0 critical. An advisory green
  check is not a zero-vulnerability claim.

CI repair evidence: the first broad E2E run passed all 12 new HTTP/PostgreSQL
cases but exposed unwanted workspace recreation in the existing settings test.
TDD commit `6195ecf3a` adds five meaningful failures with 22 passing controls.
The repair passes 75 focused owned tests and 17 upstream caller tests, plus
separate type checking. The existing settings test is unchanged. The owned MCA
disabled-session expectations now require the central 401 rejection (and no
PDF), rather than its previous downstream 403. The new HTTP spec has 13 cases,
including completed-onboarding deletion and receipt rollback/commit assertions.
Final broad CI is pending after this repair; the initial failure is not called a pass.

Next: author owns final-head CI through green, then fresh human-started
adversarial review of auth/upstream/transaction behavior. The author continues
with task #218 after this PR's author validation; it never merges or deploys.
The shipping session owns final batch state consolidation.
