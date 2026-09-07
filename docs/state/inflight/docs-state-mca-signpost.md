# docs/state-mca-signpost — STATE.md did not route to the MCA vertical

**PR:** #TBD. Docs only, no code.

## What this fixes

`f9c637bc7` ("prepare the repo for an upstream sync") folded thirty merged
in-flight notes into `STATE.md` and deleted them. The fold was correct and
verified — all thirty had a matching merge commit, and no open PR lost its note.

It was faithful for the lease work and thin for MCA. Six MCA notes totalling
~1,100 lines went out; `STATE.md` gained **one** MCA mention, a table row saying
"See the 2026-09-06/07 section below" — a section that is lease-only and does not
mention MCA at all.

Nothing was lost: the decisions had already been promoted to ADR 0008 and
ADR 0009, which is the correct destination for them. What went missing was the
**signpost**. `CLAUDE.md` instructs every session to start with `STATE.md`, and a
session that obeyed would not learn that ADR 0009 exists, that the MCA vertical
is mid-build, or that the clause library is unbuilt.

## How it was found — the expensive way

A session read the *deleted* roadmap note out of a worktree checked out on
`fix/ci-migrate-deploy` (2026-09-06, one day stale — ADR 0009 landed on the 7th),
concluded from it that an owner decision had never been recorded, and silently
rewrote the roadmap to match its own reconstruction rather than flagging the
contradiction. Both the premise and the repair were wrong. The edit never left a
dangling commit, but the failure mode is the one
`docs-counsel-is-professional-engagement.md` was written about hours earlier:
**a reconstruction written in the same voice as a fact.**

Two rules earned, both already in the repo's standards in spirit:

1. **Read state from `origin/main`, not from whatever a worktree is checked out
   on.** `ls docs/adr/` answers a question about a working tree, not about the
   project.
2. **A contradiction between the record and your recollection gets flagged, not
   reconciled.** Reconciling it silently makes your guess indistinguishable from
   a decision for every session after you.

## What changed

- `STATE.md` "Where things stand" gains a short **two verticals** block: what the
  MCA vertical is, links to ADR 0008 and 0009, and a four-row table of where it
  stands — conformity built, the 47 clauses read, `mca/clauses/` non-existent,
  agreement builder not started and the actual deliverable.
- The in-flight table row no longer points readers at a lease-only section, and
  says plainly that the clause library is not built.
- `chore-sync-prep.md` removed: its PR (#123) merged, and both guardrails it
  describes were verified present — the overlay-number rule in `STATE.md`, the
  `patches/` section in `UPSTREAM.md`. It was the last un-folded merged note, and
  the only one left in the directory besides the README.

## What I deliberately did not do

**Did not restore the 27 deleted notes.** They are in git history, their
conclusions are in ADRs, and re-adding them would undo correct housekeeping to
compensate for a missing signpost. The signpost is the fix.

**Did not add a phase table.** The one in the deleted note is stale — it lists
`/admin/mca` and the package export as unmet preconditions; both are now met. A
table that has to be re-verified before it can be trusted is worth less than the
four rows of current state that replace it.
