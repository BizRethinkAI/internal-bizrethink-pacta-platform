# ADR 0002 — Additive fork over hard fork

- **Status:** Accepted (retrospective — records existing reality)
- **Date recorded:** 2026-08-29
- **Decision date:** ~2026-04-29

## Context

Pacta is built on `documenso/documenso`, which is under active development. A
conventional fork diverges: every upstream release becomes a manual reconciliation
against a codebase that has drifted, and the cost compounds until the fork stops
following upstream at all.

## Decision

Customise **additively**, under three conventions:

1. **`packages/bizrethink/` is the only place features go**, structured as an
   ordinary workspace package.
2. **`overlays/*.patch` is the only sanctioned way to modify an upstream file.**
   Each patch carries a rationale, why it could not be additive, and a
   fragility rating. There are currently 42, all rated.
3. **Schema additions go in `prisma-extensions/additions.prisma`**, merged into
   `schema.prisma` at build time by a script rather than by hand.

`.github/workflows/upstream-sync.yml` merges `documenso/main` weekly.

## Consequences

Conflicts are confined to a small, known surface — our own files, overlay-patched
files, and `package-lock.json`. The weekly sync is a chore rather than a project.

The cost is real: **a change that would be one line upstream is a patch file plus
a rationale plus a fragility rating**, and features that need deep integration are
awkward. The 2026-08-13 sync (142 commits) still required overlay re-anchoring
and surfaced three silently dropped features.

The discipline is load-bearing rather than aspirational. When it was audited on
2026-08-29 the lease-builder feature — 47 clauses, an engine, a renderer and a
signing handoff — had added **zero overlays**. That is the design working.

## Alternatives considered

- **Hard fork.** Rejected: upstream ships signing, compliance and security fixes
  we would have to reimplement.
- **Contributing upstream.** Rejected for BizRethink-specific work (per-DBA
  branding, tenant routing) which upstream has no reason to accept. Still the
  right path for genuine bug fixes.
