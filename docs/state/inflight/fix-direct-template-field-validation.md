# fix/direct-template-field-validation — approved A-07

Shwet approved A-07 on 2026-09-12 after verification against merged main
`7f5ce5684caaa03a59b0fdc702ae6e33b60548f4`, including #177 / A-06.
Fresh worktree `/private/tmp/pacta-a07-direct-template`, own npm ci and Prisma
generation on Node 24.20.0. The shared checkout belongs to the separate
`research/mca-agreement-requirements` session and is not edited here.

This branch reserves overlay **080**; next unreserved is **081**. Ownership of
the single #176/#177 note fold is being coordinated through Shwet because the
MCA research session also plans note cleanup. Do not duplicate its fold.

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

Final validation will be recorded here. CI evidence belongs
in the PR description and Checks. No production access, credentials lookup,
schema/configuration change, PR merge or deployment is authorized by this fix.
Auth/signing and upstream changes require an independent, fresh human-started
adversarial review; this author never merges its PR.
