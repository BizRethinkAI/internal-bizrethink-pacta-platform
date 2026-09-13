# Saved MCA templates → internal transaction drafts

Task #211, author `mca-build-20260913`, directly assigned by the repository owner.
Branch `feat/mca-template-use`, based on #210
`43ba44da92ef3cda4cd08efc1a357b80a08ef2b3`. Only this note is owned.
Implementation ready for PR CI; independent review and merge remain outstanding.

## Result and boundaries

A current saved provider recipe opens a stateless transaction interview,
selects the actual equipment/report/channel instruments, fills semantic fields
and instrument-specific guarantors, previews legal text and downloads a marked,
unsigned PDF review copy. Saved provider revisions never absorb merchant input.
The server reloads and checks the revision for both output paths: live team
membership, disabled-account rejection, builder access, separate internal-draft permission, source fingerprint
and latest revision. Direct PDF errors preserve 400/401/403/404, never a success
status with a denial body. JSON reads stop at 600,000 bytes; responses are no-store.

Money remains supplied, strictly formatted data, with no second calculator.
The specified percentage must be a positive decimal no greater than 100. Full
personal SSNs and full deposit-account numbers have no supported document slot.
No input can grant consent, create a signature or assert processor acceptance.
Legal approval, findings, transaction nexus, disclosures/calculations/delivery,
actual processor forms/acceptance and authorized signing remain visible blockers.
Every output remains internal-draft and readyToSend false. Actual provider profiles,
registrations and merchant-ready disclosure packages are not verified by this PR.

## Catalogue and legal dependencies

The catalogues retain 210 numbered clauses and now 25 reusable records: 13 field
groups, 10 document blocks, two interview-only guidance records. Six new empty-body
execution/report field groups expressly remain review pending. Source provisions
and their recorded reviews are identified separately; no historical review is
falsely claimed to have read the new fields. The guard still refuses unexamined
legal prose. Each instrument has separate execution capacities; each individual
report subject gets a separate permission copy.

#194 candidate `174a45b6513772528a381f8aae63bcce9b3766e6` is integrated as
attributed code, tests and research, excluding its owner's state note. Its branch,
review status and merge ownership are untouched. The two original three-way
conflicts were guaranty-file header comments only; both substantive corrections
and the new catalogue/equipment terms were retained. This does not assert that
#194 was merged. Its original fourteen consent/acknowledgment corrections remain
unapproved; later semantic changes advance affected records again.

Current merchant notice, equipment notice/dispute and permission-preamble fields
use semantic keys. Guarantor notices use each guarantor's own information block
instead of one shared pair of source widgets. Provider servicing phone and
separate equipment-dispute contact are backward-compatible optional profile
inputs; missing fields remain visible. Source documents and extraction evidence
are preserved. No repeat Utah/California source rewrite or re-verification claim.

Full dependency chain: #210 → #208 → #206 → #204 → #190; separate ancillary #194,
design #200 and substantive review #202. No new migration or upstream overlay.
The integration is outside the shipping reviewer's frozen original PR batch.

## Validation and evidence

Focused red/green work covers input/forgery/privacy/money, percentage bounds,
source-review honesty, bounded JSON reads, HTTP access denials and real PDF
rendering. Repeated guarantors, entity capacity, separate report copies and
server-resolved current revisions are exercised. Before this final integration,
#210 at `43ba44da92ef3cda4cd08efc1a357b80a08ef2b3` passed E2E run
[34761313588](https://github.com/BizRethinkAI/internal-bizrethink-pacta-platform/actions/runs/34761313588)
(1,102 passed, three passed on retry, 59 skipped). It is the unchanged parent app,
dependencies and E2E configuration; current PR CI supplies the after-flow gate.

The final local relevant suite and separate scoped type check are recorded in
the PR. No local application build or duplicate full Playwright suite. Browser
scenarios cover the real saved-template → fill → download flow, immutable recipe,
cleared stateless inputs, stale preview and direct access/revision/input denials.

Real synthetic PDFs: 36 pages for FRPA plus worksheet; 67 pages for FRPA, equipment
lease, ISO and two individual permission copies plus worksheets. Poppler page
montages were inspected across all 67 pages; automated PDF.js checks verify page
bounds, page labels, no heading left alone, identity/capacity text, no unresolved
markers and no AcroForms. A page-number/footer line-height defect and an orphan
heading were reproduced and fixed. PDF.js and Poppler agree; libpdf misdecoded a
subset font on the worksheet and is not used for this content assertion.

## Next owner and rollback

Author owns CI fixes through green, then records exact-head results on PR/task
without a status-only code push. A fresh human-started independent review is
required for legal bindings, money, access and document output. The shipping owner
handles review/merge and state consolidation. Do not merge or deploy from this
authoring session. Once dependencies land, retarget and run every required check
against current main; stacked PR checks do not replace main-target CodeQL.

Disable either feature grant to stop drafting. Reverting this PR removes the
transaction workflow without deleting provider templates. New catalogue
fingerprints require a saved new revision; old approval is not silently reused.
See `packages/bizrethink/mca/transactions/README.md` for inputs and remaining
merchant-use requirements. The final CI status belongs in the PR/task handoff.
