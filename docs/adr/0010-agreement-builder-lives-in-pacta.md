# ADR 0010 — The MCA agreement builder lives in Pacta

- **Status:** Accepted
- **Date recorded:** 2026-09-08
- **Decision date:** 2026-09-08

## Context

The MCA vertical's deliverable is an agreement builder: answer an interview,
get an assembled set of documents for a merchant cash advance. Where it should
live was left open through five PRs and is recorded in each of their in-flight
notes as an owner decision, because it is not an engineering question with a
right answer.

Two candidates, and the case for each is real.

**`lombard-platform`** already computes the numbers. `src/lib/disclosure-math.ts`
produces the disclosure figures, and the deal facts — purchase price, factor
rate, specified percentage, term — originate there. A builder there needs no
integration to get them.

**Pacta** already holds everything else. The clause library is here: 192 clauses
across six instruments, their provenance, the two review registers and the
dispositions. So is the machinery a builder needs — a rule-pack conformity
checker, `assertPublishable`, per-clause approval, tokenised counsel review, PDF
rendering, and an envelope to send the result for signature. All of it exists
and is exercised by the lease builder, which is the same shape of product.

## Decision

**The agreement builder lives in Pacta.** Owner's decision, 2026-09-08.

`lombard-platform` keeps computing the numbers and stays the source of the
deal's facts. Pacta assembles the document set from them.

## Consequences

**The boundary is facts in, documents out.** Pacta does not compute a
disclosure figure and `lombard-platform` does not hold clause text. That line is
already drawn and already argued for in `mca/README.md`, which explains why
`instance/` checks identities between numbers printed on documents and contains
no calculator: *"Two calculators drift, and when they disagree there is no
principled way to say which is right."* The same reasoning puts the builder on
the side that owns the words.

**The three `handoff` findings become Pacta's.** REVIEW-02 produced three owner
decisions that were not document edits but *builder facts* — `usesDbaName`,
`guarantorCount`, and which entity contracts with ISO partners.
`REVIEW-02-manifest.json` records them as `handoff` to `pacta-clause-library`,
and they stay outstanding until the interview holds the conditional. That
attribution was written on the assumption this ADR would land this way; had it
gone the other way, three manifest entries in another repository would have been
wrong.

**A second consequence, less obvious.** The lease builder and the MCA builder
now live in one codebase and will be tempted to share an engine. They should not
share one before they have shared *requirements*: the lease engine selects
clauses on `ClauseFacts` for a single document, and an MCA deal is a SET of
documents of which one is a regulator-prescribed form the library may not edit.
Sharing what they genuinely share — provenance, approval, review, rendering —
is already done and was done by extraction, not by anticipation
([ADR 0008](0008-mca-is-two-surfaces-not-one.md) records
`packages/bizrethink/provenance/` moving out of the lease vertical for exactly
this reason). The engine is not on that list yet.

## Alternatives rejected

**`lombard-platform`, because the numbers are there.** It puts the clause
library on one side of a network boundary and the thing that selects from it on
the other, so every clause edit becomes a deployment of two services and the
provenance gate stops being a function call. `assertPublishable` guards text
reaching a third party; it is worth much less as an HTTP response somebody can
fail to check.

**Both, with a thin builder in each.** Two builders assembling documents from
one library is the twin problem again, one level up — and the twin problem is
the one this vertical has already paid for twice.

**Defer until the interview is designed.** The interview is the first thing that
would have been built in the wrong repository. Deciding after it is the
expensive order, which is why it was carried as an open decision rather than
quietly settled by whoever built first.
