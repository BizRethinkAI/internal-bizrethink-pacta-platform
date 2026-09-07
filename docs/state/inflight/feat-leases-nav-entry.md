# feat/leases-nav-entry — Leases becomes a place you can get to

**PR:** #TBD. The last build step of the lease product. After this, only counsel
review remains.

## What was wrong

`/t/:teamUrl/leases` has worked for weeks and was reachable only by typing the
URL. Nothing in the product linked to it — not the desktop nav, not the mobile
sheet, not the ⌘K command menu, not the admin sidebar (which links only to
`/admin/lease-library`, and correctly so: that is staff content). Verified by
grep; the only `leases` hits outside the lease routes themselves were in the two
nav files this PR touches and a false positive on the word "releases" in
`root.tsx`.

## What this adds

A **Leases** entry beside Documents and Templates, in both
`app-nav-desktop.tsx` and `app-nav-mobile.tsx`. Both or nothing: an entry in one
is a feature that is invisible on the other. No `BR` badge — that marker means
"a page BizRethink added to `/admin`" (overlay 047). Leases is a customer
feature and belongs in the team nav.

`overlays/069-leases-nav-entry.patch`, fragility **LOW**.

## The interesting problem: a server-only gate in a client component

`canAccessLeaseBuilder({ organisationId, userId })` is server-only. The nav
renders in the browser. Four ways across that boundary:

1. **A read of the gate over tRPC** — chosen. New `bizrethink.leaseBuilder.access`
   query (no input; the caller's organisations come from the session, never from
   client input) → `listLeaseBuilderOrganisationIds` → `canAccessLeaseBuilder`,
   once per organisation the user is a member of. That is *the same function*
   every lease route's loader calls, so the nav and the route it points at
   cannot disagree. `use-lease-builder-team-urls.tsx` maps the answer onto the
   session's org/team tree via the pure, tested `leaseBuilderTeamUrls`.
2. **On the organisation session.** The shape that fits, and rejected on cost:
   `getOrganisationSession` re-runs on every navigation *and* on window focus, so
   this would add two grant lookups per organisation to the hottest query in the
   app to render one link. It also patches two more upstream files — the query
   and its zod response schema.
3. **Threaded through a route loader.** What the task suggested, and it does not
   work here. `t.$teamUrl+/_layout.tsx` **has no loader at all** — the team comes
   from a React context fed by the session — and the nav is not rendered inside
   it anyway: `Header` lives in `_authenticated+/_layout.tsx`, one level up. That
   layout *does* have a loader, and it sets `shouldRevalidate = () => false`, so
   it does not re-run when you switch teams. A boolean threaded through it would
   describe whichever team you first landed on.
4. **Re-derive it client-side** from a claim flag or the billing row. This is the
   second source of truth the whole design is avoiding.

Cost of (1): one query per session, `staleTime` 5 minutes. Consequence: the entry
appears on hydration rather than in the server-rendered HTML, which is why the
pending state denies — appearing a moment late beats appearing and then
vanishing, and the route 404s either way.

## Was there an extractable definition?

No. Upstream extracted the **settings** nav to `packages/lib/utils/settings-nav.ts`
in the 2026-08-13 sync (`overlays/README.md`, "Relocations") but left the app nav
as an array literal inside each component, with a different item shape in each
(`label` + `msg` on desktop, `text` + `t` on mobile). Extracting a shared
definition ourselves would be a restructure that upstream has not done and would
conflict on its own terms.

Overlay 047's instinct still applies, though — it is already satisfied. 047 had
to *turn* 14 hand-rolled `<Button>` rows into a data-driven array to shrink the
merge surface; here upstream already ships the array, so this overlay appends one
spread expression to it. Fragility is LOW for that reason: if upstream restyles
the array, the fix is to re-append the same line. There is no logic to re-derive,
because none of the gating logic lives in an upstream file.

## Production state

`BizrethinkFeatureAccess` in prod holds exactly two rows: `lease-builder` granted
to **user 3** (user scope), and `lease-clause-draft-rendering` to one
organisation. There is **no organisation-scoped `lease-builder` grant at all**.

That is worth stating because it is the case the design has to get right: a
user-scoped grant makes `canAccessLeaseBuilder` return true for *any*
organisationId — deliberately, so one person can be granted access across every
org they belong to (see the doctrine comment in `lease-builder-router.ts`). So
user 3 will see Leases in all five of their organisations' teams, and every one
of those routes will let them in, because both sides ask the same function.
Nobody else sees the entry. If the nav had re-derived the flag from an
organisation row instead, it would have shown nothing to the one person who has
access.

## Not in this PR

- No change to the lease routes, the clause library, or the counsel-review flow.
- No icon on the entry, no reordering of Documents/Templates, no nav redesign.
- No ⌘K command-menu entry. It is a separate surface with its own gating story;
  the URL bar was the only path and now the nav is, which was the ask.
- No admin-UI for granting `lease-builder` — grants are still SQL. That is the
  next thing this feature will want, not this PR.

## Verified

1629 tests / 135 files green in `packages/bizrethink` (1605 before; 24 new — 5
unit for `leaseBuilderTeamUrls`, 19 static for the nav entry and its gate).
`tsc --noEmit` clean on both `packages/bizrethink/tsconfig.typecheck.json` and
`apps/remix/tsconfig.json` after `react-router typegen`. `biome format
packages/bizrethink` clean.

The regression guard asserts the entry exists in **both** nav files, that the
`/leases` href occurs exactly once per file and is spread in under the hook's
gate, that neither file imports the server-only module or names the feature key,
and — the assertion that matters — that the tRPC procedure behind the hook builds
its list by calling `canAccessLeaseBuilder` itself, membership-scoped. It strips
comments before matching, following `lease-library-is-staff-only.test.ts`: the
comments explaining these rules necessarily quote the strings the rules forbid.
