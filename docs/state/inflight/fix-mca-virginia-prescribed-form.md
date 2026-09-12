# Virginia official prescribed-form correction

Author: **virginia-form-20260912**. Direct Shwet assignment recorded in
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

Shwet starts one fresh independent legal-surface review. The author owns CI and
substantive fixes through green and does not merge/deploy. The authorized shipping
session owns final state consolidation. A separate assignment must rebuild and
review the merchant form and migrate stored templates; this PR does not perform
that work or claim production documents are corrected.

## Integration with the other open source correction

PR #187 / task #185 is still open at this branch's base. Both PRs touch origin
expectations. Their combined result must retain both corrections: official
disclosure origins **15**, unrecorded **0**, both Utah and Virginia in the list.
Keep this PR's isolated unknown-origin surface test instead of #187's temporary
Virginia-as-anonymous fixture. The MCA author owns any required integration fix.
The corrections to the source README are additive and both belong in the result.

Task #186 / A-08, overlay 082 and its state note belong to the security author.
No overlay or migration is used here. Other MCA agreement/option work and the
Georgia/Missouri source-access/history limits remain as recorded in settled state.
