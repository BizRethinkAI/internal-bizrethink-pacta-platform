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

---

## Second half — the stepped interview

The entity editor was two tabs over one long scroll: thirteen fields under
"1. The entity" and nine choices, a state picker and a fee repeater under
"2. Its programme". The chips said where you were and nothing else.

It is now **eleven steps with a rail**, the same shape as `leases.$id`:

    1  Who this entity is            6  Guaranty and renewal
    2  Notices and servicing         7  Equipment and positions
    3  Online and disputes           8  Brokers and reporting
    4  What this release supports    9  Where you fund
    5  Venue and disputes           10  Fees
                                    11  Review

**The rail carries state, not just position.** Each step shows how many of its
required answers are still outstanding, or a tick when none are. Counted from
`watch()` rather than `formState.errors`, because errors only exist after a
submit has been attempted and the rail has to be truthful before anyone presses
anything. Only schema-required fields are counted — an optional one left blank
is an answer, and counting it would make a finished step look unfinished
forever.

**Every step stays reachable**, for the reason the lease builder gives: an
interview that forces a strict order is one you cannot correct a typo in
without walking the whole thing.

### Two bits of logic that assumed there were two steps

- `next` did `setStep(1)`. It now advances by one and stops at the last.
- The invalid-submit handler did `setStep(errors.label || errors.identity ? 0 : 1)`.
  With eleven steps "identity or policy" is not an answer — a missing guaranty
  scope and a missing fee payee are both `policy` and six steps apart. It now
  finds the **first step that actually failed**.

### #319 is preserved

Back, Next and Save entity remain three separate conditional slots, so React
unmounts one and mounts another rather than retyping a node mid-click.
`advance-button-does-not-submit.test.ts` asserts it on the syntax and still
passes.

### The rail is named

`<nav aria-label="The interview">`, so a test and a screen reader can address it
directly. Without that, a step's accessible name is its number, its title *and*
its outstanding count run together — which is also why the E2E now scopes to the
rail and matches on a pattern rather than an exact string.

### The E2E moves by the rail

It used to fill everything on one screen and press Next once. It now fills each
step and jumps, which is what a person does and what makes the rail worth
having. The #319 assertion still checks that Next advances without saving — it
just expects the next step's heading rather than the programme's.

## Still not done

- No status badge on template cards. What a template's lifecycle even is
  (published? revision N?) is a real question, not a styling one.
- The Review step is a heading and the derived document list; it does not yet
  summarise outstanding answers the way the lease's review step does.
