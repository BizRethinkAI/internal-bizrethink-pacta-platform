# feat/library-jurisdiction-visible — the split was real and nobody could see it

**PR:** #111. Steps 1–3 of the jurisdiction plan. No new clause content.

## What was invisible, and how it was proved

The clause library has been split by jurisdiction since 2026-09-06.
`libraryFor(j)` returns `generic` ∪ `US` ∪ that state, and against the live
library that is **64 clauses: 35 `generic`, 1 `US`, 28 `US-FL`** — so **36 of
the 64 travel to any state** and only 28 turn on Florida's law. Counted by
importing `FL_LIBRARY` and tallying `clause.jurisdiction`, not from memory.

Neither review surface said so. `clauseLibrary.list` and
`clauseLibrary.openLibrary` both built their output object field by field and
**neither included `clause.jurisdiction`** — proved by reading the two `.map()`
bodies, and confirmed by the two page-level `ClauseRow` types, which have no
such field to receive. Both pages therefore rendered one flat list of 64, in
**module-concatenation order** (the order `FL_CLAUSE_MODULES` happens to be
spread in), under headings naming Florida:

- staff: *"Every clause a Florida lease can be assembled from"* — true as a set,
  and read as a claim that all 64 are Florida law, which is false for 36;
- counsel: *"Florida lease clause library"*, with no tier shown on any row.

This is the repo's characteristic failure exactly: the split was real, tested
(`library-for-jurisdiction.test.ts` passes) and **absent from every surface a
human reads**. An attorney asked to approve "the Florida library" would have
been approving 36 clauses that are not Florida's, past an admission check that
waves the portable tier through on a reading counsel has not confirmed.

## Failing tests first

`lease/__tests__/library-jurisdiction-visible.test.ts`, written before any
implementation: **26 of 30 red on the first run**, each for its own reason —
`jurisdictionLabel` and `coversJurisdiction` did not exist, the two `proc()`
slices did not contain `jurisdiction:`, the migration directory did not exist,
and the two banned strings were still on the page. The 4 that passed on day one
are ground-truth pins (35/1/28 counts, one `Record<ClauseJurisdiction, string>`)
and were written to stay green.

Two of them then went red for the WRONG reason and were fixed as tests rather
than as code: `proc(router, 'list')` was matching `properties.list`, the first
`list:` in the file, so it is now scoped to the `clauseLibrary` sub-router.

## What shipped

**A. The jurisdiction is returned, and labelled.**

`jurisdictionLabel` and `JURISDICTION_TIERS` are exported from
`approval-jurisdiction.ts`, built on the `NAMES` map that was already there —
one map, not two, and a test asserts there is exactly one
`Record<ClauseJurisdiction, string>` in the file. The labels are
**"Florida law" / "Federal law" / "No state's law"**. Never the raw token, and
deliberately never "Generic" or "Portable": those describe the library's filing
system, and a reviewer needs to know what the clause DEPENDS on.

`inReviewOrder` in `library.ts` sorts by tier, then by `FL_SECTION_ORDER` and
`sortKey` — the same order `selectClauses` gives a real lease, so a reviewer
reading the library and a tenant reading the lease see the same sequence. Both
procedures return through it and both pages group on `JURISDICTION_TIERS`.

**B. `coversJurisdiction(approval, jurisdiction)`.**

One helper beside `admissionBlocks`, and the open question is one constant:
`PORTABLE_APPROVAL_TRAVELS = true`. `admissionBlocks` is asked BEFORE an
approval is written (may this attorney sign this off); this is asked AFTER, of a
row that stored both `clauseJurisdiction` and `barJurisdiction` — **columns
written by `20260905200000` and, until now, never read back**. The staff counter
and the counsel `Approved` badge both compute through it.

Fail-closed: an approval carrying neither jurisdiction covers nothing, matching
`isApprovalCurrent`'s treatment of an unattributed approval.

`PORTABLE_TIERS` is now defined once, in `approval-jurisdiction.ts`, and
`libraryFor` reads it. It was about to be the second copy of the same two
strings.

**C. Review links are scoped, and so is their hash.**

`BizrethinkLibraryReview.jurisdiction`, `TEXT NOT NULL`, no default, no
backfill. `share` takes a jurisdiction and stamps
`libraryFingerprint(libraryFor(jurisdiction))`; `openLibrary` serves
`libraryFor(share.jurisdiction)` and compares the scoped hash;
`recordFinding` validates the slug against the clauses on that link rather than
against the whole library. `listShares` returns it so a card says which library
went out. The staff form has a `<select>` with **one option**, which is honest —
the library holds one state — and one line to extend.

`libraryFingerprint` already took a clause list, so no signature changed.

**D. One user-facing string was a legal assertion.**

The "Admitted in" helper said clauses depending on no state's law *"may be
approved by any US admission"* — the permissive reading, which
`approval-jurisdiction.ts` itself records as **provisional and pending
counsel**, stated to a user as settled. It now says only what the software does:
the bar is checked against this clause's jurisdiction before the approval is
recorded, and it names the clause's jurisdiction inline.

## The migration's precondition

`TEXT NOT NULL` with no default is correct **only if the table is empty**.
Re-verified read-only against production at implementation time, not from the
brief:

```
SELECT count(*) FROM "BizrethinkLibraryReview";            -- 0
SELECT count(*) FROM "BizrethinkClauseApproval";           -- 0
SELECT count(*) FROM "BizrethinkLibraryFinding";           -- 0
```

Zero rows, so there is nothing to backfill and a default would be a guess about
what earlier links covered. The migration comment records both the check and
what to do instead if it is ever replayed against a database that did
accumulate rows: read what each link sent from its `libraryFingerprint`, and
revoke rather than relabel a link that matches no jurisdiction's library.

If a row appears before this merges, the migration needs `DEFAULT 'US-FL'` and
that has to be said out loud, because it would be asserting what an existing
link covered.

## Deliberately not done

- **North Carolina clauses, or any clause content.** The tier order includes
  `US-NC` and `ZLeaseJurisdiction` accepts it; nothing selects it because
  nothing exists to select.
- **`whyThisClause` / `FL_COMPELLED` per jurisdiction.** Deferred until a second
  state exists. Today a generic clause still carries a Florida citation in its
  provenance line, which is the next honest thing to fix and is not this PR.
- **"Which clause moved" on a stale link.** `libraryMoved` is still one boolean.
- **Dropping `organisationId` from `BizrethinkLibraryReview`.** Still the
  durable fix the admin loader and `approve` both name.
- **Email on a recorded finding.**
- **A jurisdiction lens on anything but the staff counter.** `list` still
  returns EVERY clause — staff must be able to approve a clause of any
  jurisdiction, which is the opposite of the counsel link's job.

## Still untrue in the codebase, found on the way

- **`matter.validate` assembles from `FL_LIBRARY`, not `libraryFor(...)`**
  (`lease-builder-router.ts`, the `[...FL_LIBRARY, ...customClauses]` line). No
  behaviour difference while Florida is the only state — the two lists are
  identical — but it is the one place a second state would silently get
  Florida's clauses, and `feat-interview-follows-property-jurisdiction` is where
  it belongs.
- **`counsel-link.test.ts` sliced procedures with a fixed 2200-byte window** and
  went red because a comment was added above the thing it asserts. Replaced with
  the boundary-based `proc` that `findings-wiring.test.ts` already had.
- Several "52 clauses" claims remain in **past-tense narrative** comments and
  are left alone; the two written in the **present tense** were corrected to 64.

## Verification

- `packages/bizrethink`: **1199 tests pass** (1169 before, 30 new), 118 files.
- `tsc -p packages/bizrethink/tsconfig.typecheck.json` — clean.
- `apps/remix`: `react-router typegen` then `tsc -p tsconfig.json` — clean.
  Run because this touches two routes; skipping it broke CI on #100.
- `biome format packages/bizrethink` — clean.
- `prisma generate` regenerates the client with the new column.
  `prisma validate` fails only on absent `NEXT_PRIVATE_DIRECT_DATABASE_URL`,
  which is an env problem and not a schema one.
- **Not run: the Playwright suite.** No local database, so E2E is CI's gate.
