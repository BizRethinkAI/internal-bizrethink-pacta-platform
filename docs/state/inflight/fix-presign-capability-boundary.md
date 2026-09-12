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
valid team-wide creation controls pass. The initial test TypeScript gate passed.

Implementation retains a minimal verified capability (no parent token hash),
checks signature/algorithm/expiry plus current parent expiry, disabled issuer or
organisation owner, and current team membership. Legacy user-ID audiences remain
compatible within the parent team. Omitted scope retains documented team-wide
authoring; malformed scope fails closed. All six create/update adapters share a
verified request context. Edit loaders and nested mutations retain A-02's team
boundary. Both PDF adapters apply team/resource predicates to the query loading
the PDF and force private/no-store before conditional cache responses.

Additional TDD: four race scenarios failed before adding the data-query
predicate; three create-adapter assertions failed before propagating the team
through the mutation context. All **37 focused regressions** now pass. The three
tRPC rejection assertions inspect the wrapped AppError cause (createCaller
bypasses the HTTP error formatter); they still rejected baseline behavior.

Local validation before integrating the A-04 dependency: **4,459 owned tests**,
the owned TypeScript gate and full Remix route typegen/typecheck pass. The earlier
lib suite passed **287** tests. Twelve isolated HTTP/PostgreSQL tests cover both
PDF adapters, revocation, all three create/update variants and edit loaders;
discovery passed, actual execution is pending CI. Overlay 078 records exactly
13 upstream adapters/verifier files; reverse-apply check passes. No new schema.

Integration: A-04 / PR #173 head `f1ea41a44b87ce04c1f6159f37d41fcb4d17244c`
is included as an explicit dependency, without merging that PR to main or editing
its branch. Its state fold remains the sole source of the #172 cleanup. Merge
#173 first; A-03's review range starts at that head. Four mechanical conflicts
combined the imports, overlay index, owned paths and typecheck includes. Overlay
078 was regenerated against #173 and both overlays replay sequentially from
main to byte-identical source across all **15** affected upstream files.

Combined validation: **4,488 owned tests**, **287 lib tests**, owned and full Remix
type checks, owned formatting, and 12-test Playwright discovery pass. Prisma was
regenerated locally for A-04's additive table; no database was contacted. Discovery
uses the repo's `NODE_OPTIONS='--import tsx'` loader, like its E2E command. Actual
HTTP execution and independent review remain pending.

Fresh independent human-started adversarial auth/upstream review is required.
This author opens the PR and monitors only its own CI; it never merges its PR.
