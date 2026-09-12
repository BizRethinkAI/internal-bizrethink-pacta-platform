# Efficient development policy

Owner assignment: Shwet approved the solo-development recommendations in this
session on 2026-09-12, with the explicit requirement that the shared standard be
tool- and model-agnostic. This session owns only that documentation change.

Branch: `docs/efficient-development`. Isolated worktree:
`/private/tmp/pacta-efficient-development`. Created from merged main `42394e5f3`,
then advanced to coordination PR #182 at `4baa569fa1dd439a4a1e1e5970f4acac62dfa82b`.
This PR targets `chore/session-task-coordination` and depends on #182. That keeps
its policy diff separate from the other author's startup/state changes and
avoids duplicating the inherited #179 fold. Merge #182 first; then verify this
PR targets current main and receives the applicable checks before merging it.

## Recorded policy

- Preserve thorough initial reading and detailed, source-linked handoffs; reuse
  unchanged context and avoid copying large logs or evidence repeatedly.
- Keep one bounded, coherent PR, including its related tests and documentation.
- Preserve meaningful TDD for behavioral work. Run focused tests covering the
  changed behavior and affected dependencies; broaden for a specific risk,
  uncertainty or recurring failure. Do not invent behavioral tests for prose.
- CI supplies the broad final checks and separate typecheck. Preserve cheap
  local diff/format checks and focused tests without a duplicate full local run.
- Keep before/after Playwright for user flows, with a documented valid CI
  baseline and current PR CI. Additional manual inspection follows actual
  rendering, interaction or access concerns. Text is not automatically low risk.
- Keep one fresh, human-started independent review for the existing sensitive
  surfaces. Substantive revisions return to the reviewer; implementation helpers
  never substitute for that review. Implementers leave their PRs unmerged.
- Match model capability to risk; use one lead and optional authorized, bounded
  delegation only where the expected benefit covers its overhead. All agents
  retain the same safeguards. No provider names, model versions, prices or
  provider configuration are added to the shared policy.
- State the current advisory dependency-audit limitation and require a disposition
  for newly introduced, unaccepted findings on dependency/security changes.
  Automated blocking of new findings is explicitly separate work.

## Validation and limits

Only `docs/engineering-standard.md` and this PR's own note change relative to
#182. No application code, test assertions, CI workflow, package, configuration,
upstream overlay, STATE narrative or another PR's note is edited.

Local validation covers the diff, documentation links, model-neutral wording
and the complete PR description. This prose-only change needs no application
dependency installation, local build, unit-test run or browser sweep. Existing
CI decides its applicable checks and exemptions; none are changed here. The PR
description and current-head checks record the final CI verdict without a
status-only Git push.

No model configuration was changed or helper started. Future sessions must read
the merged standard; active sessions need an owner relay or explicit reread.
The coordination rollout and task assignment records remain with #182's owner
and Shwet. This user-assigned task predates activation of that rollout and does
not claim task #181 or appoint another coordinator. No merge or deploy occurs
in this author session.
