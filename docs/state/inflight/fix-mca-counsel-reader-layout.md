# Complete MCA counsel package: agreed reader layout

Task: #257. Author: `mca-review-repair-20260915`. Base: main
`190576a10cacdc1a65c26e36982bd106db8501a7`. This PR follows the focused
classification repair #258, but targets main directly and does not depend on its
code or migration.

## Durable behavior and design

The complete neutral/provider reader now uses the agreed counsel workspace:
250px left review index on desktop, a bounded reading column, the existing legal
prose typography, larger-text control and a collapsible mobile index. The current
neutral/provider brief is arranged into five numbered sections without restoring
the legacy Lombard-specific text. The page begins at that brief.

The index switches between saved documents, controlled processor forms and
disclosures/requirements. Subjects preserve saved parent headings. All items and
search keep clauses, alternatives and reusable items reachable; search spans
saved provisions in all documents. It uses only the snapshot, never a fresh
catalogue lookup or newly inferred numbering. The snapshot does not contain the
legacy reader's structured decision groups, so this index exposes Subjects and
All items instead of inventing a Decisions grouping. Every saved alternative
remains visible in its subject and the all-items view.

Citation previews, opening a target in its saved context and return-to-passage
reuse the shared legal reader. Findings remain beside the affected item. Package
progress and holistic findings have their own index entry; that form remains
mounted while switching views so its unsent draft survives navigation. Sidebar
progress reflects explicitly saved review coverage, not an implicit approval
from opening a document. Navigation itself records no review completion.

## Validation

TDD: new saved-package navigation tests failed before the navigation module
existed, then both passed. They check saved clauses, alternatives and helpers
across all documents plus search using archived text and citation numbers.
Separate owned-package TypeScript checking, formatting and diff whitespace
checks passed; final-head evidence belongs on task #257.

Playwright before gate: successful unchanged main run 34930316923 at the base
above. Existing neutral/provider browser flows now check the desktop grid and
reading width, five brief sections, subject headings, larger text, saved-context
reference/return, cross-document search, mobile index/overflow, preserved
findings, holistic drafts across view switches, provider coverage/completion,
source context and revocation. CI supplies the after gate; its desktop/mobile
screenshots must be inspected before handoff. No duplicate local build or broad
suite is required.

## Boundaries and shipping responsibility

No clause wording, citations, source records, stored snapshots, fingerprints,
review targets, authorization checks or approval policy changes. No migration
or new upstream overlay. Legacy single-instrument links keep their existing
reader. Both complete shared-library and selected-provider packages use this
restored layout, including authenticated saved-copy inspection.

The author carries this PR through final-head green CI. The owner starts the
fresh independent review. The shipping owner merges #258 first and this layout
second, consolidates each note, verifies the final main/deployed revision, then
records Done/no remaining action and closes #256/#257 after the assigned work
is complete. This author does not merge or deploy. Original shipped task cleanup
remains with the original shipping owner.
