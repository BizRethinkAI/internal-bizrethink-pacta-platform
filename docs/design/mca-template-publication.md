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
POST /api/v2/template/use     templateId + formValues + recipients
```

`lombard-platform/src/lib/pacta.ts` owns that call. `formValues` is keyed by
**AcroForm widget name** — the names in the published record's `acroformFields`
— and `prefillFields` is sent empty; `documenso-prefill-helper.mjs`
(`buildFormValues`) is where the keys are used. `src/templates/*.published.json`
records each `templateId`. Pacta returns a document, the platform sends it and
collects signing URLs.

**No MCA code is in that path.** It is upstream Documenso's template flow against
templates that already exist in the funder's team. Three consequences:

1. **Publication is the control point.** Once a recipe becomes a template in
   `lombard-api`, the existing API can send it and nothing of ours intervenes.
   ADR 0016 already says an unapproved recipe must not become a sendable
   template merely because the interview was completed.
2. **A per-deal interview in Pacta is not part of this** and never was — ADR 0011
   assigns deal fill to the funder's platform, over the API, for exactly the
   automation reason ADR 0010 protects.
3. **The AcroForm widget names are an interface contract.** The platform
   prefills *by widget name*. Their CI catches a drift authored on their side —
   `pacta-v2-registry.test.ts` asserts every kind emits exactly its template's
   widgets — but it cannot see a template **republished from outside their
   repository**, which is exactly what ADR 0023 introduces. Their runtime
   backstop for that case is lombard-platform #262, which warns; the failure it
   guards against is a blank where a figure belonged, in a document a merchant
   is signing.

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
| Deal fields | value or `[to complete]` | an AcroForm widget under the pinned name |
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
3. ~~**Widget-name contract.**~~ **Done** — `publish/template-parity.ts` and its
   test. Each live widget now has a binding or a stated gap, and the gaps are
   checked against the library rather than asserted.
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
   AcroForm widget names, same recipient roles, same signer fields — before
   anything it produces is published, because `lombard-platform` prefills by
   widget name.

Still undecided, and not blocking: which team a second funder publishes into,
and when the existing templates are retired. Both can wait for parity and
counsel.

## What parity means, concretely — measured

Measured in `publish/template-parity.ts`, against the widget names and recipient
roles extracted from the templates actually in use. What it found:

- **`acroformFieldCount` is not a field count.** It counts widget annotations.
  `merchant_legal_name` is one field with three widgets on the FRPA, and one
  `formValues` entry fills all three. A renderer that emitted one field per
  occurrence would ask for the same fact three times.
- **Eight widgets the builder would not emit at all.** `processor_name`,
  `provider_address`, `provider_legal_name`, `commission_percentage` map to
  `MCA_PROVIDER_BINDINGS` — facts resolved from the provider profile *at
  publication* and printed, not left as a slot. The platform would keep sending
  values for names that no longer exist. **This is the sharpest break**, and it
  is a decision per name at the first publication, not a bug to fix now.
- **Eleven widgets have no binding**: two retired on purpose (`guarantor_ssn`),
  one settled by clause selection rather than by a slot (`rollover_method`),
  four the library holds no fact for, four whose binding exists but which no
  clause of that instrument carries.
- **The lease and the subscription are one template in the send path.** The
  platform has no `equipment-lease` kind and resolves `subscription` to template
  120. The library publishes the twin as two documents.
- **A widget name carries the funder's own name** — `lombard_signer_name`. A
  second funder cannot reuse it, so the name changes at the first publication
  and the platform has to be told. The concrete case for ADR 0023 §2.

Parity is now a diff rather than an opinion. It is not yet met.
