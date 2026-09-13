---
name: coordinate-work
description: Coordinate explicitly selected repository tasks across author and review sessions using separate GitHub task issues. Use when the owner asks to assign, hand off or coordinate concurrent work; ordinary coding or reviewing does not appoint a coordinator.
---

# Coordinate work

Use the current verified repository unless the user selects others. Adapt to
each repo's AGENTS.md/CLAUDE.md, parent instructions and session workflow. These
skills work across BizRethink and Lombard; they do not waive repo ownership,
specialist review, credentials, test or deployment rules.

Use role labels and unique session labels in public task/PR records, comments,
commits and handoffs. Do not copy the owner's personal name, contact details or
identifying home paths from context; personal attribution requires an explicit
owner request. Preserve required source/license/professional attribution.

Confirm who owns coordination from the user's instruction and existing task
records. The repository owner remains coordinator until explicitly delegating
it to one session. Do not compete with an already appointed coordinator. A request to run
coordination authorizes ordinary task-card maintenance for the selected scope,
not implementation of undecided findings, merging, deployment or repo settings.

## Assign and hand off

- Read latest merged state, open PRs, and open `[Task]` issues with comments,
  paginating as needed. Check whether Issues is enabled; a failed read is not
  an empty queue. Do not silently enable repository features.
- Create one issue per approved task using the repo template. Record the
  outcome/approval and completion criteria, coordinator authority, unique
  owner-session label, branch, scope, dependencies, reserved IDs, status and next
  responsible role/session. Include required review, merge, consolidation,
  installation or authorized shipping in the completion criteria when applicable.
  Keep sensitive evidence in the repo's approved security channel, not a public
  coordination issue. A shared GitHub username does not identify a session.
- Only the coordinator changes assignment fields: outcome/scope, owning session,
  branch, dependencies and reservations. The session responsible for the current
  step updates the PR link, Status and Next action and appends evidence. This
  limited progress authority does not transfer assignments or appoint sessions.
  Re-read before editing, preserve intervening updates and keep comments/body
  consistent. No central registry file/table is rewritten; cards are not locks.
- Assign overlapping edits sequentially or split their scope. Reserve overlay
  or migration identifiers only where the repo uses them, checking both merged
  files and outstanding reservations. Do not reuse a closed task's identifier.
- Link implementation PRs without prematurely closing tasks that still need
  review, merge, consolidation, installation or shipping. Avoid closing keywords
  while work remains after merge. Keep disappeared sessions assigned until
  the owner explicitly transfers their work. Record handoffs before takeovers.
- GitHub comments persist but do not wake a separately started session. Use
  permitted peer messaging only when available and authorized; otherwise give
  the repository owner concise relay text. Never claim another session received
  a handoff because a card exists. Finish useful independent work while awaiting it.

## Batch roles

Authors implement in isolated worktrees and fix their own code/CI. A fresh,
human-started review-and-ship session independently reviews, diagnoses failures
and routes substantive fixes back. It does not merge its own implementation.
Owner authorization to coordinate alone does not authorize shipping.

Where the repo uses state consolidation, the shipping session automatically
owns one final cleanup PR for the selected batch; record that default without
requiring the repository owner to assign it again. Preserve earlier explicit
assignments until a coordinated handoff. The consolidator writes settled state
after the implementation PRs merge. The repository owner reviews and merges
the shipper's own PR unless another independent reviewer/merger is already
assigned; never self-merge.
Do not introduce a state file or this convention into a repo that lacks it.

Record the selected shipping batch on its own task card, including the final
consolidation dependency, review/CI blockers and deploy-request receipt. The
shipping session keeps its detailed execution ledger and enforces one final
non-forced, non-waiting Coolify request per selected app when authorized. A
receipt is not a claim that the revision is live.

The session completing a task's final required step owns closure without another
owner reminder. Verify the approved criteria and evidence, record the final
PR/check/receipt links, set **Status: Done** and **Next action: None — approved
scope complete**, close as completed and verify the issue body and closed state.
For a batch, the shipping session does this for each selected completed task and
its batch card. Pending, blocked or uncertain required work keeps the task open;
record the next action instead. A failed status/close operation remains explicit
unfinished handoff work. Do not reassign tasks or expand deployment authority
merely to close them.
