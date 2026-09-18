# feat/mca-entity-is-the-template — the join

The piece ADR 0026 exists for. A template now **is** one entity's version of one
document: it names the entity, and each revision carries a **copy** of it.

`compileMcaTemplate(entity, instrument)`. The provider profile is gone, and with
it the provider interview.

## What moved, and why each one

**The entity is copied into the revision, never referenced live (§4).**
`createMcaTemplate` takes an `entityId`, reads the entity and freezes it.
`reviseMcaTemplate` no longer accepts a profile at all — a new revision *is* a
fresh copy of the entity as it stands. That makes editing an entity the only way
a change ever reaches a document, and makes an already-published revision safe
from it by construction rather than by rule.

**`getMcaEntity` returns `id`, `version` and `updatedAt` alongside the entity,
and `ZMcaEntity` is `.strict()`** — so handing the whole row to the compiler
throws. `copyOf()` names the copy explicitly. A test caught this, because the
mock was faithful to the real return type rather than to what I wanted it to be.

**`externalDocuments` is gone (§6).** It read `profile.processor.legalName` into
every template. No processor is ever selected in a template, so there was
nothing left for it to hold.

## The bindings split, which is the substance of §5

Exactly **two** bindings moved from printed to widget, and the pinned parity
counts moved with them:

    frpa      37 marked / 2 printed  →  38 / 1    processor_name
    iso-pra    6 marked / 2 printed  →   7 / 1    commission_percentage

Both are live widgets the caller already sends, so this closes a gap rather than
opening one.

**Two `iso.*` bindings deliberately did NOT move, and I nearly moved them.** On
the ISO PRA `iso.companyLegalName` is the **Company** — us — while the broker is
`iso.partnerLegalName`. ADR 0026 §5 cites that very widget as its evidence that
our side is a Pacta record. Moving it would have turned the funder's own legal
name into a field the caller fills on its own channel agreement. `iso.portalUrl`
is likewise the funder's partner portal, which is why the entity gained a
`partnerPortalUrl` field rather than losing the binding.

## The owner's decision on the equipment affiliate

The FRPA's Equipment Cost clause names whoever the merchant leases equipment
from. A template names one entity, and a funder may issue receivables paper from
one company and equipment paper from another.

**Settled: widget on the FRPA, entity on the lease.** On an equipment lease or
subscription the entity IS the lessor, so its name prints; on the FRPA it is a
new caller-filled binding, `equipment.affiliateLegalName`. The alternative —
printing the issuing entity's name — is silently wrong for a funder that splits,
in a clause about who the merchant owes money to.

**This adds one widget name to lombard's implementation list**, on top of the 27
already under review.

## Two of ADR 0026's three open questions are now closed by construction

`provider.venueForum` and `equipment.creditDisputeAddress` **print**: the entity
schema (#310) already carries `venueState`/`venueCounty` and
`creditDisputeAddress`, so putting them there decided it. `iso.commissionPercentage`
is a **widget** — a term with one particular broker, and a live widget today.

Recorded here rather than by editing ADR 0026, which is append-only.

## A gate that no longer applies, stated rather than deleted

`reviewCompletionBlockers` required "the controlled processor form" before a
counsel review could complete. A template contains no processor form now, so
that check would have become **vacuous** — present, and unable to fire. Removed,
with a comment saying where the obligation went: a processor's form still needs
its own review before it is used; what it is no longer is a condition on
publishing a document that never contained it.

## Migration

`entityId` NOT NULL with **no default and no backfill**, and
`revision.profile` → `revision.entity`. ADR 0026 §8, and production was verified
empty before this was written (zero templates, zero revisions, confirmed against
a live control query). If it fails somewhere holding rows, that is correct: a
template with no entity cannot be compiled, and inventing one would put a name we
made up into a legal document. **Staging is unverified** —
`PACTA_STG_DATABASE_URL` is not configured in this checkout.

## What CI has to check that I could not

The tRPC client type. Every workspace package in a worktree resolves through a
shared `node_modules` symlink into the main checkout, so `mcaEntities` and the
new `create` input read as stale locally. Three component errors remain for that
reason alone; everything reached by relative import type-checks clean, and 3,631
unit tests pass.

The E2E rewrite is the other thing CI owns. The provider-interview test drove a
form that no longer exists; it is now two pages — add the entity, then create a
template against it — and it asserts the guarantee that matters: editing the
entity and revising the template leaves revision 1 byte-identical.

## Still owed

- The per-document-type interview. The template builder now picks an entity and
  a document; it does not yet ask anything about the document itself.
- `equipment.affiliateLegalName` needs a widget name agreed with lombard.
