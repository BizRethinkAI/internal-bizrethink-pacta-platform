# feat/lease-library-to-admin — the clause library is Pacta's, not a customer's

**PR:** #TBD. Step 6 of the lease product plan: the first change that treats the
lease builder as a product with two audiences rather than an internal tool.

## What was wrong

All four lease pages gate on `canAccessLeaseBuilder` — a per-ORGANISATION
feature flag, not a role. Once an org held the flag, every member saw
everything, including `/t/:teamUrl/leases/library`: clause text and versions,
statutory citations, attorney approvals and bar jurisdictions, draft status.

Two specifics on the landlord's own home page:

- `leases._index.tsx:122` linked them straight into that library.
- `leases._index.tsx:131` told them, in a banner, that the legal text they were
  about to send was unreviewed.

Both were right for an internal tool with one user. Neither survives a second
customer.

## The line this draws

**Whose content is it?** The library is INSTANCE content — identical for every
customer, because it IS the product. The proof is in the procedure:
`clauseLibrary.list` reads `FL_LIBRARY` and the approval table and uses
`organisationId` only for `assertAccess`. It filters no data by organisation at
all.

A route nested under `/t/:teamUrl/` that ignores the team it is nested in is a
lie about who owns the thing.

## What moved

`leases.library.tsx` → `admin+/lease-library.tsx`, gated on `isAdmin` in its own
loader as well as by the admin layout (a loader can fetch before the layout
resolves). Added to the admin sidebar under Data with the BR badge. Declared in
`overlays/BIZRETHINK-OWNED.txt` — the ownership file listed `t.$teamUrl+/leases*`
but not an admin route.

The customer's home page loses the link and the internal-preview banner. The
`draftRenderingAllowed` case now reads as a plain "generation is not enabled"
notice instead of an explanation of our review state.

**The safeguards are untouched.** `assertPublishable` and the draft-clause
feature lock still gate generation; a lease still cannot reach a third party
until counsel has reviewed the library. Only the announcement moved — to where
the people who can act on it are.

## The compromise, stated plainly

`BizrethinkLibraryReview` (the counsel-review share links) carries an
`organisationId` column, so listing and creating one still needs an organisation
to stamp. The admin loader resolves the signed-in admin's own organisation and
passes it through, which keeps every procedure unchanged and records shares
exactly where they are recorded today.

This assumes staff operate from one organisation. The durable fix is to drop
`organisationId` from that model — a migration, and its own change.

## Not in this step

- **No counsel role.** Of the four actors, three map onto something real:
  platform admin, team member, review token. Counsel maps onto nothing, and
  inventing a role before the approval workflow exists is guessing at its shape.
  Approvals already record bar number and jurisdiction (#89).
- **No team-role gating.** Owner, manager and member see the same lease surface.
  Probably right for a landlord's own team; waits for a customer who asks.
- **The review link is untouched.** Token-based, no account, works.

## Verified

1060 tests / 102 files pass, typecheck clean. The new guard asserts the route's
location and its loader's gate, and strips comments before matching — the
comments explaining these rules necessarily quote the strings the rules forbid,
and a guard that fires on its own documentation is one people delete.

Design proposal: https://claude.ai/code/artifact/ab6957f0-e7a2-432d-886b-16061ac53ba3
