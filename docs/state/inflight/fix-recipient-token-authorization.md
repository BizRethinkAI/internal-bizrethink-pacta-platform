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

Recipient reads reject drafts and deleted unfinished documents, including the
authenticated legacy document-by-token read and legacy/v2 signing-page helpers.
Upstream sender deletion hides finalized documents (COMPLETED/REJECTED/CANCELLED)
only from the sender; recipients retain their copy with ACCOUNT still enforced.
Deleted mutation gaps in legacy removal/completion/rejection also close. Existing
signing status/order/expiry/CAS behavior is retained. Other existing read states
(completed, rejected, cancelled) are unchanged. PDF responses use private/no-store,
including after the legacy renderer writes cache headers; authentication happens
before conditional requests or storage. QR links are a separate capability and
retain their existing behavior. Deliberately link-only signing stays anonymous.
Direct-template PDF previews require an enabled link bound to that placeholder
recipient. Their existing ACCOUNT contract requires an active login before a
future recipient supplies their identity; ordinary document APIs do not accept
that preview capability. Disabled/unpublished/deleted templates are refused.

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
head. No own merge or deployment. Shwet subsequently authorized background CI
monitoring of this session's PRs only; deployment watching remains prohibited.

Queue this after **#169 and #170**. #169's review session owns the inherited
merged-#168 note cleanup (`chore-mca-memo-refutations.md`); this branch deliberately
has not duplicated that fold. Guard 5 can therefore remain red until that cleanup
is merged and the queue is refreshed. Coordinate a single owner for newly stale
#169/#170 notes; never union-merge two independent folds. README/type-gate/owned
path additions may need routine integration. Rerun checks on any refreshed head;
the authorized background CI monitor follows our PRs. This branch does not
trigger production deploys.


## CI correction — 2026-09-12

Initial E2E run `34677428030` reported 10 failed, 2 flaky (passed retries),
1,039 passed, 59 curated skips and 5 not run. Eight direct-template/UI failures
came from the new PDF guard excluding template previews; one deletion test
caught the sender-only soft-delete semantics above. The owned mutation test
attempted insertion into an already filled field, so it saw the pre-existing
validation error before reaching the access gate. Its fixture now meets each
operation's preconditions and verifies the field is unchanged after each denial.
No upstream E2E assertion was relaxed and no production mutation gate changed.

- Committed regression tests first in `e051c3946`: **34 failed / 128 passed** on
  the existing implementation. These exercise real signing-page/read helpers,
  tRPC routes and all three real Hono PDF handlers.
- The correction changes owned policy/middleware only. Overlay 076 still has
  the same **18 upstream hooks**; patch/source equality and reverse apply pass.
- Corrected full owned suite: **4,334 passing**; shared lib: **287 passing**.
  Both the owned TypeScript gate and full Remix typecheck pass.
- **11 HTTP tests discovered**; coverage now includes retained completed copies and both V1/V2 direct
  preview capabilities, with anonymous denial under ACCOUNT and disabled-link
  revocation. Playwright discovery is not an execution verdict; fresh CI must
  pass on the pushed correction before independent review/merge.

Guard 5 still depends on #169's single-owner fold of the inherited #168 note;
this PR does not duplicate it. #170 is separate: its corrected delete tests and
five security E2Es passed before an interrupted run, for which one retry was
requested. Neither PR has been merged or deployed by this session.

## Independent review and combined queue — 2026-09-12

Shwet directed the review-and-ship session to finish normal merges and one
deploy using GitHub CI, without further local test reruns. Independent review
found no blocking substantive issue in author head
`23991e1490d83ae709ac8ec2a403ad0a609a6eb1`; its application checks pass.

This mechanical integration includes #170 refresh
`64078198c7f1067af3be5fdfb3a51cb3b2680e74`, which already includes merged
#169/#171. Keep the PR target on main and merge #170 there first. The two
additive conflicts retain all TypeScript entries and both exact E2E ownership
paths; overlays 074/075/076 and all reviewed implementations are preserved.
This PR alone consolidates A-02's durable state and removes its in-flight note
so #170's required preceding merge does not create another stale-note cycle.
It does not claim #170 has already landed: it is a dependency, and its reviewed
head must be proven on main before this PR can merge.

The owner-directed queue preparation is complete in one refresh per remaining
branch. Final refreshed GitHub checks, then final-main checks, are required.
No deployment has been requested. Substantive fixes remain the creating
session's responsibility.
