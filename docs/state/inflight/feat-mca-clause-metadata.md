# ADR 0014 clause metadata backfill

Branch: `feat/mca-clause-metadata`. Started 2026-09-12 on research head
`4cf12aa5a`; advanced to merged main `42394e5f3` after #179 merged.
This branch's PR targets main. The PR description and current-head Checks tab
record the final CI verdict, avoiding a documentation-only push that reruns CI
merely to record the verdict.

## Delivered scope

All **211 live source records** now explicitly carry required `whyThisClause`
and `variance`. `requiredBy` is removed from MCA types, source records,
approval fingerprint, counsel payload and page. Shared pure descriptions render
both answers in the existing staff and counsel pages. Those two route files are
already declared BizRethink-owned in `overlays/BIZRETHINK-OWNED.txt`; no upstream
file or new ownership exemption was needed.

Legal classes: **1 compelled, 35 implements, 175 discretionary**. Variance:
**6 offered, 1 fixed/compelled, 32 misattributed, 71 no-alternative,
1 unwritable, 100 load-bearing**. Every fixed record has its own reasoned note.
A conditional gate is not automatically an offered alternative. Metadata is
stored inline, not supplied by a missing-citation or missing-slug fallback.

The Texas notice alone claims compelled wording, with §86.310(d) and a
Chapter 398 contract-for-services applicability description. GA, UT, KS and MO
agreement-methodology duties are implemented in shared definition/explanation/
collection wording. Positive state scopes now enter the existing admission
checks; the metadata does not add state-selection gates. National consumer-report
and communications duties remain distinct from state financing disclosures.

## Choices and preserved gaps

Offered groups are concurrent purchases (two clauses / two values), the default
clause accompanying guaranty scope (two clauses / three values), and the
court/arbitration choice (two clauses / two values). Their accompanying guaranty,
class-proceeding and counterclaim clauses explain that they follow the choice;
they are not independent elections. The test requires exactly one offered
record per value, and rejects introducing a new offered fact without coverage.

Renewal payoff and carry text remain available under existing gates, but `none`
selects neither; the pair is not falsely labeled an exhaustive three-value
group. The six ADR refusal examples are pinned explicitly. `unwritable` is
reserved for the missing funder-state input; the missing gross-definition text
is `no-alternative`, because both existing settlement-base answers select the
same wording.

Remaining separate drafting: ACH-only and ACH-backstop terms, gross-settlement
wording and economic consistency, funder-state input/venue alternative,
processor acceptance as a deal fact, and a future interview. The ancillary
split letter and parts of the equipment/release forms still need reconciliation
with the FRPA and targeted federal authority. Their metadata is not approval.

## Source evidence

Start with
[`research/mca-clause-metadata-2026-09-12/README.md`](../../research/mca-clause-metadata-2026-09-12/README.md).
It explains classification boundaries, group membership and migration effects.
The manifest records eleven HTTP attempts and ten retained evidence files with
source URLs, dates and hashes. HTTP 200 CAPTCHA pages are identified as such.
Selected FTC/eCFR indexed browser extractions are labeled as extractions, not
raw downloads. Florida 2025 UCC enactments are examples of governing-law
formalities, not an eleven-state UCC opinion. The Texas MCA filing citation is
on the FRPA only, not the separate equipment contracts.

The merged #179 requirements walk remains the state-financing authority trail:
113 HTTP attempts, twenty retained files, 27 unchanged references. GA's full
current-body comparison and MO commencement-rule history remain open. CA/NY
publisher dates and documented amendment-search limits remain unchanged.
No prescribed-disclosure source, content rule or prior audit evidence changed.

## Migration consequences

Both new fields are in the clause fingerprint and therefore the library hash.
Previously stored approvals lapse; previously issued review links report changed
content. Nothing overwrites approval rows or transfers approval to the new
classification. Expanded positive state scope can require a different approving
bar under the existing rule. No database migration or merchant-template update
is performed. The separate stored-template rebuild and ADR 0011 guaranty
placement work are still outstanding.

All 211 bodies, fields, slugs, versions, gates, references, section/sort positions,
source provenance, draft status and examination records are unchanged. This
was checked by parsing the before/after TypeScript records and comparing every
property except the new metadata, replaced citation and deliberate state scope.
The only fact-file edit corrects the stale claim that Texas alone requires any
agreement content; fact values and defaults retain their bytes.

## Validation and next step

TDD evidence: five invariant/fingerprint failures, six expected counsel-payload
failures across all six instruments, and a missing-helper failure before their
implementations. Final local focused run: **7 files / 220 tests pass**:

- `every-clause-answers-two-questions`, `metadata-description`, `approval`;
- `a-notice-can-arrive-in-time`, `surface`;
- `counsel-surface`, `numbered-review`.

Ten retained-evidence hashes and local README links pass. All 211 records across
eighteen corpus files pass the nonmetadata-property comparison. Changed files
were formatted; `git diff --check` passes. An initial link-check regex matched
a pre-existing literal clause-token example `(b)`; excluding inline code fixed
the checker, without changing that valid documentation.

Playwright baseline: [run 34708428624](https://github.com/BizRethinkAI/internal-bizrethink-pacta-platform/actions/runs/34708428624)
on `7f5ce5684` actually ran and passed the shard. #179 changes only research/docs,
so its merged application baseline is identical. Its own green E2E checks used
the existing docs-only exemption. This backfill changes application files and
must receive the ordinary post-change CI suite and separate typecheck. Per the
owner's efficiency agreement, no broad local build/test/typecheck duplicate and
no additional local browser sweep is run. No checks or exemptions were changed.

After pushing/opening: monitor current-head CI, fix actual failures, and record
the final verdict in the PR description. The implementing session leaves the
PR unmerged for human review/merge; no implementer-started independent review.

## Coordination and ownership

This branch folds only this session's merged #179 research note into STATE.
A-07 retains authorship/ownership of the #176/#177 cleanup, which #179 reused
unchanged in `cede1f021`. No A-07 implementation is copied or edited here.
No deploy or communication to another session was performed.

Temporary working files: `/tmp/pacta-mca-metadata/` (manual assessment map,
source downloads/extractions and one-time insertion script) and
`/tmp/mca-clauses-before.json`. Durable output lives in the corpus and research
folder; **do not rerun `backfill.py --apply` on this edited tree**, because it
was a one-time insertion script rather than a migration to run in production.
