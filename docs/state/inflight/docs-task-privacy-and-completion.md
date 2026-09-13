# Public role labels and task completion

Author: **task-privacy-completion-20260912**, directly assigned by the repository
owner in [task #196](https://github.com/BizRethinkAI/internal-bizrethink-pacta-platform/issues/196).
Branch `docs/task-privacy-and-completion` starts at main
`1813b1d72fb231593ddcb2cb0b2a55054ac7f040`.

## Why the workflow changed

The public task template and active workflow instructions embedded the owner's
personal name. Sessions copied that wording into public task/PR records without
needing personal attribution. Task #181 also still said Implementing after its
implementation (#182), final state consolidation (#184) and authorized shipping
handoff were complete. Completion appeared only in comments. The old rule gave
the coordinator exclusive control over the entire issue body, including status.

Task #181 was corrected to Done and closed separately, with its current body and
comments using a role label. This PR fixes the reusable instructions that led
to both problems. It does not rewrite repository history or claim that every
historical personal reference has been removed.

## Current contract

- Public operational records use role labels and unique session labels. Do not
  copy the owner's personal name, contact details or identifying home paths from
  chat/local context. Personal attribution requires an explicit owner request;
  required source/license/professional attribution remains intact.
- The coordinator retains assignment/scope, branch, dependency and reservation
  authority. The session responsible for the current step may maintain only the
  task's PR link, Status and Next action, with supporting evidence in comments.
  It rereads before editing and preserves concurrent updates and assignments.
- A green author PR moves the card to Review. A merge with required work left
  moves it to Merged awaiting shipping; blocked work is recorded as Blocked.
  Neither is whole-task completion. Use non-closing PR references when later
  required steps remain.
- The session completing the last approved step verifies the applicable review,
  CI, merge, consolidation, installation and authorized shipping evidence. It
  records completion, sets Done/no remaining action, closes as completed and
  verifies the body and closed state during the same final handoff.
- Required pending/uncertain work keeps its task open. A failed card update or
  close remains explicit unfinished maintenance. An accepted deployment request
  remains a receipt, not verified live status; closure grants no extra deploy or
  production-polling authority. Do not expand scope or discard required work to
  obtain a closed card.

The root startup instructions, engineering standard, session workflow, task
template, handoff README and all three role skills agree on these boundaries.
The shipping execution reference includes final task-card verification in its
ledger and completion steps. Repository-independent skills retain each target
repository's own review, runtime, state and deployment rules.

## Validation and adoption

This changes documentation and issue-template instructions only. No application,
test, CI workflow, dependency, upstream overlay or database file changes. All
three skill validators pass, the task template's seven required fields/status
options and three skill UI YAML files validate, and 28 local links/anchors
resolve. The changed workflow sources contain no personal attribution or
identifying home paths. Whitespace and state-note ownership are checked as part
of commit preparation. No application TDD/browser exercise is warranted for prose;
unchanged CI supplies its normal checks and documented docs-only Playwright gate.
Final exact-head evidence belongs on the task/PR without a status-only push.

All nine installed skill files match the unchanged base revision; these new
sources are not installed yet. Versioned changes require review before installation.
The session finishing
this task must install the reviewed copies of `author-pr`, `coordinate-work` and
`review-and-ship` in the personal skill directory, preserving unrelated skills,
local customizations and backups, and verify against the reviewed revision.
Record installation plus any required batch consolidation/shipping evidence
before closing #196. The author leaves this task in Review after green CI; an
unmerged source change is not an installed workflow. Running sessions must
reread the changed instructions; a comment/file change does not wake them.

No new issue bot or personal-name classifier is added. These are explicit
session responsibilities, not claims of mechanical enforcement or a historical
privacy purge. Existing active MCA/security tasks and reservations retain their
owners. Only this branch's state note is added; authorized shipping owns the
later state consolidation.
