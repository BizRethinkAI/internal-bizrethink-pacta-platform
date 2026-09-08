# feat/mca-last-instruments — the corpus is complete, and the census was wrong three times

**Branch:** `feat/mca-last-instruments`. **PR:** #131.

Two things: the review register now reads REVIEW-02's dispositions, and the last
two instruments are imported. **192 clauses, six of six instruments.**

## The register can finally tell fixed from live

`lombard-contracts` PR #9 gave REVIEW-02 a manifest. Before it, all 48 of that
review's findings were `unrecorded` — unknown, and counted as outstanding
because unknown is not done.

**Nineteen of them were already fixed.** Outstanding across the library falls
from **58 to 43**, on top of the 23 that #129 had already removed. The number
now means "genuinely outstanding" rather than "nobody wrote it down".

`unrecorded` stays in the vocabulary and is not dead: it is what a finding gets
when its manifest does not name it — still true of the refuted ones in both
reviews — and it is where the next review to arrive without a manifest lands, on
an honest answer rather than a default that looks like one.

## Phase 0's census was wrong about both letters, in opposite directions

| document | Phase 0 says | actually |
|---|---|---|
| Payzli Split Funding Authorization | 1 clause, unexamined | **7 paragraphs**, and the "clause" was the letterhead |
| Permission to Release | **0 clauses** | **8**, with six REVIEW-01 findings against them |

Phase 0's appendix lists `3350 Buschwood Park Drive, Suite 150, Tampa, FL 33618`
as the Payzli document's one unexamined clause. REVIEW-02 caught it: *"The
extraction that built the appendix appears to have read a paragraph beginning
`3350` the same way it read `3.15`."* The Permission to Release it recorded as
empty.

**That is the third and fourth correction, and the pattern is now unmistakable:
the census keyed on `N.M` numbering.** A document numbered `1.` came out empty;
a document numbered not at all came out with an address in it. The earlier
corrections — the Subscription Agreement missing entirely, the FRPA's fourteen
unnumbered clauses — are the same fault seen from other angles.

**Coverage is the check that does not care how a document is numbered**, and it
now runs over three instruments.

## Why the Permission to Release mattered more than a count

§3 and §4 are the credit-bureau and FCRA authorisations. REVIEW-02's
`frpa-4-3-consumer-report-authority-depends-on-a-separate-instrument` says the
FRPA's authority to pull a consumer report rests on them — **on an instrument
the corpus had recorded as containing nothing.**

## The Payzli letter's second paragraph carries six findings

More than any clause in the corpus. It is the operative instruction — what the
processor withholds, from what, and until when — and three of REVIEW-02's fixes
land on it: it said "withhold or debit" where the FRPA promises no
deposit-account debiting, it stopped short of the FRPA's Completion Threshold,
and it ceased on notice where the FRPA ceases automatically.

## Two fixes to shared code

`linesNotAccountedFor` now offers every rendering the corpus uses. Six documents
do not agree on how to print a number beside a heading: the FRPA writes
"2.1 Sales of Receipts; Not a Loan", the Permission to Release writes
"1. Trade, Landlord, and Bank Information.", and the FRPA's Section 10 writes
"10.1 Merchant hereby…" with no heading at all.

**The alternates are appended rather than interleaved, and that is
load-bearing.** `norm` collapses newlines, so a headingless clause's number and
body are adjacent in the joined text — which is exactly how §10.1 matches.
Putting a second rendering between them reported six correct clauses as missing,
which is what it did first.

The same choice was made in `bodies-match-the-document`: accept both forms
rather than write a dot into six clause records, because `number` would stop
meaning the number.

## Settled

**[ADR 0010](../../adr/0010-agreement-builder-lives-in-pacta.md) — the agreement
builder lives in Pacta.** Owner's decision. `lombard-platform` keeps computing
the numbers; Pacta assembles the documents. The boundary is facts in, documents
out.

It also retroactively justifies three entries in another repository:
REVIEW-02's `handoff` findings are recorded against `pacta-clause-library`, and
had the decision gone the other way those three would have been wrong.

## Still open

- The four §-level answers, three of which are now reframed — see the PR.
- Owner decisions 5 and 6 in `lombard-contracts`, both decided and unapplied.
- Counsel: who, when, budget.
- `/admin/mca` summary honesty.

## Next

The admin surface. Nothing in this library is reachable in production and will
not be until it exists.
