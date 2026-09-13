# Legal workspace readability

This implements the repository owner's approved UI plan against the unified MCA
workspace introduced on main through `a48b5eab3bc55ecfcb64dea382b4cd3485d1b9de`.
The existing admin navigation retains one MCA entry and its four local views:
Clauses, Reusable content, Provider templates, and Disclosures & requirements.
Lease clauses remain a sibling admin section.

## Behavior

- MCA and lease catalogues have compact summaries, search and scope/subject/status
  filters, URL-addressable expanded items, complete readable wording, and grouped
  provenance, findings and approval controls.
- Counsel reviews reusable clauses by subject, business decision or full index.
  The current server brief is prominent. Offered business alternatives retain
  full wording and equal standing in the main reading flow. Reading marks and
  unsaved finding drafts last within the mounted workspace; reading is not approval.
- Canonical clause and section references carry their actual selection context.
  They support nested previews, opening the referenced context and returning to
  the exact original passage with keyboard focus restored. A reference outside
  the authorized corpus does not load or disclose its target wording.
- The disclosure register separates registered forms, open readings and available
  document checks. Detail shows prescribed rows, provider-drafted explanations,
  calculation relationships, required content evidence and the bounded source
  passage. The full retained source is separately labelled. Missing boundaries
  do not widen the verification scope. Document checks are availability, not a
  result from an evaluated transaction.
- Provider revisions separate answers, package reading and requirements. Saved
  revision history remains immutable. Package reading indexes actual document
  instances, including repeated report subjects. Missing transaction values link
  to their actual form controls, including distinct guarantors and report subjects.
- Lease browsing uses the existing Florida, North Carolina and portable-tier
  membership rules. Approval coverage always names its separate jurisdiction,
  including All and Shared views; changing browsing scope retains that jurisdiction.

## Implementation decisions

Shared presentation code lives in `packages/bizrethink/legal-ui`. Supplemental
Tailwind utilities use the existing preset and are scoped to the legal workspace.
The seven owned route modules load them through external stylesheet links, so
they work with the existing content security policy and do not depend on injected
inline styles. No upstream overlay or stylesheet scan change is required.

Reference metadata is derived from canonical tokens using the existing numbering
engine. It is an ephemeral presentation projection, added after authorization
and saved-template validation; it is never saved or included in fingerprints.
Provider and transaction projections verify/preserve the original rendered text.
Paragraph presentation retains the source text and existing paragraph boundaries.
References use stable target identities, rather than guessing from numeric text.

No schema migration, new permission, legal wording edit, brief factual correction,
approval-policy change, signing path, merchant-send action, or PDF eligibility
change is included. The existing lease review-share organization dependency
remains in place. Homelab hosting and state consolidation are separate work.

## Validation and limits

- Before gate: main `a48b5eab3bc55ecfcb64dea382b4cd3485d1b9de`, successful
  [E2E run 34777823568](https://github.com/BizRethinkAI/internal-bizrethink-pacta-platform/actions/runs/34777823568).
  The Playwright shard actually executed; this is the unchanged pre-change base.
- Focused unit/regression selection: 2,779 tests across 67 files passed, covering
  canonical wording, numbering, approvals/findings, scope, saved snapshots,
  transaction filling and the actual unsigned PDF output.
- Separate customization and Remix route type checks passed. No local full build
  was run, in accordance with repository instructions.
- Meaningful failing checks exposed distinct repeated-input targets, missing
  disclosure calculation metadata, absent reading typography and non-navigable
  citations inside a preview before their respective fixes.
- All ten affected Playwright tests passed across the final focused runs. The new
  review test creates its link through the actual admin form and confirms it is
  current before recording a finding. Browser checks use an isolated development database and the repository's CI
  rate-limit setting. They exercise authorization failures, finding persistence,
  immutable provider revisions, missing-field navigation and actual PDF download.
  Desktop, tablet and phone layouts are inspected; the existing admin header
  already overflows at 768px. The regression compares identical feature grants
  and requires the legal workspace to fit without increasing that baseline.
- Final PR CI and a fresh independent review remain required before merge.
  The author does not merge or deploy this change.
