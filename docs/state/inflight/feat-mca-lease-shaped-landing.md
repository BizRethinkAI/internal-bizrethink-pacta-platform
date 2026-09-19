# feat/mca-lease-shaped-landing — entities and templates on one page

The first of two changes making the MCA builder read like the lease builder.
This one is the landing page; the stepped interview with a sidebar is next and
separate.

## What changed

`/t/<team>/mca` was templates only, with a link to a sibling `/mca-entities`
page that listed entities. It is now one page with **Entities above Templates**,
which is exactly `leases._index`: properties, then the leases written against
them.

| lease builder | here |
|---|---|
| "Add a property" | "Add an entity" |
| property card with a facts line, `Edit` + **`New lease`** | entity card with a summary line, `Edit` + **`New template`** |
| leases listed below | templates listed below |

The entity editor keeps its own route, as `leases.$id` does, because it is an
interview rather than a list.

## The create flow moved onto the entity

"New template" opens from the entity's own card, the way "New lease" opens from
a property — so the entity is already chosen by the time the panel appears and
the only question left is which document, which is the one thing a template
still has to be told (ADR 0026).

The entity select stays in the panel, pre-selected, so the choice is still
visible and changeable rather than implied.

## The summary line

`entitySummaryLine` — seven tests, red first. Modelled on the property card's
"single family · Wesley Chapel, FL · Pasco County · pool · HOA": the facts that
decide what a document written against it will say, so two records can be told
apart without opening either. For an entity those are what it **is** and what
its programme **does** — two entities can share a legal name, which is why
`label` exists at all, and two can share a label while running programmes that
produce different paper.

A **count** of recipient states rather than a list, because eleven state codes
would be the whole line; and an entity serving nowhere yet reads "no states yet"
rather than "0 states", which looks like a defect rather than a fact.

Derived on the server and returned as one string. Sending `identity` and
`policy` to the browser to format there would put an entity's notice addresses
and its whole programme into a list payload that needs one line.

## A test that was guarding a proxy

`does not carry policy in a list` asserted that the Prisma `select` had no
`policy` key. Its docstring said something stronger and truer — "a list carries
what distinguishes them and not the programme terms behind each" — and the
proxy failed the moment the list started deriving a summary, which reads
`policy` on the server and returns a string. Nothing leaked; the proxy was
simply not the property.

It now asserts on **what the caller gets**: the returned rows carry neither
`policy` nor `identity`. Stricter than the original, and what the docstring
always claimed.

## Validation

3,725 tests in `packages/bizrethink/mca`; lint clean. The E2E now starts a
template from the entity card and asserts the card carries the summary line.

**The two local typecheck errors in `provider-templates.tsx` are the worktree
artifact**: `node_modules` symlinks to the main checkout, so `@documenso/trpc`
resolves to a router type that predates the `summary` field this branch adds.
CI is the verdict.

## Not done here

- **The stepped interview with a left sidebar** — the second half, and the
  larger one. The entity form is still a two-tab stepper over one long scroll.
- No status badge on template cards yet; the lease list has one because a lease
  has a lifecycle (draft / sent / signed). What the equivalent is for a template
  is a real question — published, revision N — and it belongs with the interview
  work rather than guessed at here.
