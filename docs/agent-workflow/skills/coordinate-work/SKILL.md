---
name: coordinate-work
description: Coordinate explicitly selected repository tasks across author and review sessions using separate GitHub task issues. Use when the owner asks to assign, hand off or coordinate concurrent work; ordinary coding or reviewing does not appoint a coordinator.
---

# Coordinate work

Use the current verified repository unless the user selects others. Adapt to
each repo's AGENTS.md/CLAUDE.md, parent instructions and session workflow. These
skills work across BizRethink and Lombard; they do not waive repo ownership,
specialist review, credentials, test or deployment rules.

Confirm who owns coordination from the user's instruction and existing task
records. Shwet remains coordinator until explicitly delegating it to one
session. Do not compete with an already appointed coordinator. A request to run
coordination authorizes ordinary task-card maintenance for the selected scope,
not implementation of undecided findings, merging, deployment or repo settings.

## Assign and hand off

- Read latest merged state, open PRs, and open `[Task]` issues with comments,
  paginating as needed. Check whether Issues is enabled; a failed read is not
  an empty queue. Do not silently enable repository features.
- Create one issue per approved task using the repo template. Record the
  outcome/approval, coordinator authority, unique owner-session label, branch,
  scope, dependencies, reserved IDs, status and next responsible session.
  Keep sensitive evidence in the repo's approved security channel, not a public
  coordination issue. A shared GitHub username does not identify a session.
- Only the coordinator edits assignment bodies. Authors and reviewers append
  progress or findings as comments. No central registry file/table is rewritten.
  Check existing records before each assignment; cards are not atomic locks.
- Assign overlapping edits sequentially or split their scope. Reserve overlay
  or migration identifiers only where the repo uses them, checking both merged
  files and outstanding reservations. Do not reuse a closed task's identifier.
- Link implementation PRs without prematurely closing tasks that still need
  review, consolidation or shipping. Keep disappeared sessions assigned until
  the owner explicitly transfers their work. Record handoffs before takeovers.
- GitHub comments persist but do not wake a separately started session. Use
  permitted peer messaging only when available and authorized; otherwise give
  Shwet concise relay text. Never claim another session has received a handoff
  because a card exists. Finish useful independent work while awaiting it.

## Batch roles

Authors implement in isolated worktrees and fix their own code/CI. A fresh,
human-started review-and-ship session independently reviews, diagnoses failures
and routes substantive fixes back. It does not merge its own implementation.
Owner authorization to coordinate alone does not authorize shipping.

Where the repo uses state consolidation, assign exactly one author and one
cleanup PR for the selected batch. Preserve earlier assignments during adoption.
The consolidator writes settled state after the implementation PRs merge; a
different session/human reviews and merges that PR. Do not introduce a state
file or this convention into a repo that lacks it.

Record the selected shipping batch on its own task card, including the final
consolidation dependency, review/CI blockers and deploy-request receipt. The
shipping session keeps its detailed execution ledger and enforces one final
non-forced, non-waiting Coolify request per selected app when authorized. A
receipt is not a claim that the revision is live.
