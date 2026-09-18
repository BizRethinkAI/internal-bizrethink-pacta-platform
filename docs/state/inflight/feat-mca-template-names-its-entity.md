# feat/mca-template-names-its-entity — the entity gets a door

**The branch name promises more than this PR delivers.** It was cut expecting to
wire templates to entities, and that turned out to need a step first. The
template still does not name an entity; this is the change that makes an entity
*exist* in the first place. Renaming the branch now would orphan the PR, so the
name stays and this paragraph is the correction.

## What was actually missing

#310 shipped `mca/entities/` with a schema, a service and **nothing else**. No
tRPC routes, no UI, no caller. ADR 0026 §2 makes an entity the thing a template
is created against, so an entity nobody can create is a floor with no door.

Four procedures under `bizrethink.mcaEntities`, and a page to reach them.

## The part worth reviewing

**No schema has a `userId` field.** Every procedure passes `ctx.user.id`. A route
that read the caller from input would let anyone act as anyone, and the service
cannot catch it — it is handed whatever the route passes. The test asserts the
field's **absence** rather than the correct value, so it fails if someone adds
one, which is the failure mode that matters.

**An update names the version it was opened at, required rather than defaulted.**
A missing version makes two people editing one entity a silent last-write-wins,
and these terms decide clause selection for every document the entity issues.

**The editor is two steps** because an entity answers two kinds of question: who
the company is, and how its programme runs. The second is the one that needs
explaining, and burying it under address fields is how it gets answered without
being read.

**Conservative defaults.** No guaranty, no renewals, no equipment, nowhere
offered. A default that quietly took a guaranty would be a term a funder never
chose.

## Two things the local typecheck earned, once it was working

For the first time this session the local typecheck was trustworthy — main
pulled current and the Prisma client regenerated — and it immediately caught a
real bug: I had guessed the fee shape. `ZMcaFee` is a **discriminated union** (a
fee states a dollar amount *or* a calculation method), and I had invented a
`timing` field and rendered both boxes. Rendering both invites someone to fill in
two and have one silently dropped. The form now asks for the one the basis
chooses.

What it still could not check is the tRPC client type: `mcaEntities` reads as
non-existent locally, because every workspace package resolves through a shared
`node_modules` symlink into the main checkout. CI is the verdict there. It
passed Build, Lint and Docker on the first run, which is that half confirmed.

## Deliberately not in this change

**Nothing references an entity from a template.** The template builder still
carries its own provider interview, and the entities page says so rather than
implying otherwise.

The seams for that next change are mapped:

- `templates/compile.ts:111-160` is the **only** place reading `buyer`,
  `processor`, `equipmentProvider` and `broker` as a group.
- The wire contract is exactly two schemas (`templates/router.types.ts`).
- The DB column is exactly one — `BizrethinkMcaTemplateRevision.profile`,
  written in `templates/server-only/service.ts`, read there and in
  `review/server-only/service.ts`.
- Sixteen test files use `providerFixture()`.
- **Ordering constraint:** `entities/entity.ts` imports `ZMcaFee` from
  `templates/profile.ts`, so the profile cannot simply be deleted — the fee
  schema moves first.

`provider-interview.tsx` keeps its own copies of the three answer controls
rather than importing the generic ones in `answers.tsx`. ADR 0026 retires that
component along with the profile, and generalising a file in order to delete it
a change later is work that pays nobody. The duplication resolves when it goes.

## Also still owed, from the batch before this

Three casts on `BizrethinkMcaTemplate.instrument` that #308 left in place —
`review/server-only/service.ts`, `publish/server-only/templates-api.ts`,
`publish/server-only/publications.ts`. Same looseness `producedInstrumentOf`
fixed in the templates service, on separate read paths.
