# ADR 0025 — What the MCA vertical is for

- **Status:** Accepted
- **Date recorded:** 2026-09-17
- **Decision date:** 2026-09-17 (repository owner, stated directly and in their
  own framing; the checks against the code below are this session's)
- **Amends:** [ADR 0020](0020-mca-decisions-consolidated.md) §1 and §6.3
- **Completes:** [ADR 0023](0023-pacta-produces-mca-templates.md) and
  [ADR 0024](0024-pacta-is-custodian-of-every-mca-template.md), which settled
  *who produces templates* without ever settling *that a template is the thing
  being produced*

## Context

The purpose of this vertical had been recorded in pieces across ADRs 0008 to
0024, and in the gaps between those pieces it drifted somewhere nobody chose:
**the only artifact the builder can render is a filled deal document.** Not
because that was decided — it never was, and a per-deal interview had already
been rejected once — but because the first renderer needed something to put in
the fields, and nothing afterwards questioned it.

Asked to state the purpose, the owner did. Checking the code against that
statement found three divergences, and this ADR settles all three.

## The purpose

1. **It is a template builder for entities in the merchant cash advance funding
   business.** It is not a contract builder, an agreement builder or a lease
   builder.
2. **It is the custodian** of MCA clauses, state-specific requirements, and the
   changing legal landscape around merchant cash advance.
3. **Its primary responsibility is keeping that library current** — clauses,
   state disclosures, and state requirements such as registration.
4. **It gives an entity an interview about that entity's own business**, and
   produces templates from the answers.
5. **Those templates are used by the entity's own API** to create and send
   envelopes. That path is already robust and in production with CircularPay and
   Lombard. **It is not what this vertical is solving.** What is being solved is
   producing the entity-specific templates it consumes.

## Decision

### 1. The artifact is a template, and a deal never enters this vertical

The transaction path is recast as a **template preview driven by specimen
values** belonging to the template. It stops accepting a merchant's legal name,
guarantors, signers, deposit account or funding figures.

This amends [ADR 0020](0020-mca-decisions-consolidated.md) §6.3, which recorded
a per-deal fill as stateless; it now records no per-deal fill at all.

**The renderer's primary output becomes the template** — widgets under the
published names, native signer placeholders — and the preview serves it. Until
now this was inverted: the internal draft was the only thing that existed and
merchant-ready was a second mode being added beside it.

**The consequence worth naming: the question of merchant identity at rest in
Pacta stops existing.** It has been circled repeatedly — in the schema's refusal
of unmasked identifiers, in a closed pull request, in the stateless rule. A
vertical that never receives a merchant's details does not need a rule about
keeping them.

### 2. Registration and licensing duties are in scope

A state's requirements on a funder who wants to operate there — registration,
thresholds, renewals, broker rules — are part of the landscape this library is
custodian of. They are held **the same way the disclosures are**: quoted
verbatim from the vendored source, cited to section, re-matched on every run,
and **verified, never approved**.

They are surfaced as *what the statute says*, never as advice about what an
entity must do. That distinction is the one [ADR 0008](0008-mca-is-two-surfaces-not-one.md)
already draws between regulator text and authored text, applied to a third kind
of obligation.

This reverses the exclusion in `mca/content/types.ts`, which today narrows label
checks to exclude "definitions, exemptions and registration duties".
`mca/statutes/ct-va-obligations.ts` already records some of this for Connecticut
and Virginia, and usefully records which obligations it cannot check — that is
the shape to extend, not to replace.

### 3. Keeping the library current needs a mechanism, and it is deferred on purpose

**Today nothing detects that a statute has changed.** The provenance checkers
verify that our vendored copy still matches itself, character by character. That
catches our own drift from the copy. It cannot catch the copy drifting from the
law, and `reviewIsStale` measures something else again — our library moving
relative to a counsel review.

For a vertical whose stated primary responsibility is keeping the library
current, that is a hole in the middle of the purpose.

**The mechanism is a monthly change-detection job** that compares each official
source against the stored copy and raises the difference for a human to read.
**It is deferred to a later phase**, deliberately: the template builder is the
work in front of us and finishing it comes first.

It is written here so that it is not dropped. When it is built it must:

- compare the **official source** with the vendored copy, not the vendored copy
  with itself;
- report a difference rather than resolve one — a statute that moved is a
  reading task, not a merge;
- fail loudly when a source cannot be fetched, because a check that silently
  stops running is worse than no check;
- be able to say, per source, when it was last successfully compared.

## Consequences

**ADR 0020 §1.1 should be read as "templates", not "documents".** Its wording —
"the result is a set of documents for one funder's product" — describes the
output of a deal, and the output is a template a funder sends many deals
through.

**ADR 0020 §1.2 needs its boundary drawn more sharply.** "Facts in, documents
out" reads as though deal facts arrive here. They do not, and after this ADR
they cannot. A funder's platform supplies deal values to a **published
template** through `POST /api/v2/template/use` — which Pacta serves as an
e-signature platform, and which no MCA code is in the path of.
**The MCA vertical's boundary ends at publication.**

**The work already in flight keeps its direction.** The parity measurements
(#289, #290, #292, #293), the injector (#291) and the publication record (#295)
are all about producing and recording templates. Nothing in them assumes a deal.

**The merchant-ready renderer stops being a second mode** and becomes the
renderer. That is a simplification of work not yet written, not a rewrite of
work already done.

## What this does not decide

- **What specimen values look like**, or whether an entity may supply its own.
  The first template preview will make that concrete.
- **Which registration obligations are modelled first.** Connecticut and
  Virginia already have a partial record; the order for the rest is a separate
  question from whether they belong here.
- **Anything about the entity's own sending path.** It works, it is in
  production, and it is out of scope.
