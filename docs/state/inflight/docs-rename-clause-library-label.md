# docs/rename-clause-library-label — name the library after its vertical

**PR:** #TBD. Three strings. No route, model or behaviour change.

## Why

"Clause Library" was unambiguous while there was one. An MCA vertical is being
built in `packages/bizrethink/mca/` with a clause library of its own, and the
generic name becomes ambiguous at exactly the place a person chooses between
them — the nav.

The naming was already inconsistent before MCA:

| Where | Said |
|---|---|
| Route `/admin/lease-library` | lease-specific |
| Nav label | generic |
| Page `<h1>` and tab title | generic |
| Page subtitle ("A lease is assembled from…") | lease-specific |

The URL and the body copy already knew what this was. Only the two labels a
person reads were generic.

## What changed

- Nav: **Lease Clauses** — the distinguishing noun first, so a future
  "MCA Clauses" sits beside it and reads as a pair.
- Page `<h1>` and tab title: **Lease clause library**.

Routes and models are untouched. `/admin/lease-library` was already right.

## Why "Lease" and not "Rental"

Everything underneath says lease — `BizrethinkLeaseMatter`,
`BizrethinkLibraryReview`, `/t/:teamUrl/leases`, `lease-builder-router`,
`FL_LIBRARY` — and the document's own title is "Residential Lease". "Rental"
would put a translation layer between what you click and what everything else
calls it, for no gain. It is also the colloquial term for the arrangement,
where "lease" is the instrument.

## The reference this does NOT fix

`/clause-review/$token` — the counsel-facing link. Today it is unambiguous
because there is one library. With two verticals, two attorneys would receive
URLs that look identical, and `BizrethinkLibraryReview` has no field saying
which library a link is for.

That is a naming problem with a structural tail, and it is the only reference
where getting the name wrong reaches someone outside the company. Recorded
here rather than fixed, because it needs a column and a decision, not a string.
