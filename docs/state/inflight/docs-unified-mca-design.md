# Unified MCA design — ADR 0015

- **Task:** [#199](https://github.com/BizRethinkAI/internal-bizrethink-pacta-platform/issues/199).
- **Author:** MCA design author — `unified-mca-design-20260913`.
- **Branch:** `docs/unified-mca-design`, from main
  `1813b1d72fb231593ddcb2cb0b2a55054ac7f040`.
- **Owner authorization:** Adopt one MCA workspace and separate catalogues with
  shared infrastructure in the design. Application implementation is separate.

## Recorded outcome

[ADR 0015](../../adr/0015-one-mca-workspace-with-separate-content-catalogues.md)
adopts Overview, Clauses, Reusable content, Disclosures & requirements and later
Templates as parts of one MCA vertical. It supersedes the separate-product
presentation in ADRs 0008/0009 and the mixed clause catalogue in ADR 0011 without
editing historical ADRs. Every displayed clause must have a selection-derived
number; reusable blocks belong outside clause APIs and counts. Prescribed
content verification, authored-content review and transaction checks retain
their distinct meaning.

The [design companion](../../design/mca-workspace.md) records the inspected
source revision, all 18 known classification cases, body/field preservation,
interview-to-document dependencies, review/storage migration concerns and
focused implementation criteria. Current inventory is 211 mixed records with
15 unnumbered entries and three additional numbered field groups. Some hold
operative protections and must be split, not silently moved into help text.
Both package READMEs distinguish this accepted design from current runtime.

## Validation and limits

Local documentation checks passed: 45 local links across five Markdown files;
all 18 mapped identities match the 211-record inventory, its 15 unnumbered rows
and 30 funding-grid widgets; whitespace, conflict-marker and new-document
personal-identifier checks pass. The existing numbered engine tests were not
rerun: this changes their future design contract, not runtime behavior.

No application dependencies were installed for this documentation change, and
no local unit/browser test, build, source-law research, database read or template
operation was performed. Node 24.20.0 is available for the existing PR-body and
state-note validators. Use PR CI for its existing broad gates; the documented
docs-only Playwright exception applies. Actual CI evidence belongs on the
task/PR after the final head passes, not in a status-only source commit.

No app route, clause body, source, approval, field, selection gate, schema or
stored template is changed. Existing pages still show mixed records. Readiness
enforcement and merchant output remain future implementation, not guarantees
established by an accepted ADR. No production state was queried or inferred.

## Handoff and pending work

The next separately assigned implementation re-inventories latest main, finalizes
mixed-record extraction, separates catalogue contracts and their consumers, and
delivers common navigation with focused TDD and existing CI/Playwright gates.
Keep current admin/counsel access, citations, findings and evidence invalidation.
Inspect storage consumers before proposing any data migration; do not infer zero
approval rows. Preserve original evidence and all legally consequential wording.

Open correction PRs #187/#190/#194 retain their existing owners and must be
incorporated when available; their changes are not duplicated here. Split Funding
Letters remain processor-controlled, with known contradictions for later review.
The interview, full package renderer/readiness, guaranty placement/numbering and
stored-template rebuilds are separate follow-ups. Security and workflow tasks
retain their assignments; no overlay or migration is reserved by this design.

The author owns this PR through green CI, then the repository owner or a fresh
authorized session reviews and merges. A separately authorized consolidator
folds this note into STATE.md without claiming the design is implemented. The
session completing that final required step records evidence, marks task #199
Done and closes it. This documentation task requires no app deployment or skill
installation. No merge, deployment or independent review is claimed here.
