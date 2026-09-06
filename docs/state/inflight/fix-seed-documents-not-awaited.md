# fix/seed-documents-not-awaited — the find-documents flake, root-caused

**PR:** #TBD · overlay 068 + regression test.

## What it is

`seedDocuments()` in `packages/prisma/seed/documents.ts` built a `match()` chain
with no terminal call. ts-pattern evaluates the matching handler eagerly, so the
writes start — but the chain returns a `Match` object, not a Promise. The
enclosing `Promise.all` therefore awaited nothing and the seeding was
**fire-and-forget**. Specs queried the API while rows were still landing.

This is the `find-documents` Team Context flake: ~1 CI run in 5 red for months,
blocking unrelated PRs, and the reason overlay 067 exists (which made the red
readable and explicitly did not fix it).

## Four earlier root causes, all wrong

DB contention on the document counter (the recorded one), cross-suite
interference, accumulated DB state on a persistent runner, and a silent role
downgrade via `getHighestTeamRoleInGroup`. The last got as far as being written
into `FORK-TESTING.md` before it was disproven.

The tell was in the data from the start: 20 repeats produced `Received:` values
of 0,1,2,3,4,5 — a continuous distribution. No filter, role or visibility rule
produces that; only a partial write does. Individual samples (`2`, `0`) were
read as evidence for a mechanism instead.

## Why it was intermittent

A race between the unawaited seeds (last row lands ~19-38ms) and the gap before
the query (`createApiToken` + one HTTP round trip, ~6-12ms). Comparable
durations, both load-sensitive.

This inverts the intuition and explains two results that had looked like noise:
an **idle** box fails *more* (fast round trip → smaller gap), and a **freshly
reset** database fails *more* (smaller DB → faster queries → smaller gap).

## Evidence

A/B, same box, same DB, back to back:

| | isolated, 20 repeats | full file, 100 tests |
|---|---|---|
| unpatched | 20 failed / 0 passed | 9 failed / 91 passed |
| patched | 0 failed / 20 passed | 100 passed |

Arrival-order instrumentation over 8 runs showed which document goes missing is
uncorrelated with status, visibility, recipient count or owner — it is whichever
loses the race.

## Blast radius

49 call sites across 5 spec files (`api/v2/find-documents`,
`api/trpc/search-documents`, `documents/find-documents`, `teams/search-documents`,
`teams/team-documents`). All racy before this; the ones that passed had a wide
enough gap.

## Follow-ups, deliberately not in this PR

- `FORK-TESTING.md` still carries the disproven role-downgrade entry written
  earlier the same day, plus the counter-contention entry. Both need replacing
  with this. Kept separate so the fix can be judged on its own.
- Worth reporting upstream — a genuine documenso bug, not fork divergence.
- `update-envelope-items:314` and `stepper-component:375` do NOT use
  `seedDocuments` and remain unexplained flakes.
