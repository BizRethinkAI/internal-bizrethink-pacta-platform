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

PR **#168** (`chore/mca-memo-refutations`) already folds the two inherited MCA
notes; this branch must not duplicate that fold. It needs to incorporate the
landed cleanup before Governance can be green. No callable Claude SendMessage
tool was available; direct notification of the other sessions remains pending
before landing. Own branch and overlay only; other sessions' worktrees are
untouched. A human must start the fresh-session adversarial review and merge;
the implementer does neither. Other audit findings remain undecided.
