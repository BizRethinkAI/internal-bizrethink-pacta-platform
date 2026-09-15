# Complete neutral MCA counsel package

Task: #229. Author session: `mca-package-review-20260915`. Base: `602e54599a92cca9dde412e099991494b45188a2`.

## Durable behavior

- New complete-package review links freeze all six MCA instruments, all 235 current content items, numbering/reference contexts and disclosure/requirement source specifications. Neutral buyer and equipment-provider roles replace implicit tenant identities; Payzli remains processor-specific. Contact details are supplied explicitly, never inferred from the creator's account.
- Counsel can navigate the complete package, read source evidence and verification limitations, and record findings against the saved content. Changes to live sources do not rewrite an invitation. Expiration/revocation removes access but preserves findings/history.
- New package findings hold relevant library content against a new attorney approval. Staff answer under the existing instance-admin gate. Anonymous recipients cannot approve, create links or inspect another invitation's findings.
- Legacy single-instrument links and findings retain their original scope and behavior. They are managed in a labelled legacy section. No canonical clause text, historical finding, regulatory source or approval fingerprint changes.

## Architecture and operations

ADR 0017 documents separate versioned package tables and an additive migration: `20260915003000_add_mca_review_packages`. New tokens use `mcpr_` under the existing owned counsel route. No upstream overlay changes. Rollback retains the tables/history; older applications cannot resolve new tokens. No production migration, merge or deployment is authorized to this implementing session.

## Validation and follow-on

Meaningful tests were written before the new compiler/service, with failing runs recorded in the author session. Focused package, bearer-access and legacy counsel tests pass. The unchanged main baseline passed Playwright at `602e54599a92cca9dde412e099991494b45188a2`, run 34902496335. The added Playwright flow exercises new-link creation, the neutral full reader, reusable fields, findings persistence, source context, unauthorized creation and revocation. Final head/check evidence stays on the task and PR so status updates do not restart CI.

Task #230 follows this PR with holistic findings, explicit review progress and team-scoped provider-revision review. This PR does not claim an eleven-state legal currency review, completed transaction disclosures, provider readiness or merchant-send clearance. The source record dates and qualifications remain visible. A fresh independently started review is required for the migration, access changes and user flow before merge. The shipping owner consolidates this note, records merge/deploy evidence and closes #229 when no action remains.
