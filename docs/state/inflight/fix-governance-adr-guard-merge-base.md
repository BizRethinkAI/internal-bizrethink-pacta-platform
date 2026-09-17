# fix/governance-adr-guard-merge-base — Guard 2 accused a branch that changed nothing

## The failure

Guard 2 enforces append-only ADRs. It failed #294 with:

```
✗ These ADRs were modified or deleted in place:
  docs/adr/0023-pacta-produces-mca-templates.md
```

**#294 never touched ADR 0023.** It branched off `feat/mca-send-gate` before
that PR's last commit, #288 then merged, and main moved ahead on that file while
#294's tree kept the older copy.

## Why

`git diff A B` compares two trees. It cannot distinguish *this branch changed
the file* from *this branch is behind main on the file*, and #294 was the
second. `git diff A...B` compares against the **merge base**, which is the
question the guard means to ask: what did this branch do.

The guard now takes the merge base explicitly, with `|| echo "$BASE_SHA"` so a
missing merge base falls back to today's behaviour rather than passing silently.

## Verified both directions, because a guard that stops catching things is worse than one that over-catches

| | two-dot | merge-base |
|---|---|---|
| branch merely **behind** main on ADR 0023 | flags it | **clean** |
| branch that genuinely **edits** an ADR on main | flags it | **flags it** |

Run against the real SHAs: `origin/main` against `f69531865` (#294 before its
refresh) for the first, and a synthetic in-place edit of ADR 0020 for the
second.

An ADR **added and then amended in the same PR** is an Add relative to the merge
base, so it is correctly not flagged — that was already true and stays true.

## The message mattered as much as the logic

The old failure ended by offering an override. A reader hitting the false
positive would take it, and **an override granted for a false positive on an
append-only rule is how that rule stops meaning anything.** The message now says
the guard compares against the merge base, so a branch merely behind main is not
reported — and if you did not edit these, the guard is wrong and wants fixing
rather than excusing.

## How it was found

#294 hit it mid-batch, and the reviewing session diagnosed it correctly rather
than taking the override on offer. #294 was cleared by merging main — a refresh,
which makes the guard pass legitimately. This change is so the next person does
not have to work it out.
