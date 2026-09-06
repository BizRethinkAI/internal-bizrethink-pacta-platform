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

> **ROOT CAUSE INVESTIGATION, 2026-09-06 — the counter theory is disproven.**
>
> Run on `ci-runner-03` (idle, out of the CI path), driving the `api` project
> directly. The recorded cause above — DB contention on `incrementDocumentId` —
> is **wrong**. So are two theories raised during the investigation.
>
> **The symptom.** `:721` asserts an ADMIN sees all 6 seeded documents and
> receives **2**. Note that the fixture seeds **2 documents at each of the three
> visibility levels**, so the number 2 on its own distinguishes nothing — an
> early reading of it as "exactly the EVERYONE count, therefore a role
> downgrade" was an unsound inference and is recorded here so it is not made
> again.
>
> **A role-downgrade mechanism was investigated and DISPROVEN.** The candidate:
> `getTeamById` derives the role via `TeamGroup → OrganisationGroup →
> OrganisationGroupMember → OrganisationMember → userId` (`get-team.ts:47`),
> and `utils/teams.ts:76` returns `LOWEST_TEAM_ROLE` untouched when that list
> comes back empty — so an empty group list is indistinguishable from "this
> user is a MEMBER", with no error and no log. That would land in the
> `.otherwise()` branch of `find-documents.ts:340` and allow `EVERYONE` only.
>
> Plausible, and wrong. Querying the database directly after a failing run,
> for the team the test actually used (`Envelope.title='Admin Doc 1'` — NOT the
> newest team, since `seedUser()` creates a personal team as a side effect):
>
> ```
> admin-token          -> userId 43
> userId 43 resolves   -> ADMIN,MEMBER      (highest = ADMIN, correct)
> all 6 envelopes      -> COMPLETED, correct visibility, deletedAt NULL,
>                         type DOCUMENT, no folder, teamId correct
> ```
>
> The group chain is intact, the role resolves to ADMIN, and every document is
> queryable. An ADMIN should therefore see all 6. **Why the API returned 2 is
> still unexplained** — but it is not this.
>
> **The silent fallback in `getHighestTeamRoleInGroup` remains worth fixing on
> its own merits** — treating "no groups found" as "lowest role" turns any
> future glitch in group resolution into a silently wrong document set, which
> in a signing platform is a permissions answer given with no signal. It is
> upstream code and would need its own overlay. It is simply not the cause of
> THIS failure.
>
> **What was ruled out, and how:**
>
> | Theory | Experiment | Result |
> |---|---|---|
> | Cross-suite interference | ran `find-documents.spec.ts` alone (50 tests) | **dead** — still fails |
> | Concurrency / DB contention | `--workers=1` vs `--workers=10`, 20 repeats each | **dead** — 18/20 vs 17/20 |
> | Accumulated DB state on a persistent runner | `migrate reset`: 4561 teams → 5 | **dead** — got *worse*, 19/20 |
>
> The accumulation theory was the plausible one (CI runs `prisma:migrate-dev`,
> never `reset`, so a homelab runner's DB grows across runs where a
> GitHub-hosted one started clean — and the dates fit the 08-31 move). A single
> experiment killed it. Recorded here so nobody spends an evening re-deriving
> it.
>
> **Reproduction, ~2 minutes instead of ~20.** On a runner, with the stack up:
>
> ```
> npx playwright test e2e/api/v2/find-documents.spec.ts --project=api \
>   -g 'should enforce visibility across admin and manager levels' \
>   --workers=1 --repeat-each=20 --retries=0
> ```
>
> **STILL OPEN.** Two gaps, not one. (a) What actually makes the API return 2
> of 6 when the role and the data are both correct. (b) Why CI mostly passes.
> A real CI run of PR #93 passed *on this same box* while the manual invocation
> fails 19 times in 20. Something differs between the two — most likely
> environment the job provides that the manual harness does not. Until that is
> closed there is a reliable reproduction and a precise mechanism, but not the
> full causal chain. **Next step: log `teamGroups.length` and the resolved role
> inside `getTeamById` at query time.** Not another re-run.
>
> **Worth fixing regardless of how the test story ends.** Treating "no groups
> found" as "lowest role" rather than as an error is what converts any glitch
> in group resolution into a silently wrong document set. In a signing
> platform that is a permissions answer given with no signal that anything went
> wrong. It is upstream code, so changing it to throw would need its own
> overlay.

## Baseline refresh — 2026-08-13 upstream sync (142 commits, upstream 2.16.0)

Post-sync the curated suite reports **1028 passed / 4 flaky / 64 skipped / 0 failed**
(up from 812 passed — upstream added ~216 tests). No new REAL-BUGs; the exclusion
table above still holds and needed no additions.

The 4 flaky remain the DB-contention group described below (accept-on-retry).

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
