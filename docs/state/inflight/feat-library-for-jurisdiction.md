# feat/library-for-jurisdiction

**Selecting clauses by the property's jurisdiction — the thing a second state
cannot be built without.**

## What this changes

- `libraryFor(jurisdiction)` returns `generic` + `US` + `US-<state>`. Nothing
  from another state can reach a lease, whatever a caller imports by mistake.
- The renderer selects with it instead of taking the whole library.
- The property's `state` is threaded through `loadPropertyContext` →
  `renderInputForMatter` → `RenderLeaseInput.jurisdiction`, so the lease is
  drafted to the law of the state the property is actually in rather than to a
  constant.
- `normaliseBarJurisdiction` → `normaliseJurisdiction`. It already turned
  "FL" / "Florida" / "us-fl" into `US-FL` for an attorney's admission; a
  property's stored state has exactly the same problem, and one function that
  serves both is better than two that can disagree.

## Deviation from the plan, and why

Step 2b was written as *move the clause files into per-jurisdiction folders*.
Measured before starting: **five mixed files rewritten and 39 import sites
updated, for no behaviour change.** Every existing file holds a mixture — the
smallest is 4 generic and 4 Florida.

Meanwhile the capability North Carolina actually needs is a filter. So this does
the filter and leaves the folders. They buy readability, not capability, and can
follow whenever the churn is worth it.

`ALL_CLAUSES` still comes from the `us-fl` module, which is now a misleading
name for a set that is 35 portable clauses. That is the honest cost of skipping
the move, and it is written down in `library.ts` rather than left to be
rediscovered.

## Verified

- `libraryFor('US-FL')` returns **exactly** the slug set the code used before —
  the safety property of the whole refactor, since anything else changes every
  existing lease.
- `libraryFor('US-NC')` contains **zero** Florida clauses and is the 36
  portable ones. Adding NC clauses is additive.
- No jurisdiction returns a clause twice.
- Against the live Picana matter: state `FL` → jurisdiction `US-FL` → 52
  clauses rendered, unchanged.

1030 tests passing, typecheck clean.

## Open

- The per-jurisdiction folders, whenever the readability is worth 39 import
  edits.
- `jurisdiction` is optional on `RenderLeaseInput` so existing callers keep
  working. It should become required once a second state has clauses — while it
  is optional, a caller that forgets it silently gets Florida.
