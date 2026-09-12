# fix/template-pdf-source-authorization — approved A-04

Owner approved A-04 on 2026-09-12 after source verification on main
`0c440a396c9b5f5c9161538358fc08ff120fdc80` (includes merged #169/#170/#172).
Fresh worktree `/private/tmp/pacta-a04-template-sources`, own npm ci and Prisma
generation on Node 24.20.0. Shared MCA checkout is untouched.

This session reserves overlay **077**; next unreserved is **078**. GitHub had
no open PRs when ownership was checked. Peer session messaging is unavailable;
coordination goes through Shwet and this note. Only A-04 is approved here.

TDD: the real template-copy helper and Hono upload route run with boundary
DB/storage doubles. Before implementation: **16 failed / 8 passed**. Foreign,
restricted, unowned and mismatched-team source copies succeeded on the baseline;
normal template use and permitted replacement controls pass. No production
credentials, DB access, requests, merges or deploys.

Implemented authorization: inspect all sources before copying any file. Existing
attachments must be readable through current envelope/team permissions; API
credentials retain their issuing-team boundary. New staged uploads carry a
server-recorded owner, optional verified team and a fingerprint of the stored
reference/content. A stored receipt cannot override current attachment access
or a changed file. Unowned historical orphan uploads cannot be safely backfilled
and will require re-uploading. Existing attached records need no backfill.

The additive `BizrethinkPdfUpload` table is declared in owned
`prisma-extensions/additions.prisma`; the existing generator appends it to the
upstream schema. Migration `20260912130000_bizrethink_pdf_upload_ownership` only
creates that table. No existing records or tables are changed; no migration was
applied locally or to production. Deploy must apply migrations before the new
app serves uploads. An older app can ignore the table on rollback, although an
application rollback also restores the A-04 vulnerability.

Receipts use scalar upstream IDs, following the existing extension convention.
There is no guessed historical ownership, expiry or single-use restriction:
retries and reuse remain allowed while the same uploader retains permission,
the file remains unattached and its stored content/reference fingerprint matches.
An attachment always requires current envelope permission; an old receipt cannot
override it. API credentials require a receipt for their issuing team, while
browser uploads retain their existing user-wide scope. Deleted sources cannot be
copied. Normal authorized organisation-template use remains intact; a custom
replacement supplied to an API key cannot cross its team boundary.

The three upstream hooks are the actual template-copy helper, browser/presign
upload route and multipart envelope-use route. No caller-supplied owner/team
is trusted. All policy lives in owned modules, preserved by overlay 077. A-03
presign scope/lifecycle and A-06 reads remain separate audit decisions. No new
environment variable, dependency or public input field is added. CircularPay's
local caller supplies a template and form values without replacement IDs; this
is source compatibility evidence, not a production traffic claim.

This PR owns the single fold of merged #172's note into STATE.md. GitHub main
was still `0c440a396` and no other PR was open when that ownership was checked.

Validation: **29 focused tests**, **4,451 full owned tests**, **287 shared-library
tests**, owned TypeScript gate and full Remix typecheck pass. Owned formatting
passes; changed-file Biome check has advisory warnings only. **Six HTTP tests
are discovered** for CI: legacy/explicit API replacements, historical orphans,
browser ownership, multipart use and member visibility. Positive controls check
copied PDF pages and populated form values. HTTP tests were not run locally
because this worktree has no DB/env; discovery is not an execution result.

Pure Prisma schema diff confirms exactly one new table and matches the committed
migration; no existing DDL/data changes. Overlay/source equality and reverse
apply pass. The upstream ownership filter returns exactly the three patched
files. No build or production verification was run. Fresh PR CI, including the
real HTTP tests and migration, and independent review remain required.

The creating session implements and opens the PR; fresh independent auth/schema/
overlay review is required before another session merges it. CI monitoring of
this session's PRs is authorized; deployment watching remains prohibited.
