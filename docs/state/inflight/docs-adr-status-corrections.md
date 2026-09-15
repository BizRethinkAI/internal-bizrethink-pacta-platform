# ADR status corrections (0011, 0015–0018)

Branch: `docs/adr-status-corrections`. Base: main `d51d9fb03`. A direct
instruction from the repository owner on 2026-09-15.

## What changed

Only the status lines of five ADRs changed. They said "Proposed", "pending" or
"for implementation" after the work had merged and deployed:

- **0011:** accepted; phases 1–4 in #171. Phase 5's guaranty numbering series is
  not implemented.
- **0015:** accepted; implemented in #208 and #215. The readiness view and
  merchant-output enforcement are not implemented.
- **0016:** implemented in #210; its migration is applied.
- **0017:** implemented in #234, with reader repairs #260/#268; its migration is
  applied.
- **0018:** implemented in #236, promoted in #250, with repair #258; both
  migrations are applied.

No decision text changed. ADR 0001 allows corrections of fact. The governance
guard "ADRs are append-only" still fails on any in-place edit by design, so this
PR needs the owner's override, as the guard's own message describes.

## Evidence

- Merge dates and bases come from `gh pr view`.
- Migration status comes from a read-only production `_prisma_migrations` query
  on 2026-09-15.
- Phase 5 status comes from `mca/clauses/*/guaranty.ts`, which uses
  `section: 'guaranty'` inside each instrument's numbering.

No code changed, and no tests apply.
