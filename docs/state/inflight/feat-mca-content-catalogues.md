# Separate MCA catalogues and common workspace

Author session: **mca-build-20260913**, directly assigned by the repository owner.
Task [#207](https://github.com/BizRethinkAI/internal-bizrethink-pacta-platform/issues/207).
Branch `feat/mca-content-catalogues` is stacked on #206, initially
`ca31f30ba8cc5593a61a5d675cc51f3207208127`. Dependencies: accepted design #200,
substantive research #202, funding/identity #204, equipment #206. Integrate #194's
consent and acknowledgment correction before the completed package can be used.
Do not repeat the already completed Utah/California legal-source research.

## Delivered behavior

One MCA sidebar entry opens three populated views: Clauses, Reusable content,
and Disclosures & requirements. Existing admin URLs and token-scoped counsel links
remain supported. Clauses contain only numbered operative provisions. Reusable
fields, document structure and interview-only guidance have a separate typed API
and admin view, with the same approval/finding/provenance infrastructure. The
prescribed disclosure view stays read-only. Overlay **085** contains the minimal
upstream sidebar change; new E2E ownership is declared. Reservations 082–084
remain with their existing task owners.

The split yields **210 clauses and nineteen reusable items**: seven field groups,
ten document blocks and two prompts. All 211 original identities remain in the
union. Mixed records are separated by actual function, not headings: operative
holdback/equipment limits, formation/funding and execution/capacity protections
remain numbered. Six embedded equipment jury/class/limitation provisions gain
independent clause identities. Equipment schedules now use #206's shared field
definitions. Required identity and execution blocks keep explicit document
placement; interview-only guidance has no document placement.

`packages/bizrethink/mca/reusable/README.md` gives the mapping decisions.
`migration.json` records the source revision, all original body hashes, extraction
segments, field/retired-slot/repeat hashes and destination version pins. Tests
reconstruct all 211 input bodies at the extraction versions. The single rollover
label/widget span maps explicitly to its field binding. Historical printed
subheading prefixes exist only in the audit reconstruction. Later deliberate
versioned drafting is permitted; the extraction audit does not make old source
wording a permanent constraint again (ADR 0012).

## Approval and stored-data consequences

Reclassified or split records advance versions. New extracted records declare
`derivedFrom`. Fingerprints cover kind, uses, placement and derivation along with
wording, fields, conditions and signer-repeat semantics. Whole-agreement reviews
cover both authored catalogues. Existing unchanged clause fingerprints retain
their prior contract; modified content and whole-agreement review links lapse as
appropriate. No approval is transplanted to a new record or different text.

Historical findings stay on their original identities. The approval router checks
unanswered findings across the derived item's source identities too, including
findings on another review link. Counsel still sees only its own token-scoped
findings and cannot approve. Earlier vendored review annotations stay internal.
There is no schema change, live database migration or deletion of stored records;
no assumption was made that approval or template tables are empty. Existing
merchant documents and stored templates are not rewritten by this change.

## Validation and handoff

Focused TDD: clause-boundary/extraction selection started at **eight failures and
one pass**, then all **224** checks passed. The broader affected selection exposed
old catalogue assumptions (fields looked up as clauses, unnumbered clauses, old
counts and embedded provisions). Those were updated to exercise their new homes
while preserving substantive legal, privacy, coverage and approval assertions.
Final affected selection: **47 files, 2,524 tests passed** across MCA clauses,
engine, review and reusable content. Biome checked changed code and removed unused
imports. A targeted separate type check caught a test's impossible typed comparison;
that assertion is corrected and the complete scoped type check now passes, including
the new workspace component and browser regression. CI also retains its own type gate.

Three new Playwright scenarios exercise the real admin views and navigation,
ordinary-member denial, token-scoped counsel field review, no counsel approval,
and an original unresolved finding blocking extracted-field approval through the
real HTTP/database path. Applicable before evidence is #206 E2E run 34755074098
(1,098 passed, two passed on retry, 59 skipped). This PR's after run and all other
required CI results will be recorded in the PR/task on the final head; no success
is claimed before those finish. No local build or duplicate full browser sweep.

Fresh independent review is required for this legal mapping, approval boundary and
upstream hook. The author does not merge, deploy or approve legal content. Stacked
feature-target CI does not attach platform CodeQL; retarget/integrate main in
dependency order and require the complete merge check set before shipping.

## Remaining authorized queue

Provider interview and reusable MCA package templates follow next. Provider policy
must stay distinct from transaction inputs, merchant elections and processor
acceptance. Actual field validation, repeated signer qualification, package
rendering, disclosure applicability/evidence and publication gates are not claimed
by this catalogue PR. Unsupported gross/ACH or other unauthored provider bargains
must remain unavailable. Processor-controlled Split Funding Letter contradictions
remain a separately owned reconciliation dependency. All authored text is still
draft, with no named legal approver. No merchant-ready legal approval is implied.

## CI correction on the author branch

First after-Playwright run 34757628985 exposed two new-test failures, with 1,099
passed, two passed on retry and 59 skipped. The recorded browser snapshot showed
translation message IDs instead of the new navigation labels: Lingui’s upstream
extraction roots excluded the owned component directory. Overlay 085 now includes
that narrow extraction root. The authenticated non-admin trace proved the existing
parent layout returned HTTP 302 to `/`; the browser followed it to HTTP 200. The
new test incorrectly expected the leaf loader’s 404. It now verifies the exact
redirect, navigation away from admin and absence of MCA rows/navigation. No access
rule was changed. The counsel review and inherited-finding HTTP/database scenario
already passed on the first run. Final CI is re-running for this corrected head.
