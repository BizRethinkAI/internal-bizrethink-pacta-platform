# ADR 0022 — An MCA deal is saved input, never a saved document

- **Status:** Accepted
- **Date recorded:** 2026-09-17
- **Decision date:** 2026-09-17 (repository owner directed the work; the shape
  below is this session's, and the parts worth arguing with are named)
- **Amends:** [ADR 0020](0020-mca-decisions-consolidated.md) §6.3, which records
  transaction filling as stateless "in this bounded release". It stops being
  stateless. Everything else in §6 stands.

## Context

A transaction interview holds a merchant's identity, the funding figures, the
guarantors and the signers, and **loses all of it on reload**. That was the right
call for a first release: it shipped an internal drafting tool without adding a
storage lifecycle while legal clearance was outstanding.

It also makes the builder unusable for real work. A deal is not filled in one
sitting: a figure is wrong, a guarantor's details arrive later, somebody reloads
the page. Today each of those starts again from an empty form, and the only way
to keep a draft is to leave a browser tab open.

Nothing about counsel review changes this. [ADR 0009](0009-counsel-is-parallel-not-a-gate.md)
settles that counsel gates text reaching a third party, not work being done.
Saving a deal sends nothing to anybody.

## Decision

**A deal is saved as the answers, scoped to one team, and a document is
recompiled from them. The assembled legal text is never stored.**

### 1. What is stored

The validated `McaDraftInput` and nothing else: the reference, the supplied
values, the equipment election, report subjects, guarantors and signers. The
record names the template and the **exact revision** it was filled against.

**The assembled document is not stored.** Reopening a deal recompiles it from
the saved template revision, exactly as filling it fresh does — so a deal cannot
carry stale legal text forward silently, and there is no archived copy to be
mistaken for an executed one. This follows [ADR 0016](0016-mca-provider-template-revisions.md),
which already refuses to return archived text from profile retrieval.

### 2. What this stores about a merchant, and what it cannot

The input schema already refuses full identifiers: a merchant tax identifier is
an EIN or a masked personal identifier, a deposit account identifier must be
masked, and there is no full SSN slot anywhere. Saving the input therefore stores
**business identity, contact details, funding figures and masked identifiers** —
and cannot store an unmasked personal identifier, because the schema will not
accept one.

**The lease vertical already stores its answers** in `BizrethinkLeaseMatter`
(`facts`, `money`, `values`), including tenant names and addresses. This is the
same shape of data at rest, under the same tenancy rules.

**No signature, signed date, processor acceptance or approval can be stored**,
because the fill contract refuses to accept them as input in the first place.

### 3. A deal can be deleted, and deletion is real

A draft holds a merchant's details for a deal that may never happen. Keeping it
forever is not caution, it is accumulation. A team member with access may delete
a draft, and the row goes; there is no soft-delete tombstone holding the same
data under a flag.

Nothing is retained elsewhere: no assembled text was stored, and the audit of who
did what lives in the record's own actor and timestamp columns until the row is
removed.

### 4. Access follows the template, with one deliberate difference

Every endpoint checks live team membership before the `mca-builder` grant, binds
the deal to its team and organisation, and rejects a disabled account — the same
boundaries [ADR 0016](0016-mca-provider-template-revisions.md) set for templates.

**The difference: writing a deal does not require team ADMIN or MANAGER.**
Provider policy is the funder's programme and is restricted to its managers;
filling a deal is the ordinary work of whoever is granted the builder. Rendering
an internal draft still needs the separate `mca-clause-draft-rendering` grant.

### 5. Concurrency fails loudly

A save carries the version it was loaded at and is refused if the stored version
has moved, in the same compare-and-swap shape as a template revision. Two people
editing one deal is a conflict to report, not a silent last-write-wins — the
values are contract figures.

### 6. Saving is not readiness

A saved deal is an internal draft. `readyToSend` stays `false`, every blocker
still applies on every recompile, and **none of the guards weakens because the
input is now durable**. In particular the venue guards, the missing-input list
and the source-freshness check run on the saved input exactly as they run on
typed input.

## Consequences

The builder becomes usable for real work: a deal survives a reload, can be
handed between two people on the same team, and can be corrected without
retyping.

**It also puts merchant details at rest in Pacta's database for the first time
in this vertical.** That is the cost, it is stated rather than buried, and the
mitigations are the schema's refusal of unmasked identifiers, tenancy scoping,
and deletion that actually deletes.

**A saved deal is not a record of anything.** It is not evidence of an offer, an
agreement, a disclosure or an acceptance, and nothing in this release lets it
become one. When a merchant path exists it will have to decide what to retain at
that moment, which is a different question with different rules.

## Alternatives rejected

**Keep it stateless and add browser storage.** Puts merchant identity in a
browser profile instead of a scoped database row, makes handover between two
people impossible, and loses the work on a different machine. Worse on every axis
that matters.

**Store the assembled document with the deal.** Fast to reopen, and it would let
a stale document be reissued after its template revision moved. The recompile is
the check.

**Store only non-sensitive fields and re-ask for identity.** Half a feature: the
identity fields are most of what somebody does not want to retype.
