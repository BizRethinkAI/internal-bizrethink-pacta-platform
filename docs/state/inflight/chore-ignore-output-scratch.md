# chore/ignore-output-scratch — closing a hole that cost 41 files

**Proposed by the implementing session (this one), for the owner to decide.**
Deliberately not merged by the reviewing session: whether `output/` is ignored,
moved or left alone is the owner's call about their own directory, and a PR is
the offer — merging it would be making the decision instead.

## What happened

`output/` — prototypes, generated HTML, review screenshots — was untracked and
absent from `.gitignore`. On 2026-09-18 I created a branch inside the main
checkout rather than a worktree, and a broad `git add` swept all 41 files into a
commit whose legitimate diff was four files.

Then switching that checkout back to `main` **deleted them from the working
tree**: tracked on the branch, untracked on `main`, so `git checkout main`
removed them. They were gone from disk for about twenty minutes.

## The recovery order mattered

They were recoverable only from the commit that should never have contained
them. The obvious sequence — drop them from the branch as the reviewer asked,
then move on — would have destroyed the only surviving copy. Restored first
(`git checkout <sha> -- output/`, then unstaged), removed from the branch
second.

## What this change is, and is not

One rule plus the reason. Nothing under `output/` is tracked on `main`, so there
is no index entry to remove and no history to touch.

**It is not the fix.** The rule covers the one directory that happened to be
sitting there; it does nothing about the next checkout holding something I did
not put in it. What caused the loss was working in a checkout that was not
entirely mine, where a broad `add` is never safe — the worktree is what makes
that tool safe, and every branch I cut after the mistake used one.

## The pattern, twice now

Earlier in this session a `git add -A` swallowed an uncommitted governance fix,
and the lesson written down afterwards was about the flag. That was the wrong
generalisation: the flag is fine in a tree that is entirely yours. Both
incidents share a working directory holding someone else's files.
