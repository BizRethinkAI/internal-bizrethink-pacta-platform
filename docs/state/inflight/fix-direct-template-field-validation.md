# fix/direct-template-field-validation — approved A-07

Shwet approved A-07 on 2026-09-12 after verification against merged main
`7f5ce5684caaa03a59b0fdc702ae6e33b60548f4`, including #177 / A-06.
Fresh worktree `/private/tmp/pacta-a07-direct-template`, own npm ci and Prisma
generation on Node 24.20.0. The shared checkout belongs to the separate
`research/mca-agreement-requirements` session and is not edited here.

This branch reserves overlay **080**; next unreserved is **081**. Shwet assigned
this A-07 session ownership of the single #176/#177 note fold. The MCA research
session must not duplicate it; coordination is relayed through Shwet because
cross-session messaging is unavailable. #176 already folded #173/#174/#175;
those notes are not folded again here.

Approved scope: enforce the direct template's immutable values and field
constraints before copying files or creating a signed recipient/document.
Preserve valid v1 label-based and v2 index-based choices, optional omissions,
existing identity gates and signing flows. Typed-signature restrictions must
also apply to both signature field types.

Test-first reproduction on unchanged main: **56 failed / 20 passed**. The actual
creation helper runs with synthetic persistence/storage/delivery boundaries;
identity and field-auth code execute normally. Rejected-input tests assert no
factor handling, file copies, quota use or creation writes. Positive controls
cover editable values, both choice encodings, formatted numbers, existing
identity/timestamp gates and drawn signatures. The test TypeScript gate passes.

The owned validator now checks and canonicalizes the complete direct recipient's
values before ACTION factors, quota use, file copies or creation writes. Locked
text/number/dropdown/radio/checkbox values retain publisher defaults, including
when an older client omits the locked field. Editable prefills remain editable.
The v1 label/empty-label and v2 index representations remain distinct; duplicate,
foreign and invalid choices fail. Existing empty id=0 UI placeholders are ignored.
Shared field validators supply ordinary constraints, with exact decimal bounds
for formatted numbers, zero-valued bounds and inputs beyond JavaScript precision.
Optional omissions, the editor's empty checkbox constraint and server-derived
DATE values keep working. Both signature types enforce the effective typed
signature setting; a caller's image flag cannot disguise plain text. Image
classification retains the existing PNG-prefix convention, not new image decoding.

Test-first commits: `88db82046` records the initial 56 failures / 20 passes on
unchanged main; `cb366ac98` adds four decimal-boundary regressions that failed
against the intermediate working-tree guard (4 failed / 76 passed); `707ee1b0d`
adds default-checkbox/date compatibility and missing-dropdown-choice cases
(12 failed / 80 passed against that intermediate guard). The latter two red
counts describe the intermediate worktree, not their test-only commits alone.
Follow-up test-first commit `17755b8c1` reproduced four compatibility failures:
the initial guard rejected `.5` and `1000.` although ordinary signing accepts
them with no selected number format. Whole-value parsing now preserves those
forms without relaxing configured formats, exact bounds or malformed-number
rejection. All **96 focused regressions** now pass. Final local validation passed
**4,637 owned tests / 207 files**, **287 shared tests / 19 files**, the owned
TypeScript gate including the new HTTP spec, full Remix types and changed-file
format/lint checks. The **12 HTTP tests** were discovered locally; their actual
app/PostgreSQL execution belongs to CI. No local build or database test was run.
Overlay 080 is the exact one-file upstream diff, reverse-checks and replays
byte-for-byte against merged main `7f5ce5684`. No schema or configuration changes.

GitHub still reported main `7f5ce5684` and no open PRs before publishing. The
#176/#177 fold preserves source qualifications and the unverified independent
review/deployment status of #177; A-04's migration prerequisite is retained.
The shared MCA research checkout was not edited. Current CI evidence belongs
in the PR description and Checks. No production access, credentials lookup,
schema/configuration change, PR merge or deployment is authorized by this fix.
Auth/signing and upstream changes require an independent, fresh human-started
adversarial review; this author never merges its PR.
