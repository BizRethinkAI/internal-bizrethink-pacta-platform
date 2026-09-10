# ADR 0012 — The baseline document is input, not specification

- **Status:** Accepted
- **Date recorded:** 2026-09-10
- **Decision date:** 2026-09-10 (owner)
- **Completes:** [ADR 0011](0011-the-mca-clause-library-is-a-library.md), which said the
  library is authored and then kept fidelity to the baseline as a goal anyway.
- **Supersedes:** rule 2 of [`mca/clauses/README.md`](../../packages/bizrethink/mca/clauses/README.md).

## Why this exists

**The same question was re-argued four times in one session.** Whether the
clause library is a transcription of `Lombard_FRPA_v4` or a corpus of its own
was settled — and then re-derived at `[Reserved]`, at a proposed `retired`
clause kind, at a per-document-version placement map, and again at
`bodies-match-the-document`. Each time the answer came out the same and each
time the reasoning started over.

It kept reopening because ADR 0011 stopped half way. It said the library is
authored, and in the same document kept **fidelity to v4 as an assertion**
(*"assembling with Lombard's facts reproduces `Lombard_FRPA_v4.txt`, line for
line"*) and kept rule 2 alive as something that would merely *narrow*. A
document that is simultaneously "not the specification" and "the thing every
clause must still match" leaves the question open, so it got asked again.

This ADR closes it. The **Questions that are closed** section below is the
point of the file: those answers are not to be re-derived, and a change of mind
needs a new ADR that supersedes this one rather than a fresh argument.

## What the baseline document actually is

`packages/bizrethink/mca/clauses/source-documents/Lombard_FRPA_v4.txt` is:

- a **rebranded `CircularPayments_FRPA_v4.docx`** — `lombard-contracts/change-notes/12`
  names it — which was itself drafted by a language model from a poorly-drafted
  MCA form;
- carrying **254 findings** across REVIEW-01 and REVIEW-02;
- assessed by outside counsel on 2026-09-09 as **18 Critical, 52 High**, with
  **REPLACE IN FULL proposed on 93 of 101 clauses**, under the heading *"Do not
  approve this FRPA for merchant use in its present form"*;
- **never signed by any merchant.**

Every clause in the library is currently a verbatim copy of it.

**If that document were sound there would be no vertical to build.** The reason
this product exists is that it is not.

## Decision

**The baseline document is one input to drafting. It is not the specification,
and reproducing it is not a goal.**

Three consequences, each of which reverses something ADR 0011 left standing.

**1. Clause bodies are written, not transcribed.** The drafting inputs are the
counsel memo's 93 replacement texts, the 254 review findings, the market forms
in `docs/reference/`, and the funder's own commitments. A clause is good because
it is well drafted, not because it matches a document.

**2. `bodies-match-the-document` is retired, not narrowed.** ADR 0011 proposed
narrowing it to the selected set. That was the same half-measure: it keeps
"matches v4" as the definition of correct for most of the corpus. Once bodies are
authored, **nothing should match v4**, and a test asserting otherwise is
asserting the defect.

**What survives, separately and permanently:** the digest assertion,
`agreementDigest(file) === digest`. It catches a vendored document changing
underneath us and has nothing to do with clause bodies. It is not part of the
retirement.

**3. Findings are drafting input, not review-page furniture.** REVIEW-01 and
REVIEW-02 audited *that document*. Rendering their notes beside a clause on the
counsel review page frames the wrong question — *"check our patches to Lombard's
paper"* instead of *"is this clause sound?"* — and 20 of the 135 a reviewer sees
name a party, several being observations about a funder's website and corporate
filings rather than about any clause.

They remain in the register, they remain the input a drafter works from, and
they stop being shown to a reviewing attorney as annotations on the product.

## What replaces the guard

Retiring rule 2 removes the only automated check that clause text is not
invented. Three things carry that weight instead, and they are the right three:

| | |
|---|---|
| `assertPublishable` | a clause with `author: null` cannot reach a third party. Authored text has no document to hide behind, so the author IS the provenance |
| counsel approval | `BizrethinkMcaClauseApproval`, pinned to a content fingerprint. **Zero approvals exist**, so nothing in the library is reviewed by anybody today |
| `every-fact-value-is-reachable` | what the library can actually offer, measured rather than assumed |

The honest statement of the trade: **before, a clause was checkable against a bad
document. Now it is checkable against an attorney.** The second is what a legal
product needs; the first was never a measure of quality, only of copying.

## Questions that are closed

Do not re-derive these. Each was argued and settled; a change of mind needs an
ADR that supersedes this one.

| question | answer |
|---|---|
| Is the library a transcription of the baseline? | **No.** It is an authored corpus. The baseline is input. |
| Should a clause body match `Lombard_FRPA_v4`? | **No.** After rewriting, none will. |
| Should `[Reserved]` sections exist? | **No.** An assembled document has no reserved sections; a clause that is not selected leaves no gap. |
| Is fidelity to v4 a test we keep? | **No.** Retired with rule 2. |
| Do findings render to reviewing counsel? | **No.** They are drafting input. |
| Is `lombard-contracts` upstream of the library? | **No.** See below. |
| Are clauses tenant-specific? | **No.** Parties are roles — `{{funder}}`, `{{merchant}}`, `{{processor}}`, `{{broker}}`. No role is privileged. |
| Does the baseline's numbering bind us? | **No.** Numbering is emitted at assembly (ADR 0011). |

## `lombard-contracts` after this

The repository split is not revisited here; it exists and this ADR works with it.
What changes is direction.

**It is downstream.** It holds the rendered documents, the AcroForm pipeline, the
two historical reviews and the change-note history. It is no longer where clause
text comes from.

What it still owes the library, and what the library owes it:

- **REVIEW-02 needs a manifest.** Its dispositions live in the prose of
  `change-notes/16`, so every one of its findings reads `unrecorded`, and unknown
  counts as outstanding. That is most of the clauses the approval gate holds.
- **Six findings the 2026-09-09 memo refuted** need their dispositions corrected —
  §4.8's regulator disclosure, factor-rate versus fair market value, the
  §6.1.3 → §6.2.1 acceleration link, the secured-party DBA, FCRA authority in the
  Permission to Release, and email service as a confession of judgment.
- **The rendered documents follow the library**, not the other way round. When a
  section's clauses are rewritten, the `.docx` is re-rendered from them and the
  Pacta templates are rebuilt. `change-notes/18` already says all five need
  replacing.

## Consequences

**Rule 2 is replaced.** *"The body is the document's words, verbatim"* becomes:
**the body is the clause's words, and the `«N»` widget markers are kept** — those
are the AcroForm anchors the pipeline injects and they remain part of what
publishes.

**Rule 1 is unchanged and now matters more.** `examinedBy` stays required and
non-empty. With no document to check against, *"who read this?"* is the only
question left, and it must keep having an answer.

**The counsel review page changes shape.** It shows a clause and asks whether it
is sound. It stops showing an audit of a document the reader was not given.

**Rewriting is not a refactor.** These are contract terms. Each rewritten clause
is unreviewed text until an attorney approves it, and `assertPublishable` already
refuses to let it reach a merchant. That gate is the reason rewriting can proceed
without counsel in the room.

## What this does not change

- [ADR 0008](0008-mca-is-two-surfaces-not-one.md) stands. **Conformity is
  untouched** — a state's prescribed disclosure is a creature of statute,
  correctly transcribed verbatim, and nothing here applies to `mca/sources/`,
  `mca/content/` or `mca/prescribed/`.
- [ADR 0009](0009-counsel-is-parallel-not-a-gate.md) stands. Counsel is parallel;
  drafting does not wait.
- [ADR 0010](0010-agreement-builder-lives-in-pacta.md) and
  [ADR 0011](0011-the-mca-clause-library-is-a-library.md) stand except where
  named above.
- The `«N»` widget markers, the provenance types, the approval fingerprint and
  the selection engine are unaffected.
