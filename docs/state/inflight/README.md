# In-flight notes

One file per pull request, created in that PR's first push and edited in place
until it merges. **Never edit another PR's file.**

```
docs/state/inflight/<branch-slug>.md
```

Reading the current state of the repo means **`docs/STATE.md` plus every file in
this folder**. STATE.md carries the settled narrative; these carry what is
still moving.

## Why this exists

`docs/STATE.md` is the only memory that survives between sessions, and the
governance guard requires every PR to update it. Those two facts together mean
any two open PRs collide by construction — both adding a section at the same
anchor, nothing actually in dispute.

`.gitattributes` sets `docs/STATE.md merge=union` to soften that, and it works
for `git merge` on the command line. **GitHub's merge button does not use the
union driver**, so the web UI still reports a conflict and still demands a
rebase. Three PRs hit exactly that on 2026-09-05, each costing a rebase and a
full E2E re-run — around fifteen minutes apiece for a collision in a documentation
file.

The `.gitattributes` comment already named the alternative:

> The alternative considered was one note file per change
> (`docs/notes/<date>-<slug>.md`), which is conflict-proof by construction; this
> was chosen as the one-line option, and that trade is the reason this comment
> is long.

This is that alternative, taken now that the cheaper option has been paid for
several times over. Two PRs touching different files cannot conflict at all —
not resolved by a driver, simply absent.

## What goes in one

Whatever the next session needs in order to pick this PR up: what it changes,
what was tried and rejected, what is still open. The same content that would
have gone into STATE.md, in a file only this PR touches.

## Compaction

When a PR merges, its note has served its purpose. Fold anything durable into
the narrative in `docs/STATE.md` and delete the file — one small PR, roughly
weekly. A folder that only grows becomes a second thing nobody reads.

## The guard

`governance.yml` accepts **either** `docs/STATE.md` or a file in this folder, so
a normal PR satisfies it with its own note and touches STATE.md not at all.

It also fails on a leftover `<<<<<<<` or `>>>>>>>` in STATE.md. Union merge
leaves no marker of its own, but a hand-resolved merge can leave one, and
nothing looked for them before.
