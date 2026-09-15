# MCA counsel review presentation

Task: #266. Author: `mca-presentation-20260915`. Base: main
`8f62e17447224f40f59db11d8a6141c7d5b1b229`.

## Durable behavior

Complete shared-library and provider review packages keep the agreed reader layout.
The reader presents the saved copy; no catalogue refresh, source correction,
legal redraft, migration or snapshot rewrite is involved.

- Typed field placeholders display bracketed labels from the same saved
  document's field catalogue. They remain unfilled. Field details retain the
  exact original notation; unknown fields are explicitly unmapped. Processor
  widget labels apply only to three fingerprint-pinned Payzli passages, checked
  against the vendored letter at `7b8e61c3`. Its purchase-agreement percentage
  and withholding percentage stay distinct. These are review annotations,
  not changes to a processor form or evidence of processor acceptance.
- Field grids group consecutive subjects in their original order. The six
  entity-guarantor fields across FRPA, equipment and subscription say they are
  required when the guarantor is an entity. Unknown conditions remain available
  in field details without claiming they are optional.
- Alternatives have distinct index and finding labels using their saved
  selection descriptions. Target IDs and citation numbers are unchanged.
- Disclosure entries separate source wording, layout instructions, authority
  and verification evidence. Machine flags receive readable labels; saved
  calculations use saved row labels. Every original source paragraph remains
  available in Saved specification. Dates are unambiguous. These records remain
  source specifications, not completed disclosure forms or current-law advice.
- Existing line breaks and sequential top-level lettered items receive paragraph
  spacing and indentation. No sentence splitting, wording changes or dropped
  references. Citation previews use the same annotations and paragraph layout.
- Search covers saved document content, field labels, sources and provider
  processor forms. Source navigation opens and focuses its disclosure record.
- Larger text covers fields, sources and review instructions as well as prose.
  The brief's saved selection is a list, and the review count explains its
  instrument/source/form units. Holistic finding drafts remain mounted when
  switching views.

## Validation

TDD: initial presentation tests failed on the actual old behavior, including raw
field tokens, duplicate labels, conditional wording, paragraph layout, source
formatting and search. Separate regressions first failed for saved calculation
labels and overly broad boolean substitutions. The focused MCA review suite and
separate owned TypeScript check pass; final counts and CI evidence belong on #266.

The existing neutral-package Playwright flow reconstructs every rendered passage
across all six saved instruments from its original field annotations and compares
it character-for-character with the saved reading, including references. It also
covers readable fields, conditional requiredness, grouped grids, alternative
labels, source search/open/focus, preserved source quotations, larger field/source
text, citation navigation and return, mobile overflow, findings and revocation.
The provider flow checks annotated remaining transaction fields and search into
its own processor form alongside the existing separation, draft, coverage and
authorization regressions. Desktop/mobile screenshots are produced for inspection.

Playwright before gate: successful unchanged-main run
[34943220143](https://github.com/BizRethinkAI/internal-bizrethink-pacta-platform/actions/runs/34943220143)
at the base above. CI provides the after gate. No duplicate local build or broad
local suite; focused review tests, scoped type checking and changed-file formatting
are the local checks.

## Boundaries and shipping responsibility

No legal wording, source record, stored fingerprint, target ID, permission,
approval policy or provider/library classification changes. Source labels are
presentation only. Legacy single-instrument and administrative catalogue views
retain their existing behavior; shared reader extensions are optional. Opening a
review item records no coverage or approval. Unknown processor forms are not
assigned the pinned Payzli field mapping.

The author carries this PR through final-head green CI. The owner starts one
fresh independent review. The shipping owner merges, consolidates this note into
STATE.md with the batch, verifies the deployed revision, then records Done/no
remaining action and closes #266 when its assigned work is finished. This author
does not merge, deploy or take over older task-card cleanup.
