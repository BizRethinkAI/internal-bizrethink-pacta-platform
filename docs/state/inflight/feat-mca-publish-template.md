# feat/mca-publish-template — the shell that publishes

**Stacked on `feat/mca-publish-gate-wiring` (#303) → #302 → #301 → #300 → #297 → #295.**

The last piece of the publication path. `publishMcaTemplate` renders, uploads,
creates an `EnvelopeType.TEMPLATE` and writes the record.

## The gate is first, and nothing happens behind a refusal

It refuses every package today — no clause carries a counsel approval — so this
is not a hypothetical path but the only one currently taken.

Order matters for a reason beyond tidiness: put a render or an upload before the
gate and a refusal costs work and, worse, **leaves an orphan document in storage
that nobody will go looking for.** Asserted directly: when the gate throws,
nothing is rendered, nothing uploaded, no envelope created, no record written.

## Thin on purpose

`buildMcaTemplateArtifact` (#302) holds the difficult part — two PDF libraries,
an annotation layer, a paint pass, and an order that is wrong in an invisible
way if reversed. This one touches the world: storage, envelope, record. Same
split `createEnvelopeFromMatter` uses for the lease, and for the same reason.

## Two details that are easy to get wrong

**A template's recipients are placeholders, not people** — `recipient.1@documenso.com`,
which is Documenso's own convention and what the live records show. What must
survive publication is the **order** and the **role name**: the caller addresses
a recipient by role, and `rN` is a position in this list.

**The numeric template id is derived, not stored twice.** `secondaryId` is
`template_121` and the caller's `/template/use` takes `121`. Reading it back out
of the envelope that was just created means the record cannot disagree with the
envelope about which template it is.

## Caught by the type gate, again

`requestMetadata` is **required** by `createEnvelope`, and I had it optional.
Publication is an auditable act — who published this, from where — so required
is also the right shape on its own merits, and there is now a test that it
reaches the envelope.

That is the fourth time in this batch the type gate has caught something the
tests could not: a type-only import, a missing `teamId`, a wrong module, and
this.

## Not wired to anything

No route, no UI, no trpc procedure calls it. Publication is a deliberate act and
what triggers it is a separate decision — and until counsel approves clauses the
gate refuses, which is the designed state rather than an unfinished one.
