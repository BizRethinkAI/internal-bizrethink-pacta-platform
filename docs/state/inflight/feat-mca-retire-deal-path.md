# feat/mca-retire-deal-path — the deal leaves the vertical

ADR 0025 decision 1, carried out. The artifact this vertical produces is a
**template**, and a deal never enters it. This removes the transaction path and
puts the specimen preview in its place.

## What went

| | |
|---|---|
| `mca/transactions/` | fill, input, fixtures, the internal-draft renderer, the draft endpoint — ~2,100 lines |
| `trpc … templates.fill` | the route and `ZFillMcaDraftRequestSchema` |
| `/api/bizrethink/mca-draft` | the endpoint that read up to 600,000 bytes of merchant identity |
| the 430-line deal interview | merchant legal name, guarantors, signers, deposit account, funding figures |

**No merchant's details can now reach this vertical**, because there is nothing
left that accepts them. The question of merchant identity at rest in Pacta,
circled repeatedly in schema refusals and a closed PR and a stateless rule,
stops existing rather than being managed.

## What replaced it

`/t/:teamUrl/mca/preview` — pick a document, download it rendered with specimen
values. The route is renamed from `draft` and the link from "Use this template"
to "Preview this template", because both said something that is no longer true.

## Tests kept rather than deleted

Deleting a test is how coverage drops silently, so each was re-pointed instead:

- **`reading.test.ts`** — the reading projection still exists. It now runs on a
  compiled template. The dropped assertion was about two permission-to-release
  copies, which came from two *report subjects*: a deal fact.
- **`reading-routes.test.ts`** — the half worth keeping is that a
  `[[clause:...]]` reference comes back through the **route** as a real number
  pointing at a real clause, across documents. Untouched. Only the `fill` half
  went.
- **`section-headings.test.ts`** — headings still restart at Section 1 per
  document. The duplicate-instance assertion is replaced by one asserting there
  are *no* duplicates, so the weaker input is explicit rather than quietly lost.
- **The E2E spec** keeps every access, revision and account restriction. Those
  never belonged to the deal path; they belong to anything that renders a
  funder's programme terms. It gains two: an instrument the builder does not
  produce, and an unknown instrument, are both refused before any render.

`transactions/`'s own tests went with it, which is correct — they tested deal
filling.

## A fixture ported, not lost

`draft.fixture.ts` built a compiled template **and** a merchant's answers. Only
the first half describes a template, so it is now
`templates/all-options.fixture.ts` — a programme offering every document the
builder produces. Without it, most fixtures are an FRPA and little else, and a
bug in the equipment, channel or report documents has nowhere to show itself.

## Two things the gates caught

**The type gate found a dead render branch.** I removed `signatures` from
`McaPackageReader`'s props but left the JSX that read it. Nothing produced
signatures once `fillMcaDraft` was gone, so the branch was unreachable and the
tests passed; `tsc` failed on four lines.

**Biome reformatted an unrelated file** — an import reorder in
`venue-is-a-choice.test.ts`, which this change does not touch. Reverted. Same
noise that tripped the fork-discipline guard in an earlier batch.
