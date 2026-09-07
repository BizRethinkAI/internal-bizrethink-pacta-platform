# ADR 0009 — Counsel review runs alongside the MCA clause library, not before it

- **Status:** Accepted
- **Date recorded:** 2026-09-07
- **Decision date:** 2026-09-07
- **Supersedes:** the sequencing in [ADR 0008](0008-mca-is-two-surfaces-not-one.md). Everything else in 0008 stands.

## Context

ADR 0008 established that the MCA vertical is two surfaces, and drew a
consequence from it that was half right:

> Conformity can reach production **without an attorney** ... The clause library
> **cannot** ... So they ship in that order, and the clause library's timeline
> belongs to counsel rather than to engineering.

The first sentence is correct. The conclusion does not follow, and the roadmap
built on it put *counsel engagement* as a phase that **blocked** building the
clause library at all.

The lease builder had already disproved this and nobody noticed. Its library
holds **81 clauses and zero approvals**. It was designed, built, rendered,
grouped by jurisdiction, and given a counsel review link — none of which waited
on an attorney. What it cannot do is send an unapproved clause to a tenant.

The owner spotted the error directly: *"we use Pacta to send counsel the
clauses for review, so why is counsel engagement a blocker? Build it like
rental lease and once we have everything, we send it to counsel for review."*

## Decision

**Counsel is a parallel track, not a prerequisite.** Build the MCA clause
library to completion, then send it for review through the existing mechanism.

What genuinely requires an attorney is one step, and it is the last one:

| activity | needs counsel |
|---|---|
| Authoring the 140 clauses with their provenance | no |
| Rendering them for a BizRethink-internal organisation | no |
| Reviewing them internally | no |
| Sending them to counsel through a review link | no — that is what the link is for |
| **Publishing — a clause reaching a merchant** | **yes** |

`assertPublishable` refuses `attorney-drafted` with a null author. That is a
gate on text reaching a third party, not on writing it down, and conflating the
two is what produced the wrong order.

### What this changes in the roadmap

The phase formerly called *"counsel engagement"* is removed as a blocking
phase. Building the clause library is unblocked immediately. Two pieces of work
that were hidden behind it become visible and are now explicit:

1. **Read the 47 clauses no review has examined.** Ours to do, before counsel
   sees them. Sending an attorney 140 clauses of which a third have had no
   internal read is paying counsel rates to find what a careful read catches.
2. **Generalise the review link.** `BizrethinkLibraryReview` is generic in
   shape — token, reviewer, status, and a fingerprint of exactly which clauses
   in exactly which words were sent. Two things are lease-bound: its
   `jurisdiction` field is documented as a `ClauseJurisdiction` (`US-FL`,
   `US-NC`), where MCA has its own deliberately separate `McaJurisdiction`; and
   the rendering lives in `lease/review/readable-lease.ts`, which renders a
   lease. The machinery is reusable with a lease-shaped hole in the middle.

## Consequences

The clause library's timeline belongs to engineering again. Counsel's belongs
to counsel, and the two overlap instead of queueing.

**The counsel questions keep accumulating either way, and that is the real
cost.** Three from the #108 review — CA §914(a)(2)(C)(iii), the
`prose-described` row-order reading, Kansas's prescribed label — plus five
`UNRESOLVED_READINGS` from #112, of which the term unit and the direction of
the (a)(3) relative test each **change verdicts**. Every one is pinned by a test
so it cannot be smoothed over, and every one is a check running on an
assumption. Making counsel parallel does not reduce that backlog; it stops the
backlog from also holding up the build.

## What 0008 got right and keeps

The two-surface split, the reasoning for it, and the rejected alternatives all
stand. Conformity still gets a read-only surface with no approval workflow,
because approving a regulator's words remains a category error. Only the claim
that the clause library must wait is withdrawn.
