# ADR 0017 — Versioned neutral MCA counsel packages

Status: Accepted for implementation under task #229.

## Context

The MCA vertical supplies shared drafting, a provider interview and reusable provider templates. Legacy counsel links present one instrument with a specific tenant's parties. That presentation does not let counsel assess the whole shared package, and silently widening an existing bearer link would change its authorized scope.

## Decision

New complete-package links use separate `BizrethinkMcaPackageReview` records and `mcpr_` tokens. A validated, fingerprinted JSON snapshot freezes all six instruments, every operative clause and reusable item, the example/alternative numbering contexts, and the disclosure registry's source specifications and verification limitations. Buyer and equipment-provider roles remain neutral. Payzli retains its processor-specific identity and control qualification. The contact displayed in the brief is supplied explicitly when sharing; creator account details are not projected to counsel.

Legacy review records, tokens, single-instrument payloads, findings and approval fingerprints remain unchanged. No legacy bearer can retrieve the new package merely by changing its route. New package records do not expose unrelated reviewers or internal historical review manifests.

An explicit stored `kind` restricts this version's reads, management writes and approval holds to `library` invitations. Future provider scopes must be ignored by this application version, including after an application rollback; shared-library administration is not a grant to read provider findings.

The new reader supports cross-document references, parent headings, reusable fields and inline findings. `BizrethinkMcaPackageFinding` records the invitation, target IDs, saved package fingerprint and recipient identity. Outstanding content findings hold the affected source/derived content against a new approval. Answers are attributable, append-only staff responses. Answering is not approving. A saved package remains readable after library changes, with a visible change notice, until it expires or is revoked. Its findings remain findings against that saved version.

The source specifications are review context, not finished disclosure forms or verified current law. No legal wording, regulatory source record, calculator, signing path or merchant-delivery gate changes. Holistic finding targets and selected provider-revision review are the dependent task #230.

## Migration and rollback

Migration `20260915003000_add_mca_review_packages` adds two tables and indexes. It does not rewrite or backfill legacy records. Deploy the additive migration before serving the new application. Application rollback leaves the new tables and review history intact; older application versions do not resolve new tokens. Do not drop tables containing counsel history as part of rollback.

## Validation

Focused tests cover full catalogue coverage, neutral roles, retained processor identity, source context, saved-payload integrity, cross-document reference targets, expired/revoked links, forged targets, recipient attribution and revocation/write ordering. Existing counsel payload and finding-wiring tests preserve legacy behavior. Playwright covers creating/opening a complete package, parent headings, reusable content, findings persistence, source navigation, unauthorized creation and revocation. The unchanged base has successful Playwright evidence at `602e54599a92cca9dde412e099991494b45188a2` (run 34902496335). Final PR checks and review status belong on the task/PR.
