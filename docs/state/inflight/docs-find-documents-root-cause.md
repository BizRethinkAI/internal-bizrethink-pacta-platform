# docs/find-documents-root-cause — correcting the E2E root cause

**PR:** #95 · docs only · no code, no tests, no workflow changes.

## What this changes

`FORK-TESTING.md` recorded the `find-documents` Team Context cluster's root
cause as DB contention on the shared document counter. Its own note already
said that was unconfirmed. This replaces the guess with what was actually
established, and — importantly — with what was *dis*established.

## What is settled

Three theories killed by experiment rather than argument, on `ci-runner-03`:

| Theory | Experiment | Result |
|---|---|---|
| Cross-suite interference | ran the file alone (50 tests) | dead — still fails |
| Concurrency / contention | `--workers=1` vs `--workers=10`, 20 repeats | dead — 18/20 vs 17/20 |
| Accumulated DB state | `migrate reset`: 4561 teams → 5 | dead — worse, 19/20 |

Plus a ~2 minute reproduction replacing a ~20 minute CI cycle.

## What was disproven, including my own

A silent role-downgrade mechanism was proposed and then **disproven by
querying the database**: the group chain is intact, `admin-token` maps to a
user resolving to ADMIN, and all six envelopes are clean and queryable. The
underlying inference — reading `Received: 2` as "exactly the EVERYONE count" —
was unsound, because the fixture seeds two documents at *each* visibility
level. Both the theory and the bad inference are recorded so they are not
repeated.

## What is still open

1. What makes the API return 2 of 6 when role and data are both correct.
2. Why CI mostly passes — a real CI run of #93 passed on the same box while
   the manual invocation fails 19 times in 20.

Next step recorded in the file: capture what the API actually returns from
inside the request, rather than inferring from a count.

## Blocked on nothing

Docs only. Safe to merge independently of #94, which is blocked by the very
cluster this note describes.
