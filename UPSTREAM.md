# UPSTREAM.md — handling Documenso upstream merges

Runbook for keeping `internal-bizrethink-pacta-platform` in sync with `documenso/documenso` upstream while preserving BizRethink customizations.

## Weekly automated sync (preferred path)

`.github/workflows/upstream-sync.yml` runs every Monday at 04:00 UTC. It:

1. Fetches `documenso/main`
2. Attempts `git merge upstream/main`
3. **If clean merge:** opens a PR titled `chore(upstream-sync): YYYY-MM-DD` with the upstream diff
4. **If conflicts:** opens a PR with conflict markers + a list of which `overlays/` patches need re-application

Review the PR, run smoke tests, merge.

## Manual sync (when the action fails)

```bash
cd ~/github/bizrethink/internal-bizrethink-pacta-platform
git fetch upstream
git checkout -b sync/$(date +%Y-%m-%d)
git merge upstream/main
```

Resolve conflicts. **Conflicts only happen in three places** (by design):

1. **`packages/bizrethink/`** — our own files. Conflicts here mean we put a file in the same path as a new upstream file. Rename ours, accept upstream.
2. **Files patched by `overlays/*.patch`** — upstream changed a file we patch. Re-apply the patch:
   ```bash
   git apply overlays/001-default-claim-enterprise.patch
   ```
   If the patch fails (line numbers drifted), edit it: re-run `diff` against the new upstream content, regenerate the patch.
3. **`package-lock.json`** — see below. Never hand-merge it.

### Resolving a `package-lock.json` conflict

`packages/bizrethink/package.json` declares its own dependencies (`@react-pdf/renderer`, `@noble/ciphers`, …), and npm workspaces record every one of them — plus their transitive tree — in the **root** `package-lock.json`. That file is upstream's. So any upstream sync that also changes dependencies conflicts there, and it is the one conflict that is neither in our directory nor covered by an overlay.

**Never resolve it by hand.** A lockfile is generated state, and a hand-merged one can pin a dependency to a tree npm would never produce — the failure shows up as an install or build error days later, not as a merge conflict.

```bash
# Take upstream's lockfile wholesale, then let npm re-add our workspace deps.
git checkout --theirs package-lock.json
npm install                      # rewrites the lock from every package.json
git add package-lock.json
```

Then confirm nothing was silently dropped or newly flagged:

```bash
# Our workspace deps must still resolve
npm ls @react-pdf/renderer --workspace=@bizrethink/customizations

# The security.yml CI gate blocks on high+; make sure the merge didn't add any
npm audit --omit=dev --audit-level=high
```

If `npm install` fails during `prisma generate` with *"The property 'options.recursive' is no longer supported"*, that is **not** a merge problem: `zod-prisma-types` calls `fs.rm` with an option Node 26 removed. The Prisma client itself generates fine and only the zod generator's cleanup step fails. Run the workstation on Node 22 (the Docker image already does) or pin the generator, and treat the lockfile conflict as resolved.

## Adding a new overlay patch

1. Make the change directly in the upstream file (this is the only time you edit upstream)
2. Generate a patch with explanatory header:
   ```bash
   git diff packages/lib/example-file.ts > overlays/00X-short-description.patch
   ```
3. Add a YAML-frontmatter-style header at the top of the patch:
   ```
   # Why: <one-sentence rationale>
   # Why-not-additive: <why this couldn't be a new file in packages/bizrethink/>
   # Upstream-merge-fragility: low | medium | high
   ```
4. Commit both the patch file AND the modified upstream file (yes, both — the patch documents intent, the file is what runs)
5. Update `overlays/README.md` index

## When to break the rules

You may modify an upstream file directly (no overlay) ONLY if:

- The change is single-byte (e.g., changing a default value)
- AND it's in a file that almost never changes upstream (config defaults, constants files)
- AND there's a comment in the file: `// MODIFIED for BizRethink (see UPSTREAM.md exceptions): <reason>`

Document each exception in `overlays/EXCEPTIONS.md` so they don't get lost.

## Pre-merge gates (REQUIRED before merging any upstream-sync PR)

These run on every PR via `.github/workflows/ci.yml` (`Build App` + `Build Docker Image` jobs). **Do not merge until both are green.** Branch protection on `main` *should* enforce this — verify with `gh api repos/BizRethinkAI/internal-bizrethink-pacta-platform/branches/main/protection` (returns `Branch not protected` if disabled).

### Why this section exists

PR #1 (the 2026-05-25 merge) was merged while `Build App` was red. Coolify rebuilt from `main`, hit the same `tsc` errors CI had already flagged, and the deploy failed. Two enforcement layers — branch protection + this runbook — keep that from happening again.

### Local pre-merge build gate (do this before pushing the merge commit)

```bash
# 1. Regenerate Prisma + zod (overlays/schema may have changed)
npm run prisma:generate --workspace=@documenso/prisma

# 2. Full app build — this is what CI and Coolify run
npm run build --workspace=@documenso/remix

# 3. Bizrethink customizations test suite
npm test --workspace=@bizrethink/customizations

# 4. (Optional but recommended) Full monorepo build, mirrors CI exactly
npm run build -- --filter=!@documenso/docs
```

If any of the above fails, **resolve before pushing**. CI will catch it anyway, but local feedback is 2 minutes vs 4 minutes of CI queue time. More importantly, fixing locally means you push one clean commit instead of a cascade of "fix typecheck" follow-ups.

### Common failure modes (post-merge typecheck)

The take-ours / take-theirs conflict strategy resolves files in isolation, but TypeScript needs symbols to line up *across* files. After every merge, expect one or more of:

1. **Upstream added a new symbol our overlay calls a different name for** — extend our overlay to alias or accept both shapes (see `onCreateUserHook` overlay 048 for the 1-arg → 2-arg fix pattern)
2. **Upstream added a new symbol our overlay never picks up** — copy upstream's new exports into our overlay-modified file, keeping our additions next to them (see `field-meta.ts` overflow system addition)
3. **Upstream deleted a file our overlay imports from** — switch to upstream's replacement pattern (see `seal-document.handler.ts` `sendCompletedEmail` → `jobs.triggerJob` migration)
4. **Upstream rewrote a UI component our overlay customized** — take upstream's new version as base, re-apply our overlay's additions on top (see `branding-preferences-form.tsx` overlay 025 re-application)
5. **Upstream extended a TRPC response schema that our UI still reads** — restore the dropped fields on the response (see `get-organisation-authentication-portal` `allowPersonalOrganisations` restoration)

### Full post-merge smoke (after the merge lands on `main` + Coolify deploys)

```bash
# All of these should be green:
npm test --workspace=@bizrethink/customizations
npm test --workspace=@documenso/lib
npm run test:e2e:dev    # Playwright regression gate (HARD RULE: never skip)

# Manual: log into sign.pacta.ink, send a test contract, sign it, verify webhook fires
```

If any of those fail and were working before the merge, the upstream change broke us. Either:

- **Patch upstream's change:** add a new overlay patching the broken behavior back
- **Update our adapter:** change `packages/bizrethink/` code to fit the new upstream contract
- **Revert the merge:** `git reset --hard HEAD~1` and wait for upstream to fix

## Cadence + version pinning

- Sync attempted weekly (Mondays, 04:00 UTC)
- We do NOT pin to a specific upstream version; we follow `main`
- If upstream ships a major refactor (e.g., Remix → Next.js), we pause the auto-sync, evaluate manually, and decide whether to follow or pin to a known-good commit

## Rollback

If a merge breaks production:

```bash
git revert <merge-commit>
git push origin main
# Coolify auto-deploys the revert
```

Document the upstream commit that broke us, file an upstream issue if appropriate, and re-attempt the sync once upstream fixes.
