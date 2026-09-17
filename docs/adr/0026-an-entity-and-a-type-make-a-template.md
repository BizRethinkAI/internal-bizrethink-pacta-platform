# ADR 0026 — An entity and a document type make a template

- **Status:** Proposed
- **Date recorded:** 2026-09-17
- **Decision date:** 2026-09-17 (repository owner, in conversation; this ADR is
  the confirmation artifact and nothing is built until it is accepted)
- **Amends:** [ADR 0025](0025-what-the-mca-vertical-is-for.md), which settled
  that the artifact is a template, and [ADR 0016](0016-mca-provider-template-revisions.md),
  which made a template a saved *package* recipe
- **Does not touch:** [ADR 0019](0019-split-funding-letters-are-processor-controlled.md).
  Split funding letters stay the processor's, used exactly as supplied.

## Context

ADR 0025 settled that this vertical produces templates. It did not say what one
*is*, and the answer inherited from ADR 0016 was: a funder's whole programme,
compiled into a set of documents.

That is not what the live system looks like. `lombard-api` holds five separate
published templates — FRPA (121), equipment lease (120), ISO PRA (119),
permission to release (103), Payzli (102) — each with its own `templateId`, each
sent on its own. **The package is ours; it exists nowhere else.** The funder's
platform has never seen one.

It also does not survive the question of who issues a document. Lombard issues
the FRPA from one company and the equipment paper from another, and a single
profile naming one "buyer" cannot say that.

## Decision

### 1. A template is one entity's version of one document type

**entity + type = one template.** Lombard Capital LLC + FRPA is a template.
Lombard Pay LLC + Subscription is a different one. The set goes away.

Pacta does not know that one of those is a funding company and the other an
operating company, and it must not learn. Those are the funder's own
arrangements. Pacta knows entities, and which document each template produces.

### 2. An entity is a saved record, chosen when a template is created

The six fields `ZEntity` already holds — legal name, entity type, formation
jurisdiction, principal address, notice address, notice email — plus the
servicing and reconciliation details the buyer carries today.

Team-scoped, like every other MCA record.

### 3. The entity carries programme policy; a template inherits it

Venue rule, guaranty scope, renewal model, dispute resolution, recipient states
and the fee schedule are answered **once, on the entity**. A template inherits
them and asks only what its own document needs.

This is the rule `BizrethinkProperty` already states for the lease: facts that
do not change per document live with the thing they describe, because
"re-asking them every renewal is how an interview earns a reputation for being
tedious."

### 4. Inherited, meaning COPIED into the revision — never referenced live

The lease's schema says why: *"a lease that read its party list from here would
have its signers silently rewritten when this row was edited."*

It matters more here. Revisions are immutable and fingerprinted, and
`publishMcaTemplate` publishes against a named revision. **Editing an entity must
not change what an already-published template says.** The entity is where you
edit; the revision snapshot is where it freezes.

### 5. Our side is a Pacta record. Every other party comes from the caller

| | source |
|---|---|
| the entity issuing the document | **Pacta**, printed at publication |
| merchant, guarantor | the caller, per send |
| ISO partner / broker | the caller, per send |
| processor | the caller, per send |
| report subject | the caller, per send |

This is already true in the live templates, which is the evidence for it rather
than an argument: `provider_legal_name` on the ISO PRA is the **Company** — our
side — while `iso_partner_legal_name`, `processor_name` and every merchant field
are widgets the platform fills.

**There will never be a template per broker or per merchant**, for the same
reason there is not one per deal.

### 6. No processor is ever selected in a template

A split funding letter is the processor's, supplied fixed, and the caller picks
the processor-specific template when it creates that envelope. Payzli today;
Maverick or others later, each its own supplied template.

`processor_name` stays a widget on the FRPA, because which processor a merchant
uses is a fact about the deal.

### 7. The ISO PRA stops citing FRPA section numbers

Its commission clause says the commission is payable out of the Origination Fee
"under Section [n]" of the FRPA. With separate templates there is no FRPA in
scope to resolve a number against.

It will name the **Future Receivables Purchase Agreement** and the **Origination
Fee** in words. A cross-document number was always fragile: ADR 0011 derives
numbering from what survives selection, so the number moves whenever a clause
drops out of the FRPA. Naming the thing survives both.

This is the only cross-instrument reference in the library. The other four
documents are entirely self-contained — checked, not assumed.

### 8. Nothing is migrated

The templates saved today are test data and will be superseded. No backfill, no
dual-shape compatibility, no guessing whether two saved profiles meant the same
company.

## Consequences

**`compileMcaTemplate` returns one document, not a set.** `instrumentsFor` stops
choosing which documents exist; the template names its own. This is the largest
piece of work and it touches the compiler, the snapshot shape and every fixture.

**The interview becomes per document type, and much shorter.** An FRPA template
asks FRPA questions. A permission-to-release template asks almost nothing. This
is the precondition for the step-by-step interview the lease builder has, which
is what prompted the whole conversation.

**The parity work survives unchanged.** `field-plan`, `field-triage`,
`recipient-contract` and `template-parity` are all keyed per instrument already,
and `publishMcaTemplate(instrument)` was per instrument from the start. They get
simpler: the instrument comes from the template rather than being a parameter.

**One classification in #292 was wrong and must be corrected.** `processor_name`
and `commission_percentage` were marked `printed` — resolved at publication —
because they sit in `MCA_PROVIDER_BINDINGS`. They are not our side, so they are
widgets. That set has to split: entity identity is printed; everything else in
it is a widget.

**The caller's send path changes, in stages.** It stops sending provider identity
for the agreements Pacta publishes, and keeps sending it for the state
disclosures, which stay in `lombard-contracts` until ADR 0024's step 3. Their
`ENTITY_ROLE_BY_KIND` already switches on kind, so this is a change to that map
rather than a new idea — but it is a change in a repository this session does
not own and must not happen before the builder can publish.

## Open, and worth settling before building

- **`iso.commissionPercentage`.** A live widget today, so the caller sends it —
  but it is a term between the funder and the broker, which reads like programme
  policy. Widget or entity policy?
- **`provider.venueForum` and `equipment.creditDisputeAddress`.** Both sit inside
  clause prose and neither is a live widget. If they are entity policy they
  print; if they are per-deal they need new widget names, which adds to the 27
  already under review.

## Alternatives rejected

**Keep the package, choose an entity per document within it.** Closest to
today's three slots and no compiler change. Rejected because the package exists
nowhere but here: the caller holds five templates and sends them separately, and
a concept with one implementation and no consumer is a liability.

**An entity role discriminator, like the caller's `funding` / `platform`.**
Rejected because it teaches Pacta the funder's internal arrangements. A second
funder splits its entities differently, or not at all.
