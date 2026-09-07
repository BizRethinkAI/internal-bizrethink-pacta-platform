# chore/sync-prep — three things fixed before the upstream sync

**PR:** #TBD. Docs and one file rename. No code, no behaviour change.

An upstream Documenso merge is next, and a week of lease-product work has never
met one. Three things would have made that merge harder than it needs to be.

## 1. Two sessions both claimed overlay 069

`069-leases-nav-entry.patch` and `069-ship-mca-sources.patch`, same day,
different files, no functional conflict. But overlay numbers are how
`UPSTREAM.md` says what to re-apply after a merge, and a duplicate makes that
reference ambiguous at exactly the moment it is needed. The later arrival
(MCA sources) is renumbered to **070**.

Recorded under "Watch out for" as a rule: check `ls overlays/` before claiming a
number, especially with more than one session working.

## 2. `UPSTREAM.md` said nothing about `patches/`

`overlays/` covers upstream FILES. It does not cover upstream DEPENDENCIES, and
this fork patches two through `patch-package`.

`@react-pdf+layout+5.2.0.patch` **pins an exact version in its filename**. A sync
that bumps `@react-pdf/layout` silently stops applying it, and the failure is not
a red build — it is a lease that renders at 12 pages and throws at 14. That took
most of a day to find the first time.

`UPSTREAM.md` now has a `patches/` section saying what to check after any sync
that touches `package-lock.json`, which test proves it, and — specifically — not
to "fix" a failure by shortening a document, because the variable is page count.

## 3. Thirty merged in-flight notes were never folded into `STATE.md`

`CLAUDE.md` says merged notes are folded in and deleted. None had been. A new
session opening `docs/state/inflight/` would read thirty notes describing
finished work as though it were in flight, while `STATE.md` was missing the
settled narrative of the entire week.

Folded into one section — what now exists, the jurisdiction architecture, what
North Carolina proved and did NOT prove, two production defects found, the
organisation move, and the pattern that cost the most time (shipping a mechanism
with no caller and describing it as working, three times, by three sessions).

Notes deleted. The directory holds only its README again.

## Verified

All thirty notes were for merged work — zero open PRs at the time of writing.
No note belonging to an open PR was removed, which would have broken
Governance's "State recorded for this PR" guard for that PR.
