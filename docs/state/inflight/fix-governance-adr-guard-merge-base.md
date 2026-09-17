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

## Verified both directions, against the committed change

A guard that stops catching things is worse than one that over-catches, so both
directions were run — and run against the fix as committed, not against a
description of it.

```
CASE 1 — a branch merely BEHIND main on ADR 0023 (the false positive)
    two-dot   : docs/adr/0023-pacta-produces-mca-templates.md
    merge-base: (clean)

CASE 2 — a branch that genuinely EDITS an ADR already on main
    two-dot   : docs/adr/0020-mca-decisions-consolidated.md
                docs/adr/0024-pacta-is-custodian-of-every-mca-template.md
    merge-base: docs/adr/0020-mca-decisions-consolidated.md
```

Case 1 used real SHAs — `origin/main` against `f69531865`, which is #294 before
its refresh. Case 2 built a throwaway branch, edited ADR 0020 in place, and
deleted the branch afterwards.

**Case 2 demonstrates both properties at once.** The genuine edit (0020) is still
caught. The extra file two-dot reports — 0024, which that branch is merely behind
main on — is exactly the false positive, and the merge-base comparison drops it.

An ADR **added and then amended in the same PR** is an Add relative to the merge
base and so is correctly not flagged. That was already true and stays true; it is
how ADR 0023 could be corrected inside #288.

## HOW THE FIRST ATTEMPT SHIPPED WITHOUT THE FIX

Worth writing down, because the shape is general and the failure was invisible.

The verification step built its positive case like this:

```
printf '...' >> docs/adr/0020-....md && git add -A && git commit -m "probe" \
  && check ... && git reset --hard HEAD~1
```

`git add -A` swept the uncommitted `governance.yml` fix into the throwaway probe
commit, and `git reset --hard` then discarded **both**. The in-flight note was
written afterwards, so the branch's only commit described a change that was no
longer in it — and CI was green, because a docs-only diff passes everything
including the docs-only E2E skip.

**Green meant "the note is well-formed", not "the guard was fixed."** A reviewer
caught it by diffing the branch rather than reading the note.

Two rules fall out. Commit the change *before* probing it, and never use
`git add -A` inside a step that ends in `reset --hard`.

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
