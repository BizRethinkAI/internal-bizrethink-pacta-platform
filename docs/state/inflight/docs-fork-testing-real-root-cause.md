# docs/fork-testing-real-root-cause — replace two wrong root causes with the real one

**PR:** #TBD · docs only. Follows overlay 068 (#96, merged).

## Why

`FORK-TESTING.md` carried TWO wrong root causes for the `find-documents` Team
Context flake:

1. DB contention on the shared document counter (recorded 2026-08-13, already
   self-flagged as unconfirmed).
2. A silent role downgrade via `getHighestTeamRoleInGroup` — written into the
   file earlier on 2026-09-06 by this same session, then disproven hours later.

A wrong answer in the file people consult is worse than no answer, and (2) was
mine. This replaces both with what #96 established and validated.

## What lands

- The 2026-09-06 investigation block is **deleted** and replaced with `RESOLVED`:
  `seedDocuments()` built a `match()` chain with no terminal call, so it
  returned a `Match` object rather than a Promise, `Promise.all` awaited
  nothing, and seeding was fire-and-forget.
- The A/B that proves it: isolated 20 repeats 20 failed/0 passed → 0 failed/20
  passed; full file 9 failed/91 passed → 100 passed. Plus #96's own CI E2E
  passing clean in 15m54s.
- The explanation for why every intuition was backwards: it races the unawaited
  seeds against the gap before the query, so an idle box and a freshly reset
  database each fail MORE.
- The 2026-09-02 correction is kept **verbatim** with a pointer to the
  resolution. Its observations were accurate; only its proposed cause was wrong.
- The baseline-refresh line no longer attributes the 4 flaky to DB contention.

## The part worth keeping

Four root causes were wrong before the right one, and every one came from
reading a single `Received:` value as a mechanism. The distribution across 20
repeats — 0,1,2,3,4,5 — was in the output the whole time and answers it
immediately. The file now says, in as many words: **plot the distribution before
proposing a mechanism.**

## Not in scope

- `update-envelope-items:314` and `stepper-component:375` do not use
  `seedDocuments` and remain unexplained; recorded as such.
- Reporting the bug upstream to documenso.
