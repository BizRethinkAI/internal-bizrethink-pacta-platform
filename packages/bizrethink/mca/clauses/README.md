# The MCA clause library

The second half of the MCA vertical. `content/` and `prescribed/` are the first
half and are not clauses: they are rule packs, describing what a state demands
of a *disclosure*. This directory holds **our own contract text** — the 140
numbered clauses of the negotiated agreements — and it is what the agreement
builder will select from.

[ADR 0008](../../../../docs/adr/0008-mca-is-two-surfaces-not-one.md) explains
why these are two surfaces rather than one, and it comes down to whose words
they are. Approving 10 CCR §914 would be a category error: California wrote it
and there is nothing for counsel to approve. Approving *these* clauses is
exactly what counsel is for.

[ADR 0009](../../../../docs/adr/0009-counsel-is-parallel-not-a-gate.md) is why
the directory exists at all right now. Counsel is a parallel track, not a
prerequisite: `assertPublishable` gates text reaching a **third party**, not
text being written down.

## Status

| | |
|---|---|
| ISO Partner Referral Agreement | **24 clauses, imported** |
| FRPA | not imported — 90 clauses |
| Equipment Lease | not imported — 25 clauses |
| Subscription | not imported — the Equipment Lease's twin |
| Payzli Split Funding Authorization | no numbered clauses; it is a letter |
| Permission to Release | no numbered clauses |
| Approvals, review links, an admin surface | not built |
| Interview, engine, assembly | not built |

Nothing here is publishable and nothing renders to a merchant. Every clause is
`attorney-drafted` with a null author, and `library.test.ts` asserts the refusal
one clause at a time rather than trusting the rule is remembered.

## The three axes, and why they are three

`jurisdictions.ts` argues at length that folding a second thing into
`McaJurisdiction` destroys the property that makes adding a twelfth state safe.
The same argument produces a third axis here rather than a wider second one.

| axis | question it answers | lives in |
|---|---|---|
| `McaJurisdiction` | which state's law is this form a creature of | `../jurisdictions.ts` |
| `McaTransactionType` | which kind of financing is it prescribed for | `../transactions.ts` |
| `McaInstrument` | **which of our agreements is this clause in** | `instruments.ts` |

A clause also carries `appliesInStates`, and that is `McaJurisdiction` used for
a different relation — not "this form IS prescribed by that state" but "this
clause is here because of that state's law". ISO PRA 2.6 names two states,
because 10 CCR §952 and 23 NYCRR §600.21 both regulate what a broker may hand a
recipient. Putting the relation in the field name is what keeps
`disclosuresFor`'s exact-equality filter meaning what it says.

## Rules for adding a clause

1. **Nothing enters unexamined.** `examinedBy` is required and may not be empty.
   Phase 0's rule was *"anything in this column enters as draft, never as
   library"*, and its reasoning is the one to keep in mind: a clause library
   seeded from unexamined text **launders that text into apparent authority**.
   A clause on a page under a heading and a version number reads as considered
   whoever typed it.
2. **The body is the document's words, verbatim, `«N»` markers and all.** Those
   markers are the AcroForm anchors the Lombard pipeline injects and they are
   part of what ships. Tidying them out would make
   `bodies-match-the-document.test.ts` a check against a cleaned-up copy of the
   agreement rather than against the agreement.
3. **Amend the document, then follow it.** This library is downstream of
   `lombard-contracts`. Editing a body here to fix a defect turns the test red,
   which is correct — the fix belongs in the `.docx`, and this file is
   re-derived after it.
4. **A finding attaches by judgement, and the judgement is visible.** REVIEW-01's
   loci name the numbering of the document as it stood then: its
   `iso-a5-clawback-window-and-tiers` is the shipped v2's **A.4**, because the
   fixes that review produced removed a section above it. There is deliberately
   no string match from locus to clause; a match would break exactly when a
   review had been acted on.
5. **A clause published in two agreements is one clause with two instruments.**
   Not two clauses that agree. The Equipment Lease and the Subscription are the
   same document with its vocabulary swapped and its numbering identical, and
   REVIEW-02's finding is the reason this matters: *every Equipment Lease
   finding lands twice, in two live templates, and a fix applied to one and not
   the other is a divergence nothing checks for.*
6. **Slugs are globally unique**, across instruments as well as within them.
   The lease library learned this when one attorney approval hid another's,
   because approvals are keyed by slug alone.
7. **Reach a clause through `libraryFor`, never by importing an instrument's
   module.** The California disclosure shipped carrying New York's phrasing and
   survived a human reading both regulations side by side; the failure was that
   a caller could reach the wrong text at all. The instruments here are more
   confusable than the states, not less.

## What the tests prove, and what they do not

They prove the words in this directory are the words the documents ship, that
the documents have not moved under them, and that every clause names a review
that read it.

They do not prove a clause is any good. The twenty-four ISO PRA clauses cite
**seventeen distinct findings, every one of which survived refutation** — a
blocker against the clawback tiers, a broker-status question routed to counsel,
a remedy that sends a merchant's refund to the wrong party. A green suite means
the record is intact, not that the record is empty, and
`bodies-match-the-document.test.ts` asserts those counts so the difference
cannot be lost by accident. `findingsFor` and `outstandingFindingsFor` are how a
surface shows it.

They also do not prove the findings say what a clause claims. The register keeps
`id`, `severity`, `locus` and the finding's one-line statement, and drops the
argument — `evidence`, `consequence`, `fix` — which stays in `lombard-contracts`
where it can be read once rather than copied twice.
