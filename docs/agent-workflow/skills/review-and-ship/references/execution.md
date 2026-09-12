# Queue execution and resume record

Use installed GitHub tools or the GitHub CLI and inspect current repo rules.
The examples below are not permission to mutate anything on their own.

## Ledger

Create a unique directory under `/private/tmp/review-and-ship/` and keep `run.md`
outside worktrees. Report its path so the owner can resume in the same session
or explicitly hand it off. Record:

- Selected repos and their default branches; agreed PR queues/exclusions;
  owner authorization for coordination, merging and deployment; phase/run ID.
- Repo-owning sessions and cross-repo handoffs where one-session/one-repo rules
  apply; do not use a shared ledger to bypass those boundaries.
- Per PR: authoring session, fetched/reviewed head, tested base/integration SHA,
  verdict/open findings, checks and links, state-fold owner, merge strategy/SHA.
- Final consolidation: owner, branch/PR, covered merge SHAs, reviewed head,
  checks and merge SHA, or a verified no-op/not-applicable reason. Record phase
  `awaiting_owner_merge` when handing your own ready PR to Shwet.
- Per app: verified repo/branch/environment, auto-deploy setting, intended
  final default-branch SHA, `deploy_attempted: false`, request time and receipt.

On resume read the same ledger and fresh remote facts. A merged PR is not merged
again. If an app's `deploy_attempted` is true, do not send a second request.
If the record is lost and a request may have been sent, disclose uncertainty
and obtain owner reconciliation; never create a new run just to retry. An empty
queue is not a reason to redeploy. Keep each repo/app distinct in multi-repo runs.

## Inspect and prepare

Representative read-only commands; substitute verified values and quote them:

```sh
gh repo view --json nameWithOwner,defaultBranchRef
gh pr view "$PR_NUMBER" --repo "$REVIEW_REPO" --json number,baseRefName,headRefName,headRefOid,isDraft,labels,mergeable,mergeStateStatus,statusCheckRollup,reviews
gh pr checks "$PR_NUMBER" --repo "$REVIEW_REPO"
gh run view "$RUN_ID" --repo "$REVIEW_REPO" --job "$JOB_ID" --log-failed
```

Read review threads separately if omitted. Match checks to the actual tested
revision and use the latest applicable run for each check. Old green runs do
not validate a new head/base. Check docs-only skips against the actual diff.
Before monitoring a long-running check, inspect a few recent completed runs of
that workflow and derive a 60–300 second cadence from their duration. Use about
one fifth of the median; a workflow that normally takes 5–15 minutes generally
warrants a 120-second interval. Do not emit unchanged snapshots to the owner.

For branch updates, coordinate ownership, use an isolated worktree, merge the
current default branch and push normally. Never rewrite someone else's history
or clobber concurrent commits. Resolve only genuinely mechanical conflicts;
semantic/code conflicts go to the author. Inspect union merges as content.
Prepare known branch/state/description fixes before pushing once. Do not keep
restarting CI as other sessions work. Respect repo PR-description requirements.

## Merge

Before each merge verify current remote state:

1. Selected PR; shipping authorized; independent reviewer; not draft/held.
2. Actual target is the default branch, dependencies have landed there, and
   relevant current base changes are included in the reviewed integration.
3. Head equals the reviewed SHA; all applicable checks and required reviews
   passed for the intended combination; blocking findings/threads resolved.
   Revalidate if head or base changed. Do not infer pass from `mergeable` alone.
4. Required session coordination is complete; any migration/deployment
   prerequisites in the repo's runbook have explicit ownership and clearance.

Use the repo's allowed, established merge strategy. Preserve merge commits for
upstream/fork syncs; do not assume every repo allows or prefers the same method.
Pin the reviewed head. Example when merge commits are appropriate:

```sh
gh pr merge "$PR_NUMBER" --repo "$REVIEW_REPO" --merge --match-head-commit "$REVIEWED_HEAD_SHA"
```

Do not add `--admin`, `--auto` or `--delete-branch`. The SHA option protects the
head, not concurrent base changes; respect up-to-date/merge-queue rules and
recheck the current base. Do not alter branch protection. If queued rather than
merged, record that state and monitor its CI in the background. Resume merge
verification automatically when the watcher reaches a terminal result.

A fresh session may use the PR author's GitHub account. Do not fabricate a
second identity or approval if GitHub forbids self-approval; publish permitted
review evidence and satisfy actual review rules.

After merging, fetch the default branch. Verify the recorded merge commit is
reachable there and the intended changes landed. With a merge commit, verify
the reviewed head is an ancestor too. With squash/rebase, verify the integrated
diff/changed-file content instead of expecting preserved head ancestry. A PR's
`MERGED` status alone is insufficient. Reassess dependencies/state notes before
the next PR; a new push requires checks on that revised integration.

## Final state consolidation where the repo requires it

Final consolidation is part of every shipping batch in a repo that uses this
convention, including a batch with one implementation PR. Reserve that final
dependency in the ledger when selecting the queue; it need not have a PR yet.
The shipping session is its default author without another owner instruction.

1. After the implementation queue merges, fetch the latest default branch and
   verify the landed changes. Read settled state, all merged notes, open PRs and
   task records. Reuse the batch's existing consolidation PR/assignment; an
   explicitly assigned different author retains ownership until the coordinator
   records a handoff. Do not create a competing cleanup PR.
2. Prepare the consolidation in your own isolated worktree under the repo's
   branch/file rules. Synthesize current facts, correct stale or duplicated
   claims, preserve unresolved limitations, and delete processed merged notes.
   Verify source evidence; do not turn an author's claim into verified review or
   deployment status. Leave notes belonging only to still-open branches alone.
   Keep the PR pure; add no new note where the repo exempts consolidation PRs.
3. Open/update that one PR with the covered PRs, state diff and validation
   evidence. Complete applicable documentation/governance/CI checks and fix
   failures in your own consolidation before asking for its review and merge.
   Do not rerun app tests locally merely to validate prose. If settled state is
   already correct and no completed notes remain, record the verified no-op
   instead of creating an empty or duplicate PR. Repos without this convention
   get a not-applicable record, not a new state system.
4. Hand your ready PR to Shwet for review and merge, or to an already assigned
   independent reviewer/merger. Explain the existing no-self-merge rule, link the
   PR and record `awaiting_owner_merge`. Never merge your own cleanup PR. This is
   the final human handoff, not a request to assign its authoring elsewhere.
5. On resume, reuse the same ledger, verify the consolidation actually landed on
   the default branch, and check the exact final revision for intervening work.
   Obtain its applicable final checks, then continue the one-deployment phase.
   Do not start a new batch, recreate the cleanup or reset deployment receipts.

Once Pacta has adopted `docs/session-workflow.md` and its release workflow,
`State ready to ship` must pass on the exact final main SHA. It is expected to
fail on intermediate main revisions with unprocessed notes. Before adoption,
retain legacy Guard 5; do not require a not-yet-installed release check. After
adoption, do not require the push-only check on author PRs or waive it at deploy.
Re-read the final main revision for intervening work before sending a request.

## One deployment per selected Coolify app

Wait until every PR in the agreed queue has reached its intended default branch
and final applicable checks have passed. For an explicitly requested multi-repo
run, complete all selected queues before the final deploy phase unless the
owner requested independent shipping. Keep the same ledger while background CI
watchers run; the owner does not need to return merely to report completion.

For each selected app:

1. Confirm current default-branch SHA is the reviewed final revision. Inspect
   and validate any intervening commits from other sessions before deployment.
2. Read Coolify once to verify app, repo, branch and environment; auto-deploy
   must remain off and no competing deployment may already be queued/running.
   Coordinate an actual conflict; do not cancel others' deployments or change
   production settings. Don't promise one total deploy if external actors
   also deploy. No app means no deploy; never revive retired apps.
3. Locate/read the available `creds` skill before credential access. Use the
   actual Coolify MCP deploy tool and its current schema. Missing credentials,
   authorization, target clarity or MCP capability means a concrete handoff,
   not direct API writes, SSH, curl or a new deployment provider.
4. Persist `deploy_attempted: true`, app ID, target revision and timestamp
   **before** calling. Call once, omit `force`, and disable waiting when the
   tool supports that option. Do not use a mode that waits for completion.
   Do not run production migrations, tests, data fixes or configuration edits.
5. Save and return the receipt. A timeout/error may be ambiguous; do not retry
   automatically, including after a compaction or resume. Further action needs
   owner reconciliation and authorization. Do not poll status/logs or claim
   the revision is live. In multi-app runs, stop on an ambiguous failure before
   continuing dependent deployments and preserve already-sent receipts.

Keep the ledger/evidence. Remove only clean disposable worktrees owned by this
run; never force-remove another session's or uncommitted review work. Installing
or validating this skill does not run any merge/deployment operation.
