# MCA template publication: what the builder must produce

**Status:** scope, not a decision. The open questions at the end need the
repository owner before any of this is built.

**Why this exists:** the MCA builder stops at an internal draft PDF. The funder's
platform sends by calling a **published template**. Nothing connects those two
facts, and that gap — not sending, not a per-deal interview — is the remaining
work.

## How a funder actually sends today

Lombard's platform holds the deal and calls Pacta:

```
POST /api/v2/template/use     templateId + prefillFields (by label) + recipients
```

`lombard-platform/src/lib/pacta.ts` owns that call; `documenso-prefill-helper.mjs`
maps field labels to values; `src/templates/*.published.json` records each
`templateId`. Pacta returns a document, the platform sends it and collects
signing URLs.

**No MCA code is in that path.** It is upstream Documenso's template flow against
templates that already exist in the funder's team. Three consequences:

1. **Publication is the control point.** Once a recipe becomes a template in
   `lombard-api`, the existing API can send it and nothing of ours intervenes.
   ADR 0016 already says an unapproved recipe must not become a sendable
   template merely because the interview was completed.
2. **A per-deal interview in Pacta is not part of this** and never was — ADR 0011
   assigns deal fill to the funder's platform, over the API, for exactly the
   automation reason ADR 0010 protects.
3. **Field labels are an interface contract.** The platform prefills *by label*.
   A label we rename silently breaks a caller we do not deploy.

## What publication requires, and where today's renderer falls short

A published template is a PDF whose **native placeholders** Documenso extracts at
upload. From `lombard-contracts/PUBLISH_RUNBOOK.md`, verified against this repo:

- Only `{{TYPE, rN, label=..., readOnly=...}}` placeholders become Documenso
  fields. **AcroForm `«N»` widgets never do.**
- A widget can only be written by the sender, so anything a signer supplies —
  signature, date, initials — must be a native placeholder or it ships as a
  permanently blank field.
- Extraction also whites the token text out of the page. Skip it and the literal
  `{{SIGNATURE, r1}}` stays visible.

Today's MCA renderer (#277–#280) deliberately produces the opposite: an
`INTERNAL DRAFT` banner on every page, values or `[to complete]` in place of
fields, unsigned rules instead of signature blocks, and **no placeholders at
all** — asserted by `pdf.test.ts`.

So publication needs a **second render mode**, not a tweak:

| | internal draft (today) | merchant-ready (needed) |
|---|---|---|
| Banner | `INTERNAL DRAFT` every page | none |
| Deal fields | value or `[to complete]` | `{{TEXT, rN, label=<binding>, readOnly=true}}` |
| Signer fields | printed rules | `{{SIGNATURE, rN}}`, `{{DATE, rN}}`, `{{INITIALS, rN}}` |
| Recipients | none | one `rN` per signing role, stable across the package |

## The upload is scriptable from inside Pacta

The runbook says publication is a manual UI click. **That is true for external
REST callers and not for us**, and the distinction matters:

- `extractPdfPlaceholders` is reachable from `createEnvelopeItems`
  (`packages/lib/server-only/envelope-item/create-envelope-items.ts:60`), and
  `createEnvelope` accepts `type: EnvelopeType.TEMPLATE`
  (`packages/lib/server-only/envelope/create-envelope.ts:74`).
- **The lease vertical already does this**, in
  `lease/server-only/create-envelope-from-matter.ts`: it renders, extracts
  placeholders and calls `createEnvelope` with them, with no UI step.

So MCA publication follows a proven in-repo path. The runbook's warning stays
true for `lombard-contracts`, which publishes over REST from another repository.

## Work, in the order it has to happen

1. **Merchant-ready render mode.** The table above. Largest item, and it is
   renderer work rather than clause work.
2. **Recipient model.** Map signing roles to stable `rN` indexes across the six
   instruments, so `r1` means the same party in every document of a package.
3. **Label contract.** Emit `label=` from each field's binding, and pin the
   emitted set in a test — it is the interface the funder's platform prefills
   against.
4. **Publication service.** Render → extract → `createEnvelope(TEMPLATE)` into
   the funder's team, recording the resulting `templateId` against the provider
   revision that produced it.
5. **The gate fires first** (#288): `assertMcaPackagePublishable` refuses while
   any clause lacks a current approval. It ships shut and stays shut until
   counsel.

## Open questions for the owner

1. **Who owns the published-template registry?** Today `lombard-contracts`
   emits `*.published.json` and `lombard-platform` reads `templateId` from it.
   If Pacta publishes, that record should come from Pacta — which changes a file
   another repository consumes.
2. **Does publication replace the `lombard-contracts` pipeline for MCA, or sit
   beside it?** Both produce templates for the same team. Two producers of one
   artifact is the twin problem this vertical has paid for twice.
3. **Which team does the MCA builder publish into?** Lombard's templates live in
   `lombard-api`. A second funder implies a team per funder, and that is an
   organisation decision, not an engineering one.
4. **What happens to the templates already published** (FRPA 121, Payzli 102 and
   the rest) when the builder can produce equivalents? Replacement is a
   re-publication with new ids that the platform must be told about.

Nothing here should be built until 1 and 2 are answered: they decide whether
this path is additive or a replacement, and that changes what it must produce.
