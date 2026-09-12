---
name: review-and-ship
description: "Independently review a repository's PR queue, diagnose failures and coordinate author fixes, merge PRs that pass the repo's gates, then request one Coolify deploy per selected app. Use for review-and-ship requests across BizRethink and Lombard repos; adapt to each repo's rules and stack. Review-only requests do not authorize shipping."
---

# Review and ship

Independently review the agreed PR queue, land it through GitHub, then request
one deployment of the final reviewed default-branch revision for each selected
Coolify application. Monitor long-running CI in the background and resume the
queue automatically when it reaches a terminal result.

## Scope and authority

- Default to the **current Git repository**, not every repository in its parent
  folder or organization. `~/github/bizrethink/` contains BizRethinkAI repos;
  `~/github/lombard/` contains lombardpay repos, with some projects nested more
  deeply. Verify the actual remote, repository root and default branch. Do not
  assume a grouping directory is a repo. Process multiple repos only when the
  user explicitly selects them or requests that broader scope, and preserve
  each repo's session-ownership rules. A request covering several Lombard repos
  normally requires separate owning sessions; generic scope does not waive that.
- Freeze the initial queue of all open PRs, including pagination, or the user's
  requested subset. Later arrivals do not silently join it. For multiple repos,
  maintain separate queues, rules and app mappings; one deploy means **one per
  selected app**, not one API request capable of deploying unrelated apps.
- An explicit request to run this review-and-ship workflow authorizes ordinary
  coordination, mechanical preparation, conditional merges and one final
  deployment per selected app. Preserve that permission across pauses; do not
  ask again for each clean PR. Reading/auto-selecting the skill does not grant
  authority. Review-only requests produce a review without merges or deploys.
- Start in a fresh session launched by the human. Never certify or merge a PR
  whose substantive implementation this session authored, including before
  compaction. An implementer-framed subagent is not an independent review.
  Read requirements and source before treating the PR author's explanation as
  evidence. Explicit owner delegation to this independent session permits the
  merge step where repo instructions otherwise leave it to a human; preserve
  the ban on implementers merging their own work.
- Review every selected PR, but ship only after all have cleared their gates.
  Do not silently skip a failing, held or draft PR and deploy a partial queue.
  Continue useful review/preparation, then pause for resolution or the owner's
  explicit queue exclusion. Do not infer new product/security decisions.

## Discover this repo's contract

Identify the repo, then load the applicable profile before the general reads:

- `BizRethinkAI/internal-bizrethink-pacta-platform`: read
  [the Pacta profile](references/pacta.md), preserving its incident reading order.
- Repos under `~/github/lombard/` or owned by `lombardpay`: read
  [the Lombard profile](references/lombard.md), starting with the owned repo's
  `docs/STATE.md` and preserving its session boundaries.
- Other repos: follow their parent and repo instructions without importing a
  different project's profile.

Respect any specified reading order while gathering parent and repo
`AGENTS.md`/`CLAUDE.md`, relevant engineering standards, state/in-flight notes,
PR template, workflow files, deployment instructions, runtime pins,
package-manager lockfiles and branch rules. Use each repo's own
commands and gates. Do not impose npm, Node 24, Vitest, a `main` branch, overlays,
Prisma, an in-flight-note convention or a particular merge strategy everywhere.
Resolve stale prose against current code/configuration and explain discrepancies.

Where GitHub task coordination is adopted, read the repo's session workflow
and separate task issues/comments before assigning work or folding notes. The
appointed coordinator owns assignments; a ship request does not replace that
coordinator. Append findings and receipts to the selected task records within
authorized scope. A shared GitHub account is not a session identity. Comments
do not wake a separately launched session; retain explicit handoff/relay rules.

Follow each project's special review requirements for money, legal text, auth,
migrations or upstream synchronization. A narrow review must not silently
certify a specialist change whose required evidence is missing.

Fetch current default-branch and PR refs, recording full SHAs, actual PR bases,
dependencies, authors/sessions, labels, reviews and checks. Read the complete
diff and relevant callers. When a local check or branch preparation is justified,
use an isolated worktree outside shared checkouts and install only what that work
requires. Do not install dependencies merely to duplicate passing CI. Never
symlink dependency directories, import production env files, disturb another
session's worktree, or run a local build forbidden by that repo.

Locate/read the available **creds** skill before credential access and follow
its mechanism without printing secrets. Discover actual Coolify MCP tools and
map each app by repo, branch and environment. No Coolify app is a valid result
for docs, iOS, infrastructure or retired projects: report deployment not
applicable; do not create/revive an app or invent another deploy mechanism.
If production/staging or multiple app matches remain ambiguous, finish reviews
and ask which targets to use before deploying.

For selected Coolify apps, verify auto-deploy is **off before the first merge**.
If on/unknown, prepare the queue but pause merging until the owner resolves it;
do not silently change production settings or cause a deploy per PR. Confirm
required credentials/tools are available before promising to ship.

Coordinate branch updates, merges and state-note ownership with the authoring
sessions using available peer messaging. Send actual findings/fix requests, not
just a status label. If messaging is unavailable, prepare the relay text and
say so; obtain owner coordination before changing another session's branch.
Do not claim notification occurred when it did not.

## Independent review and failure ownership

Verify behavior, removed functionality and relevant integrations against the
actual code. For security changes, trace reachable entry points, authorization
and tenant scope, configuration/failure behavior and persistence. For migrations,
money, legal text or signing, follow the repo's specific review requirements.
Check tests for real wiring, realistic fixtures, meaningful failure assertions,
and mocks that could hide the defect. Verify TDD evidence where required.

Treat completed GitHub CI on the exact unchanged revision as the default
validation evidence. Do not install dependencies or rerun tests, type checks or
builds locally merely to duplicate passing CI. Run a targeted local check only
to resolve a specific review uncertainty, reproduce a suspected defect,
diagnose a CI failure, or cover relevant behavior absent from CI. State the
concrete reason before starting expensive local validation. After a head or
integration change, obtain fresh CI on that revision unless one of those local
exceptions applies. Never weaken assertions, add `.only`/skip/xfail, alter CI
to hide a failure, or call a cancelled job a pass. Report applicable curated
skips, flakes and limitations.

| Situation | Responsibility |
|---|---|
| CI failure or review finding | Reviewer diagnoses logs/source and supplies impact, reproduction, affected files and expected behavior/checks. |
| Mechanical branch refresh or verified stale-note cleanup | Reviewer may prepare it during an authorized ship run, after coordination; inspect the resulting diff and obtain updated checks. |
| App code, tests, auth/security, schema, overlays, legal text or money fix | Send to the creating session for implementation and required TDD. Independently review its new revision afterward. |
| Reviewer authors a substantive fix, or author is unavailable | Hand off roles explicitly; that fix requires another fresh independent reviewer before merge. Never approve your own correction. |

Classify findings by impact, not by whether GitHub labels the check required.
Distinguish a code defect, integration/state issue, infrastructure failure and
genuine flaky test from evidence. Retry only after a relevant change or a
demonstrated transient failure; do not repeatedly rerun an unchanged failure.

Where a repo uses state-note folding, exactly one PR owns each fold. Follow its
current gate placement: with batch consolidation, author PRs retain their own
notes and the final shipping dependency is one pure consolidation PR. Assign
that PR to another author, or hand your own consolidation to a different
reviewer/merger. Never merge your own cleanup PR. Require the repo's state
readiness gate on the exact final default-branch revision before deployment.
Compare latest default-branch state and all open PRs before edits. Synthesize durable
content, delete the stale note and check for lost/duplicated claims. A merged
cleanup PR can introduce its own stale note. A clean union merge is not proof
of a correct document. Do not add this convention to repos that lack it.

## Land, pause and deploy

Follow [the execution reference](references/execution.md) for the resume ledger,
merge verification and deployment receipt. These are actual operations only
when the user has requested shipping, never while creating/testing this skill.

- **Watch CI in the background at a history-based cadence.** After all known
  preparation is combined and pushed once, inspect a small sample of recent
  completed runs for the same repository/workflow and account for the current
  run's elapsed time. Choose a conservative interval from observed duration;
  as a practical guide, use roughly one fifth of the median duration, clamped
  to 60–300 seconds. Jobs that usually take 5–15 minutes should normally use
  about 120 seconds, not 30. Start one watcher for the exact PR head (for
  example, `gh pr checks --watch --interval 120`) and continue useful work while
  it runs. Avoid surfacing repeated unchanged snapshots; report state changes
  and the terminal result. When CI is the only dependency, wait on the watcher
  in tool-supported intervals and resume the merge queue automatically when it
  exits. Do not require the owner to report completion. Afterward, read final
  checks once and confirm the head is unchanged before merging. Diagnose a
  failure once; retry only after a relevant change or demonstrated transient
  failure. Never create overlapping watchers for the same head or rapid custom
  polling loops.
- Merge sequentially in dependency order into the verified default branch.
  Recheck `baseRefName`; merging into an already-landed feature branch may not
  reach the default branch. Reassess remaining PRs after each merge. Never push
  directly to the default branch, bypass rules, force-push another session's
  branch, or enable unattended auto-merge.
- All applicable checks and required reviews must pass on the final reviewed
  revision, including repo governance/security checks that are not enforced
  by branch protection. Pending/missing expected checks and unexplained skips
  block. If a repo has no CI, disclose that fact and apply its documented
  validation contract; never fabricate CI success or waive a CI requirement.
- After the full agreed queue lands and the final default-branch checks pass,
  request **one non-forced, non-waiting Coolify MCP deployment per selected app**.
  Record each attempt before sending. No automatic retry after an uncertain
  response. **Never watch the deployment**, poll its logs/status, run production
  tests or claim the requested revision is verified live.

Report each PR's reviewed SHA, verdict, checks, merge SHA or blocker, and fix
owner. Include final default-branch SHA, ledger path and deploy receipt or
uncertainty. Explain permission-related pauses using the actual rule/tool
restriction. Use concise ordinary chat for owner questions.
