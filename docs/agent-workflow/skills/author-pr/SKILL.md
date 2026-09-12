---
name: author-pr
description: Implement an assigned repository task in an isolated worktree, open its PR and resolve its own CI failures through green. Use for authoring work in a coordinated multi-session workflow; it does not authorize merging or shipping.
---

# Author a PR

Default to the current verified repository and the user's assigned task. Read
parent/repo instructions, current merged state, PR template and the repo's
session workflow. For Pacta incident work, preserve the HANDOFF reading order
and individual finding decisions. For Lombard, preserve each repository's
owning-session boundaries. Do not impose another project's stack or gates.

## Take the assignment

Read open task issues and their comments, open PRs and reserved identifiers.
Use the task assigned by the owner/coordinator, with a unique session label,
scope and branch. Do not appoint yourself coordinator or take another session's
assignment. If coordination is not adopted or Issues is unavailable, preserve
existing explicit user assignments and prepare a concrete adoption handoff;
do not pretend a task card exists or pause unrelated authorized analysis.

Work in a fresh worktree from the latest merged default branch. Install the
repo's required dependencies in that worktree; no shared node_modules symlink,
production env import or disturbance of another checkout. Follow runtime pins,
test-first requirements, upstream overlays, migrations and specialist review.

## Own implementation and validation

- Verify the behavior against current code before fixing it. Reproduce the
  defect with meaningful failing tests where required, then implement within
  the task's approved scope. New findings need their own owner decision.
- Follow documented local checks and use CI for its comprehensive gates.
  Do not run forbidden local builds or duplicate passing CI without a specific
  unresolved concern. Never hide failures with skips, weaker assertions or
  unrelated workflow changes.
- Write only this PR's handoff note where the repo uses notes. On repositories
  with batch consolidation, leave settled state and other notes to the assigned
  consolidator. Do not silently take inherited cleanup from another owner.
- Combine known fixes, inspect the diff and open the PR with the complete repo
  template via a body file. Link the task and record test evidence, decisions,
  limits, dependencies and actual review status. Keep sensitive material out of
  public coordination records.
- Monitor **this PR's CI** in one background watcher. Use recent workflow
  duration to choose a 60–300 second cadence, normally about 120 seconds for
  long E2E runs. Continue useful work and report changes, not repeated snapshots.
  Diagnose failures from logs; retry only after a relevant fix or demonstrated
  transient error. A cancelled run is not a pass.
- Implement substantive review fixes in this branch using required TDD, then
  return the new SHA and evidence for fresh independent review. Never force-push
  someone else's branch or resolve a semantic conflict in their work unassigned.
- Finish with all applicable CI green on the actual final head. Record results
  in the PR/task without a status-only code push. Report remaining independent
  review and shipping separately; do not merge your PR or deploy it.

Task comments carry progress and handoffs without Git commits. They do not wake
other sessions. Use authorized peer messaging when available or provide relay
text through the owner, and do not claim notification without evidence.
