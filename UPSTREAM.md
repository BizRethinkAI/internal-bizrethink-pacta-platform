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

Resolve conflicts. **Conflicts only happen in two places** (by design):

1. **`packages/bizrethink/`** — our own files. Conflicts here mean we put a file in the same path as a new upstream file. Rename ours, accept upstream.
2. **Files patched by `overlays/*.patch`** — upstream changed a file we patch. Re-apply the patch:
   ```bash
   git apply overlays/001-default-claim-enterprise.patch
   ```
   If the patch fails (line numbers drifted), edit it: re-run `diff` against the new upstream content, regenerate the patch.

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

## How to verify a sync didn't break BizRethink features

After every merge, run:

```bash
pnpm install
pnpm build
pnpm test
# spike-deploy to a test Coolify env
# manually test: create org, create team, issue API token, send a test contract, sign it
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
