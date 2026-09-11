# fix/dependabot-alerts — patch the open Dependabot advisories, and keep them patched

**Branch:** `fix/dependabot-alerts`. Follow-up to the 2026-09-10 incident review.
Overlay **072**.

## Where it started

32 open Dependabot alerts on `main` (6 critical, 6 high, 17 moderate, 3 low).
`npm audit --omit=dev`: 20 (1 critical, 6 high, 11 moderate, 2 low).
**Upstream had fixed none of them** — upstream's current lockfile (v2.18.0,
2026-09-09) carries the same versions, so waiting for the weekly sync would not
help.

**What actually ships** was checked in the running production container, not
assumed. The six critical alerts are `next` (RCE advisories), which is **absent
from the Pacta image** — it belongs to `apps/docs` and `apps/openpage-api`,
neither deployed. Present in production and patched here: `nodemailer`,
`sharp`, `hono`, `qs`, `morgan`, `colord`, `fflate`, `@simplewebauthn/server`,
`csv-parse`, `@faker-js/faker`. (`csv-parse`'s advisory needs
`group_columns_by_name`, which the bulk-send parser does not set — not
exploitable here; bumped because 7.0.0 has no breaking changes.)

## Where it ended

`npm audit --omit=dev`: **6 (0 critical, 3 high, 3 moderate, 0 low)** — all of
it two accepted chains. Full audit incl. dev: 25 → 9.

**Accepted, with reasons, in `dependency-security-floors.test.ts` (`ACCEPTED`):**
- `deepmerge-ts` (high) — only via `@prisma/config` (exact pin), trusted config
  at startup. Forcing v8 risks breaking `prisma migrate deploy` at container
  start.
- `ts-deepmerge` (moderate) — only via `@anatine/zod-openapi`, static schema
  objects while building the OpenAPI document.
- `adm-zip` (dev) — via `inngest-cli`; one advisory has no fix; not in the image.

The Dependabot alerts for these stay open until someone dismisses them on
GitHub — **not done here**; it is the owner's call.

## The part that is easy to miss: durability

The weekly sync takes upstream's lockfile wholesale (UPSTREAM.md). A fix that
lived only in the lockfile would be reverted by the next sync. So:

- **Direct deps:** declared ranges are raised in `package.json`, so upstream's
  locked versions no longer satisfy them and `npm install` re-resolves.
- **Transitive deps:** root `overrides` (`qs`, `morgan`, `joi`,
  `@shuding/opentype.js → fflate`, and `hono` raised). **npm does not apply an
  override to a package already in the lockfile**, so the runbook now runs
  `npm update qs morgan joi fflate` after `npm install`. Simulated both ways:
  without the line 4 floors regress; with it all hold.
- **`dependency-security-floors.test.ts`** reads the root lockfile and fails if
  any floor regresses — so a sync PR that drops one goes red instead of
  shipping.

## Still open

- The npm-audit gate stays **advisory**: `npm audit` cannot allowlist the
  accepted `deepmerge-ts` high, so a blocking gate would fail every PR.
- The master `~/github/bizrethink/CLAUDE.md` still calls this gate "blocks
  high+". It is not in this repo; not edited.
