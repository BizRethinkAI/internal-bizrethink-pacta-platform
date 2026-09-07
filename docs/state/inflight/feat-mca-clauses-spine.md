# feat/mca-clauses-spine — the MCA clause library exists, and one agreement is in it

**Branch:** `feat/mca-clauses-spine`. **PR:** #TBD.

`packages/bizrethink/mca/clauses/` did not exist. It does now, with the ISO
Partner Referral Agreement's twenty-four clauses in it and four guards holding
the shape.

This is the first of six instruments. It is deliberately not the biggest one.

## What this is for, so the next session does not lose it

**The deliverable is the agreement builder.** The clause library is what it
selects from; the conformity layer already built is what it must not violate.
A session that treats the conformity layer as the product has lost the thread —
and that is an easy thread to lose, because `mca/README.md` said "Phase 1 is
here: the conformity checker" and read as though the package were finished. It
now opens with the two-surface split and points at `clauses/`.

The mapping from the lease product, which is the build plan:

| lease | mca | |
|---|---|---|
| `rule-packs/` | `content/` + `prescribed/` | built |
| `clauses/` | `clauses/` | **this PR — the spine, plus 1 of 6 instruments** |
| `interview/` | `interview/` | not started |
| `engine/` | `engine/` | not started |
| `documents/` + `render/` | | not started |
| `review/` | | not started |

## The three design decisions

**1. `McaInstrument` is a third axis, not a wider `McaJurisdiction`.**
`jurisdictions.ts` argues at length that folding a second thing into that type
destroys the property making a twelfth state safe to add. The same argument
produces a third axis rather than a wider second one: nothing in the negotiated
corpus is a creature of any state's law, so the question that organises a clause
is simply which of our agreements it is in.

`appliesInStates` is `McaJurisdiction` used for a **different relation** — not
"this form IS prescribed by that state" but "this clause is here because of that
state's law". ISO PRA 2.6 names two, because 10 CCR §952 and 23 NYCRR §600.21
both regulate what a broker may hand a recipient.

**2. `instruments` is plural, and that is the twin defence.** REVIEW-02:
*"the Subscription and the Equipment Lease are the same document with
terminology swapped, clause numbering identical. Every Equipment Lease finding
therefore lands twice, in two live templates, and a fix applied to one and not
the other is a divergence nothing checks for."* One clause in two instruments
cannot diverge. Two clauses that agree today can, on the next edit. Nothing
exercises the plural yet — the twins are Phase 2 — but the field is what makes
that phase an import rather than a rewrite.

**3. `examinedBy` is required and non-empty.** Phase 0's rule was *"anything in
this column enters as draft, never as library"*, and its reasoning is the point:
**a clause library seeded from unexamined text launders that text into apparent
authority.** A clause on a page under a heading and a version number reads as
considered whoever typed it and however little anybody looked. The rule was
prose and nothing could check it; it is now structural.

## What the checks buy, stated narrowly

- Every body and heading is re-found in the vendored document on every run, and
  the document is pinned by digest. This is `provenance/source-text.ts`'s
  argument pointed at our own documents. There, a regulator amends a rule under
  a spec still quoting the old wording. Here, somebody edits the `.docx`,
  re-renders, republishes — and the library keeps asserting a superseded
  sentence with a date beside it.
- A finding id a clause cites is a finding that was really raised, in a review
  that really ran, and whether it survived. It does **not** prove the finding
  says what the clause claims. The argument stays in `lombard-contracts`,
  because two copies of a finding drift and the copy in the clause file is the
  one nobody re-reads.
- **No string match from a review's locus to a clause, deliberately.**
  REVIEW-01's `iso-a5-clawback-window-and-tiers` is against "§A.5 Clawback
  Provision"; the shipped v2 numbers that clause **A.4**, because the fixes that
  review produced removed a section above it. A match would break precisely when
  a review had been acted on.

## Three things found while writing it

**A finding id is not unique.** REVIEW-01 uses
`frpa-cross-reference-titles-wrong` for two different findings — one against the
Florida, Georgia and Kansas disclosures, one against Louisiana, Missouri, Texas
and Utah. Found by the test that assumed otherwise. A map keyed by id would have
kept one and dropped the other in silence, so the register resolves an id to a
LIST and `AMBIGUOUS_FINDING_IDS` names the collision; a test pins the set at
exactly that one. **Worth fixing upstream in `lombard-contracts`, where the
duplicate actually is.**

**ISO PRA §2.6 fell between the two censuses and nothing would have said so.**
It did not exist when REVIEW-01 ran — that review's
`iso-no-952-transmission-or-evidence-clause` reports its absence and names §2.1
as the nearest hook — so it was added afterwards, in answer to the finding. And
it is not in Phase 0's appendix of unexamined clauses either, because that list
was built before it was counted. **A clause added between a review and a census
appears in neither, and the census meant to find unexamined text reported this
document fully covered.** REVIEW-02 read it in passing, against 1.6, and raised
nothing. That is the examination recorded, it is thinner than it looks, and it
is the strongest claim the record supports. There are five more agreements to
import and no reason to think this is the only one.

**A refuted finding is a different shape and padding it would be a lie.** The
reviews record one as `id`, `finding` and `why` — no severity, no route, because
a withdrawn finding has neither. Filling those with empty strings would print
"severity: " beside a refuted finding and read as missing data.

## Still open — and these are the owner's, not mine

1. **Where the agreement builder lives** — Pacta, or `lombard-platform`, which
   computes the numbers. Unblocked for now: the clause library belongs in Pacta
   under ADR 0008 either way. It becomes its own ADR when decided, and it wants
   deciding before `engine/` is built rather than after.
2. **`/admin/mca` summary honesty.** The "15 of 15" banner cannot move when a
   vendored digest goes stale. Open on #118's review; `fix/ga-primary-text`
   found its sharpest instance — Georgia's card said nothing about having been
   verified against a secondary source, and the view model has no notion of
   source strength.
3. **Counsel: who, when, budget.** No longer blocks the build (ADR 0009). The
   backlog keeps accruing either way: seventeen surviving findings on this one
   agreement, of which the broker-status question and the CA §952 route are
   counsel's.

## Not done, on purpose

- **No `includeWhen` and no `variables`.** Both belong to the engine, which is
  not built. This package has already paid for forward scaffolding once: the AI
  config asked for a GCP project id, a location AND an API key for four months
  before anything read any of them, and shaped a UI around the wrong product.
  A facts type should be derived from what the clauses actually branch on.
- **No admin surface, no approvals, no review link.** ADR 0009 names
  generalising `BizrethinkLibraryReview` as its own piece of work — it is
  lease-bound in two places, its `jurisdiction` field and
  `lease/review/readable-lease.ts`.
- **Nothing was published and no template was edited.** Publishing goes through
  the UI, never REST, and never from a session.
