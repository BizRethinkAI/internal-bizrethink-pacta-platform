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
restricted, unowned and mismatched-team source copies currently succeed;
normal template use and permitted replacement controls pass. No production
credentials, DB access, requests, merges or deploys.

Planned authorization: inspect all sources before copying any file. Existing
attachments must be readable through current envelope/team permissions; API
credentials retain their issuing-team boundary. New staged uploads carry a
server-recorded owner, optional verified team and a fingerprint of the stored
reference/content. A stored receipt cannot override current attachment access
or a changed file. Unowned historical orphan uploads cannot be safely backfilled
and will require re-uploading. Existing attached records need no backfill.

The creating session implements and opens the PR; fresh independent auth/schema/
overlay review is required before another session merges it. CI monitoring of
this session's PRs is authorized; deployment watching remains prohibited.
