# Working across sessions

The repository owner assigns work, or explicitly appoints **one coordinator**
for a selected repository and batch. Starting an author or review session does not appoint a
second coordinator. GitHub task issues hold live assignments. Git holds code,
per-PR handoffs, decisions and settled project documentation.

## Start a session

1. Read the repository instructions, latest merged state and PR notes. Fetch the
   default branch; a local checkout can belong to another session.
2. Read open `[Task]` issues **and their comments**, then open PRs. Do this again
   before expanding scope, reserving an overlay or handing work off.
3. Use the task assigned by the repository owner/coordinator. Its record names
   a unique session label, scope, branch, dependencies and reservations. Several sessions may use
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

## Public records use roles

Use **repository owner**, **coordinator**, **author**, **reviewer** and unique
session labels in agent-authored issues, PRs, comments, commit messages, workflow
instructions and handoffs. Do not copy the owner's personal name, personal
contact details or identifying home-directory paths from chat or local context
into these records. Use repo-relative paths or `~/` where a path is needed.
Personal attribution needs an explicit owner request; familiarity or its
appearance in another file is not permission to repeat it. Preserve required
source, license and professional-review attribution rather than anonymizing
unrelated evidence. This rule is not a repository-history rewrite.

## Each task has its own card

Use `.github/ISSUE_TEMPLATE/session-task.yml`, or the same fields through the
GitHub API/CLI. Prefix the title `[Task]`. No shared registry file or shared
issue-body table is maintained.

- **Coordinator owns assignment fields:** approved outcome/completion criteria,
  scope, owning session, branch, dependencies and reserved identifiers. Record
  delegated authority with a role and session label, not a personal name.
- **The session responsible for the current step maintains progress:** add the
  PR link, update the body's Status and Next action, and append evidence with
  its session label, PR/head SHA and findings. This limited authority does not
  transfer ownership, change scope or assign a new session. Describe the next
  already-authorized role; the owner/coordinator still appoints its session.
- Re-read the issue body and comments before editing. Preserve assignment fields
  and intervening updates; do not overwrite a stale copy of the whole card.
  Comments supplement the current status, not replace it.
- Only the coordinator changes assignments or reservations. Read current open
  cards and PRs first. Reserve an overlay before use; do not reuse an identifier
  merely because the associated issue was closed. Check merged overlays too.
- A session that disappears retains its assignment until an explicit handoff.
  No automatic timeout or competing takeover. If two coordinators appear,
  resolve authority through the repository owner before making new assignments.
- Link the task in the PR's Related Issue section. Use a non-closing reference
  while required work remains after merge; do not use `Fixes`/`Closes` as a
  shortcut past the completion check below.

The cards are a coordination protocol, not database locks. GitHub permissions
cannot distinguish two sessions sharing one account. The single coordinator,
explicit handoffs and independent review remain necessary. Comments persist
but do not wake another session; a running session must reread or receive an
owner relay. Do not claim a message was delivered unless it was.

## Update status and close completed tasks

The responsible session updates the body at each handoff, without a reminder
from the owner:

| Event | Responsible session and task status |
|---|---|
| Implementation starts | Author sets **Implementing**. |
| PR ready and CI green | Author sets **Review**, links the PR/evidence and records the next review action. The task stays open. |
| PR merged with required work remaining | Merger sets **Merged awaiting shipping** and identifies the remaining consolidation, installation or authorized shipping step. |
| A required step cannot proceed | Its responsible session sets **Blocked** and records the blocker and next responsible role. |
| Every approved completion criterion is satisfied | The session completing the final required step sets **Done** and closes the task as completed. |

Before closing, verify the approved outcome and evidence for every applicable
review, CI, merge, consolidation, installation and authorized shipping step.
Do not invent a deployment requirement for a task that does not include one.
For a shipping batch, the shipping session checks each selected task and the
batch card before its final handoff. A merge or a green author PR alone is not
evidence that later required steps finished.

Record the completion evidence and relevant PR/run/receipt links, set **Status:
Done** and **Next action: None — approved scope complete**, then close the issue
with reason **completed** and verify the resulting body and closed state.
Do this in the same completion handoff, not as work left for the owner to notice.
If an update/close fails, report the unfinished card maintenance and responsible
role. Closing an issue does not change its historical assignment or free a
reserved identifier for reuse.

Keep a task open when required work is pending, blocked or uncertain. A deployment
receipt proves a request was accepted, not that the revision is live; preserve
that distinction without polling production. Record out-of-scope follow-ups
separately, but do not move required work out of scope just to close a task.

## State belongs to the batch integration

Author PRs create and update only
`docs/state/inflight/<branch-with-slashes-replaced-by-hyphens>.md`. These files
carry durable behavior, decisions, validation, risks and unfinished work. Live
assignment/status changes belong on the issue, without a Git push or app CI run.

`docs/STATE.md` is the last consolidated account. Until shipping, read it together
with the notes on the current branch and the task/PR records. A note present on
`main` describes merged work awaiting consolidation; its folder name does not
prove that its PR is still open. An old note cannot establish production status.

The review-and-ship session is the default **consolidation author** for every
batch, without another reminder or assignment from the repository owner. Preserve
an existing explicit fold assignment until the coordinator records a handoff. After all
implementation PRs in the agreed batch merge, the consolidator prepares one
`chore/state-consolidation-<unique-batch>` PR from latest main for the whole batch:

1. Verify what actually merged and identify every note now on main. Preserve
   unresolved limitations and distinguish code merged, reviewed and deployed.
2. Synthesize current facts into STATE.md and delete the processed notes. Correct
   stale claims; do not concatenate competing summaries. Do not delete notes
   belonging only to still-open PR branches.
3. This PR changes only STATE.md and deletes notes. **It creates no note of its
   own.** Its review surface is the STATE diff, PR body and linked task card.
4. Finish its applicable checks, then give the repository owner the PR for review
   and merge, unless another independent reviewer/merger is already assigned. The ban on
   merging one's own PR still applies. The ship session resumes the same run
   after that merge, verifies final-main checks and continues to deployment.

If settled state is already correct and no merged notes remain, record a no-op
in the shipping ledger; do not create an empty or duplicate consolidation PR.

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
merges only cleared PRs. Final consolidation is an automatic last dependency,
even before its PR exists. Later unrelated work needs explicit inclusion or a
later batch.

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
The session completing an approved skill update verifies the installed copies
against the reviewed revision, preserves local customizations/backups and records
that evidence on the task before closing it. If installation remains pending,
say so. Running sessions must reread the changed instructions; installation or a
task comment does not refresh context already loaded by another session.

Adopt this in other repositories with a separate PR per selected repository:
add the task template and startup pointers, retain its existing test/review
contract, and change shared-state handling only where needed. A generic skill
is not authorization to modify every repository or enable their issue trackers.

For this rollout, Issues were initially disabled and then verified enabled on
2026-09-12. The templates and instructions become available after merge;
activation still requires assigning existing work. No claim is made that existing sessions have
switched workflows merely because this document exists.
