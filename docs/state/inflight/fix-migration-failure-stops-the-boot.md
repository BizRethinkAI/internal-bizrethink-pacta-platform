# fix/migration-failure-stops-the-boot

Found by the reviewing session reading the **deploy path** during the post-merge
review of #317 — not by any failure, and not in the diff.

## What was wrong

`docker/start.sh` runs the migration and then starts the server regardless of
how it went, and the script has no `set -e`:

    npx prisma migrate deploy --schema ../../packages/prisma/schema.prisma
    printf "Starting Documenso server..."
    NODE_ENV=production ... node ... main.js

So a failed migration left the app serving against the **old schema**,
`/api/health` answered 200, and Coolify recorded a **successful** deployment.

**A deploy whose only failure mode reports itself as a success is worse than one
that fails.**

## Why it had never bitten, and why it matters now

Every migration in the previous batches was additive with a default and could
not realistically fail. `20260918010000_mca_template_names_its_entity` is the
first that can:

    ADD COLUMN "entityId" TEXT NOT NULL;   -- no default
    DROP COLUMN "profile";
    ADD COLUMN "entity" JSONB NOT NULL;

It fails against any table holding rows. Production holds none — verified
directly, with a control query — so this is a guard rather than a rescue.

## What is true either way

**Postgres DDL is transactional.** A failed migration rolls back, the
`DROP COLUMN` with it, and nothing is destroyed. The comment in the migration
said a failure there "is the correct outcome" and the *reasoning* was right; what
did not hold was the consequence, because the deploy would not have failed. That
correction is the reviewing session's.

What the guard adds is refusing to serve from a schema we never reached.

## Mechanism

`docker/start.sh` is upstream's entrypoint, so this is **overlay 093** rather
than a direct edit, with its rationale and merge fragility recorded in
`overlays/README.md` as the convention requires.

Guarded by `regression-tests/docker-start-migration-guard.test.ts`, which
asserts the step is guarded and that it exits non-zero — written to accept
`set -e`, `||` or `&&` as well, so a later rewrite passes on its merits rather
than on matching one spelling. It joins `docker-start-node-env.test.ts`, which
guards the same file for a different incident.

## Deploy note

**This should land before the ADR 0026 batch is deployed.** Not because that
migration is expected to fail — production is empty — but because it is the
first one that *could*, and the failure would have been silent.
