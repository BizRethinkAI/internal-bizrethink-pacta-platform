# UPSTREAM.md — handling Documenso upstream merges

Runbook for keeping `internal-bizrethink-pacta-platform` in sync with `documenso/documenso` upstream while preserving BizRethink customizations.

## Weekly automated sync (preferred path)

`.github/workflows/upstream-sync.yml` runs every Monday at 04:00 UTC. It:

1. Fetches `documenso/main`
2. Attempts `git merge upstream/main`
3. Pushes a `sync/YYYY-MM-DD` branch — **always**, clean merge or not
4. Writes a **job summary** carrying the compare URL and, on conflicts, the `overlays/` patches that may need re-application

**It does NOT open a pull request.** Token policy prevents it (`upstream-sync.yml:4-9,110-152`), and the conflict step records status rather than committing conflict markers. **Open the PR yourself from the compare URL in the job summary.** A session that only looks for an open weekly PR will conclude the sync never ran.

Review, run the local gates below, merge.

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
   git apply overlays/001-add-bizrethink-claim-tier.patch
   ```
   Check the real filename in [`overlays/README.md`](overlays/README.md) rather than copying the one above — patch names change when their purpose does.
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

If `npm install` fails during `prisma generate` with *"The property 'options.recursive' is no longer supported"*, that is **not** a merge problem. `zod-prisma-types@3.3.5` calls **`fs.rmdirSync(path, {recursive: true})`** (`dist/classes/directoryHelper.js:25`), and recursive `rmdir` no longer works after Node 24. Verified on this machine: **Node 24.20.0 succeeds** (with a `DEP0147` deprecation warning), **Node 26.0.0 throws** that exact message. Node's own documentation dates the removal to **v25**, so 25 and 26 both fail. The Prisma client itself generates fine; only the zod generator's cleanup step fails.

**Run the workstation on Node 24**, which is what [`.node-version`](.node-version) pins and what the Docker image uses (`node:24-alpine3.23`). Note that `engines.node: ">=24.0.0"` still *admits* 25 and 26, so the range does not protect you — check the Node you are actually running.

> **Do NOT work around this by running the install inside a Linux container against this checkout.** See *Never install from a container into this checkout* below. It is the mistake that cost a day on 2026-09-09.

## Never install from a container into this checkout

**This cost a working day on 2026-09-09 and every gate stayed green while it happened.**

Docker on the dev Mac is **Colima** — a linux/aarch64 VM. Its generated Lima config
(`~/.colima/_lima/colima/lima.yaml`) mounts `location: "~"` with `writable: true`,
so the whole home tree, this repo included, is the *same directory* seen from
inside the VM. `mounts: []` in `colima.yaml` does not mean "no shared
directories"; check the generated Lima file, not the user-facing one.

So this, run to verify dependencies in a clean Linux environment:

```bash
docker run -v "$PWD":/app -w /app node:24-alpine3.23 sh -c 'npm install && npm audit'
```

does exactly what it says — and npm, correctly, installs **linux-arm64** optional
dependencies **into the Mac's `node_modules`**. Darwin binaries for esbuild,
Rollup, Biome, Turbo, sharp, bcrypt and skia-canvas are replaced with ELF ones.
Afterwards no local build, test, lint or typecheck can start, with errors that
point at npm bugs and missing packages rather than at what happened.

**Nothing catches it.** CI is Linux, so the same tree is correct there and every
check passes. `git status` is clean because `node_modules` is ignored. The
lockfile is untouched and still lists every Darwin package. The only visible
symptom is on one machine, hours later.

**Instead:**

- Give the container its own copy of the source, or mount the source **read-only**
  so an attempted install fails loudly instead of succeeding quietly.
- Or use a separate checkout / worktree with its own `node_modules` that no Mac
  process uses.
- After any container work that touched a shared path, run the Mac-side check
  below before trusting a local gate.

```bash
# Mac postflight — run from a normal shell, not a container
node -p "process.platform + '/' + process.arch + '  ' + process.execPath"
node -e "require('rollup'); require('esbuild'); require('sharp'); console.log('native ok')"
file node_modules/esbuild/bin/esbuild        # must say Mach-O, never ELF
```

**Recovery, if it happens anyway:** `npm ci` from a normal Mac shell on Node 24,
then `npm run prisma:generate --workspace=@documenso/prisma` — `npm ci` wipes the
generated Prisma client and the typecheck fails with phantom
`'@prisma/client' has no exported member` errors until you regenerate. Do **not**
run `turbo` first, even `turbo --version`: `node_modules/turbo/bin/turbo` sets
`SHOULD_INSTALL=true` and runs its own `npm install` when the platform binary is
missing.

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

## `patches/` — the other thing a sync can silently break

`overlays/` covers upstream FILES. It does not cover upstream DEPENDENCIES, and
those are patched through `patch-package`, applied by `postinstall`:

| Patch | Owner | What breaks without it |
|---|---|---|
| `@react-pdf+layout+5.2.0.patch` | **ours** | Every lease PDF over ~13 pages dies with `unsupported number: -2.2127632876551446e+22` |
| `@radix-ui+react-menu+2.1.24.patch` | upstream | Arrived with the 2026-09-07 sync; upstream's, not ours |

**Only the first row is fork work.** `@ai-sdk+google-vertex+3.0.81.patch` used to
sit in this table and was never ours either: upstream added it in #2271 and
deleted it in #3225 when they bumped the package to 5.0.48, so the 2026-09-07
sync removed it. Read a `patches/` entry's provenance before defending it —
`git log --diff-filter=A -- patches/<name>` says who introduced it.

**The filename pins an exact version.** If a sync bumps `@react-pdf/layout` past
5.2.0, `patch-package` will not apply a 5.2.0 patch to 5.3.0 — and the failure
is not a red build. It is a lease that renders fine at 12 pages and throws at
14, in whichever document happens to be longest.

**So: after any sync that touches `package-lock.json`, check `npx patch-package`
output for a patch that did not apply.** Then run
`packages/bizrethink/regression-tests/react-pdf-lineheight-compounding.test.ts`,
which renders a document three times the length of the real lease and fails with
the exact crash when the patch is missing.

**If that test goes red, do not "fix" it by shortening a document.** The bug is
that `lineHeight` is re-resolved once per page and grows as
`fontSize ^ pageCount` until it passes pdfkit's 1e21 ceiling — the variable is
PAGE COUNT, not content. Hours went into clause length and an orphan-control
character threshold before that was noticed. Upstream bug, current in 4.9.0:
https://github.com/diegomura/react-pdf/issues/3277

Re-generate a patch with `npx patch-package <pkg>` after applying the same edit
to the new version in `node_modules`, and rename the file to the new version.

## Pre-merge gates (REQUIRED before merging any upstream-sync PR)

These run on every PR via `.github/workflows/ci.yml` (`Build App` + `Build Docker Image` jobs). **Do not merge until both are green.** `main` is protected by the **ruleset `protect-main`** (id `16850885`, enforcement `active`), not by classic branch protection.

**The classic endpoint returns a false negative.** `gh api repos/.../branches/main/protection` answers `Branch not protected` (HTTP 404) *even though main is protected* — classic protection is genuinely off and the ruleset does the work. Verify with the rulesets endpoint instead:

```bash
gh api repos/BizRethinkAI/internal-bizrethink-pacta-platform/rulesets
gh api repos/BizRethinkAI/internal-bizrethink-pacta-platform/rulesets/16850885
```

Its four required checks are **Build App**, **Build Docker Image**, **E2E Tests** and **Validate PR title**. A pull request is required; approvals required: **0**. Governance, PR description, npm audit and CodeQL run on every PR but are **not** required statuses — a red one does not block merge.

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
npm run test:e2e -w @documenso/app-tests   # Playwright regression gate (HARD RULE: never skip)

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
