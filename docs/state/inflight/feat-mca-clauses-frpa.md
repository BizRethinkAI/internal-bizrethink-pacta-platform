# feat/mca-clauses-frpa — the FRPA, and the fourteen clauses with no number

**Branch:** `feat/mca-clauses-frpa`. **PR:** #TBD.

101 clauses. Four of six instruments imported; **177 clauses** in the library.

## The finding: a clause library can miss what has no number

Eighty-seven of the FRPA's clauses are numbered `N.M`. Fourteen are not, and a
library that imported only numbers would have dropped every one of them without
a word. They include:

- **The granting clause.** *"Effective as of the Purchase Date, Merchant hereby
  sells, assigns and transfers to Buyer (making Buyer the absolute owner)…"* —
  the sentence that makes this instrument a sale and not a loan, and therefore
  the subject of most of REVIEW-01's work.
- **The definitions** of Workday, Approved Bank Account and Approved Processor,
  which sit between the Section 2 header and §2.1.
- **Section 5's lead-in**, *"Merchant represents, warrants, and covenants that as
  of the Effective Date and during the term of this Agreement:"* — which governs
  all eighteen representations beneath it, and without which none of them is a
  representation at all.

`__tests__/frpa-coverage.test.ts` asserts that **every line of the document is
either inside a clause or declared non-clause with a reason.** No third option,
no default.

**That direction is the one that fails silently.** A clause we invent is caught
by `bodies-match-the-document`; a clause we never noticed is caught by nothing.
It has already cost this corpus twice — ISO PRA §2.6, which postdates one census
and predates the other, and now this.

## 87, not Phase 0's 90

§6.1's fifteen limbs and §6.2's five are enumerated items under a lead-in —
*"Each of the following constitutes an Event of Default hereunder:"* — and a
limb approved apart from its lead-in means nothing, so they live inside those
clauses' bodies. Phase 0's count has now been corrected three times: the Payzli
addressee line that was not a clause, the Subscription Agreement missing
entirely, and this.

## The locus exception, checked rather than assumed

#126 refuses to bind a finding to a clause by matching its locus string, because
the ISO PRA's numbering moved and a match would have been wrong exactly where
the review had been acted on. **That rule stands.** The FRPA is the checked
exception: v4 was locked 2026-05-07 and both reviews ran against v4.

Of 82 clause numbers named in FRPA loci, 75 exist. All seven that do not are
explained and pinned in `FRPA_LOCUS_EXCLUSIONS`:

| | |
|---|---|
| §6.5 | deleted outright by option (a) of REVIEW-01's own fix — the finding that led to #129 |
| §1.3, §1.4, §1.5 | Section 1 form-grid fields, not prose clauses |
| §3.5, §3.6, §3.14 | the twins' numbers, in cross-document loci |

A test asserts the set is exactly those seven, so the exception cannot widen
into the rule it is an exception to.

## `instrument` is singular now, and the corpus is why

The plural existed so a clause published in two agreements could be stored once
and be unable to diverge — aimed at the Equipment Lease and the Subscription.
Those two are one document with its vocabulary swapped, but the swap was made by
hand and is not a function, so they share no vocabulary-bearing sentence and
there was never anything to store once.

**Across 177 clauses of four instruments, not one names a second.** A field with
no user reads as evidence that sharing happens here; it does not. `twins.ts`
does the job instead, by asserting the two documents' agreement rather than
generating it.

Widening it back is a small, deliberate change if a genuinely shared clause ever
appears — the same argument `jurisdictions.ts` makes about a federal disclosure.

## Two fixes to shared code, found by this import

- `linesNotAccountedFor` matched headings without their numbers, so every
  heading in the document read as unaccounted. The document prints
  "2.1 Sales of Receipts; Not a Loan" as one line; the clause holds the number
  and heading apart.
- Number-uniqueness now applies to `N.M` only. Fourteen clauses carry no number
  and three carry "Appendix A" — the document's designation for a section of
  three paragraphs, not an identifier for one. Forcing uniqueness would invent
  numbers the document does not have, which is precisely what a later reader
  would try to "fix" against it.

## Still open

Unchanged: agreement-builder placement, `/admin/mca` summary honesty, counsel.
The `instruments` question is now settled and closed.

**Two instruments remain** — the Payzli Split Funding Authorization and the
Permission to Release. Both are letters with no numbered clauses, so both are
mostly a coverage exercise rather than an import.
