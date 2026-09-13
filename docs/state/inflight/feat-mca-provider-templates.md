# MCA provider interview and reusable package templates

Author: **mca-build-20260913**, directly assigned by the repository owner.
Task [#209](https://github.com/BizRethinkAI/internal-bizrethink-pacta-platform/issues/209).
Branch `feat/mca-provider-templates` is stacked on #208, initial base `169e7855f`.
Overlay **086** and additive migration `20260913120000_add_mca_provider_templates`
are reserved on the task after checking open task bodies and recent comments.
Existing reservations 082–085 remain with their current owners.

## Main integration refresh

Refreshed #208 at `3f47427bec10cf6ad14e3dabc1ff865aabe06e84` is merged into
this branch, incorporating main `a2e0719fc38d988f489234b564095ef46307c05f` and
the corrected consent/catalogue version history. This merge has no conflicts.
Provider-interview implementation, overlay 086 and the additive migration are
unchanged. Five template, extraction and consent test files pass 285 tests.
The provider navigation overlay still reverse-applies; complete fresh CI is
recorded on PR #210 / task #209. No independent review, merge into main or
deployment is performed by this author.

## Work in progress

The intended result is a real provider interview that saves, reopens, revises and
previews reusable package templates, with immutable revisions and stale-content
checks. Provider policy is separate from merchant facts, amounts, equipment
choices, consumer-report instructions, signatures and processor acceptance.
Transaction fill/render/signing integration follows as the next bounded author
PR. No completion, merchant readiness, merge or deployment is claimed here.

The first profile boundary tests produced **17 failures and one pass** against
an unrestricted input schema; the completed strict schema passes all eighteen.
It requires actual buyer/entity/contact data and an express confirmation of the
supported net-card, processor-split, merchant-state terms. It rejects permanent
transaction facts and unsupported collection/base/venue answers. The initial
provider-template release supports the court bundle; the existing arbitration
alternative stays in the legal-review catalogue. Guaranty, renewal, concurrent
positions and channel choices remain tied to authored selections. Equipment
requires its own contracting entity. A broker channel requires its actual
Company, portal, commission and explicit acceptance of the existing fixed ISO
forum terms. No Lombard/Circular commercial profile is assumed verified.

Dependencies: #200 design, #202 substantive research, #204 funding fields,
#206 equipment and #208 mapping. #194 ancillary consent/acknowledgment changes
must be integrated before merchant package use. Broad legal-source research is
reused; no repeated Utah/California source edits are planned. Processor-controlled
form contradictions remain a separate review/acceptance requirement; this task
does not rewrite those forms or infer future processor acceptance.

Only this note is owned here. Detailed implementation, validation, migration
rollback and remaining integration work will be recorded before the PR opens.
Fresh independent review and human-authorized shipping remain separate.

## Implementation and review handoff

Base refreshed to #208 head `13cab523fedd7289d3c23d0d9847613c8e5e0d3b` after
its translation/access-test CI correction. This branch keeps all dependencies.

The real three-step interview and team workspace now save/reopen/revise profiles,
show immutable revision history, and assemble internal package previews. Only
team ADMIN/MANAGER can write. Actual membership is checked before feature grants;
all resource reads/writes constrain template ID to team and organisation. Read
metadata excludes legal snapshots. Internal text requires a separate draft grant.
No upstream Envelope or sendable template is created. Admin self-service affects
only that admin's own account; ordinary users cannot grant themselves access.
Both responsive upstream app-navigation surfaces call an owned access hook via
reserved overlay 086. The MCA admin workspace now has a populated template tab.

Two additive tables, generated via the owned Prisma merger, hold parent ownership
and append-only revisions. Compare-and-swap rejects a stale editor inside the
revision transaction. A content/source mismatch blocks preview until the user
saves a new revision. ADR 0016 records persistence, access, consequences and
rollback: application rollback leaves the additive tables/history intact; no
production DB operation or destructive reset was performed.

The compiler uses existing selection/number/reference services and structural
placement metadata, excludes interview guidance, and retains per-transaction
conditions on equipment, report and channel documents. Processor-controlled form
requirements remain external and unaccepted. Requirement fingerprints include
vendored source bytes but are not source reverification or applicability approval.
No second finance calculator is introduced.

Nine records advance version: FRPA identity and its funding field group; four
unconditional equipment-provider references in definitions, negative pledge,
insurance and no-encumbrance; ISO identity, commission rate and portal. Actual
provider entity type/formation jurisdiction/address replace the Florida LLC
assumption, with distinct notice address. ISO company/rate/portal fields use the
actual channel company. All remain draft and unapproved. No Utah/California
citations or vendored source files changed. #194's pending 14 consent/release
bodies were not overwritten.

Validation so far: provider boundary 17 red/1 pass → 18 pass; compiler seven red
→ seven pass, expanded with separate equipment/ISO and no-affiliate scenarios;
service boundary nine red → nine pass. Affected MCA suites: 50 files, 2,562 pass, including orphan/cyclic placement guards.
Scoped separate types pass including the real browser regression. Before browser
baseline is #208 run 34758603825 (1,099 pass, four retry-pass, 59 skipped). Added
browser/HTTP/DB scenarios for actual three-step save/reload/preview/revision
history, foreign-team denial, manager authority, independent draft grant and
revocation, and stale-editor rejection. After CI results belong on the PR/task.
No local full build or duplicate complete Playwright sweep.

The implementing author continues with transaction filling/rendering integration
in the next bounded PR. This PR requires fresh independent review for legal
variable changes, money policy, access, migration and upstream hooks. Stacked CI
has no platform CodeQL job; integrate/retarget main in dependency order and
require all merge gates. No independent review, merge, merchant readiness or
deployment is claimed here. Only this note is owned; consolidation stays with
the selected shipping session.

## First after-CI correction

The initial browser run 34760337856 passed 1,101 cases, with two recovered retries
and 59 skips; the two new scenarios failed before completing their flows. One
selector matched both the newly visible global MCA navigation and the intended
team link; it now selects the team by its accessible name. The non-admin grant
test expected 403, while the existing upstream admin middleware correctly uses
401/UNAUTHORIZED; the test now requires that response and the exact denial
message. No authorization rule or product behavior was relaxed. CI is rerun on
the corrected head so the remaining save/history and access assertions execute.
