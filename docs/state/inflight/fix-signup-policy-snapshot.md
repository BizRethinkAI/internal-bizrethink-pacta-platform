# fix/signup-policy-snapshot

R-01 from the 2026-09-10 incident audit. The owner approved **fix now** on
2026-09-11. Based on fresh `origin/main`
`001287a0f9b223fe461f18562d9e9668cc17fdcb`, after verifying A-01 is deployed:
Coolify deployment `omxhjaogrssgtfkjcs1jylcs` finished on that commit. No deploy
was triggered and no production database was accessed.

## Reproduction before implementation

`npm test -w @bizrethink/customizations -- regression-tests/signup-policy-request.test.ts`:
**5 failed, 10 passed**. The actual Hono `/signup` route returned **201 instead
of 400** for an outsider or an uninvited user when the initial restricted
policy read succeeded and later reads failed. A later unrestricted row also
replaced the first request's domain restriction. The two success controls
revealed three settings reads instead of one. Initial closed/missing/invalid
policy, initial read failure and invitation-query failure already blocked.

`npm test -w @bizrethink/customizations -- server-only/signup-config.test.ts`:
**5 failed, 14 passed** after replacing permissive error-fallback expectations
with rejection expectations. These tests use mocked I/O; they do not attack
production or write to a real database.

## Change and boundaries

Reads one validated signup policy per request and uses it for the disabled,
domain and invitation gates. Keep the existing provider kill switches, domain
matching, invitation verification flow, rate limiting and CAPTCHA. A valid
open DB policy with an empty domain list may still use the existing env CSV;
an unreadable policy cannot fall back into permission. Preserve the existing
rule that the invitation toggle applies to a nonempty **DB** domain list.

The policy lives in `packages/bizrethink/server-only/signup-config.ts`; the
upstream route wiring and its source guards are recorded in overlay **074**.
Legacy individual getters reject unavailable/closed policy rather than return
permissive defaults. A typed closed policy contains no domain/invitation
permissions. No schema, admin setting or environment change. An admin policy
change affects the next request; this does not serialize an already-started
signup with concurrent admin edits.

## Verification and coordination

Fresh worktree `/private/tmp/pacta-r01-signup-policy`, its own `npm ci`, Prisma
generation and Node 24.20.0. The exact main baseline already passed
[CI](https://github.com/BizRethinkAI/internal-bizrethink-pacta-platform/actions/runs/34657079323)
and the [full Playwright suite](https://github.com/BizRethinkAI/internal-bizrethink-pacta-platform/actions/runs/34657079229).
Local verification: **4159 Vitest tests / 193 owned-package files**, **6 auth
source guards**, and **45 lib auth/create-user/verify-email tests** passed. The
two R-01 files now have **36 passing tests**, including env precedence, case
normalization, provider kill switches, successful invited/unrestricted signup,
and failure to read the required invitation. The expanded TypeScript gate
includes the policy and request fixtures; its initial run caught missing
fixture audit fields, now corrected. Typecheck, owned-package formatting,
`git diff --check` and overlay reverse-apply check pass. No tests were skipped
or marked xfail. No local build was run; the full post-change Playwright suite
and build run on the PR. Test-first commit: `8f4e95812`.

PR **#168** landed at `005db8e469ad8c66da6bb3373149705f0089e250` and folded
the two inherited MCA notes. This branch now incorporates that main revision
and owns only the fold of #168's newly stale `chore-mca-memo-refutations.md`
note. Its durable register state and unresolved source/ADR follow-ups move to
`docs/STATE.md`; the older proposal to reject six memo findings is corrected
to match the one rejection already recorded by #168.

The owner started an independent review-and-ship session and released this
branch for the mechanical refresh on 2026-09-12. Peer messaging is unavailable,
so the owner relayed coordination: this review session owns #168's note cleanup;
the separate A-02 remediation session owns `fix/api-token-team-boundary` and
reserves overlay **075**, without editing this PR or its notes. Substantive
R-01 findings go back through Shwet. No substantive R-01 defect was found.

Independent validation of `b2f4961efac4801dc2058bf2ca66c38262a24235` reproduced
the test-first commit's **10 expected failures / 24 passes**, then passed
**136 targeted tests** and the separate TypeScript gate on the fixed head.
Overlay 074 exactly matches both upstream-file edits and reverse-applies.
Completed PR E2E evidence: **1046 passed / 2 passed on retry / 59 existing
skips**, on integration `80e28156d7a653d765ba80957180f0c286de9bcd` against the
older main; the identities of the 59 skips match the baseline. The refreshed
integration passed **4160 tests / 193 owned-package files**, the separate
TypeScript gate and the local stale-note guard. The refreshed revision needs
new CI before merging. No local build or production operation was run.
The implementation remains the creating session's; this review
session's changes are the coordinated merge and state-note maintenance.
