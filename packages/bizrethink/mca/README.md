# The MCA vertical

Second vertical beside `lease/`, and **two surfaces rather than one** — see
[ADR 0008](../../../docs/adr/0008-mca-is-two-surfaces-not-one.md).

| | where | what it is |
|---|---|---|
| **Conformity** | this directory: `content/`, `prescribed/`, `statutes/`, `sources/` | does a disclosure meet a state's statute. The words are the regulator's, so there is nothing here for counsel to approve |
| **The clause library** | [`clauses/`](clauses/) | our own contract text, the negotiated agreements. Every clause needs an attorney before it can reach a merchant |

The rest of this file is about the first. **This file is not about `clauses/`,
and reading it as the whole package is the mistake ADR 0008 exists to prevent:
`content/` and `prescribed/` are rule packs — what a state demands of a
disclosure — and they were never going to become clauses.** The deliverable the
whole vertical is for is the agreement builder, which selects from `clauses/`
and must not violate what is checked here.

## What this checker does and does not do

**It records comparisons. It does not make them.**

That distinction is the most important thing on this page, because a growing
green test suite reads like convergence on correctness and is not. Every
assertion here pins a comparison a person already made between our text and a
regulator's. A third state whose prescribed sentence differs in a way nobody has
noticed will pass every test in this directory, because the tests only know
about the divergences they were told about.

Concretely: the check that New York must not carry California's APR wording
exists because someone read 10 CCR §914 and 23 NYCRR §600.6 side by side and
found the defect. The test makes that finding permanent. It would not have found
it.

So the count of passing tests is a measure of coverage, never of conformity. The
statutes still have to be read.

## Two surfaces: the blank form, and the filled one

### `prescribed/` — the blank template

`checkFormConformity(spec, rendered)` — does a form we built match the spec we
wrote? Row count, prescribed labels, verbatim text, and additions to a row the
regulation closes with *"shall include only"*.

`checkAgainstSource(spec, sourceText)` — does the **spec** match the statute?
This is the one Georgia and Texas needed and lacked: both forms faithfully
implemented specs derived from secondary summaries that were broadly right and
wrong in the particulars. A library that only checks form-against-spec is a tidy
way of being confidently incorrect.

### `instance/` — the numbers written into it

Both checks above live entirely in fixed prose, and every defect either has
found lived there. Three REVIEW-01 blockers did not:
`ca-funding-provided-is-gross-purchase-price`,
`ca-finance-charge-omits-withheld-fees` and `ca-apr-understated` all have the
right widget in the right row with the right sentence beside it. What was wrong
was the number.

`checkDisclosureInstance(envelope)` checks **identities** — relationships that
must hold between the numbers PRINTED on the documents in one envelope, whoever
computed them and however. It contains no calculator and reimplements nothing;
`lombard-platform/src/lib/disclosure-math.ts` computes the disclosure and keeps
doing so. Two calculators drift, and when they disagree there is no principled
way to say which is right.

The one place arithmetic is unavoidable is the APR, and even there no rate is
solved for: present value is strictly decreasing in the rate, so the §955 /
§600.4 band on the calculated rate inverts into a band on the present value at
two rates already known.

**Read `instance/limits.ts` before trusting an empty findings list.** An empty
list means the instance is CONSISTENT, not that it is lawful, and the two
strongest identities need a second document in the envelope — see the
`skipped` array and `instanceCoverage()`, which names the blockers a given
envelope could not have detected.

## The third check: provenance

`verifyProvenance(spec)` — is the verification date on this spec worth
anything? Added 2026-09-06, when the package was wired to
`packages/bizrethink/provenance/`.

`assertPublishable` asks whether a date is PRESENT. That is all it can ask, and
a present date is indistinguishable from one somebody typed. So every date here
is bound to something re-executed on every run:

| the claim | what re-executes it |
|---|---|
| `verbatimVerifiedAt` | every label, prescribed sentence and *permitted* sentence is still found in the named file, **in the section the form was transcribed from** |
| `structureVerifiedAt` | the source's digest is unchanged, and for `source-order` forms the labels still appear in the spec's order |

**The scoping is the load-bearing part.** California's regulation prescribes at
least six different tables in one 132,000-character file — closed-end, open-end,
factoring, sales-based, lease, asset-based — and only the sales-based one is
ours. Checked against the whole file, `"Repurchase Costs"` (a real California
label, for factoring) passes as one of our rows. Sharper still: **New York's
file contains California's phrasing of the funding-provided sentence**, in a
later section governing a different transaction type (§600.11, §600.12), so a
whole-file check accepts New York's form carrying California's words. `section`
on each spec is what closes that.

**That is the mirror of the defect that shipped, not the defect itself** — a
distinction worth keeping, because the temptation is to claim the mechanism
caught the thing that hurt. Templates 104/105 had the *California* form
carrying *New York's* wording, and New York's phrasing appears nowhere in the
California file, so a whole-file check would have rejected it;
`__tests__/near-identical-states.test.ts` asserts precisely that. **The shipped
defect survived because until PR #101 there was no checker at all**, which is
the account given at the top of that file and the one to trust. Scoping earns
its place on the direction nobody has got wrong yet.

### What the digest was being read as answering, and now is not

A digest compares our text to **our vendored copy** of the rule. On
`/admin/mca` that comparison was carrying the word *verified*, which a reader
takes to answer two further questions it cannot touch. Both now have their own
evidence, and both feed the same three-level `Assurance` — no fourth level, and
`surface/view.ts` carries the argument for that.

**Staleness — `provenance/reading-age.ts`.** When a regulator amends a rule our
file does not move. The digest still matches, every prescribed sentence is still
found where the spec says, and the card goes on saying *verified* about text
that is now wrong. Nothing in this package can see an amendment; what it can
state is how old the reading is. A reading goes stale after
`READING_GOES_STALE_AFTER_DAYS` — 180 days, chosen as the largest window that
guarantees one human reading between the two conventional effective dates (1
January, 1 July) these acts arrive on. A stale card drops to
`partly-verified`. The honest reading of *fresh* is "recently looked at", never
"current": a rule can be amended the day after a reading.

**Source strength — `provenance/source-origin.ts`.** Georgia was *verified*
against a browser capture of law.justia.com that was also incomplete — see the
record below — and its card was indistinguishable from California's. The
verdict is derived from the vendored file's own header on every load and is
never a field on a spec: a spec asserting "official publisher" with nothing
re-executing it is the defect this package exists to prevent, one level up from
a verification date nobody re-earns. Three verdicts:

| | what it means | where it lands |
|---|---|---|
| `official-publisher` | the header records a retrieval from the publisher that enacted or codified the text — a URL on a government host | can reach `verified` |
| `origin-not-recorded` | the file records no retrieval, or records only a path of ours | `partly-verified` |
| `secondary-publisher` | the retrieval names a publisher that reproduces the law | `unverified`, beside a stale digest |

**Two of the eleven sources are `official-publisher`**: Georgia's and Texas's,
both re-vendored after a defect was found in what preceded them. The other nine
include California's and New York's, which are almost certainly the promulgating
department's own documents — "almost certainly" is a belief, and the file gives
a reader nothing to re-check it against.

**Letterhead is not credited, and that is the judgement most worth arguing
with.** `sources-are-primary.test.ts` accepts an issuing authority's letterhead
as evidence that a file shows where it came from, which is a sensible floor. It
is not evidence of a publisher: letterhead travels with the text, so a
reproduction of 10 CCR carries "STATE OF CALIFORNIA / DEPARTMENT OF FINANCIAL
PROTECTION AND INNOVATION" exactly as the Department's own PDF does, and "Be it
enacted by the Legislature of the State of Kansas" is in every copy of the bill.
The Georgia capture almost certainly carried the Code's own headings too.

Two things it deliberately does not claim:

- It does not prove a human read the regulation. It proves the bytes have not
  moved since we said they had. When a regulator amends a rule the digest
  breaks and a human has to look again — that is the event this is built for.
- **Row order is not machine-checked for California or New York.** Their
  regulations *describe* rows in a prose order that is not the table's order:
  §914 introduces the Estimated Monthly Cost row last, as an instruction to
  "insert one additional row below the fourth row", and numbers Payment Terms
  "the sixth row" on a count taken before that insertion. Checking source order
  there reports a defect in a table that is correct. `structureEvidence` records
  which reading each form gets, and it is required with no default so the weaker
  one has to be chosen rather than fallen into.


## Rules for adding content

1. **Primary text only.** `sources/` holds regulations, never summaries. Two
   summaries in the contracts repo carry `SUPERSEDED` banners for this reason.
2. **A spec is not evidence.** Anything asserting a prescribed label or sentence
   must pass `checkAgainstSource` against a vendored file.
3. **Never reconcile two states.** Where prescribed texts are near-identical,
   pin the divergence with an assertion rather than a comment. See
   `__tests__/near-identical-states.test.ts` — the deduplication guard there is
   deliberate and must not be tidied away.
4. **Jurisdiction is one axis; tenant is another.** Federal, state, regulatory
   and generic are jurisdictional. Product- or tenant-specific is not, and
   folding them together breaks the property that makes adding a state safe.
   Nothing in `instance/` outside `instance/adapters/` knows a field is called
   `funding_provided`, and nothing in `instance/adapters/` is imported by the
   checker.
5. **Unexamined text enters as draft.** 47 of 140 clauses in the Lombard
   agreements have never been reviewed by anyone (see
   `lombard-contracts/MCA-CLAUSE-LIBRARY-PHASE0.md`). None looks dangerous,
   which is what the inherited documents looked like before REVIEW-01 found 207
   defects in them.
5. **Reach a spec through `disclosuresFor`, never by importing it.** The
   individual specs stay exported because the conformity tests need them, but a
   caller that imports `CA_OFFER_SUMMARY` directly is back in the position that
   shipped California's form carrying New York's sentence.
6. **Scope a source that holds more than one instrument.** If the vendored file
   contains other prescribed tables, other transaction types or — like
   Missouri's SB 1359 — eighty other sections of an omnibus bill, set `section`.
   A label found "somewhere in the file" is not evidence.
7. **Our own wording goes in `providerDrafted`, never in `alsoPermitted`.**
   `alsoPermitted` means the regulator supplied these words and they can be
   matched against the source. Where a regulation requires *"a short
   explanation"* and supplies no wording, the sentence is ours: it must carry
   the citation that compels it, and it is counted as unverifiable rather than
   sitting among text that has been verified.
8. **A new date needs a new digest.** Re-vendoring a source breaks
   `sourceDigest` on purpose. Re-stamping the date without re-reading the
   regulation is the one move this whole mechanism exists to make impossible to
   do by accident.

## If an assembler ever arrives

The Lombard documents are DOCX → PDF with AcroForm widgets injected, which
sidesteps the react-pdf `lineHeight` compounding bug patched on main
(`patches/@react-pdf+layout+5.2.0.patch`) — worth knowing if that changes.

More importantly: **this fork deliberately does not flatten AcroForm widgets**
(overlays 018 and 040, with a regression test pinning it). An assembler that
assumes flattening will fight the fork.

## What it has found

Kept as a record, because a checker's worth is the defects it catches in real
documents and not the tests it passes.

**2026-09-06, first run against a shipped form.** Lombard's California
disclosure carried New York's phrasing of one prescribed sentence — 10 CCR
§914(a)(2)(C)(ii) says *"on what amounts will be deducted"*, 23 NYCRR §600.6(b)
says *"on the amounts that will be deducted"* — inside a row §914 closes with
"shall include only". Four words. It had survived REVIEW-01, a human reading
both regulations side by side, and had shipped to Pacta as templates 104 and
105.

Two things fell out of writing the spec that no amount of re-reading the form
would have surfaced:

- §914(a)(1) says the table has **nine rows**, and ours has ten. That is
  correct: §914(a)(12) inserts an "Estimated Monthly Cost" row below the fourth
  whenever payments are not monthly, and Lombard's are daily. Recorded in the
  spec so that a later reader does not "fix" the count.
- §914(a)(10) closes the eighth row with *"shall include only"* and
  §914(a)(11) opens the ninth with *"shall include"* and no "only". Adjacent
  paragraphs, describing adjacent rows, with different rules. NY §600.6(j) and
  (k) both say "only".

And one thing the spec forced into the type. The first draft flagged three
sentences our form is *required* to carry — §914(a)(2)(C)(ii), (a)(3)(D) and
(a)(4)(C)(ii) — as unauthorised additions, because the row's `verbatim` held
only the unconditional sentence. That is the checker crying wolf, which is worse
than useless: findings that are usually wrong get ignored, and the findings are
the entire point. Hence `alsoPermitted`, which holds the rest of a row's
authorised vocabulary.

Note what `alsoPermitted` does **not** do. It records that a sentence is allowed
in a row, not that a required sentence is present. This checker tests
authorisation, never completeness — it can tell you that you said something you
may not say, and cannot tell you that you failed to say something you must.
Completeness needs the transaction's facts, which this package does not have.

**2026-09-07, the four remaining prescribed forms.** Writing the §915 and
§600.14 specs turned up two defects in documents that had already shipped, and
neither is visible by reading the form:

- `Lombard_NY_Lease_Disclosure_v1` **drops a word from a prescribed sentence.**
  §600.14(c)(3) reads "… finance charges you pay, **and** the periodic payments
  you make, and the anticipated cost …"; the document omits that conjunction,
  which is California §915(a)(3)(C)'s structure with New York's noun swapped in.
  The row is closed by §600.14(c) with "shall include only". This is the same
  failure as templates 104/105 and in the same direction — one state's phrasing
  surviving inside the other state's document.
- **Neither lease disclosure combines the Prepayment cell.** §915(a)(8) and
  §600.14(h) both say the first column of the seventh and eighth rows "shall be
  combined". Both DOCX files contain no `vMerge` element at all, while the
  sibling `Lombard_CA_Disclosure_v1` merges correctly under §914(a)(9). Weigh
  this one honestly: the lease tables carry no borders, so the eighth row's
  first column prints as blank space under "Prepayment" — which is what a
  combined cell looks like. The divergence is in the file rather than on the
  page.

And a third, in our own tooling rather than in a document:
`lombard-contracts/pipeline/extract_disclosure_rows.py` drops any row whose
first cell is empty or reads "term". Both are prescribed rows under §915, so the
script returns six rows from an eight-row lease table — an extractor that
silently loses the rows a checker exists to check.

The two document defects are reported and handed back. Nothing was published
and no template was edited from here.


## Coverage

Fifteen specs across eleven states. Four kinds of prescription, which is the
reason there are three checkers rather than one:

| | specs | what the statute fixes | what is checked |
|---|---|---|---|
| Prescribed sentences | CA §914, CA §915, NY §600.6, NY §600.14 | rows, labels AND exact words, closed with "shall include only" | every word, that nothing else is present, and that a row the regulation empties stays empty |
| Prescribed form | CT, VA | labels and their order; the answers are ours | every label, spelled and ordered as prescribed |
| At a minimum | CA §956, NY §600.17 | six described items, in order; extra lines lawful | the descriptions as an ordered subsequence, and that each computed line's cross-reference names the lines it is actually computed from |
| Content only | FL, GA, KS, LA, MO, TX, UT | the information required; wording is ours | that every required item has a home, and the evidence for it is present |

Kansas and Missouri sit across the line: content-only acts that nevertheless
dictate every label.

**California and New York prescribe three documents each,** which is why
`disclosuresFor` returns three specs for those states and why there is a second
axis. `mca/transactions.ts` records which KIND of financing a spec is prescribed
for, and `prescribedFormsForTransaction` filters on it — §915's lease table
asserts a purchase option and an anticipated cost of acquiring property, and
sending it with a merchant cash advance would be the right shape for the wrong
instrument. It is not a tenant axis and not a product axis; "Lombard-specific"
belongs on neither axis.

**The Itemization is not a table and does not use the table checker.** §956(a)
requires a document "substantially similar in form … including at a minimum" six
items: no row count, no "shall include only", each third-party payee on its own
line, and §956(c)(4) expressly permitting assumptions below. Positional row
alignment is wrong there the moment a deal has two payees. See
`prescribed/itemization.ts`, which also holds the one check no table needs — the
"(Sum of Items 1-3)" cross-references name line POSITIONS, and go stale silently
when a line is added.

## What this cannot tell you

**Completeness, on the prescribed-sentence states.** The checker knows a
sentence is authorised in a row; it cannot know that a conditionally required
sentence is missing, because that turns on facts about the transaction this
package does not have.

**Anything in a row that prescribes "a short explanation".** Five of New York's
eleven rows and four of California's ten do. `coverage()` returns the number and
the tests assert it, so a green suite cannot be read as a clean form.

**That a source is complete.** `source-origin.ts` reads what a file SAYS about
its own origin: a header naming an official publisher and lying is
indistinguishable from one telling the truth, and nothing here would catch a
complete capture from a secondary publisher or a truncated one from an official
publisher. The Georgia capture was both secondary and truncated, and truncation
is the half that made it dangerous.

**Whether a regulation has been amended.** Only how long ago someone looked. A
`fresh` card is a card read inside 180 days, not a card that is current.

**Whether the evidence actually says the right thing.** For the content states
the check is that a required item has a home and that the words pinned as
evidence are in it. That a row *addresses* the requirement is a human judgement,
recorded in the spec's `requires` field so a reviewer can see what was claimed.

**Thirteen obligations across the two Acts that are not about the form at all** —
contract terms, sending rules, registration and enforcement. They are now
verbatim and verified, and *verified* here means "these are the Act's words",
not "we comply". §36a-868 bars prejudgment-remedy waivers in the contract;
§6.2-2234(C) bars confessions of judgment, which Connecticut does not; §36a-869
bars withdrawing a specific offer for three calendar days *subject to two
carve-outs*. Virginia retains its September 15 annual fee and automatic expiry;
Connecticut's amended §36a-870(c) instead sets December 31 expiration, a
November–December renewal window and a $1,000 initial/renewal fee plus other
required charges. Nothing in this package reads a contract, sends an offer or pays a
fee. `bearsOn` on each obligation names the surface it lives on, and everything
that is not `'the form'` is outside what any check here can reach.

**And three obligations that ARE about the form and that no row can discharge.**
§36a-866 and §6.2-2233 both allow additional information and require it to sit
outside the prescribed disclosure — a constraint on the page, not on a cell, and
the checker sees only the table. §36a-867 governs which form may be used at all.

**One fact about the Department's practice, in Connecticut.** Everything else
that used to sit here — the prohibitions, the three-day window, the registration
duties, the penalties, the scope of both Acts — was closed on 2026-09-07, when
Conn. Gen. Stat. §§36a-861 to 36a-872 and Va. Code §§6.2-2228 to 6.2-2238 were
vendored from their official publishers and every claim became a verbatim
quotation re-matched on every run (`statutes/ct-va-obligations.ts`).

The 2026-09-12 source correction incorporates Connecticut's 2026 supplement
(P.A. 25-115 §§21–23, effective July 1, 2025), including the revised registration
and enforcement text. The [source record](sources/README.md) identifies both
publications and the exact retrievals behind that consolidation.

What survives is narrow and cannot be closed by reading a statute: §36a-867
opens the door to another state's form only if *"the Banking Commissioner
determines"* that its law meets or exceeds Connecticut's, and whether such a
determination exists is a fact about the Department's practice. The guidance
says none has been made. The Act cannot say.

**Three things the fetch corrected**, all of which had been asserted from
secondary text and were wrong: the Act is in chapter 669 and not 668; Virginia's
chapter ends at §6.2-2238 (the next two sections govern virtual currency kiosk
operators); and §36a-869 is not flat three-day irrevocability — the same
sentence carries two carve-outs and §36a-869(b) lets the offer state that it is
preliminary.
