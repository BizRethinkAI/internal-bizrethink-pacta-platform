# fix/admin-loader-authz — close the anonymous admin-loader bypass (A-01)

**Branch:** `fix/admin-loader-authz`. Overlay **073**. First fix out of the
independent security audit that followed the 2026-09-10 external probe.

## The hole

Documenso puts the admin authorization check in exactly one place — the admin
**layout** loader (`admin+/_layout.tsx`: `getSession` + `isAdmin` → redirect).
Under React Router 7 single-fetch, a request for

```
/admin/<page>.data?_routes=routes/_authenticated+/admin+/<page>
```

runs *only* that leaf route's loader and skips every ancestor loader — so the
layout's check never executes. Any admin leaf loader without its own check
therefore returns its data to **anyone, unauthenticated**. This is A-01 in the
audit, rated critical, reproduced there against the pinned React Router 7.18.2
and re-confirmed here by reading our own code. It was live in the deployed
build (`f3a3b38e9`) and needed no signup, password or token.

**Eight** upstream admin leaf loaders were exposed:
`claims`, `documents.$id`, `organisation-insights._index`,
`organisation-insights.$id`, `organisations.$id`, `site-settings`, `stats`,
`users._index`. The worst is `documents.$id` — full envelope detail including
recipients, fields, signatures and **signing tokens**, across `mfg` and
`lombard`; `site-settings` leaks the CAPTCHA secret in plaintext; `users._index`
leaks every user's email and role.

The fork's own admin pages (`mca`, `mca-library`, `lease-library`) were already
safe — they self-gate with `isAdmin`. This is an upstream weakness our overlay
pages happened to dodge.

## The fix

- **`packages/bizrethink/server-only/require-admin-loader.ts`** (new, owned):
  `requireAdminLoader(request)` = `getOptionalSession` + `isAdmin` → `throw new
  Response('Not Found', { status: 404 })` for anonymous or non-admin. 404, not
  403/redirect, so it does not confirm a route exists. Same idiom the fork's own
  admin pages already used, factored into one place.
- **Overlay 073** wires `await requireAdminLoader(request)` as the first line of
  all eight upstream leaf loaders (adding the `request` param where the loader
  lacked it). One guard line each; no other logic touched.
- **`@documenso/auth`** added to the bizrethink package's dependencies (needed
  for `getOptionalSession`).

## Why it can't silently come back

- **`regression-tests/admin-loaders-gated.test.ts`** scans the admin route
  directory and fails on any leaf that exports a loader but gates it via neither
  `requireAdminLoader` nor `isAdmin`. It earned its place immediately: it caught
  `organisations.$id`, which the audit's own list of seven had missed (its
  loader only returns license flags, which is why — low sensitivity, but still
  ungated).
- **`server-only/require-admin-loader.test.ts`** pins the 404-for-anon /
  404-for-non-admin / returns-admin behaviour, and that the two denials are
  indistinguishable.
- Both are in the `tsconfig.typecheck.json` gate.

## Verified

Full bizrethink suite 3819 passed; bizrethink typecheck exit 0; apps/remix
typecheck 0 errors; biome format clean. Playwright not run locally (no DB) —
the E2E job on the PR is the verdict.

## Not in this PR

A-01's recommended defence-in-depth (request-level middleware) and the other
23 audit findings, which the owner is triaging one at a time. The audit and its
PR review live in `~/Desktop/Claude Cowork/BizRethink/Platform/incidents/2026-09-10-pacta-probe/`.
