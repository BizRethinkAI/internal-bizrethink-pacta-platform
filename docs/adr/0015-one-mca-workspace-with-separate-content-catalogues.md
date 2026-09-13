# ADR 0015 — One MCA workspace with separate content catalogues

- **Status:** Accepted design; application implementation pending.
- **Decision date:** 2026-09-13.
- **Authority:** The repository owner approved separate catalogues with shared
  infrastructure, then approved bringing conformity into one MCA workspace.
- **Partially supersedes:** [ADR 0008](0008-mca-is-two-surfaces-not-one.md)'s
  separate-product and separate-navigation decision, including its reaffirmation
  in [ADR 0009](0009-counsel-is-parallel-not-a-gate.md); and
  [ADR 0011](0011-the-mca-clause-library-is-a-library.md)'s inclusion of helpers
  and deliberately unnumbered blocks in the clause catalogue.
- **Preserves:** distinct review and verification responsibilities, parallel
  counsel review, the [Pacta builder boundary](0010-agreement-builder-lives-in-pacta.md),
  selection-derived numbering, and ADRs
  [0012](0012-the-baseline-document-is-input-not-specification.md),
  [0013](0013-a-funder-profile-describes-the-funder.md) and
  [0014](0014-two-questions-every-clause-answers.md).

## Context

The admin navigation separates MCA Conformity from MCA Clauses. Meanwhile,
`McaClause` mixes clauses, field groups and explainers. All flow into the clause
list and its counts, including records for which numbering deliberately returns
an empty string. This makes the library's boundaries unclear to its reviewer
and hides relationships the future builder must understand across documents.

The owner's handoff dated 2026-09-12 already said that an item is either a clause
with a number or an explainer that is not registered as a clause. It also allowed
structural blocks to stay unnumbered. Those decisions are compatible when the
blocks live outside the clause catalogue. The implementation kept them inside
it instead. This decision makes the missing boundary explicit.

At the inspected main revision, 211 records include 15 unnumbered entries;
10 of those are still typed as clauses. Three numbered field groups also need
classification. Some apparent helpers contain operative restrictions, obligations
or signer protections. Hiding empty numbers, or moving every record labelled
"explainer" into interview help, would lose necessary distinctions.

The [workspace design and migration map](../design/mca-workspace.md) records
the source revision, affected identities, dependencies and implementation work.

## Decision

### One MCA workspace

Use one **MCA** navigation entry with the following views:

| View | Responsibility |
|---|---|
| Overview | Relationships and unresolved work across the applicable document package. |
| Clauses | Numbered contractual provisions and their review evidence. |
| Reusable content | Form fields, document structure and interview guidance, with their intended use identified. |
| Disclosures & requirements | Disclosure specifications, required content, source evidence, conformity results and open readings. |
| Templates | Later assembly of applicable content and template/transaction readiness. |

These are views of one vertical. A particular template selects only applicable
content; it does not include every catalogue entry or every state's disclosure.
Templates and the full readiness view remain future work, not empty features to
scaffold during the initial catalogue change.

### Distinct catalogues and contracts

1. **The clause catalogue contains only clauses.** Its list, count and API cannot
   include a field group, an explainer or an unnumbered structural block. Every
   displayed clause has a citation derived for its labelled selection context.
   A clause has no `unnumberedReason` escape. Stable identities remain separate
   from numbers; no permanent number is stored on the source record. Mutually
   exclusive alternatives retain their distinct example profiles.
2. **Reusable content has its own types and catalogue.** Identify whether each
   item is a document block, a field group or interview-only guidance, and which
   consumers use it. A reusable block may be required in the assembled document
   even though it has no clause number. Interview-only guidance does not enter a
   contract automatically. These records are not registered as `McaClause`.
3. **Disclosures and requirements retain their own typed catalogue.** Preserve
   prescribed forms, itemizations and content requirements and the checks
   appropriate to each. A requirement is evidence and a selection/validation
   input; it is not automatically document wording or a numbered clause.
4. **Classify content by what it does.** A heading such as "Explanation",
   "Parties" or "Execution" does not make operative language a helper. Separate
   mixed records into numbered provisions and reusable blocks while accounting
   for every existing obligation, field, cross-reference and signature capacity.
   Reuse canonical content and links rather than maintaining competing copies.

The assembler may compose an ordered mixture of clauses and reusable document
blocks. Only clauses participate in clause numbering. Required blocks retain
their placement, fields and validation; moving them out of the clause list does
not remove them from the document package or from appropriate review.

### Share infrastructure while preserving evidence

Reuse existing provenance, stable identity, review links, findings, versioning,
fingerprinting and storage services where their contracts fit. Separate
catalogues do not require separate databases, independent review systems or a
new general-purpose content platform. Typed entry points enforce the catalogue
boundary rather than relying on a UI filter over the existing mixed registry.

Keep evidence distinct:

- Authored legal wording, including wording inside a disclosure or reusable
  document block, retains appropriate review and publication controls. Moving
  it between catalogues is not approval and does not make it exempt from review.
- Prescribed text and structure retain source and conformity verification.
  A conformity result is not an attorney's approval or a claim of authorship.
  Questions of applicability and interpretation remain visible for review.
- Filled documents require field, recipient and cross-document consistency
  checks using the supplied transaction facts and calculations. Passing a form
  comparison does not verify those figures or resolve an unread requirement.

The current conformity report remains read-only when brought into MCA. Sharing
its navigation or storage plumbing must not introduce an approval action that
changes prescribed content or replaces verification. Review of authored answers
and unresolved readings remains separately identified.

Preserve approval/finding history under stable identities. A split or semantic
change must not copy an old approval onto new content. Changes to content,
placement or dependencies invalidate affected evidence according to its
fingerprint. Audit existing storage consumers before deciding whether a schema
or data migration is necessary; none is authorized or implied by this ADR.

### Assemble and assess the applicable package together

Connect supported interview choices and transaction facts to clauses, reusable
blocks, disclosures, required fields and recipients. Keep funder configuration,
merchant elections and transaction prerequisites distinct. ADRs 0013 and 0014
still govern which choices are actually supported; a helper does not create a
new interview election or supply an unauthored alternative.

The eventual readiness view must identify the affected document/content and the
reason for each unresolved condition: missing inputs, unsupported combinations,
incomplete or stale review, unverified sources/requirements, unavailable checks
and contradictions across documents. A template can be ready for completion
while transaction-dependent checks remain pending; that is not permission to
publish a completed transaction. Unrelated, unselected content does not block
the selected package, but unresolved applicability cannot silently exclude a
requirement. A skipped or unavailable check is not a pass.

Internal drafting and counsel review can proceed with visible open issues,
as ADR 0009 established. The future merchant-output path must enforce its
applicable publication and validation requirements before release. The current
reports do not establish that such an output gate is implemented.

## Delivery and consequences

This PR records the design, current inventory and migration plan. It changes no
application route, content record, contract wording, approval, schema or stored
template. Existing ADR decision text remains intact under ADR 0001.

The next implementation should deliver the catalogue/type separation and common
MCA navigation as one bounded outcome, with the necessary selection, review,
reference and counting changes. Resolve the mixed-record mapping first. Follow
with the interview, package assembly and readiness enforcement through their own
assigned work. Existing templates and signed documents are not retroactively
rewritten by moving a source record.

The design replaces two product silos with one place to understand a document
package. It deliberately retains several kinds of evidence and review because
they answer different questions. Implementation acceptance criteria and the
pending corrections it must incorporate are in the linked migration map.

## Alternatives considered

| Alternative | Disposition |
|---|---|
| Separate catalogues sharing existing infrastructure | Chosen by the owner; clear boundaries without duplicating storage and review services. |
| Separate databases and review workflows for every catalogue | No demonstrated need; adds maintenance and complicates package-wide review. |
| Hide unnumbered entries in the existing clause page | Insufficient: helpers remain clauses in APIs, counts, review and assembly; numbered helpers are missed. |
| One undifferentiated list and one approval status | Loses the distinction between clauses, reusable content and disclosure verification. |
