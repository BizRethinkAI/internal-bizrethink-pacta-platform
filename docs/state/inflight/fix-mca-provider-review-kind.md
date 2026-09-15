# MCA provider-review classification repair

Task: #256. Author: `mca-review-repair-20260915`. Base: main
`190576a10cacdc1a65c26e36982bd106db8501a7`. This restores the accepted
ADR 0017/0018 boundary after promotion #250; it introduces no new product policy.

## Durable behavior

Provider invitations and their management operations explicitly carry
`kind: provider`. Shared-library inspection explicitly requires `kind: library`.
Public reads, findings/progress writes and authenticated snapshot inspection
require the stored kind to agree with the validated, fingerprinted snapshot.
Correctly labelled provider links remain readable subject to the existing team,
organization, template revision, expiry and revocation checks.

The additive migration `20260915060000_restore_mca_review_kinds` corrects only
library-labelled provider snapshots whose schema version, template identity and
revision agree with their non-null relational scope. It updates only `kind`.
Snapshots, fingerprints, tokens, findings, review progress and timestamps are
preserved. A stronger database constraint binds kind, snapshot kind and scope;
missing JSON kinds cannot pass through PostgreSQL's nullable CHECK semantics.

## Validation

Focused Vitest regression: 5 failures / 9 passes before implementation, then
14 passes across package/provider services. Cases cover provider creation and
management scope, correct provider access and rejected mismatches on reads and
findings. Prisma clients were generated after isolated dependency installation.
Separate owned-package type checking, changed-file formatting and diff whitespace
checks passed. Final-head CI evidence belongs on task #256.

Playwright before baseline: successful main run 34930316923 at the base above,
with unchanged dependencies/config. CI after gate includes the existing provider
browser flow asserting the actual persisted kind, plus PostgreSQL tests that
execute the exact migration against transaction-local temporary tables. Those
tests check preservation, invalid writes and atomic failure for unexpected data.
No duplicate local build or broad suite is needed.

## Shipping and remaining responsibility

The migration takes an exclusive lock on the review table and validates every
row. Unexpected legacy data stops the entire statement without partial repair;
the shipping owner must investigate that evidence rather than loosen the guard.
Run it through the normal deployment migration procedure. Do not edit applied
migrations or revert corrected provider rows to library for rollback. Saved
reviews remain distinct from publish/sign approval.

The author supplies a green PR; the owner starts one fresh independent review
covering the discriminator, access scope and migration. The shipping owner
merges, consolidates this note and verifies any authorized deployment, then
updates/closes task #256 when all assigned responsibilities are done. No merge,
production data change or deployment is performed by this author.

Reader-layout restoration is separately tracked in #257 and based directly on
main. Original shipped tasks #229/#230 still belong to their shipping owner for
task-card cleanup; this correction does not take over those records.
