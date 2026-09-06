# feat/lease-row-state — the Leases list says what is happening

**PR:** #TBD. The remaining half of the step-6 wireframe; #99 did the other half.

## What it replaces

The list rendered `matter.status` raw, so the badge read **"draft"**, **"sent"**,
**"executed"** — column values, shown to the person paying for the product.

And it could not say the thing that is true most of the time a lease is
interesting: that somebody is **reading it**. "In review" is not a matter
status. It is an open review link, in another table.

## The design is the ordering

`leaseState` is a derivation, not a lookup, and it resolves terminal states
first:

| Condition | Label | Tone |
|---|---|---|
| `executed` | Signed | done |
| `abandoned` | Abandoned | quiet |
| `sent` | Out for signature | active |
| any open review | **In review** | active |
| `ready` | Ready to send | quiet |
| `draft` | Drafting | quiet |
| anything else | the raw value | quiet |

A review link left open after the lease went out for signature must not drag
the row backwards — what happens next is a signature, not a comment. Same for a
signed lease: it is done, whatever links still exist.

An unrecognised status renders raw rather than throwing or inventing a label. A
value this does not know is a schema change nobody updated it for, and a
landlord seeing something odd and saying so beats a list page that dies.

**Three tones, not five.** `active` means something is happening that is not
yours to do; `done` means finished; `quiet` is everything else. A colour per
status teaches the reader that colour means nothing.

## Query shape

Open reviews are fetched with one `groupBy` over the matter ids, not a count
per row. The list is unbounded — per-row counting is the shape that looks fine
on one lease and is a problem on eighty.

## Verified

1068 tests / 103 files pass. Both typechecks clean, including
`react-router typegen && tsc` in `apps/remix` — the one that caught #100 in CI
after the package-level check passed. Running it locally before pushing is now
the habit for anything touching a route.

The mapping is unit-tested rather than asserted through the page: it is a pure
function, and the ordering is the part that can silently regress.
