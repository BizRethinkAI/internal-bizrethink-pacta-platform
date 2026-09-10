# chore/pr-discipline-node-24 — the last literal Node version, and two comments that lied about it

**Branch:** `chore/pr-discipline-node-24`, stacked on `docs/fold-inflight-into-state` (#146).
One workflow line, two corrected comments.

## Why

`pr-discipline.yml:27` pinned `node-version: 20`. Node 20 is EOL, and the file is
byte-identical across several repos — it propagated Node 20 as a unit rather than
by anyone choosing it.

**Everything else here was already on 24 and a grep could not see it.** The four
workflows that need Node — `ci.yml:32`, `security.yml:37`, `e2e-tests.yml:226`,
`governance.yml:223` — all call `.github/actions/node-install`, and **none passes
`node_version`**, so all four take that action's `default: v24.x`.

That invisibility has already produced one wrong answer: an external survey
grepped `node-version:` across the workflow files, reported *"pacta CI runs Node
20"*, and had to retract it. The only literal `node-version:` in the repo was the
one stale line. **A version that lives in a composite action's `default:` is
invisible to the search everyone runs.**

## What changed

| File | Change |
|---|---|
| `.github/workflows/pr-discipline.yml:27` | `node-version: 20` → `24`, with the inline `MODIFIED for BizRethink` marker `.github/` uses instead of an overlay |
| `.github/workflows/ci.yml:58-62` | a comment asserting **three** wrong facts, corrected |
| `docs/STATE.md` | a *Blocked* bullet that is no longer true at all, rewritten |

### The comment was wrong three times over

`ci.yml` said *"CI runs Node 22 (the default in .github/actions/node-install)
… zod-prisma-types calls `fs.rm` with the `recursive` option Node 26 removed."*

- **"Node 22"** — the default is `v24.x`.
- **"`fs.rm`"** — it is `fs.rmdirSync(path, {recursive: true})`, at
  `zod-prisma-types/dist/classes/directoryHelper.js:25`.
- **"Node 26 removed"** — it stops working **after 24**. Measured on this machine:
  24.20.0 succeeds with a `DEP0147` warning, 26.0.0 throws.

Each is the same failure — **asserting a version without opening the file that
decides it** — which is also what produced the retracted survey, and what I did
myself earlier in this session when I reported the machine as running Node 26
from a shell that never sourced `.zshrc`.

### The STATE.md bullet was stale in substance, not just detail

It said `npm test` cannot run on the workstation and that **"CI is currently more
capable than the dev machine."** Both ended on 2026-09-09: Homebrew's Node 26 was
uninstalled and `node@24` linked, and the full suite runs locally — 48 files,
1889 MCA tests. Rewritten rather than patched, with what remains unguarded kept.

## The engines decision, taken deliberately and answered NO

`engines.node` is `">=24.0.0"` — an open upper bound admitting exactly the
versions where `fs.rmdirSync(recursive)` breaks. Tightening to `">=24 <25"` would
close it. **Not done, and this is the reasoning rather than an omission:**

- `package.json` is **upstream-owned**. Three overlays already patch it (007, 019,
  033), and each is a permanent merge-conflict surface. A fourth buys a guard we
  already have.
- **`.node-version` is fork-owned, conflict-free and already pins 24**, which fnm
  honours per-directory. That is the mechanism that actually decides which Node
  runs on a workstation.
- Upstream will keep moving `engines` as it adopts newer Node. A `<25` bound
  fights **every** sync where upstream moves, for a hazard that belongs to a
  dependency rather than to us.

**What would change the answer:** upstream moving `engines` to admit 25+ while
`zod-prisma-types` is still calling `rmdirSync`, or a second incident where a
workstation lands on 25/26 despite `.node-version`. Either is the trigger to
overlay it.

## Verification

Every claim in the brief that produced this was re-checked before editing —
`action.yml:5`'s default, all four callers, the sole literal `node-version:`,
`check-pr-body.mjs`'s imports (`node:fs` only, so the runtime bump is riskless),
and both comment texts.

```
yaml.safe_load on ci.yml and pr-discipline.yml    OK
grep node-version across .github/workflows        one hit, now 24
48 files / 1889 MCA tests                         passed
scoped typecheck                                  exit 0, 0 errors
```

Node **24.20.0**, `/opt/homebrew/Cellar/node@24/24.20.0/bin/node`, npm 11.19.0 —
checked with `node -p process.execPath`, not `node -v`.

## Found while verifying, and not part of this change

**Corepack IS enabled in CI and in the image**, contrary to something I asserted
to another session earlier today. `.github/actions/node-install:15-17` runs
`corepack enable npm`, and `overlays/019-corepack-enable-npm.patch` adds
`RUN corepack enable npm` to the Dockerfile. So `packageManager: npm@11.19.1` is
**enforced** in CI and the image; only the local Mac has corepack off, which is
why local npm is 11.19.0. Corrected with that session.

Separately, **overlay 019's own comment is stale** — it says *"currently
npm@11.11.0"* while `package.json` now declares `11.19.1`, moved by the 2.17.0
sync. Not touched here; an overlay comment edit belongs with the next
re-application, not with a workflow chore.
