# Upstream Merge Manifest — 2026-05-25

**Status:** Pre-merge planning. Live production system; no staging.
**Source branch:** `documenso/main` → into our `main` (currently `a9ffb394a`)
**Last successful auto-sync run:** 2026-05-04 (clean merge, PR never opened due to org-level Actions PR-creation toggle being disabled; merge work now 3 weeks stale).

This document is the source of truth for the merge work. It captures:
- The conflicted-file map vs overlay patches vs inline modifications.
- Decisions made via interactive review (2026-05-25).
- Per-file merge plans from 3 forensic audit agents.
- Execution sequence with validation gates and rollback procedures.

---

## 1. Decisions made (2026-05-25)

| Question | Decision |
|---|---|
| Org-level Actions PR-creation toggle | User to flip via UI or `gh auth refresh -h github.com -s admin:org` (blocked by lack of `admin:org` scope) |
| Overlay 048 (auto-claim) sustainable shape | Don't tie auto-claim to auth mechanism — always run it; let SSO callers suppress only Personal-Org creation via `skipPersonalOrganisation: true` |
| Patchify timing | **Patchify 9 inline modifications BEFORE the merge.** Each patch becomes a testable artifact before the merge surface is opened. |
| Overlay 034 (signature width/height) | Test post-merge with real FRPA template — delete if upstream's overflow=`auto` solves clipping; keep otherwise. |
| `packages/lib/constants/auth.ts` strategy | Pre-merge call-site audit (running now). Decide between async-preserve vs adapter-wrapper after seeing the call-site map. |
| Staging environment | None. Merge to `main` directly after local validation. Rollback = `git revert <merge-commit>` + `git push` → Coolify auto-redeploys. |
| Older sync branches (sync/2026-05-04, -05-11, -05-18, -05-25) | Delete after successful merge ships. Verified `sync/2026-05-04` has a stale clean-merge commit; the others point to current main. |

---

## 2. Master conflict-vs-modification table

17 inline-modified files in the conflict list. 30 overlay patches exist on disk; 49 files have inline `// MODIFIED for BizRethink (overlay N)` markers (drift documented in §5).

| # | File | Patch exists | Upstream change | Decision | Risk |
|---|---|---|---|---|---|
| 1 | `packages/lib/constants/auth.ts` | ❌ | Reverted async DB-backed SSO/signup getters → sync env-only constants | Leave inline, hand-reconcile. **Call-site audit complete (2026-05-25): all 14 call sites correctly await; zero bugs.** Risk downgraded from H → L. | **L** |
| 2 | `packages/lib/server-only/user/create-user.ts` | ❌ (overlay 048 phantom) | Added `skipPersonalOrganisation` option to `onCreateUserHook` (compatible) | Patchify before merge — combine both gates | **M** |
| 3 | `packages/lib/server-only/user/get-all-users.ts` | ❌ (overlay 053 phantom) | Reverted to OR-only whereClause | Patchify before merge — re-add notIn under AND | **L** |
| 4 | `packages/lib/server-only/organisation/create-organisation.ts` | ❌ (overlay 041 inline) | Reverted to FREE claim + removed trial setup | Patchify before merge — re-insert PRO + trial | **M** |
| 5 | `packages/trpc/server/organisation-router/create-organisation.ts` | ❌ (overlay 041 inline) | Same revert pattern as #4 | Patchify before merge | **M** |
| 6 | `packages/trpc/server/admin-router/create-admin-organisation.ts` | ❌ (overlay 041 inline) | Same revert + `internalClaims.free` accessor change | Patchify before merge | **M** |
| 7 | `packages/trpc/server/organisation-router/update-organisation-settings.ts` | ✅ `025-org-branding-hide-powered-by-toggle.patch` | Added `brandingColors` + `brandingCss` + `cssWarnings` return (orthogonal columns) | Leave inline; extend overlay 025 for cssWarnings return shape | **L** |
| 8 | `packages/lib/server-only/site-settings/schema.ts` | ❌ (overlay 012/014/048 phantom) | Reverted union to upstream-only members | Patchify before merge — re-add 4 schema imports | **L** |
| 9 | `packages/lib/server-only/site-settings/upsert-site-setting.ts` | ❌ (overlay 032 inline) | Simplified upsert; removed cache-invalidation block | Patchify before merge — re-add cache invalidation | **M** |
| 10 | `packages/signing/index.ts` | ❌ (overlay 011 phantom) | Lint only (no structural change) | Patchify before merge — create overlay 011a | **M** |
| 11 | `packages/signing/helpers/tsa.ts` | ❌ (overlay 011 phantom) | Lint only | Patchify before merge — create overlay 011b | **M** |
| 12 | `packages/lib/jobs/definitions/internal/seal-document.handler.ts` | ✅ 036 + 040 | `fec5d5525` moved completed-email to job (does NOT touch `decorateAndSignPdf`) | Leave inline (patches stable); mandatory post-merge E2E seal test | **H** |
| 13 | `packages/lib/universal/upload/server-actions.ts` | ❌ (overlay 013 phantom) | Lint only | Patchify before merge — create overlay 013 | **M** |
| 14 | `packages/lib/server-only/pdf/render-audit-logs.ts` | ✅ `038-compact-audit-log-rows.patch` | Lint only | Leave inline (patch stable) | **L** |
| 15 | `packages/lib/types/field-meta.ts` | ✅ 034 + 035 | New `overflow` enum + `resolveFieldOverflowMode()` added; both width/height and fontWeight deleted in merge | Decide post-merge; 034 may be obsolete; 035 must be re-applied | **M** |
| 16 | `packages/lib/universal/field-renderer/render-generic-text-field.ts` | ✅ `035-date-fontweight-meta.patch` | Major refactor: now uses `calculateOverflowLayout`; fontStyle silently dropped | Patchify after merge — re-inject fontStyle into setAttrs | **H** |
| 17 | `packages/email/templates/reset-password.tsx` | ❌ (overlay 058 phantom) | Upstream reverted `SUPPORT_EMAIL` import → hardcoded `hi@documenso.com` | Patchify before merge — re-add SUPPORT_EMAIL usage | **L** |

**Counts:**
- Take-upstream-verbatim mechanical files (not in table above): 6 email templates + 11 i18n .po + ~9 email handlers + 2 document send helpers = ~28 files mechanically resolved (`git checkout --theirs`)
- Patchify-before-merge: 9 files (rows 2, 3, 4, 5, 6, 8, 9, 10, 11, 13, 17 — count is 11 if every file is counted; some patches cover multiple files)
- Leave-inline (existing patch stable or orthogonal): 4 files (rows 7, 12, 14, 15)
- Patchify-after-merge: 1 file (row 16)
- Pre-merge call-site audit required: 1 file (row 1)

---

## 3. Cross-cutting findings

1. **✅ Resolved: `packages/lib/constants/auth.ts`** — Originally rated HIGH risk due to async-vs-sync conflict. Call-site audit (2026-05-25) found all 14 call sites correctly use `await` or `Promise.all()` — zero bugs. **Merge resolution: keep our async versions verbatim; refuse upstream's sync rewrite.** Risk downgraded to LOW. Call sites enumerated: 3 in `signup.tsx`, 3 in `signin.tsx`, 3 in `embed/_v0/_layout.tsx`, 2 in `handle-oauth-callback-url.ts` + `email-password.ts`, 1 internal wrapper, 2 in `isEmailDomainAllowedForSignup` callers.

2. **🚨 Cryptographic critical: `seal-document.handler.ts`** — Overlays 036 (footer) + 040 (skip flatten) both anchor on `decorateAndSignPdf` which upstream did NOT touch in `fec5d5525`. Patches should still apply, BUT this is the central orchestrator of PDF sealing. **Mandatory end-to-end seal test post-merge.** Loss of overlay 040 would corrupt AcroForm widget values (data integrity issue, not just visual). Loss of overlay 036 would remove the per-page verification footer (evidentiary loss, not cryptographic).

3. **📉 Overlay 034 may be OBSOLETE** — Upstream's new `ZFieldOverflowMode` ('auto'/'horizontal'/'vertical'/'crop') was designed to solve signature-clipping. If `'auto'` mode handles tight FRPA templates without explicit `width=240`, we can DELETE overlay 034. Requires side-by-side PDF test on real templates.

4. **📉 Overlay 035 (fontWeight) will silently disappear** — Upstream rewrote `render-generic-text-field.ts` using `calculateOverflowLayout`. The new `setAttrs` call doesn't emit `fontStyle`. Our bold-date feature vanishes unless we re-inject post-merge.

5. **⚠️ Discipline drift quantified** — 49 files have inline `// MODIFIED for BizRethink (overlay NNN)` markers; 30 overlay patches exist on disk. Phantom overlay numbers in comments: 011, 012, 013, 014, 048, 053, 058. These should have been patches but never were. Patchifying the 9 highest-impact ones pre-merge restores discipline incrementally.

6. **Signing-chain integrity invariant** — `getSigner()` in `packages/signing/index.ts` must call `seedTsaFromConfig()` BEFORE the first `signPdf()` call on the process. If this ordering breaks, TSA URLs won't be seeded → archival LTV validation silently fails in 5+ years. Preserve the ordering when patchifying overlay 011.

7. **Cross-file invariants:**
   - Site-settings schema (file #8) and upsert (#9) must merge together — type and runtime caching must stay aligned.
   - Auth constants (#1) and all SSO callers across `apps/remix/app/routes/auth/*` must agree on async-vs-sync.
   - Org creation (#4, #5, #6) must all assign the same claim tier (PRO) — drift breaks the trial model.
   - User auto-claim (#2) depends on site-settings schema (#8) being present so it can read signup flags.

---

## 4. Pre-merge workstreams

Before any `git merge` runs, three workstreams in parallel:

### 4.1 — Patchify 9 inline modifications

Order suggested (lowest-risk to highest-risk for incremental confidence):

1. **`053-filter-system-service-accounts.patch`** — `get-all-users.ts`, 10 lines, mechanical
2. **`058-reset-password-support-email.patch`** — `reset-password.tsx`, 3 lines, mechanical (or fold into 021)
3. **`008-site-settings-schema-extensions.patch`** — `schema.ts`, 10 lines, additive
4. **`009-site-settings-cache-invalidation.patch`** — `upsert-site-setting.ts`, 12 lines
5. **`013-instance-storage-config.patch`** — `upload/server-actions.ts`, ~40 lines
6. **`011a-instance-signing-config.patch`** — `signing/index.ts`, ~25 lines
7. **`011b-tsa-cache-manual.patch`** — `signing/helpers/tsa.ts`, ~60 lines
8. **`048-auto-claim-invites.patch`** — `create-user.ts`, ~30 lines + new hook-options handling
9. **`041-route-new-orgs-to-pro-trial.patch`** (rewrite) — three call sites in `create-organisation.ts` paths, ~20 lines

(Numbering chosen to fill phantom slots already referenced in inline comments; this is intentional — the comments will then point at real patches.)

Each patch:
- Has a header documenting WHY it exists + WHY-NOT-additive + estimated upstream-merge fragility.
- Applied via `scripts/apply-overlays.sh` (or whatever the local mechanism is).
- Reviewable and revertable independently.

### 4.2 — Call-site audit for `auth.ts` ✅ COMPLETE

**Finding:** All 14 call sites of the 6 async functions correctly use `await` or `Promise.all()`. Zero bugs. The codebase was comprehensively refactored when overlays 012/014 went inline.

| Function | Call sites | All async-aware? |
|---|---|---|
| `isGoogleSsoEnabled()` | 3 | YES |
| `isMicrosoftSsoEnabled()` | 3 | YES |
| `isOidcSsoEnabled()` | 3 | YES |
| `getOidcProviderLabel()` | 2 | YES |
| `getAllowedSignupDomains()` | 1 | YES (internal wrapper) |
| `isEmailDomainAllowedForSignup()` | 2 | YES |

**Merge strategy decision:** Stay async; refuse upstream's sync overwrite during conflict resolution. No call-site patches needed.

### 4.3 — Verify packages/bizrethink/ helpers compile

Quick `tsc --noEmit -p packages/bizrethink/tsconfig.json` (if such config exists) to confirm no broken imports in our customization layer before we start merging.

---

## 5. Merge execution plan

### Phase 0 — Prereqs (must be done before Phase A)
- [ ] Patchify the 9 inline modifications (§4.1)
- [ ] Run `auth.ts` call-site audit (§4.2)
- [ ] Pick `auth.ts` strategy based on audit findings
- [ ] User flips org-level Actions PR-creation toggle (UI or `gh auth refresh -h github.com -s admin:org`)

### Phase A — Branch creation
```
git fetch upstream main
git checkout -b sync/manual-2026-05-25
```

### Phase B — Initiate merge (halted state)
```
git merge upstream/main --no-commit --no-ff
# Many conflicts surface. Do not let it auto-commit.
```

### Phase C — Resolve files in batches, one commit per batch
Validation gate between every batch: `npx tsc --noEmit` + `npm run build`. Halt and investigate if either fails.

**Batch C1 — Mechanical take-upstream (no BizRethink touch)**
- 11 i18n `.po` files
- 6 email templates (excluding reset-password.tsx)
- 9 email handlers
- 2 document send helpers

Strategy: `git checkout --theirs <file>` for each, then `git add`. Single commit.

Validation: build passes; spot-check that one English email template still renders correctly in dev.

**Batch C2 — Site-settings schema + upsert**
- `packages/lib/server-only/site-settings/schema.ts` (apply patch 008)
- `packages/lib/server-only/site-settings/upsert-site-setting.ts` (apply patch 009)

Strategy: hand-merge using audit plan; apply pre-built patches.

Validation: tsc on `packages/lib/`.

**Batch C3 — User filter + invite auto-claim**
- `packages/lib/server-only/user/get-all-users.ts` (apply patch 053)
- `packages/lib/server-only/user/create-user.ts` (apply patch 048)

Strategy: apply pre-built patches.

Validation: tsc; manual test signup flow in dev (verify Personal Org created OR invite claimed correctly).

**Batch C4 — Org creation + trial**
- `packages/lib/server-only/organisation/create-organisation.ts` (apply patch 041 part 1)
- `packages/trpc/server/organisation-router/create-organisation.ts` (apply patch 041 part 2)
- `packages/trpc/server/admin-router/create-admin-organisation.ts` (apply patch 041 part 3)

Strategy: apply pre-built patches.

Validation: tsc; manual test: create a new org via public route in dev; verify PRO claim + trial row in `BizrethinkOrganisationBilling`.

**Batch C5 — Update-organisation-settings + reset-password email**
- `packages/trpc/server/organisation-router/update-organisation-settings.ts` (hand-merge: take upstream's new branding fields, keep our hidePoweredBy block)
- `packages/email/templates/reset-password.tsx` (apply patch 058)

Validation: tsc; check org settings save in dev (both hidePoweredBy and the new brandingColors).

**Batch C6 — Field meta + render**
- `packages/lib/types/field-meta.ts` (3-way merge: take upstream's overflow system; preserve overlay 034 width/height + overlay 035 fontWeight in addition)
- `packages/lib/universal/field-renderer/render-generic-text-field.ts` (take upstream verbatim; defer fontStyle re-injection to post-merge overlay)

Validation: tsc; deferred render test until Batch C8.

**Batch C7 — Signing + sealing + upload (CRYPTO CRITICAL)**
- `packages/signing/index.ts` (apply patch 011a)
- `packages/signing/helpers/tsa.ts` (apply patch 011b)
- `packages/lib/universal/upload/server-actions.ts` (apply patch 013)
- `packages/lib/jobs/definitions/internal/seal-document.handler.ts` (re-apply existing overlays 036 + 040 to lint-reformatted upstream version)

Validation: tsc; `npm run build`; **mandatory E2E seal test in dev** — sign a test envelope, verify (a) PDF generated, (b) verification footer present on every body page, (c) AcroForm widget values mapped correctly to fields, (d) signature validates in Acrobat Reader.

**Batch C8 — `constants/auth.ts` (HIGHEST RISK, last)**
Based on Phase 0 call-site audit, either:
- Stay async, patch any new upstream callers that expect sync
- Or implement adapter wrapper

Validation: tsc across full workspace; manual test login flow in dev for each enabled SSO provider.

### Phase D — Final consolidation commit
- Re-run `scripts/apply-overlays.sh --dry-run` (or equivalent) to confirm every patch in `overlays/` still applies cleanly post-merge.
- Update overlay headers if line anchors shifted significantly.
- Run full test suite: `npm test` if any exists for affected packages.

### Phase E — Push branch + open PR (still pre-production)
```
git push origin sync/manual-2026-05-25
gh pr create --base main --head sync/manual-2026-05-25 \
  --title "chore(upstream-sync): 2026-05-25 manual merge" \
  --body-file overlays/MERGE-MANIFEST-2026-05-25.md
```

(Once the org toggle is flipped, future bot-created PRs will work; for this manual merge, we just open one ourselves.)

### Phase F — Final local validation
- Pull the branch fresh in a clean clone.
- `npm install` + `npm run build`.
- Run all overlay applications via `scripts/apply-overlays.sh`.
- Spin up dev server: `npm run dev`.
- Smoke test surfaces per Phase G checklist (below) IN DEV first.

### Phase G — Merge to main + production smoke
```
gh pr merge <PR-number> --squash  # or --merge for full commit history
# Coolify auto-deploys on push to main.
```

Within 5 minutes of auto-deploy completing, perform the production smoke checklist:

**Critical surfaces:**
- [ ] Sign in via each enabled SSO provider (Google, Microsoft, OIDC if applicable)
- [ ] Email-password signup → verify Personal Org OR claimed invite path correctly
- [ ] Domain-gated signup (if signup-domains config is set) blocks non-allowed domains
- [ ] Create a new external org → verify PRO claim assigned + trial row exists
- [ ] Send a test envelope (one signer) → recipient receives email with correct footer (Pacta branding)
- [ ] Sign the test envelope → verify sealed PDF has (a) verification footer, (b) signature validates in Acrobat, (c) AcroForm fields correctly populated
- [ ] Open `/admin/users` → service accounts filtered out
- [ ] Open `/admin/instance-signing` → load DB-backed signing config, save a TSA URL update, verify subsequent seal uses new TSA
- [ ] Open `/admin/instance-storage` → verify S3 config readable, test connection passes
- [ ] Open `o/<orgUrl>/settings/branding` → verify Hide Powered By toggle works, plus upstream's new brandingColors/brandingCss
- [ ] Open `o/<orgUrl>/billing` → trial banner shown for new external orgs

### Phase H — Monitoring window (24h)
- Watch Sentry for any new error patterns.
- Watch the Postgres logs for any unexpected query errors (especially around `BizrethinkInstanceSigningConfig`, `BizrethinkInstanceStorageConfig`).
- Manually verify a real signed contract during this window (request user to send a test FRPA).

### Phase I — Cleanup
- Delete sync branches: `git push origin --delete sync/2026-05-04 sync/2026-05-11 sync/2026-05-18 sync/2026-05-25 sync/manual-2026-05-25`
- Verify org toggle is flipped + manual-trigger next Monday workflow run.
- If clean-merge PR opens automatically, the recovery is complete.

---

## 6. Rollback procedures

### Per-batch rollback (during merge resolution, before push)
```
git checkout -- <file>            # discard local changes to file
git reset --hard HEAD~1            # back out the last commit on this branch
```

### Post-merge production rollback (after push to main, after Coolify deploys)
```
git revert <merge-commit> --no-edit
git push origin main
# Coolify auto-deploys the revert within ~5 min.
```

**Specific surface rollbacks** (less destructive than full revert):
- Signing breakage: `git checkout upstream/main -- packages/signing/index.ts packages/signing/helpers/tsa.ts && commit && push`. Reverts to env-only signing; loses hot-swap admin feature.
- Storage breakage: similar checkout of `upload/server-actions.ts`. Reverts to env-only S3.
- Auth.ts breakage: similar checkout of `constants/auth.ts`. Reverts to env-only SSO config.

**Database considerations:** No new Prisma migrations in this merge (verified — no schema files in conflict list). Rollback is safe; no migrate-down needed.

---

## 7. Post-merge follow-up workstreams

Not blocking the merge; track separately:

1. **Overlay 034 obsolescence test** — render real FRPA template both ways, decide DELETE vs KEEP.
2. **Overlay 062 (or extend 035) — re-inject fontStyle into `render-generic-text-field.ts`** post-merge.
3. **Patchify remaining inline modifications** (~30 files marked but not in this merge's conflict list). Background hygiene; restores additive-fork discipline.
4. **Staging environment** — spin up a separate Coolify app pointing at a long-lived `staging` branch so future merges can be validated before production. The "no staging" reality made this merge riskier than it needed to be.
5. **Sentry monitoring on the patched files** — confirm error rates don't spike on the new signing/storage DB-backed paths.

---

## 8. Appendices — full audit reports

### Appendix A — Auth / User / Org / Site-Settings audit (9 files)

(See `agent-output-audit-A.md` or the conversation transcript from 2026-05-25.)

Summary: 9 files audited. Detailed per-file analysis covers constants/auth.ts (HIGH), create-user.ts (M), get-all-users.ts (L), 3 create-organisation files (M each), update-organisation-settings.ts (L), schema.ts (L), upsert-site-setting.ts (M). Cross-file invariants spelled out (4 dependencies between files in this domain).

### Appendix B — Signing / Upload / Sealing / Audit-Log audit (5 files)

(See agent-output-audit-B.md or conversation transcript.)

Summary: 5 files audited. signing/index.ts (M), tsa.ts (M), seal-document.handler.ts (H — central orchestrator), upload/server-actions.ts (M), render-audit-logs.ts (L). Signing chain integrity invariant documented. Most concerning finding: overlay 011 has no patch file and is inline-only.

### Appendix C — Field-meta / Render / Email-template audit (3+7 files)

(See agent-output-audit-C.md or conversation transcript.)

Summary: 3 primary files + 7 email templates audited. field-meta.ts (M), render-generic-text-field.ts (H — fontStyle silently dropped), reset-password.tsx (L). Email templates without inline mods (6 files) safe to `git checkout --theirs`. Critical finding: upstream's overflow system may obsolete overlay 034 but not overlay 035.

---

## 9. Sign-off

This manifest reflects the state of planning as of 2026-05-25, after:
- 1 ground-truth survey agent
- 3 forensic audit agents
- 4 user-confirmed decisions

The actual merge has not yet been executed. Phase 0 prerequisites must complete before Phase A.

Document is mutable until merge ships; update as decisions are made or new findings emerge during execution.
