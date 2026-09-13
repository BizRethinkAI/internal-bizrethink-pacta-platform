# PR handoff notes

Each author creates `docs/state/inflight/<branch-slug>.md` in the first push and
edits that file in place. Replace every slash in the branch with a hyphen.
Never edit another PR's note. Include durable behavior, decisions, validation,
limitations and unfinished work; put live assignment/status changes on the
GitHub task card without restarting application CI.

Use role/session labels instead of the owner's personal name or identifying
local details. The responsible session updates the task body's progress fields
at handoff. When all approved work is finished, its final responsible session
records the evidence, sets Done/no remaining action and closes the task as
completed. A committed handoff or completion comment does not replace that step.

Read STATE.md, these notes and current task/PR records together. STATE.md is the
last consolidation; a note on main is merged work awaiting consolidation. The
folder name does not prove a PR is still open or a change is deployed.

The shipping session automatically folds main's notes into STATE.md once per
batch through a pure `chore/state-consolidation-<batch>` PR, preserving any
existing explicit fold assignment until a coordinated handoff. It only updates
STATE.md and deletes notes, and creates no note itself. The repository owner
reviews and merges it unless another independent reviewer/merger is already assigned; never
self-merge. Synthesize current facts, preserve open limitations and correct
stale claims; do not concatenate duplicate accounts.

Governance validates each author's own note. **State ready to ship** rejects
main revisions with any remaining note. It replaces the old Guard 5 behavior
that forced the next unrelated author to clean up previous merges. Conflict
markers still fail. The gate is required by the shipping workflow, not a
Coolify deployment hook.

See [the full session workflow](../../session-workflow.md) for task cards,
ownership, transition handling and independent review. Until this workflow is
adopted, preserve existing explicit fold assignments; do not take them over.
