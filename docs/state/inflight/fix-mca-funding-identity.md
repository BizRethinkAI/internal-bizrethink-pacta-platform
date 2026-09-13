# MCA funding and document identity fields

Author session: **mca-build-20260913**, directly assigned by the repository owner.
[Task #203](https://github.com/BizRethinkAI/internal-bizrethink-pacta-platform/issues/203)
is the first implementation in the authorized funding/identity → equipment →
final mapping → provider interview/reusable-template queue. The owner directed
continuous authoring across bounded PRs; independent review/merge remains separate.
Initial base: merged main `7f178f8e4f8242a4abe2ca2ba4864d3ee7e16492`.
This PR is stacked on refreshed #190 to inherit its source integration and the
necessary CI MinIO registry repair. Retarget to main after that dependency merges.

## Result and rationale

All four current field groups use shared, semantic field definitions. Funding
labels no longer add equipment to a payback amount or define finance charge as
purchased amount minus merchant cash. Purchase price, purchased receipts, loan
principal, prior MCA settlement, unpaid prior charges, equipment charges and cash
are distinct bindings. Missing notice/reconciliation contacts, funding conditions,
deadlines, offer expiry, effective date, exhibits and broker information are
represented; DBA and explicitly conditional fields are optional.

Current placeholders are stable names. Historical widget anchors remain separate
provenance, and three original full-SSN slots are explicitly retired. Each
instrument's guarantor identity block repeats independently, with a separate
guaranty signature/date and conditional entity-signer name/capacity. Field-group
versions advance; fingerprints include repeat and retirement metadata. No source
is promoted from draft or given a named legal reviewer.

The original source documents remain unchanged. Historical coverage accounts for
retained and explicitly retired anchors and rejects an empty-anchor match. The
existing funding coverage test still pins all 30 source anchors. This follows
research [#202](https://github.com/BizRethinkAI/internal-bizrethink-pacta-platform/pull/202)
findings MCA-R02/R03 and the approved library direction, without repeating the
source research or finalizing clause/helper placement.

## Decisions and limits

- Retire full SSN document slots entirely; private verification belongs outside
  the agreement. Merchant tax and account identifiers are labeled for document-
  safe use. This metadata change is not value-validation or production-privacy
  enforcement; the later transaction API must enforce that boundary.
- Preserve separate purchase-price placements sharing one value, and distinguish
  prior loan principal from a prior receivables purchase settlement.
- Add current placeholders instead of inventing new legacy AcroForm numbers.
  Existing PDFs must not be filled by translating these names back automatically.
- Keep all 211 clause bodies unchanged. Equipment economics, final catalogue
  mapping, a typed transaction-fill API, rendered/signed forms and stored-template
  migration remain in later queue items. No production or schema operation occurs.
- Enable existing build/test and Playwright workflows for PRs targeting stacked
  branches by removing only their main-target restriction. All jobs, test scopes,
  exemptions, token permissions and main-only push triggers remain unchanged.
  This implements the owner's instruction to continue across PRs without waiting
  for each merge. It neither authorizes merges nor substitutes helpers for review.

## Validation and continuation

The new focused suite first produced **7 failing tests**. A subsequent refinement
separating prior MCA settlement from loan principal produced another failing
case before its implementation. Coverage includes stable bindings, absence of
full-SSN fields, required contacts, separate guarantor capacities/signatures,
approval invalidation and rejection of vacuous source coverage. The affected
corpus, approval, numbering and counsel-review selection passes **14 files /
513 tests**. Actual CI results belong on the PR/task. Changed-file formatting,
diff inspection and own-note checks are required before push. No duplicate local
full build, typecheck or browser sweep is run for field metadata.

The earlier executed before-Playwright [run 34721779381](https://github.com/BizRethinkAI/internal-bizrethink-pacta-platform/actions/runs/34721779381)
at `e5fbec884b3c02cb02e3e32815fa5d24022310cc` matches the initial base's application,
dependencies, overlays and workflow files. The stacked dependency's new run
[34753452484](https://github.com/BizRethinkAI/internal-bizrethink-pacta-platform/actions/runs/34753452484)
must pass on `7cc9a8528dbd7eab066833f7f72a1e13a1aa66c9` for the integrated before
gate; its result is not assumed here. This PR's CI supplies the after gate,
broad tests/builds and separate type checking. Final evidence is on the PR/task.

Fresh human-started review remains required for the legal/money/signing surface.
The author owns CI through green, then continues the next authorized task; the
author does not merge or deploy. The completing reviewer/merger and consolidator
record completion and close task #203 after their required scope is finished.
Other sessions' security/workflow work and state notes retain their owners.

### First CI correction

The first full CI unit run found three obsolete assertions in
`a-signature-for-merchant-is-not-a-guaranty.test.ts` that still required the
original full-SSN grid. Those assertions now require the current notice bindings,
all retained/retired historical anchors, independent signature/entity capacity,
and absence of full-SSN fields. The affected file plus new field tests pass
**2 files / 28 tests**. This was a missed affected test, not a reason to remove
CI or restore the unsafe field. The original 513-test evidence predates this
additional focused correction; fresh full CI remains the after gate.

The stacked before-Playwright run on #190 now passes: run 34753452484 reports
1,096 passed, four passed on retry, and 59 skipped. Fresh independent review of
#190 was requested on its PR/task. This author continues without merging it.
