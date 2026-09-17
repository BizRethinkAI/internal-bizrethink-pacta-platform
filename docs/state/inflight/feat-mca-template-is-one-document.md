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

**`McaTemplateSnapshot` was inferred, and the inference was circular.** It was
`ReturnType<typeof compileMcaTemplate>`, while `projectTemplateReading` is
generic over that type and feeds the tRPC preview route. TypeScript answers a
circular inference with `any` and says nothing.

The symptom was that the client-side preview type kept its **pre-change shape**
— no `instrument`, `kind: string` — through a declared snapshot type, an
explicit property on the preview return, a declared `McaPreviewedTemplate`, and
an annotation on the route itself. None of the four moved it. The type is
declared now, which is right regardless, and the two preview components ask for
the fields they render (`Pick<…, 'documents' | 'externalDocuments' |
'requirements'>`) instead of a whole snapshot — which is what they always meant,
since neither renders a fingerprint.

**Not fully explained, and worth knowing about before the next tRPC-facing
change:** an annotation on a procedure's return did not change what the client
inferred. Left as it is because the components' narrowed props are the correct
end state anyway, not because the inference is understood.

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

## Local failures that are not this branch

Four regression files fail in this worktree and pass in the main checkout:
`sensitive-route-logging`, `webhook-tls-boundary`,
`resource-recipient-email-boundary`, `webhook-response-boundary` (16 tests).
**Identical at the parent commit**, so they predate this work — the fourth
occurrence of the shared-`node_modules` worktree artifact. Not investigated
further here; CI is the verdict.

## Still owed

- **`externalDocuments` contradicts ADR 0026 §6** — it reads
  `profile.processor.legalName` into every template, and no processor is ever
  selected in a template. It survives this PR because the profile still carries
  a processor; both go when the entity wiring lands.
- Entity wiring proper: `entityId` on the template, policy copied into the
  revision. Stacked on #310.
- The per-document-type interview — the lease-style step-by-step that prompted
  ADR 0026 in the first place.
