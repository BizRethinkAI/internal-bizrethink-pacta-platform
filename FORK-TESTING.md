# FORK-TESTING.md — curating the upstream E2E suite for a behavior-diverging fork

## Why this file exists

`internal-bizrethink-pacta-platform` is an **additive fork** of
[documenso/documenso](https://github.com/documenso/documenso). The E2E suite
under `packages/app-tests/e2e/` is **upstream Documenso's** — we inherit it
verbatim on every weekly upstream sync. But our fork deliberately changes runtime
behavior through ~40 overlays (see `overlays/README.md`). Some upstream tests
therefore assert behavior we intentionally replaced. **Those failures are not
bugs** — they are the suite testing Documenso's behavior, not ours.

This file is the contract for how we keep the Playwright regression gate (a
project **hard rule**) green without masking real defects.

## The four buckets

Every failing/flaky E2E test falls into exactly one:

| Bucket | Meaning | Action |
|---|---|---|
| **REAL-BUG** | Genuine defect in *our* code | **Fix it** (TDD-first). Blocks green. |
| **OVERLAY-CONFLICT** | Test asserts behavior a BizRethink overlay deliberately replaced | Ignore here + cite the overlay + **cover our behavior with a fork-owned test** |
| **ENVIRONMENT** | Fails due to the CI runner/env, not logic (e.g. pixel-diff vs foreign baselines) | Ignore here + cite the reason |
| **REAL-FLAKE** | Non-deterministic; passes on retry | Leave in the suite — Playwright `retries` handle it. Do **not** exclude. |

## The rule

> **Upstream files — including their tests — stay pristine, so the weekly sync
> stays a 5-minute chore. Our intended behavior gets guarded by *our own* tests
> in `packages/bizrethink/`.**

Concretely, when an upstream test conflicts with an overlay:

1. **Ignore it** in `packages/app-tests/playwright.config.ts` (`testIgnore`
   glob for a whole file) or, if only some tests in a file conflict, `test.skip`
   those specific tests in-file. Always cite the overlay number in a comment.
2. **Do NOT** edit the test's assertions to match our behavior — that forks the
   upstream test file and it will conflict on every sync.
3. **Backfill** the behavior we care about with a fork-owned test under
   `packages/bizrethink/` (never conflicts on sync; asserts *our* intended
   behavior). Only backfill behaviors worth guarding.
4. Record the exclusion as an overlay (`overlays/NNN-*.patch`) so it's tracked
   and re-appliable.

Flakes are the exception — they stay in the suite (they're real coverage of
upstream logic we depend on); retries make them green.

## Current curated baseline (locked 2026-08-13)

Established by a one-time curation: full inventory (`maxFailures` disabled →
**8 failed / 6 flaky / 812 passed**) + a 13-agent categorization workflow with
adversarial verification of every exclusion. **Result: 0 REAL-BUGs.**

**Excluded (overlay 066):**

| Spec | Bucket | Overlay | Fork-owned backfill |
|---|---|---|---|
| `scenarios/form-flattening.spec.ts` (whole file) | OVERLAY-CONFLICT | 018 / 040 | `packages/bizrethink/regression-tests/acroform-flatten-skip.test.ts` |
| `envelopes/envelope-alignment.spec.ts` (whole file) | ENVIRONMENT | 061 | — (tests upstream pixel rendering, not our logic) |
| `envelopes/envelope-overflow.spec.ts` (whole file) | ENVIRONMENT | 061 | — |
| `webhooks/webhooks-crud.spec.ts` → `create`(:42), `update`(:173) | OVERLAY-CONFLICT | 024 | deferred — lands with the planned webhook fan-out feature |

**Kept in the suite (accept-on-retry):** `search-documents:416`,
`find-documents:663`, `find-documents:715`, `update-envelope-items:314`,
`stepper-component:375`, `documents/find-documents:1112`. Root cause of the seed
group is DB contention on the shared document counter
(`packages/lib/server-only/envelope/increment-id.ts`) under the `workers:10`
API-test project. Optional future hardening: a bounded retry on
`incrementDocumentId` (own overlay) — not required for green.

> **CORRECTION, 2026-09-02 — "accept-on-retry" is no longer true.**
>
> *(RESOLVED 2026-09-06 — see the block below. The root cause proposed in this
> note was wrong; the real defect is an unawaited seed helper, fixed by overlay
> 068. Kept verbatim because the observations in it are accurate and were what
> eventually led to the answer.)*
>
> These specs now fail through **all five attempts**. A run on PR #67 shows
> `retry #1` … `retry #4` exhausted, and the failing cluster is the
> `find-documents.spec.ts` **Team Context** visibility group (`:562`, `:669`,
> `:721`, `:864`) — adjacent to, but not the same as, the `:663`/`:715` entries
> recorded above.
>
> The assertions fail as `Expected: 3 / Received: 0` — a team query returning
> **nothing**, not the wrong thing. Empty-not-wrong does not obviously fit the
> counter-contention story, so treat the root cause above as **unconfirmed**.
>
> Rate: 5 reds in 25 runs (~20%), three of them on 2026-09-02 alone.
>
> **Not yet reproduced locally.** The spec passes locally in isolation; a
> faithful repro needs the built app (`npm run start`), and the local build is
> currently blocked by a Node version mismatch (repo/CI expect Node 22, the dev
> machine runs 26 — `options.recursive` was removed from `fs.rm`). That is the
> next step, not another re-run.
>
> Overlay 067 raised `maxFailures` from 1 to 25 so this cluster stops hiding the
> other ~888 results. That makes the red **readable**; it does not make it go
> away.

> **RESOLVED, 2026-09-06 — `seedDocuments()` never awaited. Overlay 068.**
>
> Not contention, not visibility, not roles. `seedDocuments()` in
> `packages/prisma/seed/documents.ts` built a `match()` chain with **no terminal
> call** — no `.exhaustive()`, `.otherwise()` or `.run()`. ts-pattern evaluates
> the matching handler eagerly, so the writes start, but the chain returns a
> `Match` object rather than the handler's Promise. The enclosing `Promise.all`
> therefore awaited nothing and the seeding was **fire-and-forget**: specs
> queried the API while rows were still being written and received an arbitrary
> subset.
>
> Measured directly: **0** documents immediately after `await seedDocuments()`,
> all **6** five seconds later.
>
> **A/B, same box, same database, back to back:**
>
> | | isolated, 20 repeats | full file, 100 tests |
> |---|---|---|
> | unpatched | 20 failed / 0 passed | 9 failed / 91 passed |
> | patched | **0 failed / 20 passed** | **100 passed** |
>
> The unpatched failures land on exactly the six Team Context tests because
> those six are the only tests in that block and **all six call
> `seedDocuments()`**. Every other test in the file seeds through the properly
> awaited singular helpers.
>
> **Why it was intermittent, and why every intuition about it was backwards.**
> It is a race between the unawaited seeds (last row lands ~19-38ms) and the gap
> before the query (`createApiToken` plus one HTTP round trip, ~6-12ms).
> Comparable durations, both load-sensitive. So an **idle** box fails MORE (fast
> round trip, smaller gap), and a **freshly reset** database fails MORE (smaller
> DB, faster queries, smaller gap). It also explains why CI is bimodal rather
> than a per-attempt coin flip: all five retries run on the same box in the same
> state, so a run fast enough to lose the race loses it five times — which is
> what the 2026-09-02 note above recorded as "fails through all five attempts".
>
> **FOUR ROOT CAUSES WERE WRONG BEFORE THIS ONE**, and the reason is worth more
> than the fix. In order: DB contention on the document counter (recorded above,
> self-flagged as unconfirmed); cross-suite interference; accumulated DB state
> on a persistent runner; and a silent role downgrade via
> `getHighestTeamRoleInGroup`, which was written into THIS FILE earlier the same
> day and has now been deleted from it.
>
> The evidence was present throughout. Twenty repeats produced `Received:`
> values of **0 x8, 1 x2, 2 x3, 3 x1, 4 x4, 5 x2** against `Expected: 6` — a
> continuous distribution. No filter, role or visibility rule produces that;
> only a partial write does. Each wrong theory came from reading a SINGLE draw
> (`2`, then `0`) as a mechanism instead of as a sample. Arrival-order
> instrumentation over 8 runs confirmed it: which document goes missing is
> uncorrelated with status, visibility, recipient count or owner. It is
> whichever loses the race.
>
> **If you are debugging a flake in this repo, plot the distribution before
> proposing a mechanism.** That single step would have replaced four theories
> and several days.
>
> **Blast radius:** 49 call sites across 5 spec files — `api/v2/find-documents`
> (8), `api/trpc/search-documents` (8), `documents/find-documents` (18),
> `teams/search-documents` (4), `teams/team-documents` (11). All were racy; the
> ones that passed had a wide enough gap.
>
> **Still unexplained:** `update-envelope-items:314` and
> `stepper-component:375` do NOT use `seedDocuments` and are unrelated flakes.
>
> **Upstream:** a genuine documenso bug, introduced in `feat: add organisations
> (#1820)` (Jun 2025), not fork divergence. Worth reporting.

## Baseline refresh — 2026-08-13 upstream sync (142 commits, upstream 2.16.0)

Post-sync the curated suite reports **1028 passed / 4 flaky / 64 skipped / 0 failed**
(up from 812 passed — upstream added ~216 tests). No new REAL-BUGs; the exclusion
table above still holds and needed no additions.

The 4 flaky were attributed to DB contention; that was wrong. Root-caused
2026-09-06 to `seedDocuments()` never awaiting — see the RESOLVED block above,
fixed by overlay 068.

**Job cap:** the suite now runs ~51 min of test execution / ~59 min wall-clock. The
E2E job cap was raised 60 → 120 min because the sync pushed it past the old cap and
GitHub killed the job mid-run — a cancelled job reports **neither pass nor fail**, so
the gate goes dark exactly like the warp-runner incident did. Two guards in
`packages/bizrethink/regression-tests/workflow-runners.test.ts` now pin the cap
(>= 90 min) and `TURBO_LOG_ORDER: stream` (without streaming, turbo buffers task
output and discards it on kill — the capped run produced 53 min of pure silence,
making "slow" and "hung" indistinguishable).

**If E2E ever reports `cancelled`, treat it as no-verdict, not as a pass.**

## When a NEW test fails after this baseline

Because the baseline is curated and green, **a new red means a real signal.**
Triage it into a bucket:
- If it's an OVERLAY-CONFLICT with a *new* overlay → add it to overlay 066's
  exclusions, cite the overlay, backfill if the behavior matters.
- If it's REAL-FLAKE → confirm it passes on retry; leave it.
- Otherwise treat it as a **REAL-BUG** and fix it (TDD-first).

Never add a `testIgnore`/`test.skip` without a cited reason in this table.
