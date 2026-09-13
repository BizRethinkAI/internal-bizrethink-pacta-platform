# ADR 0016 — Provider templates have immutable, team-owned revisions

Status: proposed implementation; independent review and merge pending.
Date: 2026-09-13. Task #209. Depends on ADRs 0010–0014 and the unified-workspace
design in #200 / ADR 0015.

## Context

An MCA provider interview describes the provider, not a future merchant deal.
The clause catalogue alone cannot remember provider identity, policy, separate
counterparties or processor-controlled form requirements. A mutable JSON blob
would also lose the policy and wording used by an earlier transaction.

Native Documenso Envelope templates can enter existing distribution paths. An
internal, unapproved MCA recipe must not become a sendable upstream template
merely because the provider interview was completed.

## Decision

Add `BizrethinkMcaTemplate` and `BizrethinkMcaTemplateRevision` through the owned
Prisma additions and additive migration `20260913120000_add_mca_provider_templates`.
The parent belongs to one team and organisation. Revisions append the strict
provider profile, assembled content snapshot, content/requirement fingerprint,
actor and timestamp. The parent's current version advances with an atomic
compare-and-swap inside the same transaction that appends the revision. There
is no revision update route. Existing revisions survive subsequent policy edits.

Every endpoint checks actual team membership before the `mca-builder` feature
grant. Provider-policy writes additionally require team ADMIN or MANAGER. Resource
lookups bind the template ID to the authorized team and organisation. An instance
admin cannot use a feature grant to access an unrelated customer team.

Profile retrieval returns metadata and answers, never the archived legal-text
snapshot. Internal preview has an independent `mca-clause-draft-rendering` grant
and recompiles the saved profile against the current catalogue/source records.
A changed fingerprint requires an explicit new revision. It never silently
rewrites a saved revision. The archive records what was compiled but is not
trusted as an arbitrary rendering payload.

Instance admins can explicitly enable or disable either feature for their own
account in the MCA workspace. There is no automatic grant, billing-flag shortcut,
organisation-wide self-service grant or caller-selected user ID. Existing generic
feature resolution retains user-specific revocation over organisation grants.

The first release supports only the coherent net-card/processor-split,
merchant-state/court bundle. Unsupported answers fail validation. Equipment and
ISO entities are separately identified; individual reports and equipment options
remain conditional per transaction. Processor-controlled letters are requirements
for external forms, not silently generated or accepted copies. Source citations
are not refreshed by compiling a template, and eligibility is not inferred from
a provider's list of offered states.

## Consequences

The real interview can save, reopen, revise and preview reusable package recipes
before merchant-delivery prerequisites are satisfied. It creates no native
Envelope, recipient, signature, delivery, external review link or PDF artifact.
Every recipe explicitly remains an internal draft and not ready to send.

Transaction filling, authoritative upstream calculations, state applicability and
prescribed disclosures, processor acceptance, signer capacities and gated document
emission are the next bounded integration. Any subsequent public emission must
recheck approvals/findings, current content, transaction completion and recipient
authority; a saved recipe or internal draft grant is insufficient.

## Migration and rollback

The migration creates only two tables, their team/time and revision uniqueness
indexes, and an owned-table foreign key. Existing documents, approvals and
findings are unchanged. Upstream user/team/organisation IDs are scalar references,
following the existing owned-model convention; authorization joins live upstream
membership on every request. The revision relation cascades only on deletion of
its own template parent. No delete operation is exposed by this release.

Apply through the normal Prisma deployment path; no production SQL is executed
by the author. Application rollback leaves the additive tables intact. Do not
reset the database or drop revision history to roll back UI code. If permanent
removal is later requested, export and retain the provider history before a
separately reviewed removal migration.
