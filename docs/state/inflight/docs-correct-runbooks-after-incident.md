# docs/correct-runbooks-after-incident — the runbook pointed at the hole

**Branch:** `docs/correct-runbooks-after-incident`. Documentation only. No code,
no workflow, no dependency change.

## Why

On 2026-09-09 the dev Mac's local toolchain stopped working — no vitest, no
Biome, no Turbo, no build. It took most of a day and three wrong diagnoses to
find out why, and every gate in the repo stayed green throughout.

**Cause, established from the session transcript rather than inferred:** eight
`docker run -v "$PWD":/app -w /app node:24-alpine3.23 … npm install` invocations
against this exact checkout, the first at 04:30:34 UTC. Docker on this machine is
Colima, whose *generated* Lima config (`~/.colima/_lima/colima/lima.yaml`) mounts
`~` writable — so the container and the Mac are looking at the same directory.
npm, correctly, installed **linux-arm64** binaries into the Mac's `node_modules`.
The first Linux native file was born **six seconds** after that command.

The install was a reasonable move. `UPSTREAM.md` documented that `npm install`
fails on the Mac's Node, and its advice was *"Run the workstation on Node 22 (the
Docker image already does)"* — pointing at the container as the working Node,
with no warning that the container writes into the checkout.

**Repaired** with `npm ci` on Node 24.20.0 plus `npm run prisma:generate`: 48
files / 1889 MCA tests pass, both typechecks exit 0 on darwin/arm64. That also
answers an open question — a clean native Mac install of *post-sync* source had
never been demonstrated, and there is no Mac-specific defect from 2.17.0.

## What changed

### `UPSTREAM.md` — five corrections, each verified before editing

| Was | Is | How it was checked |
|---|---|---|
| The Monday action *"opens a PR"* (twice) | It pushes a `sync/<date>` branch and writes a job summary with the compare URL; **you** open the PR | `upstream-sync.yml:4-9,110-152` says so in its own header |
| `git apply overlays/001-default-claim-enterprise.patch` | `001-add-bizrethink-claim-tier.patch`, plus "check `overlays/README.md` rather than copying this" | no file of the old name exists |
| *"calls `fs.rm` with an option Node 26 removed … run on Node 22"* | `fs.rmdirSync(path, {recursive:true})` at `dist/classes/directoryHelper.js:25`; **run Node 24** per `.node-version` | read the installed source; **ran the call on both Nodes** — 24.20.0 succeeds with `DEP0147`, 26.0.0 throws the exact quoted error |
| *"verify with `gh api …/branches/main/protection`"* | That endpoint returns **`Branch not protected` (404) while main IS protected** — use `…/rulesets`; ruleset `protect-main` id `16850885` | called both endpoints |
| `npm run test:e2e:dev` | `npm run test:e2e -w @documenso/app-tests` | the old script exists in **no** `package.json` |

The protection one is the most dangerous: it reports a false negative that reads
as *protection is off*. The four required checks are Build App, Build Docker
Image, E2E Tests, Validate PR title — Governance, PR description, npm audit and
CodeQL run but are **not required**, so a red one does not block merge.

### `UPSTREAM.md` — a new section, *Never install from a container into this checkout*

The mechanism, why nothing catches it (CI is Linux; `node_modules` is
git-ignored; the lockfile is untouched and still lists all 43 Darwin packages),
what to do instead, a Mac postflight, and the recovery — including **do not run
`turbo` first**: `node_modules/turbo/bin/turbo` sets `SHOULD_INSTALL=true` and
runs its own `npm install` when the platform binary is missing, which repairs the
tree and destroys the evidence.

### `docs/engineering-standard.md` — *The development machine*

This contract existed nowhere. It now says: Node 24 and verify what you are
actually running; `engines: ">=24.0.0"` still admits the broken versions; a
non-login shell gets Homebrew's Node, which is how a machine correctly running 24
was reported as running 26; `npm ci` alone leaves the Prisma client ungenerated;
never install from a container; and green CI and a working local tree are
separate claims about separate machines.

### `docs/state/inflight/docs-mca-library-is-a-library.md` — a correction on a merged note

#144's *What could not be verified* attributed the Linux tree to *"the staleness
the #143 lockfile merge warned about"* and proposed `npm install`. Both wrong:
#143 moved three package **versions** and changed **zero** platform entries. The
correction is added as a marked block rather than a silent rewrite, because the
claim was stated confidently three times before anyone checked it.

## What was verified vs. relayed

A comprehensive review of the machine and repo was produced in a separate
session. **Every claim used here was re-verified independently** before it was
written into a runbook: the transcript commands and their timestamps, the on-disk
binary formats, the missing npm script, both protection endpoints, the overlay
filename, and the `rmdirSync` behaviour on both Node versions.

Not re-verified, and not relied on here: the count of absent Darwin lock entries,
and the ruleset bypass actor detail.

That review is **deliberately not committed.** This repository is public, and it
contains homelab addressing, runner names, local machine paths and a map of which
CI gates are advisory. It is kept outside the repo.

## Still open

- STATE.md consolidation: **20** merged-PR notes remain in `docs/state/inflight/`,
  and STATE.md still says the MCA clause library does not exist. Next.
- Parent `~/github/bizrethink/CLAUDE.md:114` says `node:20-alpine or node:22-alpine`;
  this repo uses `node:24-alpine3.23`. Different repo, not fixed here.
- The `upstream-sync` skill is user-local and still describes the four local
  gates without the machine contract.
