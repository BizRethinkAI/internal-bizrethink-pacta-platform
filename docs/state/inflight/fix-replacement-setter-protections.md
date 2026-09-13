# A-08 — document replacement integrity

Shwet approved A-08 on 2026-09-12. Task [#186](https://github.com/BizRethinkAI/internal-bizrethink-pacta-platform/issues/186)
records this security author's scope and overlay **082**. This branch started
from merged main `1813b1d72fb231593ddcb2cb0b2a55054ac7f040`, after #178, #180,
#182, #183 and state consolidation #184. The merged efficient-validation policy
in `docs/engineering-standard.md` was read before implementation.

## Behavior and implementation

`setFieldsForDocument` and `setDocumentRecipients` now protect the whole
replacement, including omitted entries. Their existing authenticated parent
predicate still controls access. Each replacement validates fresh persisted
recipients/fields, keeps an existing field bound to its saved owner and applies
the ordinary recipient mutability rules to removals. A recipient's SIGNED status
and an inserted field independently establish protection. The shared AES/QES
envelope lock is awaited for both helpers; completed-document rejection remains.
Untouched entries can still be edited, removed and created, while a protected
entry can be retained unchanged beside them.

The owned `packages/bizrethink/server-only/document-replacement.ts` provides
policy and transaction ownership. It selects the authorized parent, locks
Envelope, Recipient and Field rows in that order, and rereads the authorized
snapshot after waiting. Explicit READ COMMITTED isolation makes a preceding
signing commit visible to this validation. The existing validation, upsert,
removal and audit operations all use that transaction. A failed operation rolls
them back together. Recipient-removal emails run only after a successful commit.
Protected fields are returned without rewriting/default-normalizing saved data.

Overlay 082 changes only the two upstream replacement helpers. Most patch lines
indent the existing body under the wrapper; upstream validation and persistence
were retained in place instead of copied into an owned fork. Fragility is HIGH:
future Documenso syncs must preserve both hooks, existing parent authorization,
the same transaction for every write/audit, and post-commit notifications.
The new HTTP spec is individually declared owned in `overlays/BIZRETHINK-OWNED.txt`.
Both new test files and the owned helper are covered by the separate CI type gate.

## Validation evidence

- Fresh isolated worktree, Node 24.20.0, `npm ci`, then Prisma generation.
- TDD commit `8fb08aa87`: the initial 15 real-helper tests ran against unchanged
  application code, with **11 behavior assertion failures / 4 passing controls**.
  Implementation followed that commit. Local red log:
  `/private/tmp/pacta-a08-red.log`.
- Expanded focused Vitest coverage: **21 passing tests**. This includes signed
  and inserted-only removals, saved-owner binding, untouched edits/removals,
  fresh-state checks, completion/advanced-signature rejection, rollback on an
  audit/commit failure, notification timing and protected no-op retention.
  DB doubles establish helper behavior; they do not establish PostgreSQL locking.
- Targeted TypeScript check of both changed helper consumers and the new unit/HTTP
  tests passed. Changed-file formatting and source `git diff --check` (excluding patch payloads) passed. No local
  application build or duplicate full test/typecheck suite was run.
- Overlay 082 reverse-checks on this branch and forward-applies to the exact base
  in a scratch directory, reproducing both final upstream files byte for byte.
- The before-change Playwright gate is [run 34719946377](https://github.com/BizRethinkAI/internal-bizrethink-pacta-platform/actions/runs/34719946377)
  on exact base `1813b1d72`: **1098 passed, 2 flaky, 59 skipped**, full suite
  executed. It represents the unchanged application, dependencies and test
  configuration. Current PR CI supplies the after gate.
- Eight new HTTP/PostgreSQL cases cover both legacy/current document setter
  routes, real signature preservation, partial completion, wrong-parent denial,
  AES/QES locks, allowed draft edits/creation, and a signing transaction that
  commits while a replacement request waits on an observed row lock. This is a
  controlled signing-state DB transaction, not a complete signing ceremony.
  Local discovery lists all eight using the repository's `--import tsx` loader;
  HTTP/database execution is left to CI. A first plain Playwright invocation
  failed during module loading without that loader; no application fix was needed.
- No dependency files changed. [Baseline security run 34719946445](https://github.com/BizRethinkAI/internal-bizrethink-pacta-platform/actions/runs/34719946445)
  reported the documented six accepted dependency-chain findings (three high,
  three moderate: deepmerge-ts and ts-deepmerge). Compare the final PR audit to
  that accepted baseline; an advisory green result does not mean zero findings.

Final CI verdicts, exact PR head, retries/skips and independent review status
belong on the PR/task without another status-only code push.

## Decisions, limits and next owner

The fixed lock order and READ COMMITTED transaction are the chosen concurrency
mechanism. PostgreSQL's [row-lock semantics](https://www.postgresql.org/docs/current/explicit-locking.html)
were checked on 2026-09-12. Default transaction timeouts remain; a timeout or
deadlock aborts the replacement, with no automatic retry. This change does not
coordinate every other authoring/signing API or establish a transactional email
outbox. A notification failure after commit retains the existing committed-data
behavior.

No schema/migration, dependency, configuration, public request shape or unrelated
audit remediation is included. Existing recipient-role and field-value rules
are reused. The pre-existing optional signing-order normalization behavior is
unchanged; HTTP controls supply explicit valid signing orders. A-09 and later
findings still need individual owner decisions. No production access or deployment
was performed, and no deployed revision is claimed.

This author owns its PR and CI fixes. One fresh human-started adversarial review
is required for this signing/upstream change before an independent merge.
The separately authorized review-and-ship session owns final batch consolidation
and shipping; this author changes only this note and never merges its own PR.
MCA task #185 / PR #187 owns different files and is not part of this implementation.
