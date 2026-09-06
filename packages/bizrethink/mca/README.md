# MCA clause library

Second vertical beside `lease/`. Phase 1 is here: the conformity checker, with
no clause content behind it yet.

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

## The two checks

`checkFormConformity(spec, rendered)` — does a form we built match the spec we
wrote? Row count, prescribed labels, verbatim text, and additions to a row the
regulation closes with *"shall include only"*.

`checkAgainstSource(spec, sourceText)` — does the **spec** match the statute?
This is the one Georgia and Texas needed and lacked: both forms faithfully
implemented specs derived from secondary summaries that were broadly right and
wrong in the particulars. A library that only checks form-against-spec is a tidy
way of being confidently incorrect.

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
label, for factoring) passes as one of our rows. Worse, and this is the defect
that actually shipped: **New York's file contains California's phrasing of the
funding-provided sentence**, in a later section governing a different
transaction type, so a whole-file check accepts New York's form carrying
California's words. `section` on each spec is what closes that.

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
4. **Unexamined text enters as draft.** 47 of 140 clauses in the Lombard
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


## Coverage

All eleven states Lombard sends to are encoded, and every shipped form conforms.
Three kinds of prescription, which is the reason there are two checkers rather
than one:

| | states | what the statute fixes | what is checked |
|---|---|---|---|
| Prescribed sentences | CA, NY | rows, labels AND exact words, closed with "shall include only" | every word, and that nothing else is present |
| Prescribed form | CT, VA | labels and their order; the answers are ours | every label, spelled and ordered as prescribed |
| Content only | FL, GA, KS, LA, MO, TX, UT | the information required; wording is ours | that every required item has a home, and the evidence for it is present |

Kansas and Missouri sit across the line: content-only acts that nevertheless
dictate every label.

## What this cannot tell you

**Completeness, on the prescribed-sentence states.** The checker knows a
sentence is authorised in a row; it cannot know that a conditionally required
sentence is missing, because that turns on facts about the transaction this
package does not have.

**Anything in a row that prescribes "a short explanation".** Five of New York's
eleven rows and four of California's ten do. `coverage()` returns the number and
the tests assert it, so a green suite cannot be read as a clean form.

**Whether the evidence actually says the right thing.** For the content states
the check is that a required item has a home and that the words pinned as
evidence are in it. That a row *addresses* the requirement is a human judgement,
recorded in the spec's `requires` field so a reviewer can see what was claimed.

**Two Connecticut obligations that are not about the form at all.** §36a-868
bars prejudgment-remedy waivers in the contract; §36a-869 makes a specific offer
irrevocable until midnight of the third calendar day. The second is a sending
rule, and nothing here enforces it.

**Two states where we hold the form but not the statute.** Connecticut (guidance
plus Appendix A, not the General Statutes) and Virginia (the form, not the
Code). Their forms can be checked; the prohibitions, registration duties and
penalties around them cannot.
