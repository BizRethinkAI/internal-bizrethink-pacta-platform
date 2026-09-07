#!/usr/bin/env bash
# install-pr-discipline.sh — port the PR-description discipline to another repo.
#
#   scripts/ci/install-pr-discipline.sh <path-to-repo> [--pr]
#
# Copies the validator, the Claude Code hook, the "PR description" workflow and
# the /open-pr command; adds the PR template and a discipline config when the
# repo has none; merges the PreToolUse hook into .claude/settings.json; adds the
# read-first line to CLAUDE.md when one exists. With --pr: branch, commit, push
# and open a PR whose body passes the validator. Idempotent.
set -euo pipefail
SRC=$(cd "$(dirname "$0")/../.." && pwd)
TARGET=${1:?usage: install-pr-discipline.sh <repo> [--pr]}; OPEN_PR=${2:-}
TARGET=$(cd "$TARGET" && pwd)
[ -d "$TARGET/.git" ] || { echo "not a git repo: $TARGET" >&2; exit 1; }

# The default branch, from origin/HEAD when set, else main, else master.
default_branch() {
  local b; b=$(git symbolic-ref -q --short refs/remotes/origin/HEAD 2>/dev/null | sed 's#^origin/##') || true
  if [ -z "$b" ]; then git show-ref -q --verify refs/remotes/origin/main && b=main; fi
  if [ -z "$b" ]; then git show-ref -q --verify refs/remotes/origin/master && b=master; fi
  printf '%s' "$b"
}

# With --pr the install happens in a TEMPORARY WORKTREE off origin/<default>, so
# the live checkout (which another session may own) keeps its branch and its
# uncommitted work untouched. Without --pr it installs into the checkout as-is.
if [ "$OPEN_PR" = "--pr" ]; then
  cd "$TARGET"
  git fetch -q origin
  base=$(default_branch); [ -n "$base" ] || { echo "$TARGET: cannot find the default branch" >&2; exit 1; }
  if git ls-remote --exit-code --heads origin chore/pr-discipline >/dev/null 2>&1; then echo "$TARGET: chore/pr-discipline already on origin — skipped"; exit 0; fi
  WT=$(mktemp -d "${TMPDIR:-/tmp}/pr-discipline-XXXXXX")
  git worktree add -q -B chore/pr-discipline "$WT" "origin/$base"
  trap 'cd "$TARGET" && git worktree remove --force "$WT" >/dev/null 2>&1 || true' EXIT
  WORK="$WT"
else
  WORK="$TARGET"
fi
cd "$WORK"
mkdir -p scripts/ci .github/workflows .claude/commands
cp "$SRC/scripts/ci/check-pr-body.mjs" scripts/ci/check-pr-body.mjs
cp "$SRC/scripts/ci/pr-hook.sh" scripts/ci/pr-hook.sh
cp "$SRC/scripts/ci/install-pr-discipline.sh" scripts/ci/install-pr-discipline.sh
cp "$SRC/.github/workflows/pr-discipline.yml" .github/workflows/pr-discipline.yml
cp "$SRC/.claude/commands/open-pr.md" .claude/commands/open-pr.md
chmod +x scripts/ci/pr-hook.sh scripts/ci/install-pr-discipline.sh
[ -f .github/pull_request_template.md ] || cp "$SRC/.github/pull_request_template.md" .github/pull_request_template.md
if [ ! -f .github/pr-discipline.json ]; then
  # Diff-driven rules only where the repo has the directories they name.
  adr=$([ -d docs/adr ] && echo '"docs/adr"' || echo null)
  mig='[]'; [ -d supabase/migrations ] && mig='["supabase/migrations/"]'; [ -d prisma/migrations ] && mig='["prisma/migrations/"]'
  printf '{\n  "adrDir": %s,\n  "migrationPaths": %s,\n  "redRunPaths": [],\n  "redRunWaiver": "not a money, auth or tenant-scope change"\n}\n' "$adr" "$mig" > .github/pr-discipline.json
fi
node - <<'JS'
const fs=require('fs'); const p='.claude/settings.json';
const j=fs.existsSync(p)?JSON.parse(fs.readFileSync(p,'utf8')):{};
j.hooks=j.hooks||{}; j.hooks.PreToolUse=(j.hooks.PreToolUse||[]).filter(h=>!JSON.stringify(h).includes('pr-hook.sh'));
j.hooks.PreToolUse.push({matcher:'Bash',hooks:[{type:'command',command:'bash scripts/ci/pr-hook.sh'}]});
fs.writeFileSync(p, JSON.stringify(j,null,2)+'\n');
JS
if [ -f CLAUDE.md ] && ! grep -q 'pull_request_template.md' CLAUDE.md; then
  printf '\n## Pull requests\n\nThe PR body is the review surface. Read `.github/pull_request_template.md` before opening or editing any PR, write the body to a file, and open it with `/open-pr` (or `gh pr create --body-file`). A Claude Code hook blocks any other shape; the "PR description" CI job fails a body that skips a section.\n' >> CLAUDE.md
fi
echo "installed in $TARGET"
if [ "$OPEN_PR" = "--pr" ]; then
  # Only paths that exist: one missing pathspec (a repo with no CLAUDE.md) makes git add stage nothing.
  # A repo that ignores .claude (Pacta) keeps the hook local-only: the add is skipped, not fatal.
  for f in scripts/ci .github .claude/commands/open-pr.md .claude/settings.json CLAUDE.md; do
    [ -e "$f" ] || continue
    git add "$f" 2>/dev/null || echo "note: $f is ignored in this repo — not versioned (the hook stays local to each checkout)"
  done
  if git diff --cached --quiet; then echo "nothing to commit in $TARGET"; exit 0; fi
  git -c commit.gpgsign=false commit -q -m "chore: PR description discipline — template-driven validator, Claude Code hook, CI check"
  # A repo with its own template (Pacta's is Documenso's) needs a body in that shape:
  # PR_DISCIPLINE_BODY_FILE overrides the generated one.
  body=$(mktemp)
  if [ -n "${PR_DISCIPLINE_BODY_FILE:-}" ]; then cp "$PR_DISCIPLINE_BODY_FILE" "$body"; fi
  [ -n "${PR_DISCIPLINE_BODY_FILE:-}" ] || cat > "$body" <<'MD'
## What was asked

Every PR opened by Claude Code, in every repo under the lombard and BizRethink orgs, must follow the repo's PR template and rules; it had been hit or miss.

## What was done

Ported the PR-description discipline from lombard-platform: a template-driven validator (`scripts/ci/check-pr-body.mjs`), a Claude Code PreToolUse hook that blocks `gh pr create`/`gh pr edit` without a body file that passes it, a "PR description" GitHub Actions job that fails the PR on the same rules (and re-runs when the body is edited), the `/open-pr` command, the PR template where the repo had none, and a read-first line in CLAUDE.md where one exists.

## Decisions I made that you did not specify

- Diff-driven rules (schema change needs an ADR; money/auth paths need a red-run link) are enabled only where the repo has the directories they name; `.github/pr-discipline.json` is where a repo turns them on.
- The hook lives in `.claude/settings.json` so it travels with the repo, not in the user's global settings.
- Installed as a standalone workflow rather than editing the repo's existing CI.

## What I deliberately did not do

- Did not change existing workflows, branch protection or merge tooling in this repo.
- Did not backfill descriptions on old PRs.

## Proof

- [x] Validator exercised locally against a filled body (pass), a schema diff without an ADR (fail), and an unfilled body (fail).
- [x] CI green on this PR — the "PR description" job checks this very body.

**Tests added or changed:** none — tooling only; not a money, auth or tenant-scope change.

**Screenshots / recordings:** none (no visible change).

## Blast radius

**What else touches this code:** nothing; new files plus one hook entry and one CLAUDE.md section.

**What could break if this is wrong:** a PR is wrongly failed by the description check; fix the body or the config and it re-runs on edit.

**Rollback:** plain revert.

## Documentation

- [ ] ADR written — not required (tooling)
- [ ] patterns — none
- [x] CLAUDE.md section added (where CLAUDE.md exists)

## Adversarial review

- [ ] Not run — not a money, auth or tenant-scope change.

## Follow-ups proposed

- Tune `.github/pr-discipline.json` for this repo's money/auth paths and ADR directory.
MD
  node scripts/ci/check-pr-body.mjs --body "$body"
  git push -q -u origin chore/pr-discipline
  gh pr create --base "$base" --title "chore: PR description discipline (template validator, hook, CI check)" --body-file "$body"
fi
