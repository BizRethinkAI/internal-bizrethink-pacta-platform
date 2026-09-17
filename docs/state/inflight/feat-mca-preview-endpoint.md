# feat/mca-preview-endpoint — download a preview of a template

**Stacked on `feat/mca-specimen-preview` (#300) → #297 → #295.**

`POST /api/bizrethink/mca-template-preview` returns the named template revision
rendered with specimen values. Additive: nothing is removed, and the existing
draft endpoint is untouched.

## Why it is this small

ADR 0025: the artifact is a template and a deal never enters this vertical, so
there is nothing to fill in before previewing one. The whole request is **which
team, which template, which revision, which document** — four small fields.

Compare the draft endpoint it will replace, which reads up to 600,000 bytes of
merchant identity, guarantors, signers and funding figures.

## Access is decided by `previewMcaTemplate`, not here

It already checks live team membership, the separate
`mca-clause-draft-rendering` grant, and that the revision still compiles to what
it compiled to. Repeating any of that here would be two checks that can
disagree — and the one that disagrees quietly is always the one nobody reads.

## Two bugs the gates caught

**The type gate caught a missing `teamId`.** `previewMcaTemplate` takes
`TeamActor & { id, version }` and the endpoint passed only `userId`, `id` and
`version`. The mocked test passed happily, because the mock accepted whatever it
was given. `tsconfig.typecheck.json` exists for exactly this class, and the
request schema now carries the team with a test pinning its absence as a refusal.

**A test-isolation bug of my own.** `vi.clearAllMocks()` empties the call log but
**keeps** an implementation set with `mockImplementation`, so the throwing
`assertUserNotDisabled` from the disabled-account case leaked into every test
after it and turned two expected 400s into 500s. `vi.resetAllMocks()` is correct
here, and the reason is written where the next person will look.

## Small things that are deliberate

- **The filename says `preview`.** A file called `mca.pdf` in somebody's
  downloads folder a week later is how a preview gets mistaken for the thing it
  previews.
- **`split-funding` is refused**: ADR 0019 makes the letter the processor's and
  the builder produces none, so there is nothing to preview.
- **`private, no-store`.** A preview holds no merchant's details but it does hold
  a funder's programme terms.

## Not in this change

The deal path is still there. This is the endpoint that replaces its PDF
download; removing `transactions/`, the draft route and the deal form in the
workspace is the next change, and it touches the UI and an E2E spec.
