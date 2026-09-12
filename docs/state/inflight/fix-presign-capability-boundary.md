# fix/presign-capability-boundary — approved A-03

Owner approved A-03 on 2026-09-12 after source verification on latest merged
main `0c440a396c9b5f5c9161538358fc08ff120fdc80`. Fresh worktree
`/private/tmp/pacta-a03-presign`, Node 24.20.0, own npm ci and Prisma generation.
Shared checkout belongs to `chore/mca-source-verification` and is untouched.

This session reserves overlay **078**; next unreserved is **079**. PR #173 / A-04
owns overlay 077 and the merged #172 state fold. This branch will not duplicate
that fold. Cross-session messaging is unavailable; coordinate through Shwet.

Approved scope: retain parent lifecycle and delegated team/resource/operation
limits across presign consumers. Existing omitted scopes are documented as
team-wide authoring authority; preserve that within the issuing team. Resource-
scoped tokens cannot create unrelated documents. Normal human sessions and
CircularPay's direct server-to-server REST token flow remain separate. No new
rate limit, config, production request, credential access, merge or deploy.

TDD baseline: **24 failed / 9 passed** before changing production code. Real
JWT verification, both Hono PDF adapters and all three create tRPC handlers run;
database/storage/mutation boundaries use synthetic doubles. Failures reproduce
expired/disabled parent acceptance, lost resource/team limits and restricted
passes gaining create authority. Existing signature, audience, JWT expiry and
valid team-wide creation controls pass. Test TypeScript gate passes.

Fresh independent human-started adversarial auth/upstream review is required.
This author opens the PR and monitors only its own CI; it never merges its PR.
