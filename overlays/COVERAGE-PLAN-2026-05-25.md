# Test Coverage Plan — Pacta Platform (2026-05-25)

**Status:** Pre-merge prerequisite. BLOCKS the resumption of the upstream merge workstream (see `overlays/MERGE-MANIFEST-2026-05-25.md`).
**Decisions locked:** 2026-05-25 by user (Shwet).
**Estimated total effort:** 120-140h (~3-3.5 working weeks for one engineer).

This document captures:
1. User decisions about scope + approach
2. Current test coverage state (vitest + Playwright surveys)
3. Per-file test plan for ALL 33 BizRethink TypeScript files
4. P0/P1/P2 phasing
5. Tooling setup work
6. Recommended writing order
7. Open items

After this plan ships and P0 is green, the upstream merge resumes per `overlays/MERGE-MANIFEST-2026-05-25.md` §9.

---

## 1. Decisions made (2026-05-25)

| Question | Decision | Implication |
|---|---|---|
| Save plan to repo? | YES — this file | Reference doc for ~3 weeks of execution |
| PDF cryptographic assertion depth | **THICK** — parse PKCS#7 + assert TSA timestamp + cert chain | The signing-chain E2E (E4) is 8h not 4h. Required because the merge specifically touches `decorateAndSignPdf` + moves TSA to DB-backed |
| SSO E2E approach | Stub the OAuth callback | Deterministic, no rate limits, no real Google account needed |
| Retroactive coverage scope | **ALL ~33 BizRethink files NOW, not just merge-critical** | +30-40h vs P0-only. Comprehensive but ambitious. |
| Hard rules added to memory | feedback-tdd-first-pacta + feedback-playwright-regression-gate | Every future change follows TDD + Playwright before/after gate |

---

## 2. Current state — vitest

**Configs found:**
- `packages/lib/vitest.config.ts` — minimal (`{ include: ['**/*.test.ts'] }`)
- NO config in `packages/bizrethink/`, `packages/auth/`, `packages/ee/`, `packages/signing/`

**Existing test files (entire monorepo):**
- `packages/lib/server-only/webhooks/is-private-url.test.ts` — IPv4/IPv6 private-range detection (~40 cases, upstream Documenso)
- `packages/lib/server-only/webhooks/assert-webhook-url.test.ts` — URL+DNS guard (~25 cases, upstream Documenso)

**Total BizRethink-specific tests: 0.**

**Packages with `test` npm script:**
- `packages/lib` — `"test": "vitest run"`
- `packages/signing` — `"test": "vitest"` (NO test files; dead script)

**Coverage tooling:** Not installed. `@vitest/coverage-v8` is absent. No coverage thresholds configured.

**Root `package.json` test scripts:** None. `ci` script runs only `turbo run test:e2e`, not vitest.

---

## 3. Current state — Playwright

**Config:** `packages/app-tests/playwright.config.ts`. Three projects: `api` (10 workers), `license` (1 worker, serial), `ui` (CPU-derived, max 6). Base URL `http://localhost:3000`.

**Run modes:**
- `test:dev` — assumes dev server already running
- `test:e2e` — `start-server-and-test` boots Remix, runs Playwright, used by `ci` script

**Test count: 85 spec files**, all upstream Documenso. Categories:
- 12 in `e2e/api/` (REST v1, v2, tRPC contract tests)
- 9 in `e2e/envelope-editor-v2/`
- 8 in `e2e/document-flow/`
- 6 each in `e2e/teams/`, `e2e/templates/`, `e2e/envelopes/`
- 5 in `e2e/user/`
- 4 in `e2e/document-auth/`
- 1 in `e2e/admin/`
- Various others — 1-2 each

**BizRethink-specific E2E coverage: 0 specs.** Zero specs touch admin BizRethink pages, PRO+trial org creation, auto-claim, verification footer, compact audit log, instance SSO switching, per-org-mailer, etc.

**Fixtures present:** `authentication.ts` (cookie-based signin), `documents.ts`, `envelope-editor.ts`, `signature.ts`, `konva.ts`, `generic.ts`, `api-seeds.ts`. NO BizRethink-specific fixtures.

**Seed helpers:** `seedUser()` (in `packages/prisma/seed/users.ts`) creates a logged-in-ready user+team. NO BizRethink seed helpers (no signing-config seeder, no pending-invite seeder, etc.).

**Critical safety gap:** Playwright config has NO guardrail preventing tests from mutating prod data if `baseURL` is misconfigured. P0 tooling task adds one.

---

## 4. The 33 BizRethink files — per-file test plan

Format: file path · purpose · test target · phase · effort

| # | File | Test focus | Phase | Effort |
|---|---|---|---|---|
| 1 | `packages/bizrethink/index.ts` | Module exports surface — assert public API doesn't shift without intent | P2 | 0.5h |
| 2 | `packages/bizrethink/feature-flags.ts` | Each flag returns correct env-var-driven boolean; default values; precedence rules | P1 | 1h |
| 3 | `packages/bizrethink/server-only/auto-claim-invites-on-signup.ts` | PENDING invites matching user email auto-claim (case-insensitive); per-invite errors don't abort loop; ACCEPTED/DECLINED invites ignored; expired invites ignored; revoked-org invites ignored; duplicate invites across two orgs both claim | P0 | 4h |
| 4 | `packages/bizrethink/server-only/billing/start-trial-for-new-org.ts` | External org → `bizrethinkInternal=false`, `trialStartedAt=now`, `trialEndsAt=now+14d`; internal=true → no trial dates; upsert preserves existing dates on retry; idempotent on double-call | P0 | 3h |
| 5 | `packages/bizrethink/server-only/captcha-config.ts` | DB-row read + decrypt site key/secret; env fallback; cache 60s TTL; invalidate hook clears cache | P0 (V8 covers schema) | 2h |
| 6 | `packages/bizrethink/server-only/instance-ai-config.ts` | DB-row load; model selection (Gemini/Vertex); env fallback; `enabledForTier` gating | P1 | 3h |
| 7 | `packages/bizrethink/server-only/instance-signing-config.ts` | Load + decrypt `localPassphrase` + `localCertContents`; `tsaUrls` CSV parsed; cache invalidation evicts; encrypt round-trip; null when no row; env fallback shape | P0 | 3h |
| 8 | `packages/bizrethink/server-only/instance-storage-config.ts` | Same DB-singleton load/decrypt/cache pattern as #7; S3 endpoint + CloudFront key fields | P0 | 2h |
| 9 | `packages/bizrethink/server-only/instance-stripe-config.ts` | DB-backed sandbox↔live mode switch; decrypts API keys per mode; mode change triggers SDK singleton re-init; webhook signing-secret per mode | P0 | 4h |
| 10 | `packages/bizrethink/server-only/org-context.ts` | Per-tenant routing helper — given org → returns DBA-specific mailer/storage/signing context | P1 | 2h |
| 11 | `packages/bizrethink/server-only/pdf/add-verification-footer-to-pdf.ts` | Footer text drawn on every body page (NOT certificate page); pdf.js text-content extraction matches expected string; positioning correct (bottom margin, font size); handles single-page + multi-page; respects rotated pages | P0 | 4h |
| 12 | `packages/bizrethink/server-only/per-org-mailer.ts` | Routes outbound mail to org SMTP when `BizrethinkOrgSmtpConfig` row exists; falls back to default mailer when absent; handles per-org from-address rewriting | P1 | 4h |
| 13 | `packages/bizrethink/server-only/security-headers-config.ts` | DB load; HSTS / Permissions-Policy / Referrer-Policy fields; nosniff toggle; cache 60s + invalidate | P0 | 2h |
| 14 | `packages/bizrethink/server-only/signup-config.ts` | Domain-allowlist CSV → string[] (whitespace tolerant, case-insensitive); `isEmailDomainAllowedForSignup('foo@example.com')` accepts/rejects per list; signup-disabled flag; `requireInviteWhenDomainGated` flag (overlay 048b) | P0 | 2h |
| 15 | `packages/bizrethink/server-only/site-settings/schemas/captcha.ts` | Zod schema parametric: valid input parses, invalid input rejects (missing required fields, wrong types) | P0 | 0.5h |
| 16 | `packages/bizrethink/server-only/site-settings/schemas/security-headers.ts` | Same as #15 | P0 | 0.5h |
| 17 | `packages/bizrethink/server-only/site-settings/schemas/signup.ts` | Same as #15 | P0 | 0.5h |
| 18 | `packages/bizrethink/server-only/site-settings/schemas/webhook.ts` | Same as #15 | P0 | 0.5h |
| 19 | `packages/bizrethink/server-only/sso-provider-config.ts` | `isGoogleSsoEnabled()` / `isMicrosoftSsoEnabled()` / `isOidcSsoEnabled()` read DB row + env fallback; `getOidcProviderLabel()` returns DB value or env or default; cache invalidation | P0 | 2h |
| 20 | `packages/bizrethink/server-only/sync-stripe-products.ts` | Idempotent: re-running doesn't duplicate Stripe products; sync respects sandbox vs live mode; tier→product mapping matches `INTERNAL_CLAIM_ID` | P1 | 4h |
| 21 | `packages/bizrethink/server-only/test-instance-storage.ts` | "Test Connection" handler returns OK on valid S3 creds; clear error on auth failure; clear error on bucket-not-found; doesn't leak credentials in error message | P1 | 2h |
| 22 | `packages/bizrethink/server-only/test-org-smtp.ts` | Same shape as #21 but for SMTP | P1 | 2h |
| 23 | `packages/bizrethink/server-only/test-stripe-connection.ts` | Same shape as #21 but for Stripe | P1 | 2h |
| 24 | `packages/bizrethink/server-only/trpc/instance-ai-router.ts` | Mutation: save → DB row created + cache invalidated. Query: returns current config. Authz: instance admin only. | P1 | 3h |
| 25 | `packages/bizrethink/server-only/trpc/instance-signing-router.ts` | Same shape as #24 | P0 | 3h |
| 26 | `packages/bizrethink/server-only/trpc/instance-storage-router.ts` | Same shape as #24 | P0 | 3h |
| 27 | `packages/bizrethink/server-only/trpc/instance-stripe-router.ts` | Same shape as #24 — including mode-switch handler triggers SDK re-init | P0 | 3h |
| 28 | `packages/bizrethink/server-only/trpc/org-smtp-router.ts` | Per-org SMTP config CRUD; authz: org admin only | P1 | 3h |
| 29 | `packages/bizrethink/server-only/trpc/organisation-billing-router.ts` | Returns correct billing state per org (BIZRETHINK / PRO+trial-active / PRO+trial-expired / FREE / etc.); `bizrethinkInternal=true` orgs always return "internal" badge | P0 | 2h |
| 30 | `packages/bizrethink/server-only/trpc/router.ts` | Composite router exports correct shape; namespaces present; no accidentally-exposed admin procedures on public namespace | P1 | 1h |
| 31 | `packages/bizrethink/server-only/trpc/signup-invite-router.ts` | Invite list/create/revoke; authz checks; domain-gated invite enforcement | P1 | 3h |
| 32 | `packages/bizrethink/server-only/trpc/sso-provider-router.ts` | Same shape as #24 — config CRUD + enable/disable flags | P0 | 3h |
| 33 | `packages/bizrethink/server-only/webhook-config.ts` | Outbound webhook destination + signing-secret CRUD; URL validation; cache | P1 | 3h |

**Subtotals:**
- P0: items 3,4,5,7,8,9,11,13,14,15,16,17,18,19,25,26,27,29,32 = **19 files, ~46h unit tests**
- P1: items 2,6,10,12,20,21,22,23,24,28,30,31,33 = **13 files, ~34h unit tests**
- P2: item 1 = **1 file, ~0.5h unit tests**

(Total per-file vitest time: ~80.5h. This is higher than the original P0 estimate of 14h because we're now retroactively covering ALL 33 files, not just the merge-critical helpers.)

---

## 5. Playwright E2E specs

Per the agent's plan + the user's "thick PDF crypto" decision:

| # | Spec file | Covers | Phase | Effort |
|---|---|---|---|---|
| E1 | `e2e/bizrethink/auth-signup-domain-gate.spec.ts` | Disabled-signup blocks; allowed/disallowed domain; `requireInviteWhenDomainGated` + no invite blocks; with invite succeeds + auto-claims + skips Personal Org | P0 | 4h |
| E2 | `e2e/bizrethink/sso-signin.spec.ts` | Each provider (Google/Microsoft/OIDC) gated by DB flag — disabled hides button, enabled shows + clickable, redirects to OAuth start. **Callback STUBBED** (not real OAuth). | P0 | 4h |
| E3 | `e2e/bizrethink/org-creation-pro-trial.spec.ts` | User + admin paths assign PRO claim + create `BizrethinkOrganisationBilling` row with `trialEndsAt≈now+14d`; billing banner shows "Trial active" | P0 | 4h |
| E4 | `e2e/bizrethink/signing-chain-e2e.spec.ts` | **HARDEST.** Send → recipient signs → poll for SEALED → download. Asserts: (a) PDF parseable, (b) verification footer on every body page, (c) **PKCS#7 signature dict present (PAdES) via pkijs**, (d) **TSA timestamp embedded**, (e) **certificate chain validates**, (f) AcroForm widgets retain values, (g) audit log compact format | P0 | **8h** |
| E5 | `e2e/bizrethink/admin-instance-signing.spec.ts` | Admin → `/admin/signing` loads → save TSA URL → next signing uses new TSA | P0 | 3h |
| E6 | `e2e/bizrethink/admin-instance-storage.spec.ts` | `/admin/storage` save → Test Connection success (mocked S3) → upload flow uses new config | P0 | 3h |
| E7 | `e2e/bizrethink/admin-site-settings-bizrethink.spec.ts` | Update signup-domains → DB row updated → subsequent signup honors new allowlist | P0 | 2h |
| E8 | `e2e/bizrethink/pacta-email-branding.spec.ts` | Send envelope → outbound email captured → footer contains "sign.pacta.ink" / Pacta wordmark; subject prefix correct. Covers signing-invite + completed templates | P0 | 2h |
| E9 | `e2e/bizrethink/admin-instance-stripe.spec.ts` | Sandbox↔live mode switching from admin UI → SDK re-init confirmed → webhook secret per mode | P1 | 4h |
| E10 | `e2e/bizrethink/admin-instance-ai.spec.ts` | Gemini/Vertex toggle, model selection, tier gating | P1 | 3h |
| E11 | `e2e/bizrethink/per-org-mailer.spec.ts` | Org SMTP config set → outbound emails for that org use the SMTP transport (per-org-mailer fixture intercepts) | P1 | 3h |
| E12 | `e2e/bizrethink/admin-users-filter-service-accounts.spec.ts` | Seed service-account row → navigate `/admin/users` → assert absent | P1 | 2h |
| E13 | `e2e/bizrethink/org-branding-hide-powered-by.spec.ts` | `o/<orgUrl>/settings/branding` Hide Powered By toggle saves + applies to outbound emails | P1 | 2h |
| E14 | `e2e/bizrethink/tsa-cache-hot-reload.spec.ts` | Change TSA URL via admin → next seal uses new URL (mock TSA server in test) | P1 | 3h |
| E15 | `e2e/bizrethink/trial-expiry-sweep.spec.ts` | Run cron handler → orgs past `trialEndsAt` + no Stripe sub → downgraded to FREE; orgs with sub → unchanged; internal orgs → unchanged | P1 | 3h |
| E16 | `e2e/bizrethink/inline-signature-badge.spec.ts` | Signed envelope has "Signed YYYY-MM-DD HH:MM UTC" badge below signature glyph (overlay 037) | P1 | 2h |
| E17 | `e2e/bizrethink/compact-audit-log-render.spec.ts` | Sealed PDF audit log uses 2-line compact rows (overlay 038); 30-event envelope ≤ 3 pages | P1 | 2h |
| E18 | `e2e/bizrethink/security-headers.spec.ts` | Page response has HSTS + Permissions-Policy headers from DB config | P1 | 2h |
| E19 | `e2e/bizrethink/email-domains-bypass-billing.spec.ts` | `/o/<orgUrl>/settings/email-domains` page renders + form submits without billing-enabled env (overlay 008) | P1 | 3h |
| E20 | `e2e/bizrethink/all-email-templates-branding.spec.ts` | Parametric across 10 templates — each has Pacta-branded subject + footer | P1 | 3h |
| E21 | `e2e/bizrethink/visual-regression-sealed-pdf.spec.ts` | pixelmatch comparison of canonical sealed PDF | P2 | 3h |
| E22 | `e2e/bizrethink/webhook-fanout-outbound.spec.ts` | Outbound webhook delivered to mock receiver on document events | P2 | 4h |

**Subtotals:**
- P0 E2E: E1-E8 = 8 specs, **~30h**
- P1 E2E: E9-E20 = 12 specs, **~32h**
- P2 E2E: E21-E22 = 2 specs, **~7h**

---

## 6. Tooling setup (T-series tasks, ~10h)

Required before tests can be written/run.

| # | Task | Effort | Phase |
|---|---|---|---|
| T1 | Add `@vitest/coverage-v8` dep + `coverage:` block to `packages/lib/vitest.config.ts`; thresholds 80% lines/functions initially | 1h | P0 |
| T2 | Create `packages/bizrethink/vitest.config.ts` + `"test": "vitest run"` + `"test:watch": "vitest"` scripts in `packages/bizrethink/package.json` | 0.5h | P0 |
| T3 | Add root `"test"` script: `turbo run test` across workspaces | 0.5h | P0 |
| T4 | Add Playwright `signedInAsAdmin` fixture in `packages/app-tests/e2e/fixtures/admin.ts` | 1h | P0 |
| T5 | BizRethink seed helpers in `packages/prisma/seed/bizrethink.ts`: `seedInstanceSigningConfig`, `seedInstanceStorageConfig`, `seedInstanceStripeConfig`, `seedInstanceAiConfig`, `seedSiteSettingsExtensions`, `seedSsoProviderConfig`, `seedPendingInvite`, `seedBizRethinkOrganisationBilling`, `seedOrgSmtpConfig` | 3h | P0 |
| T6 | Prod-safety guardrail: `playwright.config.ts` global setup throws if `baseURL` resolves to anything outside localhost | 0.5h | P0 |
| T7 | Wire vitest into root `ci` script: `turbo run build && turbo run test && turbo run test:e2e` | 0.5h | P0 |
| T8 | Mailpit (or similar) test mailer setup in `docker/development/compose.yml`; document `playwright.config.ts` env vars to point at it | 1.5h | P0 |
| T9 | `pkijs` dep for PKCS#7 parsing in E4 + helper module `e2e/helpers/pdf-crypto.ts` for the thick assertion | 1.5h | P0 |
| T10 | Per-package `vitest.config.ts` + test scripts for `packages/auth/`, `packages/ee/` (so overlay 048b + 009 callsites get unit coverage when we add tests there) | 0.5h | P1 |

**Tooling P0 subtotal: ~9.5h.**

---

## 7. Phased totals

| Phase | Tooling | Vitest unit | Playwright E2E | Total |
|---|---|---|---|---|
| **P0 (blocks merge resume)** | 9.5h | 46h | 30h | **~85.5h** |
| **P1 (post-merge soon)** | 0.5h | 34h | 32h | **~66.5h** |
| **P2 (deferred)** | 0h | 0.5h | 7h | **~7.5h** |
| **Total to 100% critical-flow coverage** | 10h | 80.5h | 69h | **~159h** |

**This is higher than the initial 96h estimate** because the user chose "retroactive for ALL 33 files" rather than P0-only. P0 alone increased from ~52h (P0-only scope) to ~85h (P0 + retroactive of remaining critical files). P1 also expanded.

**Realistic time-to-resume-merge: ~85h of focused work = 2-3 working weeks for one engineer (Shwet, solo).**

If a faster path is needed, fall back to the original P0-only scope (~52h, the merge-blocker minimum) and treat the retroactive-coverage-for-all-files as a P0.5 workstream that overlaps with the merge.

---

## 8. Recommended writing order

Optimized for momentum (easy wins first) and dependency chains (fixtures before tests that use them).

**Day 1 (4h):**
1. T1 + T2 + T3 + T7 — tooling foundation (2h)
2. V15-V18 — 4 Zod schemas, parametric (2h)

**Day 2 (8h):**
3. V14 — signup-config (2h)
4. V19 — sso-provider-config (2h)
5. V13 — security-headers-config (2h)
6. V5 — captcha-config (2h)

**Day 3 (8h):**
7. V4 (billing/start-trial-for-new-org) (3h)
8. V29 (organisation-billing-router) (2h)
9. V8 (instance-storage-config) (2h)
10. V7 — start instance-signing-config (1h)

**Day 4 (8h):**
11. Finish V7 — instance-signing-config (2h)
12. V11 (PDF verification footer) (4h)
13. T8 + T9 — Mailpit + pkijs setup (2h)

**Day 5 (8h):**
14. V3 — auto-claim-invites (4h)
15. V9 — instance-stripe-config (4h)

**Day 6 (8h):**
16. V25-V27 + V32 — 4 TRPC routers (instance-signing/storage/stripe/sso-provider) (8h, ~2h each shared boilerplate)

**Day 7 (8h):**
17. T4 + T5 + T6 — Playwright fixtures + seeds + guardrail (5h)
18. E7 — admin-site-settings save → effect (2h)
19. Start E5 — admin-instance-signing (1h)

**Day 8 (8h):**
20. Finish E5 (2h)
21. E6 — admin-instance-storage (3h)
22. E8 — Pacta email branding (2h)
23. Start E2 — SSO signin (1h)

**Day 9 (8h):**
24. Finish E2 — SSO signin (3h)
25. E1 — signup with domain gate + auto-claim (4h)
26. Start E3 — org creation PRO+trial (1h)

**Day 10 (8h):**
27. Finish E3 (3h)
28. **E4 — signing chain E2E with thick PDF crypto assertions (5h, may slip to Day 11)**

**Day 11 (4-8h):**
29. Finish E4 + flakiness debugging + verify coverage report green
30. **Merge resume unblocked**

**Total P0: ~85h ≈ 10-11 working days.** Add 1-2 days buffer for flakiness in E4 and Mailpit/pkijs setup. Realistic: **2.5 working weeks to unblock merge**.

P1 work (E9-E20 + V2, V6, V10, V12, V20-V24, V28, V30, V31, V33) follows after merge ships. Estimated 8-9 more working days.

---

## 9. Resolved questions (answered 2026-05-25)

| Question | Decision |
|---|---|
| Thin vs Thick PDF crypto in E4 | **Thick** (pkijs PKCS#7 parsing + TSA timestamp + cert chain) |
| SSO E2E approach | Stub OAuth callback |
| Mailer infra | Mailpit (T8) — confirm in docker compose; if absent, add |
| Coverage thresholds | 80% lines/functions for `packages/bizrethink/` after P0; raise to 90% after P1 |
| Staging environment | Defer — out of scope for this workstream; revisit after merge ships |
| `packages/signing` dead test script | Leave as-is; BizRethink signing tests live in `packages/bizrethink/__tests__/` (V7) |
| TDD retroactive vs new-only | Retroactive for ALL 33 BizRethink files (P0 covers 19 critical; P1 covers remaining 13; P2 covers index export shape) |
| Save plan to repo | YES — this file (`overlays/COVERAGE-PLAN-2026-05-25.md`) |

---

## 10. After-this-plan — resumption protocol for upstream merge

Once P0 vitest + P0 Playwright are all green:

1. **Capture baseline:** `npx playwright test` (P0 subset, `packages/app-tests/e2e/bizrethink/`) — all pass. Tag the commit.
2. **Re-do the merge** per `overlays/MERGE-MANIFEST-2026-05-25.md` §9 Resume Plan:
   - Discipline-drift sweep
   - 6 strategic per-overlay decisions (014, 028, 048b, 009, 045b, 023)
   - Regenerate broken patches (023, 032)
   - `git merge upstream/main` → resolve in 8 conflict groups
3. **Gate 1:** After merge but BEFORE push — `npx playwright test` again. ALL P0 specs must pass. Any new failure = regression to fix before push.
4. **Push to main** → Coolify auto-deploys.
5. **Gate 2:** Production smoke per `MERGE-MANIFEST-2026-05-25.md` Phase G checklist + run P0 Playwright against prod (via temp `baseURL` override; this is a one-time exception to T6 guardrail and requires explicit env-var override).
6. **Cleanup** per `MERGE-MANIFEST-2026-05-25.md` Phase I.

After all that: the merge is shipped + we have automated regression coverage for every future merge.

---

## 11. Tracking

- Task #12 — Coverage workstream (in_progress, blocks Task #5)
- Task #5 — Execute merge (PAUSED, blocked by #12)
- Task #11 — Next-session merge prereqs (blocked by #12 → #5)
- Tasks #6, #7, #9, #10 — downstream of merge

This document is mutable; update as P0 lands and effort estimates refine. Update `MERGE-MANIFEST-2026-05-25.md` §9 once P0 is green to remove the "PAUSED" status.
