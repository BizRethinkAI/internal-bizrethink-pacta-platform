# MCA template publication: what the builder must produce

**Status:** scope. The ownership questions it raised were answered on 2026-09-17
and are recorded in [ADR 0023](../adr/0023-pacta-produces-mca-templates.md); the
work items below are current and unstarted.

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

## Decided, 2026-09-17

Recorded as [ADR 0023](../adr/0023-pacta-produces-mca-templates.md):

1. **The Pacta builder becomes the only producer** of MCA agreement templates,
   once it reaches parity. `lombard-contracts` keeps the historical documents,
   the change notes and the state disclosures. One producer, because a second
   route to publication is a route around the approval gate.
2. **Pacta owns the record**: the `templateId` is kept against the provider
   revision that produced it and exposed over the API, rather than in a JSON
   file in a third repository.
3. **Parity first.** The builder's output matches the documents in use — same
   labels, same recipient roles, same signer fields — before anything it
   produces is published, because `lombard-platform` prefills by label.

Still undecided, and not blocking: which team a second funder publishes into,
and when the existing templates are retired. Both can wait for parity and
counsel.

## What parity means, concretely

The first piece of work is measuring it: extract the label and recipient set
from the templates in use, and pin it as the contract the builder's output must
satisfy. Until that set is written down as a test, "parity" is an opinion.
