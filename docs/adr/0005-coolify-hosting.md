# ADR 0005 — Coolify + Docker, auto-deploying from `main`

- **Status:** Accepted (retrospective — records existing reality)
- **Date recorded:** 2026-08-29
- **Decision date:** ~2026-04-29 (inherited from the house standard)

## Context

BizRethink runs a self-hosted Coolify PaaS on Vultr VPS infrastructure and
deploys every project that way. Pacta inherited it rather than choosing it
independently.

## Decision

Deploy Pacta as a Docker container on Coolify, **auto-deploying on every push to
`main`**. Secrets live in the Coolify dashboard. The Postgres database runs as a
Coolify-managed container on the same VPS.

## Consequences

Deployment is a merge; no separate release step.

That is also the sharp edge: **`main` is production.** A merge with red CI reaches
users. This happened — PR #1 on 2026-05-25 — and is the direct reason for the
definition of done in the engineering standard and for branch protection, which
was only actually enabled on 2026-08-29.

Two operational consequences worth knowing before touching production:

- The database host in `NEXT_PRIVATE_DATABASE_URL` is a **Coolify-internal
  hostname that does not resolve outside the VPS network.** `prisma migrate
  deploy` cannot reach it from a workstation. Use
  `scripts/bizrethink-db-query.sh`, which tunnels over SSH and runs `psql`
  inside the container.
- **There is no local development database.** Every Prisma query in
  `packages/bizrethink/server-only/` has been unit-tested and never executed
  against a real Postgres. Closing this is a known gap, tracked in `STATE.md`.

## Alternatives considered

- **Vercel / managed hosting.** Rejected: self-hosting is the AGPL-comfortable
  path and keeps signing keys on infrastructure we control.
- **Staging environment before production.** Not adopted; a solo shop with one
  VPS. The compensating control is CI, which is precisely why CI must actually
  test something.
