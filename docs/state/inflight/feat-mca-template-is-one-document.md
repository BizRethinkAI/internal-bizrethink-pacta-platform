# feat/mca-template-is-one-document — the compiler produces one document

**Stacked on `feat/mca-compile-one-document` (#311).**

The piece #311 held back. ADR 0026: **entity + type = one template.** The
compiler took a profile and produced whichever set of documents the policy
selected, and that set existed nowhere outside it — `lombard-api` holds five
separately published templates, each with its own `templateId`, each sent on its
own. The caller has never seen a package.

## What a template is now

`compileMcaTemplate(profile, instrument)` compiles one document.

- **A document the programme does not run is refused**, not quietly omitted. A
  template for a document nobody can lawfully send is worse than no template.
- **A split funding letter is refused by name**, whatever the policy says. ADR
  0019 keeps the letter the processor's, so the tRPC create route's input is
  `PRODUCED_INSTRUMENTS` and turns it away at the edge rather than in the
  compiler.
- **`BizrethinkMcaTemplate.instrument`** records which document a saved template
  is. `updateMcaTemplate` reads it from the stored row and never accepts it: a
  template does not change which document it is. Existing rows are test data
  (ADR 0026 §8), so the migration default exists only to add the column.
- **The builder asks which document**, on the create path only, because an
  existing template has no such choice to make. Defaulting it to the FRPA and
  saying nothing would have been the exact species of invisible assumption ADR
  0026 exists to remove. This is not the per-document interview — that is still
  owed — it is one control so the creation path stops guessing.

## Three things this turned up that were not the subject

**`templatePlacement` failed open.** It read `document?.items ?? []`, so a
snapshot that does not carry the document asked for got a placement of *nothing
at all* — which a caller cannot tell apart from a document with no fields to
place. One template per document is what makes the mismatch reachable: the
snapshot and the instrument argument can now disagree where the package used to
hold them all. It fails closed now, like the renderer beside it, and the test
that proves it replaced one that was passing on an incidental throw.

**`isMcaTemplateCurrent` recompiled with no instrument at all**, which under ADR
0026 has no meaning. The snapshot carries `instrument` at the top level now, and
two tests cover it — one that every document checks out as current, and one that
an ISO PRA snapshot *claiming* to be an FRPA does not. The second is the one
that pins the coupling; an implementation recompiling a hardcoded instrument
passes the first.

**`McaTemplateSnapshot` is declared now, not inferred.** It was
`ReturnType<typeof compileMcaTemplate>`. It is the shape the review, publish and
reading pipelines are written against and the shape the preview route returns,
so it is worth stating rather than deriving — and stating it immediately caught
two fields looser than intended (a requirement's `kind`, the processor's
`form`). The preview route and `McaPreviewedTemplate` are annotated for the same
reason. The two preview components now ask for the fields they render rather
than a whole snapshot, so adding a field to a compiled template cannot break a
component that never reads it.

## The local environment was lying, and this is how

**Every workspace package in a git worktree resolves to the MAIN CHECKOUT.**

```
<worktree>/node_modules/@bizrethink/customizations -> .../internal-bizrethink-pacta-platform/packages/bizrethink
<worktree>/node_modules/@documenso/trpc            -> .../internal-bizrethink-pacta-platform/packages/trpc
```

All seventeen of them. STATE.md records this as an occasional artifact — a
stale Prisma client, missing Playwright types, missing tRPC routes. It is not
occasional. **Anything reached by package name comes from `main`; only relative
imports come from the branch.**

That is the whole explanation for a long detour in this session. A type imported
as `../templates/compile` was current, while the same type reached through
`@documenso/trpc`'s router was `main`'s. The client-side preview type therefore
kept its pre-change shape through four attempted fixes — a declared snapshot
type, an explicit property, a declared `McaPreviewedTemplate`, an annotation on
the procedure — because none of them were being read. I wrote that up as an
unexplained tRPC inference problem in the first draft of this note and in the
first PR body. **It was not; it was the symlinks, and both have been corrected.**

Repointing them in the worktree fixes module resolution:

```sh
for d in node_modules/@documenso/* node_modules/@bizrethink/*; do
  t=$(readlink -f "$d"); case "$t" in */internal-bizrethink-pacta-platform/packages/*|*/apps/*)
    rel=${t#*internal-bizrethink-pacta-platform/}; [ -d "$rel" ] && rm "$d" && ln -s "../../$rel" "$d";; esac
done
```

**The lesson worth keeping: in a worktree, CI is the only trustworthy verdict on
anything crossing a package boundary.** CI caught the one real error here — the
create mutation needed an instrument — while local tsc reported the opposite,
that the field did not exist.

## Test files this moved

Fourteen, in three kinds:

- **Mechanical** — the instrument added to the call. Most of them.
- **A shared `snapshot()` helper per file** — the four publish tests now take the
  instrument, so a compiled template and the document asked for are visibly the
  same one at each call site rather than agreeing by accident.
- **Package assertions rewritten.** `compile.test.ts` had a describe block
  titled "the provider interview produces a reusable document-package template"
  and assertions over `.documents.flatMap(...)`. The five-document assertion is
  now five separate compiles — which is what the caller does, and what
  publishing does. `reading-routes.test.ts`'s "all offered instruments" scenario
  became three per-document scenarios, each expecting no cross-document
  reference, since #311 removed the only one.

Nothing was deleted to make this green.

## The E2E gate

The MCA specs post to the `create` route directly and had to name a document
too. While there, the ADR 0019 guard is now asserted **over HTTP**: the route's
input schema refuses a split funding letter, and no row is written. The schema
is the guard, and this is the only thing that exercises it end to end.

Two non-MCA specs failed in the same run and **passed on retry #1** —
`update-envelope-items.spec.ts:298` and `envelope-save-as-template.spec.ts:445`,
both green on #311. Flaky, not this branch. The MCA failures failed all five
attempts, which is what a real one looks like.

## Local failures that are not this branch

Four regression files fail in this worktree and pass in the main checkout:
`sensitive-route-logging`, `webhook-tls-boundary`,
`resource-recipient-email-boundary`, `webhook-response-boundary` (16 tests).
**Identical at the parent commit**, so they predate this work. Same cause as
the section above: those tests import `apps/remix` routes by package name and
therefore run `main`'s copy. CI is the verdict.

## Still owed

- **`externalDocuments` contradicts ADR 0026 §6** — it reads
  `profile.processor.legalName` into every template, and no processor is ever
  selected in a template. It survives this PR because the profile still carries
  a processor; both go when the entity wiring lands.
- Entity wiring proper: `entityId` on the template, policy copied into the
  revision. Stacked on #310.
- The per-document-type interview — the lease-style step-by-step that prompted
  ADR 0026 in the first place.
