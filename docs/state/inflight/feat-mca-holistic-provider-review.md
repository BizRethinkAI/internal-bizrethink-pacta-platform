# Holistic MCA findings and provider review

Task: #230. Author session: `mca-package-review-20260915`. Depends on PR #234; starts from its corrected package implementation, including JSONB integrity and the stored library/provider kind boundary. Own changes are intended for the second PR in that order. This note does not supersede the first PR's note.

## Durable behavior

- Counsel findings can address the whole saved package, several provisions/instruments, requirement specifications and processor forms. Targets are validated against the saved scope. Shared-library instrument/package findings hold the appropriate shared content, including source/derived relationships. Provider findings remain with the provider revision and do not silently hold every customer's shared library.
- Explicit checklist acknowledgements cover each instrument, requirement specification and controlled form. Completing review requires all units acknowledged, no unanswered findings and the actual processor text. New findings or changed acknowledgements reset completion. Completion is coverage of this saved copy, never an attorney approval or merchant-release decision.
- The team template workspace can create invitations for a selected saved revision with actual provider identities and selected documents. The supplied controlled processor text is preserved with the form title/version/reference from the provider profile. Missing text is labelled incomplete and blocks completion. No alternative processor's terms are substituted.
- Public links retain their original wording after live source/provider changes, and clearly flag newer revisions/source differences. Existing completions do not transfer to new revisions. Existing v1 library and legacy instrument reviews remain compatible.
- Authorized staff can inspect archived package wording after the public link expires or is revoked, then answer findings against the saved evidence. Public recipients see only their own invitation's findings. Written staff responses are attributable and immutable.

## Access, storage and operations

ADR 0018 documents team/organization/template/revision isolation, builder/internal-draft gates, management permissions and completion meaning. Creation validates source currentness through the existing provider preview service. Shared-library admin endpoints explicitly exclude provider-scoped rows; global admin status alone does not bypass provider-team membership. Bearer writes serialize progress, completion, findings and revocation on the invitation row.

Migration `20260915003100_add_mca_package_review_progress` depends on the first PR's additive package tables. It adds scope/progress fields and a scope check without rewriting previous reviews or approvals. Rollback preserves history and columns; older applications cannot render schema-v2 provider invitations. No upstream overlay changes, legal/source refresh, production migration, merge or deploy performed by this author.

## Validation and remaining responsibility

Test-first compiler/target, progress and provider-access regressions pass alongside the legacy counsel/template tests. The new browser flow covers actual provider and processor identities, cross-team and global-admin isolation, staff responses, explicit completion, superseding revisions, follow-up findings, revocation and archive inspection. The corrected first PR includes a JSONB key-order regression; the dependent branch incorporates that fix. Exact final counts, SHA, predecessor/after Playwright runs and browser artifacts are recorded on the PR/task to avoid status-only CI restarts.

Fresh human-started independent review is required for the migration, team/bearer access, approval-hold changes and user flow. The shipping owner merges in dependency order, retargets/refreshes as necessary, folds both notes into settled state through the required consolidation PR, records authorized deployment evidence and closes tasks #229/#230 when their approved work has no remaining action. Provider interview options remain the currently supported business policy; transaction-specific calculations, signatures, authoritative form/layout verification, legal currency and merchant clearance are not created by a review completion.
