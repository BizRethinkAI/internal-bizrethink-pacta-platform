# ADR 0021 — Manual batch deploys, and an ADR index that stays current

- **Status:** Accepted
- **Date recorded:** 2026-09-15
- **Decision date:** 2026-09-15 (repository owner approved the compaction).
  Manual deploys were already practice from 2026-09-12 (#182).
- **Supersedes:** [ADR 0005](0005-coolify-hosting.md)'s *"auto-deploying on
  every push to `main`"* and its consequence *"Deployment is a merge"*. The rest
  of 0005 stands.
- **Amends:** [ADR 0001](0001-record-architecture-decisions.md). ADR files stay
  append-only. One file, `docs/adr/README.md`, is not an ADR and is kept current.

## Context

ADR 0005 says Pacta auto-deploys every push to `main`. That stopped being true.
`docs/session-workflow.md` (#182, 2026-09-12) ships work in batches: a shipping
session merges reviewed PRs, merges one state consolidation, then requests a
single deployment. Coolify's `is_auto_deploy_enabled` is `false` for
`bizrethink-pacta-platform`, read on 2026-09-15. No ADR recorded the change, so
0005 kept telling new sessions that a merge is a release.

ADR 0001 makes ADR files append-only, and CI enforces it. That is right for
decisions. It also froze each ADR's status line at the moment of writing. By
2026-09-15 five ADRs still read "Proposed" or "pending" after their work had
shipped, and correcting them meant overriding the guard.

## Decision

### 1. `main` is deployed manually, once per batch

- **Coolify auto-deploy stays off** for Pacta. A merge is not a release.
- **A deployment is requested only after** every PR in the batch is merged,
  its state consolidation is merged, and `State ready to ship` is green on the
  exact final `main` SHA.
- **Request one non-forced deployment per app, and do not watch it.** A
  deployment receipt shows the request was accepted, not that the revision is
  live.
- **A deploy applies migrations.** The container runs `prisma migrate deploy`
  before the app starts (`docker/start.sh`). Merged migrations reach production
  on the next deploy, not on merge.
- **Merging stays human.** `main`'s repository ruleset allows merge commits only,
  which preserves upstream-sync ancestry. It requires these checks: Build App,
  Build Docker Image, E2E Tests and Validate PR title. Governance is not a
  required check.

This matches `docs/session-workflow.md`, which remains the procedure. This ADR
records the decision behind it.

### 2. `docs/adr/README.md` is the living index

- ADR files remain append-only. A decision that changes gets a new ADR.
- **The index holds each ADR's current status:** accepted, implemented,
  partly superseded or superseded, and by what. A status line inside an ADR file
  records its status when written.
- **Any PR that adds an ADR, supersedes one or completes one updates the index
  in the same change.**
- The append-only guard in `governance.yml` excludes `docs/adr/README.md` and
  nothing else.

## Consequences

**New sessions read the index, then the few current ADRs.** For MCA that is
[ADR 0020](0020-mca-decisions-consolidated.md). The superseded files stay as
history, so every existing link to an ADR number keeps working.

**Deploys went out on 2026-09-15 while `State ready to ship` was red.** The
batch was already merged and nothing broke. This ADR makes the order explicit so
the gate means something.

**Status lines inside older ADRs stay wrong forever.** That cost is accepted.
The index corrects them, and ADR 0020 lists the MCA ones.

## What 0005 keeps

Pacta runs as a Docker container on Coolify, deployed from `main`, with secrets
in Coolify. Self-hosting remains the chosen model over managed hosting, and
there is no staging environment.
