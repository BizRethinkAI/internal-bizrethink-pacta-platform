# fix/recipient-token-authorization — A-05 recipient identity gates

Owner approved A-05 on 2026-09-12 after independent source verification against
latest merged main `005db8e469ad8c66da6bb3373149705f0089e250`. Main was refreshed
again before preparing the PR and remained at that commit. Fresh worktree
`/private/tmp/pacta-a05-recipient-auth`, Node 24.20.0, own npm ci and Prisma
generation. No production access. The shared checkout remains the MCA session's.

Overlay **076** is this branch's; 074/#169 and 075/#170 belong to the preceding
remediations. Next unreserved number after this work is **077**. This work does
not edit either PR or duplicate their state folds. There is no SendMessage
capability to the other live sessions; ownership is announced through Shwet and
this branch. The separate review-and-ship session owns queue integration.

## Owner decision and behavior

**Keep downloads after the signing deadline**, with ACCOUNT identity still
required wherever configured. Upstream explicitly asks for access 2FA at
completion, not before viewing; this timing remains. ACCOUNT and completion 2FA
are cumulative: a code cannot replace ACCOUNT, and ACCOUNT cannot replace the
code. Email completion codes remain bound to recipient email plus envelope and
work without an account when ACCOUNT is not configured. Account-backed password,
passkey and authenticator factors must belong to the intended recipient.

ACCESS applies independently of ACTION to ordinary fields, signatures, removal,
completion and rejection. FREE_SIGNATURE has the same ACTION requirement and UI
prompt as SIGNATURE. The CSC adapter and completion's SES/TSP branch check
ACCOUNT before entering the existing TSP pipeline; this is not a claim of a
TSP cryptographic bypass or a change to its cryptographic verification.

Recipient reads reject draft/deleted envelopes, including the authenticated
legacy document-by-token read and the legacy/v2 signing-page helpers. Deleted
mutation gaps in legacy removal/completion/rejection also close. Existing
signing status/order/expiry/CAS behavior is retained. Other existing read states
(completed, rejected, cancelled) are unchanged. PDF responses use private/no-store,
including after the legacy renderer writes cache headers; authentication happens
before conditional requests or storage. QR links are a separate capability and
retain their existing behavior. Deliberately link-only signing stays anonymous.

## Implementation and upstream sync

All new policy is in `packages/bizrethink/recipient-auth-policy.ts` and
`server-only/recipient-access.ts`; the Hono middleware is
`server-only/recipient-token-file-access.ts`. Overlay 076 contains small hooks in
18 upstream files, each with an inline marker. It has a README row and was
verified with reverse apply; no schema, lockfile, dependency or instance-config
change. The new Playwright API spec has an exact ownership declaration.

On an upstream sync, recheck token entry points (including early uninsert and
SES/TSP branches), the factor verifier's early returns, the three file routes,
and the UI's signature-kind decision. The owned behavior tests are the regression
surface. API attachment access counts only a real session as recipient ACCOUNT
identity; an API token's creator identity is not a recipient login. Ordinary team
API access is unchanged. A-03/A-04/A-06 and the rest of the audit remain separate
owner decisions; none is claimed fixed here.

## Validation

- Tests committed before implementation: `6560aa4ae` (46 failing / 40 passing)
  and `d9855bd17` (supplemental CSC and state tests: 9 failing / 59 passing).
  Further authenticated legacy-read cases (2 failing / 83 passing) and combined
  account/code cases (3 failing / 108 passing) were also run red before their
  hooks/policy were changed. The v2 draft case additionally checks the runtime
  guard; its pre-existing Prisma query already excluded drafts.
- Final focused regression suite: **144 passing**. DB/storage/jobs/webhooks are
  doubled at boundaries; actual helpers/tRPC/Hono handlers run. Password checks
  use real bcrypt. Failure cases cover no/wrong/disabled identity, failed DB
  reads, wrong and invalid factors, recipient overrides, deleted/draft reads,
  and early-return mutations. Positive controls preserve intended accounts,
  email completion, unprotected links, QR capability and post-deadline downloads.
- Full BizRethink suite: **4,287 passing**. Shared lib suite: **287 passing**.
- Full Remix typecheck (`react-router typegen && tsc`) and separate owned type
  gate pass. Owned format check passes; changed-file Biome check passes with
  advisory async-mock/pre-existing upstream warnings. No local build was run.
- **8 new Playwright HTTP tests discovered** under the `api` project. They use
  real login cookies, PostgreSQL and PDF bytes in CI; not executed locally
  because this worktree has no DB/env. Baseline main already passed CI
  [34663118704](https://github.com/BizRethinkAI/internal-bizrethink-pacta-platform/actions/runs/34663118704)
  and full Playwright
  [34663118705](https://github.com/BizRethinkAI/internal-bizrethink-pacta-platform/actions/runs/34663118705).
  Final PR CI/E2E is still required; discovery is not an E2E pass.

## Review/queue handoff — not yet shipped

The implementing session opens the PR and stops. **Fresh independent adversarial
review started by Shwet is mandatory**, followed by green CI on the reviewed
head. No own merge, deployment, CI watcher or deploy watcher.

Queue this after **#169 and #170**. #169's review session owns the inherited
merged-#168 note cleanup (`chore-mca-memo-refutations.md`); this branch deliberately
has not duplicated that fold. Guard 5 can therefore remain red until that cleanup
is merged and the queue is refreshed. Coordinate a single owner for newly stale
#169/#170 notes; never union-merge two independent folds. README/type-gate/owned
path additions may need routine integration. Rerun checks on any refreshed head;
Shwet will report E2E completion. This branch does not trigger production deploys.
