# Virginia official prescribed-form correction

Author: **virginia-form-20260912**. Direct repository-owner assignment recorded in
[task #189](https://github.com/BizRethinkAI/internal-bizrethink-pacta-platform/issues/189).
Branch `fix/mca-virginia-prescribed-form` begins at merged main
`1813b1d72fb231593ddcb2cb0b2a55054ac7f040`.

## What changes

The active Virginia source is replaced with the official October 2022 two-page
form. Its unmodified PDF and complete reading-order/layout extractions match
the independent source-audit captures. Exact retrieval URLs, times and PDF hash
are in the headers; earlier evidence/manifests remain unchanged. All four
10VAC5-240 implementing rules and histories are also retained as a separate source.

The spec corrects the first monetary label and checks the fixed label formulas
and payment-range qualification. `PrescribedRow.labelSuffix` keeps these literal
instructions separate from headings for source extraction; Virginia uses exact
label matching. The old extra Fixed/Variable heading boxes now fail. Other
forms' behavior is unchanged when the optional field is absent.

The original legacy row fixture remains unchanged and now produces four explicit
label findings (rows 0, 2, 5, 6). A separate blank-official-form transcription is
the positive control. The statutory first-row mapping and the misleading
Code-only finance-charge explanation are corrected. The implementing definition
exists in 10VAC5-240-10; no financial formula or workflow is implemented here.

Word/structure verification dates move to September 12 after both pages were
read. The digest changes for a different source document, not just a new header.
The official-origin classification is evidence of source provenance, not full
conformity of a completed merchant form. All 211 authored clauses, stored
templates and approval records are untouched.

The [correction record](../../research/mca-virginia-form-correction-2026-09-12/README.md)
contains source hashes/URLs, visual layout observations, the precise defect map,
test limitations and the concrete separate-renderer/template handoff.

## Validation and next action

Fifteen new regressions failed before implementation. The final focused
selection passes **16 files / 448 tests**, including the shared prescribed-form
checker, all affected state form checks, provenance, statutory row mappings and
the conformity surface. Source-integrity, changed-file formatting and local-link
checks pass. Both official PDF pages were rendered and visually inspected;
the active PDF is byte-identical to the one inspected.

The exact-base before Playwright is
[run 34719946377](https://github.com/BizRethinkAI/internal-bizrethink-pacta-platform/actions/runs/34719946377).
Current PR CI supplies the after Playwright, complete builds/unit tests and
separate typecheck. Final CI evidence is recorded on the PR/task without a
status-only code push. No duplicate broad local build, suite or typecheck is run.

The repository owner starts one fresh independent legal-surface review. The author owns CI and
substantive fixes through green and does not merge/deploy. The authorized shipping
session owns final state consolidation. A separate assignment must rebuild and
review the merchant form and migrate stored templates; this PR does not perform
that work or claim production documents are corrected.

## Integration with the other open source correction

On September 13, the repository owner assigned the refresh requested by the
fresh shipping review. Main `7f178f8e4f8242a4abe2ca2ba4864d3ee7e16492` contains
#187 despite GitHub's stale open status for that PR. A real merge reproduced
the two reported test-file conflicts. Before correcting their expectations,
the combined sources produced **2 failing / 68 passing tests**.

The resolution preserves both corrections: **15 official disclosure origins /
0 unrecorded**, both Utah and Virginia in the named list, and this PR's isolated
unknown-origin surface regression. Both source-README correction sections remain.
This refresh changes no legal requirement, clause body, source evidence, fixture
or checker behavior beyond incorporating already-merged main. It does not repeat
the source research. Focused after-validation passes **5 files / 102 tests**
(origin/surface plus Utah/California and Virginia form regressions); changed-file
formatting and whitespace pass. Fresh CI is recorded on PR #190 and task #189;
the shipping reviewer must assess the refreshed head before merging.

Current main contains `docs/session-workflow.md` and the per-author note gate.
The shipping ledger's statement that this file is absent and legacy Guard 5
applies needs correction by its owner. Final consolidation remains with the
authorized shipping session; this author does not edit that session's ledger.

Task #186 / A-08, overlay 082 and its state note belong to the security author.
No overlay or migration is used here. Other MCA agreement/option work and the
Georgia/Missouri source-access/history limits remain as recorded in settled state.
