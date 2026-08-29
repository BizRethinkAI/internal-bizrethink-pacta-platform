# ADR 0004 — Instance configuration in the database, not environment variables

- **Status:** Accepted (retrospective — records existing reality)
- **Date recorded:** 2026-08-29
- **Decision date:** 2026-05-11

## Context

Upstream Documenso configures the instance through environment variables —
signing certificates, S3 storage, SMTP, SSO, Stripe keys. On Coolify that means
every setting change is a dashboard edit followed by a redeploy, and the current
value is visible only to whoever can open the Coolify console.

For a platform whose admins are meant to self-serve, an unreadable setting is an
unmanageable one.

## Decision

**Instance configuration lives in the database with an admin UI.** Never a
Coolify environment variable.

The pattern, repeated per config surface:

1. A Prisma model in `additions.prisma`, secrets encrypted at rest with
   `NEXT_PRIVATE_ENCRYPTION_KEY`.
2. A server-only getter with an in-memory cache and an env-var fallback, so the
   env path remains the bootstrap default.
3. An overlay patching upstream's env read to consult the getter first.
4. An `/admin/*` page with a sandbox/live toggle and a "Test connection" button.

Applied to signing (overlay 011), storage (013), SSO, AI (016), Stripe, and
per-org SMTP.

## Consequences

An admin can see and change every setting without a redeploy, and "Test
connection" turns a misconfiguration into an immediate answer rather than a
failed deploy.

The costs are honest ones: **more moving parts per setting** (model, getter,
overlay, UI) than a single `process.env` read, encryption key management, and
cache invalidation on save. Each config surface also needs its own overlay,
adding to the sync surface.

The env fallback is deliberately retained so a fresh instance can boot before any
admin exists.

## Consequence for new work

New configuration goes in `/admin/*`. If you are reaching for a Coolify env var,
that is the signal you are about to violate this ADR.
