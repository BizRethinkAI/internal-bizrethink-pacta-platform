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
The foreign recipient self-hide fallback also allowed a write; same-team and human-session controls worked. Database/external side effects are doubled in these
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
