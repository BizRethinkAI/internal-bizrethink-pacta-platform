# docs/adr-0012-v4-is-input — closing the question that kept reopening

**Branch:** `docs/adr-0012-v4-is-input`. One ADR, two replaced rules. No code.

## Why

**The same question was re-argued four times in one session** — whether the clause
library is a transcription of `Lombard_FRPA_v4` or a corpus of its own. It was
settled, then re-derived at `[Reserved]`, at a proposed `retired` clause kind, at
a per-document-version placement map, and again at `bodies-match-the-document`.
Same answer every time, fresh reasoning every time.

It kept reopening because **ADR 0011 stopped half way.** It says the library is
authored and, in the same file, keeps fidelity to v4 as an assertion — *"assembling
with Lombard's facts reproduces `Lombard_FRPA_v4.txt`, line for line"* — and keeps
rule 2 alive as something that merely *narrows*. A document that is both "not the
specification" and "the thing every clause must match" leaves the question open,
so it got asked again.

## What the baseline actually is

Stated plainly in the ADR, because the argument kept restarting from a premise
nobody had written down:

- a **rebranded `CircularPayments_FRPA_v4.docx`** (`change-notes/12`), itself
  drafted by a language model from a poorly-drafted MCA form
- **254 findings** across REVIEW-01 and REVIEW-02
- outside counsel, 2026-09-09: **18 Critical, 52 High**, REPLACE IN FULL on
  **93 of 101** clauses, under *"Do not approve this FRPA for merchant use in its
  present form"*
- **never signed by any merchant**

Every clause in the library is a verbatim copy of it. **If that document were
sound there would be no vertical to build.**

## What ADR 0012 decides

1. **Clause bodies are written, not transcribed.** Inputs are the memo's 93
   replacements, the 254 findings, market forms, and the funder's commitments.
2. **`bodies-match-the-document` is retired, not narrowed.** Narrowing keeps
   "matches v4" as the definition of correct for most of the corpus. Once bodies
   are authored, nothing should match v4, and a test asserting otherwise asserts
   the defect. **The digest assertion survives separately** — it catches a
   vendored document changing underneath us and is not about bodies.
3. **Findings are drafting input, not review-page furniture.** They audited *that
   document*. On the counsel page they frame the wrong question, and 20 of the 135
   a reviewer sees name a party — several being observations about a funder's
   website and corporate filings rather than about any clause.

Plus a **Questions that are closed** table, which is the point of the file: eight
settled answers that are not to be re-derived, and changing one needs an ADR that
supersedes this one.

## The trade, stated honestly

Retiring rule 2 removes the only automated check that clause text is not
invented. What carries that weight instead: `assertPublishable` (a clause with
`author: null` cannot reach a third party), counsel approval pinned to a content
fingerprint, and `every-fact-value-is-reachable`.

**Before, a clause was checkable against a bad document. Now it is checkable
against an attorney.** The second is what a legal product needs; the first was
never a measure of quality, only of copying.

Rule 1 is unchanged and now matters more — with no document to check against,
*"who read this?"* is the only question left.

## Deliberately not in this PR

**The test is not deleted yet.** The ADR retires it; the code change lands with
the first rewrite, which is when it would actually go red. Until then it still
catches an accidental edit to a body that is still transcribed, which costs
nothing and is worth keeping for the window.

**No STATE.md change**, to avoid colliding with #150 and the compaction work.

## What this unblocks

The rewrite. Working the memo's tranches — 18 Criticals plus the entangled Highs
first — with the clusters split by dependency rather than by section, because the
memo is explicit that related replacements have to move together.

## Also owed, in `lombard-contracts`

Recorded in the ADR so it is not re-discovered:

- **REVIEW-02 needs a manifest.** Its dispositions are prose, so every finding
  reads `unrecorded`, and unknown counts as outstanding.
- **Six findings the memo refuted** need corrected dispositions.
- **The rendered documents follow the library now**, not the reverse. All five
  Pacta templates already need replacing per `change-notes/18`.
