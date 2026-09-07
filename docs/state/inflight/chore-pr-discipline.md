# chore/pr-discipline

Ported from lombard-platform (owner's instruction, 2026-09-07): `scripts/ci/check-pr-body.mjs`
(template-driven PR-body validator), `.github/workflows/pr-discipline.yml` ("PR description"
check, re-runs on body edits), `.github/pr-discipline.json`, `scripts/ci/install-pr-discipline.sh`,
and a "Pull requests" section in CLAUDE.md. This repo ignores `.claude`, so the Claude Code
PreToolUse hook and the `/open-pr` command are not versioned here; add the hook to a local
`.claude/settings.json` by hand. The validator judges the body only and does not overlap
governance.yml's "State recorded for this PR". Diff-driven rules are off until
`.github/pr-discipline.json` names directories. PR #122.
