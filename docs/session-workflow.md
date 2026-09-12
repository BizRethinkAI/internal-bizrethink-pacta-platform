# Working across sessions

Shwet assigns work, or explicitly appoints **one coordinator** for a selected
repository and batch. Starting an author or review session does not appoint a
second coordinator. GitHub task issues hold live assignments. Git holds code,
per-PR handoffs, decisions and settled project documentation.

## Start a session

1. Read the repository instructions, latest merged state and PR notes. Fetch the
   default branch; a local checkout can belong to another session.
2. Read open `[Task]` issues **and their comments**, then open PRs. Do this again
   before expanding scope, reserving an overlay or handing work off.
3. Use the task assigned by Shwet/coordinator. Its record names a unique session
   label, scope, branch, dependencies and reservations. Several sessions may use
   the same GitHub account, so an account assignee alone is insufficient.
4. Create an isolated worktree from the latest merged branch and follow this
   repo's install, TDD, overlay and CI requirements. Own the PR through green CI.

Example reads, after verifying the actual remote:

```sh
gh issue list --repo "$TASK_REPO" --state open --search '"[Task]" in:title' --limit 100
gh issue view "$TASK_NUMBER" --repo "$TASK_REPO" --comments
gh pr list --repo "$TASK_REPO" --state open --limit 100
```

Paginate if the result reaches the limit. Do not treat an unavailable issue
service as an empty queue. If issues are disabled, finish authorized preparation
and have the owner enable them before activating this coordination process.
During adoption, inspect existing branches/PRs and obtain owner relays; old
sessions do not magically receive these instructions.

## Each task has its own card

Use `.github/ISSUE_TEMPLATE/session-task.yml`, or the same fields through the
GitHub API/CLI. Prefix the title `[Task]`. No shared registry file or shared
issue-body table is maintained.

- **Coordinator owns the issue body:** approved outcome, session label, branch,
  scope, dependencies, reserved overlay/migration identifiers, status and next
  responsible session. Status: queued, assigned, implementing, review, blocked,
  merged awaiting shipping, or done. Record who delegated coordination.
- **Authors and reviewers append comments** with their session label, evidence,
  PR/head SHA, findings and next action. They do not rewrite the assignment body.
- Only the coordinator changes assignments or reservations. Read current open
  cards and PRs first. Reserve an overlay before use; do not reuse an identifier
  merely because the associated issue was closed. Check merged overlays too.
- A session that disappears retains its assignment until an explicit handoff.
  No automatic timeout or competing takeover. If two coordinators appear,
  resolve authority through Shwet before making new assignments.
- Link the task in the PR's Related Issue section. Keep the card open until its
  next action is complete; avoid auto-closing it at merge when shipping remains.
  A deploy receipt means requested, not verified live.

The cards are a coordination protocol, not database locks. GitHub permissions
cannot distinguish two sessions sharing one account. The single coordinator,
explicit handoffs and independent review remain necessary. Comments persist
but do not wake another session; a running session must reread or receive an
owner relay. Do not claim a message was delivered unless it was.

## State belongs to the batch integration

Author PRs create and update only
`docs/state/inflight/<branch-with-slashes-replaced-by-hyphens>.md`. These files
carry durable behavior, decisions, validation, risks and unfinished work. Live
assignment/status changes belong on the issue, without a Git push or app CI run.

`docs/STATE.md` is the last consolidated account. Until shipping, read it together
with the notes on the current branch and the task/PR records. A note present on
`main` describes merged work awaiting consolidation; its folder name does not
prove that its PR is still open. An old note cannot establish production status.

After all application PRs in the agreed batch merge, one assigned **consolidation
author** prepares `chore/state-consolidation-<unique-batch>` from latest main:

1. Verify what actually merged and identify every note now on main. Preserve
   unresolved limitations and distinguish code merged, reviewed and deployed.
2. Synthesize current facts into STATE.md and delete the processed notes. Correct
   stale claims; do not concatenate competing summaries. Do not delete notes
   belonging only to still-open PR branches.
3. This PR changes only STATE.md and deletes notes. **It creates no note of its
   own.** Its review surface is the STATE diff, PR body and linked task card.
4. A different session or Shwet reviews and merges it. If the ship session writes
   the consolidation, it must hand that PR to another reviewer/merger. The ban
   on merging one's own PR still applies.

Governance checks each author's own note and rejects edits to another note or
to STATE.md outside a pure consolidation PR. It no longer makes the next author
clean up previous merges. Bots retain the note exemption, not permission to
rewrite someone else's state.

The separate **State ready to ship** workflow checks each main revision and
fails while any note remains. It must be green on the exact final main SHA
before shipping. Intermediate main revisions can therefore be unready to ship
while author PRs pass. This gate supplements existing application CI; it does
not change branch protection, Coolify settings or automatically deploy anything.
An authorized manual deploy could bypass the process, so the shipping session
must enforce it. A missing check is not a pass.

## Review and ship

Use a fresh, human-started review-and-ship session. It freezes the selected PR
queue, reviews independently, sends substantive fixes to their authors and
merges only cleared PRs. It includes the assigned state-consolidation PR as the
last dependency. Later work needs explicit inclusion or a later batch.

Verify auto-deploy is off before merging for a batch deployment. After the batch,
consolidation and final-main gates pass, request one non-forced, non-waiting
Coolify deployment per selected app. Preserve the receipt; do not watch it or
retry an uncertain request. Review-only and workflow-setup requests do not
authorize merges or deployment.

## Reusable skills and adoption

Versioned sources live in [`agent-workflow/skills/`](agent-workflow/skills/):
`coordinate-work`, `author-pr`, and `review-and-ship`. They use each selected
repository's own rules; Pacta's state gate, npm and overlays are not imposed on
other BizRethink or Lombard repositories. Install reviewed copies in the user's
personal skill directory, preserving unrelated skills and local customizations.
Update these versioned sources through PRs before updating installed copies.

Adopt this in other repositories with a separate PR per selected repository:
add the task template and startup pointers, retain its existing test/review
contract, and change shared-state handling only where needed. A generic skill
is not authorization to modify every repository or enable their issue trackers.

For this rollout, Issues were initially disabled and then verified enabled on
2026-09-12. The templates and instructions become available after merge;
activation still requires assigning existing work. No claim is made that existing sessions have
switched workflows merely because this document exists.
