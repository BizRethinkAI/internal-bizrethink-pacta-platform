# ADR 0008 — The MCA vertical is two surfaces, not one

- **Status:** Accepted
- **Date recorded:** 2026-09-06
- **Decision date:** 2026-09-06

## Context

Pacta's second vertical is merchant cash advance, built beside the lease
builder. The obvious plan is to copy what works: the lease library is one
admin page (`/admin/lease-library`) listing every clause with its provenance,
where an attorney's approval is recorded per clause and a clause renders to a
third party only once approved.

Applying that shape wholesale to MCA is a category error, and the error is not
obvious until the corpus is examined. MCA's 22 documents split unevenly:

| | count | whose words |
|---|---:|---|
| Regulator-prescribed disclosure forms | 17 | **the regulator's** |
| Negotiated agreements (FRPA, ISO PRA, Subscription, Equipment Lease, Payzli) | 5 | **ours** — 140 numbered clauses |

The lease library's central promise is *"a clause reaches a third party only
once an attorney has approved the exact words below."* That promise is coherent
for text we wrote. It is incoherent for 10 CCR §914, whose words California
prescribes and closes with "shall include only": there is nothing for counsel to
approve, an approval would assert authority counsel does not have over a
regulator's text, and editing the text to satisfy a reviewer would be the
defect rather than the fix.

## Decision

**Treat the MCA vertical as two products with two surfaces and two release
paths, sharing one provenance gate.**

### 1. Conformity — the prescribed forms

Read-only. Shows, per state: which statute the spec was transcribed from, when
the words and the structure were each last verified, whether the vendored
source's digest still matches, which rows the checker can only read the label
of, and which questions are open for counsel as *readings* rather than
approvals.

No approval workflow. `ClauseSource` carries the
`regulator-prescribed-form` variant, whose two verification dates —
`verbatimVerifiedAt` and `structureVerifiedAt` — replace the author field
precisely because there is no author to name.

### 2. The clause library — the negotiated agreements

A near-exact sibling of `/admin/lease-library`: 140 clauses, our prose, per
clause approval by counsel under their name and bar number, approval pinned to
exact wording and lapsing on edit, and the same read-only counsel review link.

### Shared

`packages/bizrethink/provenance/` — `ClauseSource`, `assertPublishable`,
`HasProvenance`. Extracted out of the lease vertical in PR #105 for this reason:
provenance is a property of text, not of tenancy, and a merchant-cash-advance
package importing from a rental-lease package would have been worse than moving
it.

## Consequences

**The two halves have different blockers, and this is the point of the ADR.**

Conformity can reach production **without an attorney**, because the words are
already the regulator's. The clause library **cannot** reach production without
one: every clause is `attorney-drafted`, and `assertPublishable` refuses
`attorney-drafted` with a null author by design.

So they ship in that order, and the clause library's timeline belongs to
counsel rather than to engineering. Sequencing them the other way — or treating
them as one release — makes the half that could have shipped wait on the half
that cannot.

**A second consequence, less obvious.** Because the conformity surface has no
approval workflow, it has no mechanism by which a human is *forced* to look at
it. The lease library's approval step is also its read step. Nothing equivalent
exists here, and the rows the checker can only see the label of — five of New
York's eleven, four of California's ten, where the regulation prescribes "a
short explanation" and supplies none — still need human eyes. `coverage()`
reports that number so a green suite cannot be mistaken for a clean form, but
reporting it is not the same as anyone reading it.

## Alternatives rejected

**One library with a `kind` discriminator.** Cheaper to build, and it puts an
Approve button on text no one may approve. The first person to press it records
an attorney's name against California's words.

**Prescribed forms as `court-approved-form`.** That variant exists to answer
the unauthorised-practice question — those forms exist so non-lawyers may
complete them. A regulator-prescribed disclosure carries no UPL implication;
reusing the variant would conflate two unrelated legal properties.

**Deferring conformity until counsel is engaged.** Would leave eleven states
verified in a package nothing can import, for no benefit, while waiting on a
dependency it does not have.
