# fix/dependabot-2026-09-09 — the lockfile was stale, the overrides were theatre

**PR:** #TBD. One file changed: `package-lock.json`.

## What it does

Regenerates the lockfile. Production-dependency vulnerabilities go from
**24 (2 low, 12 moderate, 9 high, 1 critical) to 20 (2 low, 11 moderate, 6
high, 1 critical)** — three high and one moderate closed, measured with
`npm audit --package-lock-only --omit=dev` against main's lockfile and this
one, in the full workspace.

`js-yaml` 4.3.1→4.3.2, `fast-uri` 3.1.5→3.1.6, `browserslist` 4.28.0→4.28.8.
Their existing semver ranges already permitted the patched versions. Nothing
was pinned; the lockfile had simply gone stale.

## What was tried first and thrown away

Seventeen `overrides` entries in the root `package.json`, pinning every flagged
package to its first patched version. **All of it was reverted, and the reason
is worth keeping.**

1. **npm refuses to override a direct dependency at all** unless the override
   string is byte-identical to the declared spec. Not "unless the version
   satisfies the range" — `nodemailer@^9.1.1` does satisfy `^9.0.0` and npm
   still rejected it with `EOVERRIDE`. Every existing entry in this repo's
   overrides block that touches a direct dependency restates the same spec
   (`typescript 5.6.2`, `postcss ^8.5.19`) or uses `$name`. None of them bumps
   anything. They exist to pin TRANSITIVE copies. That is the only thing
   overrides can do here.

2. **For the transitive ones, the overrides made no difference.** A/B with and
   without them resolved `js-yaml`, `fast-uri` and `browserslist` to identical
   versions and produced an identical audit. They were inert.

3. **A blanket pin can silently downgrade.** `fflate ^0.7.5` looked right for a
   `>=0.7.0 <0.7.5` advisory, but a caret on `0.x` caps the minor, and the root
   depends on `fflate ^0.8.3`. npm rejected it. Three copies exist; only
   `@shuding/opentype.js`'s 0.7.4 was ever in range.

**A Dependabot alert names a package, not which copy is affected.** Check which
instance is actually in the vulnerable range before pinning anything.

## What is left, and why a lockfile cannot fix it

| Remaining | Blocker |
|---|---|
| `next` — 6 criticals, unauth RCE | `apps/docs` + `apps/openpage-api` pin `16.3.0` exactly. **Not in the production image** — `turbo prune --scope=@documenso/remix` drops both apps; verified `next` absent from the running container and `apps/` holding only `remix`. |
| `sharp` — high, libheif | root + `packages/lib` pin `0.35.3` exactly. **Is** in the production image. |
| `deepmerge-ts` + `@prisma/config` + `prisma` — 3 highs | One advisory, three surfaces. npm's only offered fix is `6.12.0` — downgrading Prisma seven minors. The flaw is stack exhaustion on recursive object graphs, which here means our own build-time Prisma config, not attacker input. **Deliberately not fixed.** |
| `nodemailer`, `colord`, `@faker-js/faker`, `@simplewebauthn/server`, `hono` | Direct dependencies; overrides are impossible by rule. |

Each needs an edit to an upstream manifest — an overlay, permanent, conflicting
on every sync, for dependencies upstream will bump themselves. Not taken
unilaterally.

## The npm audit gate does not gate

`CLAUDE.md` lists it as a compensating control for having no CodeQL licence:
*"npm audit CI gate (security.yml, blocks high+)"*. `security.yml` sets
`continue-on-error: true`, with its own comment saying it reports and does not
fail. It has been advisory since at least 2026-08-29.

That is why PR #142 showed a green "npm audit" check with 40 alerts open. The
control described in CLAUDE.md does not exist. Correcting the doc — or the
workflow — is a separate change, but it should not stay as it is.

## Verified

`npm install` clean, `patch-package` both ✔ (**`@react-pdf/layout@5.2.0` still
applies** — the lease page-count crash stays shut, and a refreshed lockfile is
exactly where that pin dies silently), `prisma generate`, 163 bizrethink test
files, 18 lib test files, `turbo run build` 3/3.
