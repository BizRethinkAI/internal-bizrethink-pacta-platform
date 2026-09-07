# fix/ci-migrate-deploy — one database per E2E run

**Branch:** `fix/ci-migrate-deploy`.

## What was wrong

The E2E job runs on a **self-hosted** runner, and `dx:up` brings postgres up on
a **named volume** (`docker/development/compose.yml`: `documenso_database`), so
the database survives between jobs and between branches. `concurrency` is keyed
on `github.ref`, so two branches run there at the same time.

Against that, `prisma migrate dev` cannot work. It is an interactive
**authoring** command: it compares the database against the migrations folder
and, on any difference, asks to reset. In CI there is nobody to ask, so it exits
130 and the job dies before a single test runs.

On 2026-09-06 that cost three runs. PR #111 carried
`20260906230000_library_review_jurisdiction` and applied it to the shared
database. Every branch afterwards that lacked the migration was killed:

```
The following migration(s) are applied to the database but missing from the
local migrations directory: 20260906230000_library_review_jurisdiction
We need to reset the "public" schema at "127.0.0.1:54320"
npm error code 130
```

**The failure looked like a fault in each innocent branch.** Confirmed by run
timestamps rather than inferred: #111 ran at 00:35 and applied it; #112 ran at
01:05 and died; #108, #109 and #110 were green only because they ran earlier.
Any of them re-running would have failed the same way.

## The fix, and why it is two things

Both, because either alone leaves the incident possible.

**`migrate deploy` instead of `migrate dev`.** Applies pending migrations in
order and never resets — the only behaviour that makes sense unattended. Alone
this stops the crash but leaves one schema accumulating every branch's columns
forever, until two branches add the same column name.

**A database per run**, `documenso_run_<run_id>_<run_attempt>`, so concurrent
branches cannot see each other's schema at all. Created after an explicit
`pg_isready` wait — `dx:up` returns when containers are created, not when
postgres accepts connections, and the old step tolerated that only because
prisma retries where `CREATE DATABASE` does not.

Dropped in an `always()` step, plus a sweep for runs cancelled before they got
there. Without teardown a per-run database is a disk leak on a self-hosted
runner — a new problem in place of the one being fixed. The sweep is safe
against a concurrently running branch: a live job writes continuously so its
directory mtime stays fresh, and the job timeout is 120 minutes, so three hours
without a write means nothing is using it.

## Guard

`packages/bizrethink/regression-tests/ci-migrate-deploy.test.ts`, following the
pattern of `workflow-runners.test.ts`. Five assertions, each verified red by
mutation: restoring `migrate-dev` fails two, pointing the Playwright override
back at the literal database name fails one, and removing `always()` from the
teardown fails one.

**The test asserts against the workflow with comments stripped.** Its first
draft matched raw text and failed on its own documentation — the comments
explaining why `migrate dev` is banned have to name it. A comment naming the
command is harmless; a `run:` line invoking it is the incident.

## Not fixed here

`migrate dev` remains the right command for a developer's own machine; only CI
changes. `.env.example` and `docker/development/compose.yml` are upstream and
untouched — the run-scoped name is written into `.env` after it is copied.

## The test that it worked

Two branches carrying different migrations both going green in the same hour,
which is exactly what could not happen on 2026-09-06.
