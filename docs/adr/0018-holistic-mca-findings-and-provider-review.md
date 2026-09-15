# ADR 0018 — Holistic MCA findings and provider review

Status: Accepted for implementation under task #230. Depends on ADR 0017 / PR #234.

## Context

A finding can concern multiple instruments, a disclosure requirement, a controlled processor form, or the package as a whole. Per-clause findings cannot express those relationships. Shared wording approval also does not establish whether counsel has reviewed a particular provider's selected policy and identities.

## Decision

Derive review targets from each invitation's immutable snapshot: the whole package, instruments, content items, requirements and external processor forms. Counsel may select up to 50 distinct targets per finding. Reject targets outside the saved scope. A shared-library finding against a package or instrument holds affected shared content against a new clause approval, including derived content's source targets. A provider finding belongs to that provider revision and holds its review completion; it does not silently change the shared clause library's approval status. Staff may separately raise a shared-library finding when an issue applies to common wording.

Store explicit review-unit acknowledgements and a completion timestamp on the invitation. Units are instruments, requirement specifications and controlled processor forms. Completion requires every unit acknowledged, no unanswered findings and supplied processor text. Acknowledgement is not inferred from a page visit. Any new finding or changed checklist acknowledgement clears completion. All writes lock the invitation row and recheck status/expiry before updating it, so findings, progress, completion and revocation serialize on one record.

Completion means review coverage of the saved copy; it is not legal approval, proof of current law, or send/sign authority. A newer provider revision or changed source does not rewrite an earlier review. The reader flags that difference. Counsel can finish reviewing a historical copy, but that completion does not transfer to the newer revision. Written responses remain attributable and immutable; counsel can record a follow-up finding.

## Provider scope and saved content

Schema-v2 provider snapshots name the saved template ID, revision and fingerprint, actual provider identities/policy, selected full instruments/reusable items, applicable requirement specifications, and that provider's required processor form. Creation requires current-source validation through the existing preview service, team manager/admin membership, MCA builder access and internal draft access. A historical revision can be explicitly selected if its source remains current. No fallback tenant or alternative processor supplies identities or terms.

The manager can include the complete controlled processor form text when sharing. It is preserved as submitted alongside the profile's title/version/reference. A reference without text is visibly missing and blocks review completion. Text is review evidence, not a finding that it matches an authoritative original or that the processor accepted it. Additional processors retain their own identity and required form. No PDF/layout fidelity or processor acceptance is claimed by a plain-text review snapshot.

Provider invitations carry stored kind `provider` plus team, organization, template and revision scope. The predecessor's `library`-only queries ignore provider rows even after application rollback. Authenticated list, archive inspection, response and revocation operations enforce that scope and the existing access grants. Instance-admin shared-library endpoints are constrained to unscoped library invitations; they cannot bypass team authorization by naming a provider review ID. A bearer sees only its invitation's saved copy, findings and progress. A provider bearer is also bound to the owning template and immutable revision. No approval, sharing, staff response or administrative inspection procedure becomes public.

Schema-v1 neutral library snapshots and legacy single-instrument links retain their scope/history. Authorized staff can inspect saved package copies after a public link expires or is revoked. No legal wording, source record, provider compiler policy, transaction calculator or merchant-signing gate changes.

## Migration and rollback

Migration `20260915003100_add_mca_package_review_progress` adds nullable scope columns, an empty-default review-unit array, a nullable completion date, a scope index and a database check constraining library/provider scope. Existing package rows remain unscoped library invitations with no claimed progress. No legacy review or approval rows are rewritten. Deploy after the ADR 0017 migration. Application rollback retains all columns and history; do not drop stored counsel evidence. Schema-v2 links require this application version to render correctly.

## Validation

Focused tests cover saved target membership, cross-document targets, derived approval holds, actual provider identities, no processor substitution, schema-v1 compatibility, schema-v2 integrity, missing-form and outstanding-finding completion blocks, progress reset, revocation races, team/revision query scoping, grant denial and public snapshot isolation. Playwright exercises provider invitation creation, controlled text, holistic findings and staff responses, cross-team/global-admin denial, explicit completion, superseding revisions, follow-up reset, revocation and authorized archive inspection. PR #234 supplies the unchanged predecessor flow; its final successful Playwright run and this PR's after-change run are recorded in the PR/task evidence.
