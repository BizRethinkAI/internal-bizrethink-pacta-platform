# feat/mca-admin-library — the clause library becomes reachable

**Branch:** `feat/mca-admin-library`. Held until #131 merged, then opened against `main` so it gets all 13 checks rather than 5.
**PR:** #132.

`/admin/mca-library`. Read-only, 192 clauses, six instruments.

## Why this matters more than it looks

**Until now nothing in the running application imported `mca/clauses/` at all.**
Five PRs built a library of 192 clauses that sat on `main` reachable by nobody.
A library nobody can look at cannot be reviewed, and review is the only thing
standing between these clauses and a merchant.

## What it is, and is not

A sibling of `/admin/lease-library`, and a **separate page** from `/admin/mca`
for the reason [ADR 0008](../../adr/0008-mca-is-two-surfaces-not-one.md) gives:
two surfaces, two release paths. `/admin/mca` is the regulator's words and must
never acquire an approval workflow; this is ours and will need one.

**No approval, no review link, no mutation.** Those need database models and are
the next piece of work. Shipping the read surface first is deliberate — the
lease library's approval mechanism was built and left unplugged for months, and
a page you can actually look at is what makes that kind of gap visible.

## The trap this had to avoid, and how

`mca/clauses/examination.ts` reads the review register and
`mca/clauses/documents.ts` digests the vendored agreements, so the view model
reaches `node:fs`. Importing it into a route module breaks the **client** build.

`/admin/mca` learned this the expensive way — PR #118 went red on it — and the
lesson recorded there is that using the import only inside `loader` is not
enough: **relying on the bundler's dead-code elimination is relying on an
optimisation for correctness.** So the route reaches the surface through
`apps/remix/app/utils/bizrethink-mca-library.server.ts`, and the `.server.ts`
suffix is the mechanism that actually guarantees it.

Verified by building, not by reasoning: `react-router build` produces both the
server and client bundles cleanly.

## What the page says first

The failure mode of an admin page is looking reassuring, and 192 clauses under
headings and version numbers read as considered. So the first thing on the page
is that **none of them may be sent to a merchant** — every one is
`attorney-drafted` with no named reviewer — and that **43 findings are
outstanding** out of 136 cited, the rest being recorded as implemented, rejected
or withdrawn in the review manifests.

`publishProblems` is computed against a **hypothetical published copy**, not the
draft in hand. `assertPublishable` correctly returns nothing for a draft, so
asking it about the clause as it stands would report no problems for all 192 and
the page would read as though the library were ready.

## Three states for a source, not two

| | |
|---|---|
| `verified` | the digest matches; the bodies are the words the document ships |
| `digest-moved` | **the document changed under the library** — the loudest thing this page can say |
| `source-missing` | the evidence is not in this environment |

The last two are coloured differently on purpose. A moved digest means clauses
may be quoting superseded sentences. A missing source is a deployment fact, not
a defect in the text, and colouring them alike would teach a reader to ignore
both.

**This will matter within the week.** lombard-contracts #10 edits four of the
six documents, so all four digests break the moment it merges — deliberately.
The page will say so.

## Also

- `docker/Dockerfile` now copies `mca/clauses/source-documents/`. Without it the
  page degrades honestly on every row, which is not a page worth having — and it
  is the same omission that made `/admin/mca` report SOURCE MISSING for all
  eleven states until that line's neighbour was added. `docker/` is outside the
  paths the fork-discipline guard watches.
- Overlay 047 gains the nav row, documented in `overlays/README.md`. The
  2026-09-07 rename to "Lease Clauses" anticipated this exact pairing.

## Not verified

**The page has not been rendered.** There is no local database (STATE.md,
*Blocked*), so the loader cannot run here. The build proves it compiles and the
view model is asserted by seven tests; that the page LOOKS right is unverified
until it is on an environment with a database.

## Next

Approvals and the counsel review link — the half ADR 0009 says is the last gate.
`BizrethinkLibraryReview` is generic in shape but lease-bound in two places, and
generalising it is named in that ADR as its own piece of work.
