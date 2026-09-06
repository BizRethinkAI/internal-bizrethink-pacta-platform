# feat/inflight-state-notes

**One in-flight note per PR, so two open PRs stop colliding in `docs/STATE.md`.**

## What this changes

- `docs/state/inflight/` with a README setting the convention: one file per PR,
  named for the branch, created in the first push, edited in place, never
  another PR's.
- **Guard 4** in `governance.yml` accepts `docs/STATE.md` **or** a file in that
  folder, so a normal PR satisfies it without touching STATE.md at all.
- Guard 4 also now **fails on a leftover `<<<<<<<` or `>>>>>>>`** in STATE.md.
  Union merge leaves no marker of its own, but a hand-resolved merge can, and
  nothing looked for them before.
- `CLAUDE.md` and the engineering-standard checklist point at the new
  convention.
- The `## In flight` section of STATE.md gains an intro pointing at the folder.
  A non-insert edit, so it is union-safe.

## Why

STATE.md is the only cross-session memory and Guard 4 requires every PR to
update it, so any two open PRs collide by construction. `.gitattributes` sets
`merge=union`, which fixes `git merge` on the command line — but **GitHub's merge
button does not use the union driver**, so the web UI still reports a conflict.

Three PRs hit it on 2026-09-05 (#81, #85, and #90/#91 were set up to), each
costing a rebase and a full ~15-minute E2E re-run for a collision in a
documentation file.

The `.gitattributes` comment had already named this fix as the alternative it
declined — "one note file per change, which is conflict-proof by construction".
This takes that trade now the cheaper option has been paid for several times.

## This PR proves the guard on itself

It contains **no edit to `docs/STATE.md` bullets** — only the intro line — and
its state is recorded in this file. Guard 4 passing here is the demonstration
that the new branch works, because `pull_request` workflows run from the PR
head.

## Deliberately not included

**Part 2 of the original brief — `/merge-pr` and `scripts/ops/merge-chain.sh` —
is not here.** Its landing step (`git push origin HEAD:main`) is rejected by
this repo's ruleset on `main`, which requires a pull request plus Build App,
Build Docker Image, E2E Tests and Validate PR title. The deeper objection is
that a merge chain lands a *combination* no CI run ever saw. A revised design
(per-PR update-branch landing, chain as pre-flight only) exists but is not
built.

**Part 3 — conditional E2E — is rejected for this repo.** The gate has gone dark
twice without a red test, and `cancelled` was read as green both times.
Making it conditional on changed paths is how it goes dark a third time.

## Open

- Compaction has no cadence yet. Roughly weekly: fold merged notes into the
  STATE.md narrative and delete them. A folder that only grows becomes a second
  thing nobody reads.
- No `/state` command. The convention is documented rather than automated.
