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

## When a NEW test fails after this baseline

Because the baseline is curated and green, **a new red means a real signal.**
Triage it into a bucket:
- If it's an OVERLAY-CONFLICT with a *new* overlay → add it to overlay 066's
  exclusions, cite the overlay, backfill if the behavior matters.
- If it's REAL-FLAKE → confirm it passes on retry; leave it.
- Otherwise treat it as a **REAL-BUG** and fix it (TDD-first).

Never add a `testIgnore`/`test.skip` without a cited reason in this table.
