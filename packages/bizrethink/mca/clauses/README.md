# The MCA clause library

The second half of the MCA vertical. `content/` and `prescribed/` are the first
half and are not clauses: they are rule packs, describing what a state demands
of a *disclosure*. This directory holds **our own contract text** — the selectable records of six negotiated agreements — and it is what the agreement
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
| FRPA | **108 records**, including four funding notes and two field groups |
| ISO Partner Referral Agreement | **28 records** |
| Equipment Lease | **30 records** |
| Subscription | **30 records** — the Equipment Lease's twin |
| Split Funding Authorization | **7 records** |
| Permission to Release | **8 records** |
| **Total** | **211 records**; a selection contains only applicable alternatives |
| Approvals, review links, admin surface | implemented; all authored source records remain drafts |
| Selection and numbering | implemented; no merchant rendering or sending path |
| Interview and assembly | future work in Pacta, per [ADR 0010](../../../../docs/adr/0010-agreement-builder-lives-in-pacta.md) |

### Citation contract (ADR 0011 phases 1–4)

A source record has **no `number`**. `selectClauses` filters first, sorts by the
instrument's section order and each record's `sortKey`, then derives consecutive
section and clause numbers. An `unnumberedReason` explicitly identifies a form
grid, preamble, funding note, lead-in or execution block. All other records are
citable. Separate guaranty numbering is still ADR 0011 phase 5.

Use `[[clause:frpa.definitions]]` for a clause reference and
`[[section:reconciliation]]` for a whole section. Opposite rules share the
canonical clause identity through `referenceId`; only one may be selected.
Lettered limbs follow the token, for example `…]](b)`. A cross-instrument
section reference includes its instrument, `[[section:frpa#default]]`.
Missing, duplicate and malformed references fail selection rather than printing
a guessed number. Name the separately signed guaranty when an ungated limit
must also make sense for a funder that selects no guaranty.

Counsel and staff see numbers for a clearly labelled example profile. Every
excluded alternative is shown once with its own example context. Internal slugs
still attach findings and approvals; counsel does not see them as citations.
Clause fingerprints cover source words, fields, semantic targets and conditions;
review-link fingerprints also cover order, the example profile and referenced
instruments. Existing reviews become stale after this migration.

Historical review loci belong to the vendored document, not the new numbering.
Existing Pacta templates require a separate rebuild; selecting this corpus does
not change them. Source documents, review registers and prescribed disclosures
are unchanged.

Nothing here is publishable and nothing renders to a merchant. Every clause is
`attorney-drafted` with a null author, and `library.test.ts` asserts the refusal
one clause at a time rather than trusting the rule is remembered.

### Clause purpose and funder choice (ADR 0014)

Every source record requires `whyThisClause` and `variance`; `requiredBy` has
been removed. Counsel and staff see both answers beside the current wording.
`compelled` identifies prescribed agreement text and its applicability;
`implements` identifies a legal duty addressed by our own wording;
`discretionary` identifies commercial drafting. These are drafting assessments,
not approvals or a statement that the whole clause satisfies its cited law.

A fixed clause has a specific reason and explanation. Fixed describes the
wording available in this library, not a prohibition on a lawful commercial
alternative. It can still have a conditional `includeWhen`: applicability and
an exhaustive wording choice are different. Only a complete group selecting
exactly one clause for every fact value earns `offered`. The current groups are
concurrent purchases, the default clause accompanying guaranty scope, and the
court/arbitration choice. Other clauses accompany those choices without adding
separate elections. Renewal settlement has payoff and carry text, but `none`
selects neither; it is not labeled an exhaustive three-value group.

Both answers enter the clause and review-link fingerprints. Previously stored
approvals lapse, and previously issued review links report changed content.
No database migration, stored-template rebuild or new interview is performed.

The [backfill assessment and source index](../../../../docs/research/mca-clause-metadata-2026-09-12/README.md)
records the classification basis, jurisdiction limits and remaining wording
gaps. The baseline documents remain input, not a specification for this text.

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

## Re-vendoring, when the documents change

```
python3 scripts/mca/revendor.py            # do it
python3 scripts/mca/revendor.py --check    # report drift, write nothing
```

`lombard-contracts` is the source of every document and every review manifest
here; this repository holds copies. When that repository acts on a finding or
edits a `.docx`, these copies go stale **and nothing here notices** — the
digests are taken over our own copy, so they still match.

That is not hypothetical. This script's first `--check` run found the review
register a commit behind: `lombard-contracts` #10 had recorded five findings as
`implemented` and Pacta was still holding them as live work, over-blocking the
approval gate by seven clauses.

**What it deliberately does not do.** It updates the vendored TEXT and prints
the digests that have moved. It does not touch a clause body and does not
re-stamp `bodiesVerifiedAt`. Those two acts assert that a human re-read the
document, and a script cannot make that claim — see rule 3 below.

## Rules for adding a clause

1. **Nothing enters unexamined.** `examinedBy` is required and may not be empty.
   Phase 0's rule was *"anything in this column enters as draft, never as
   library"*, and its reasoning is the one to keep in mind: a clause library
   seeded from unexamined text **launders that text into apparent authority**.
   A clause on a page under a heading and a version number reads as considered
   whoever typed it.
2. **The body is the clause's words, and the `«N»` markers are kept.** Those
   markers are the AcroForm anchors the Lombard pipeline injects and are part of
   what ships.

   **REPLACED 2026-09-10 by [ADR 0012](../../../../docs/adr/0012-the-baseline-document-is-input-not-specification.md).**
   This rule used to read *"the document's words, verbatim"*, enforced by
   `bodies-match-the-document.test.ts`. That test is retired. The baseline
   document is AI-generated from a poorly-drafted source, carries 254 review
   findings and a counsel memo proposing REPLACE IN FULL on 93 of 101 clauses,
   and has never been signed. Requiring a clause to match it was requiring the
   defect. The digest assertion survives separately: it catches a vendored
   document changing underneath us and is not about clause bodies.
3. **The library is upstream; the documents are rendered from it.** Editing a
   body here is how a defect gets fixed. `lombard-contracts` holds the rendered
   documents, the AcroForm pipeline and the two historical reviews — it is no
   longer where clause text comes from.

   **REVERSED 2026-09-10 by ADR 0012.** This rule used to say *"Amend the
   document, then follow it. This library is downstream of `lombard-contracts`."*
4. **A finding attaches by judgement, and the judgement is visible.** REVIEW-01's
   loci name the numbering of the document as it stood then: its
   `iso-a5-clawback-window-and-tiers` is the shipped v2's **A.4**, because the
   fixes that review produced removed a section above it. There is deliberately
   no string match from locus to clause; a match would break exactly when a
   review had been acted on.
5. **A twin is two clauses whose agreement is asserted, not one clause rendered
   twice.** This was the other way round when the field was designed, and the
   documents refused it — see `twins.ts`. The Equipment Lease and the
   Subscription share no vocabulary-bearing sentence, so there is nothing to
   store once; what there is instead is `__tests__/twins.test.ts`, which
   answers REVIEW-02's *"a fix applied to one and not the other is a divergence
   nothing checks for"* by checking for it. `instrument` is consequently
   singular: across 177 clauses not one names a second.
6. **A clause the document does not number still gets imported.** Fourteen FRPA
   clauses carry no number, including the granting clause — the sentence that
   makes the instrument a sale rather than a loan.
   `__tests__/frpa-coverage.test.ts` asserts that nothing in the document is
   missing from the library, which is the direction that fails silently.
7. **Slugs are globally unique**, across instruments as well as within them.
   The lease library learned this when one attorney approval hid another's,
   because approvals are keyed by slug alone.
8. **Reach a clause through `libraryFor`, never by importing an instrument's
   module.** The California disclosure shipped carrying New York's phrasing and
   survived a human reading both regulations side by side; the failure was that
   a caller could reach the wrong text at all. The instruments here are more
   confusable than the states, not less.

## What the tests prove, and what they do not

They prove the words in this directory are the words the documents ship, that
the documents have not moved under them, and that every clause names a review
that read it.

**The twins are checked against each other as well as against their documents.**
`twins.test.ts` asserts that the two number their clauses identically, that
every clause not declared divergent agrees word for word once the vocabulary is
applied, and that every declared divergence still diverges — so the register
cannot go write-only. Five clauses differ in substance (§§3.4–3.8) and ten more
places differ only in wording; both lists are pinned.

They do not prove a clause is any good. The clauses here cite **136 distinct
findings that survived refutation**, of which **43 are still outstanding** — the
other 93 were fixed or rejected, and the two review manifests are what say so.

Both reviews now carry dispositions. REVIEW-02's manifest landed in
lombard-contracts PR #9; before it, all 48 of that review's findings were
`unrecorded` and counted as outstanding, and 19 of them turned out to be fixed.
`unrecorded` remains in the vocabulary for a finding whose manifest does not
name it — which is still true of the refuted ones, and is where the next review
to arrive without a manifest will land.

**`findingsFor` and `outstandingFindingsFor` mean different things and the
difference is the point.** A finding surviving refutation says it was RIGHT.
Whether anybody acted on it is a separate question with its own authoritative
answer, and reading only the first is how this library spent two PRs reporting
more than twice the real backlog. See `__tests__/dispositions.test.ts`.

**REVIEW-01 keeps a manifest; REVIEW-02 does not.** Its dispositions are prose
in `change-notes/16-review-02-document-defects.md` — 23 of 48 fixed, without
saying which in a form anything can read. Every REVIEW-02 finding is therefore
`unrecorded`, counted as outstanding because unknown is not done.

They also do not prove the findings say what a clause claims. The register keeps
`id`, `severity`, `locus` and the finding's one-line statement, and drops the
argument — `evidence`, `consequence`, `fix` — which stays in `lombard-contracts`
where it can be read once rather than copied twice.
