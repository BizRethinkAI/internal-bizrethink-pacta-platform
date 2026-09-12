# fix/api-token-team-boundary — keep API credentials within their issuing team

Owner approved audit finding A-02 for implementation on 2026-09-12. Started
from freshly fetched main `005db8e469ad8c66da6bb3373149705f0089e250` in an isolated
worktree with Node 24.20.0, own npm ci and Prisma generation.

## Verified defect and failing tests

The common single/bulk envelope predicates allow creator ownership and
team-email ownership without an outer team boundary. API v1/v2 use the token's
effective user with those predicates, so a key can reach that user's documents
in another team. Legacy tokens fall back to the organisation owner. The same
predicate grants destructive document deletion. Three Hono PDF download paths
shadow tRPC and must be covered separately.

Before implementation, the actual v2 handlers, v1 authentication middleware,
token validation and Hono download handlers produced **14 failing / 13 passing**
Vitest cases. Failures returned foreign records/PDFs or allowed deletion;
The foreign recipient self-hide fallback also allowed a write; same-team and
human-session controls worked. Database/external side effects are doubled in these
unit tests; the additional Playwright spec exercises real HTTP/PostgreSQL.

The exact baseline main has successful CI and Playwright runs:
- CI: https://github.com/BizRethinkAI/internal-bizrethink-pacta-platform/actions/runs/34663118704
- Playwright: https://github.com/BizRethinkAI/internal-bizrethink-pacta-platform/actions/runs/34663118705

## Scope and ownership

Only A-02 is approved here. Preserve existing human-session permissions and
legitimate same-team REST operations. Do not throttle CircularPay, edit consumer
repos, query production or claim knowledge of its current token-user overlap.
The new E2E spec requires the isolated CI/local E2E environment.

Overlay **075** is reserved for this change; 074 belongs to R-01 PR #169.
The owner acknowledged a coordination relay to the separate review session.
This session cannot directly message the live Claude/other Codex sessions.
Do not edit #169's branch or duplicate another PR's state-note folds.

Fresh independent adversarial review is required. The common predicate files
also explicitly call for at least two reviewers when those functions change.
The implementing session opens the PR and never merges it. CI green remains
the definition of done; no CI/deployment watcher is authorized.

## Implemented boundary and validation

Owned `server-only/api-token-team-scope.ts` carries only the immutable issuing
team ID through `AsyncLocalStorage.run`. The global singleton survives separate
Remix/Hono module copies. An invalid/nested-different team is refused before
dispatch; a query using another team's role is refused. Human sessions and
non-API jobs keep upstream ownership semantics when no API scope is active.
The common single/bulk queries AND the API team outside every ownership branch.
The first document-delete lookup is also scoped, returning 404 before any
foreign deletion or recipient self-hide. Three Hono download queries establish
the same scope before PDF generation/storage; the item-download route already
has an explicit team predicate and is unchanged.

Overlay 075 captures all six upstream hooks. TDD commit `ad81f11a9` contains
only tests/registration/state, and reproduces 14 assertion failures before the
implementation. Final local validation on Node 24.20.0:

- 40 focused cases pass: 27 actual-handler regressions and 13 context cases.
- Full owned suite: 4,183 tests / 195 files pass; shared lib: 287 / 19 pass.
- The separate TypeScript gate and owned-package format gate pass.
- Overlay reverse-apply and exact six-file coverage/inline-marker checks pass.
- The prescribed `test:dev -- ... --list --project=api` discovers all five new
  Playwright cases. The raw CLI initially lacked the repo's `--import tsx`
  loader; using the package command resolves discovery. No DB URL is set
  locally; import-time Stripe config initialization logs that missing URL.
- New Playwright spec covers v1/v2/v2-beta, normal/legacy keys, shared sender,
  mixed-team bulk reads, deletion, recipient self-hide and shadow PDF routes.
  It has not been executed against a running HTTP/PostgreSQL stack locally.
  The exact final PR CI/E2E verdict remains outstanding; never call this done
  or merge it based solely on the unit tests.

Production and CircularPay were not accessed. The fix removes inherited
cross-team authority by design; actual consumer reliance on that authority is
unknown. Same-team read/delete/PDF positive controls pass locally; full HTTP
confirmation belongs to the final CI run. A-03 presign authority and all other
findings remain separate decisions, not claimed fixed here.

## Review queue dependency

Read-only queue check: main remains `005db8e469ad8c66da6bb3373149705f0089e250`.
PR #169 head `4e0af2d44409286774e64b4c111fb3e234a7024b` now owns the merged
#168 fold and deletes `chore-mca-memo-refutations.md`. Do not duplicate that
fold here. Merge #169 first, then mechanically refresh this branch from main,
retaining overlays 074+075 and both sets of type-gate entries. The resulting
stale #169 note needs exactly one coordinated fold; this session does not own
it. Revalidate the resulting final head before merging A-02. Until refreshed,
Guard 5 will still see the inherited #168 note on this branch.
