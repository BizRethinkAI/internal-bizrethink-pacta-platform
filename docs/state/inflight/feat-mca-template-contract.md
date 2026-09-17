# feat/mca-template-contract — the templates in use, pinned as a test

**What this is:** the parity measurement [ADR 0023](../../adr/0023-pacta-produces-mca-templates.md)
§3 asks for, before the builder publishes anything. It adds no behaviour: it
writes down what the live templates expect and what the builder would put there.

## What was actually found

**The interface is the AcroForm widget name, not the field label.** ADR 0023 and
`docs/design/mca-template-publication.md` both say "labels are an interface
contract". They are wrong on the mechanism, and the correction is in this branch.
`lombard-platform/src/lib/pacta.ts` sends `formValues` keyed by the names in
`acroformFields` and sends `prefillFields: []`; `buildFormValues`
(`documenso-prefill-helper.mjs`) is where the keys are used.

**What catches a drift, corrected 2026-09-17.** An earlier draft of this note
said nothing on that side catches a rename. The platform session checked instead
of taking my word for it: their `pacta-v2-registry.test.ts` asserts every kind
emits exactly its template's widgets, and it is clean across 6,283 tests. So
nothing is being dropped silently today and I overstated the exposure.

What that spec cannot see is a template **republished from outside their
repository** — exactly what ADR 0023 introduces by making this builder the
producer. Their runtime backstop for that is lombard-platform #262, which reads
`acroformFields` (the key the records actually carry) and warns rather than
throws: a drifted name leaves the document equally blank either way, and
throwing at send time would turn a cosmetic drift into an outage.

The risk this test answers is the one neither covers — a name renamed *here*, in
a template produced *here* — and it fails before publication rather than after.

**Where the numbers come from, since two sessions have now got arithmetic wrong
under a claim like this one.** Every count in this branch and the ones stacked on
it is derived by a test from `live-template-contract.json`, which
`scripts/mca/extract-template-contract.mjs` writes from the published records
themselves. None of them comes from a message, a regex over source, or a
hand-kept list.

Re-verified directly: of the 23 records `lombard-platform` vendors, **22 carry
widgets** and one (`processor2-v1`, unpublished) carries none; **17 of the 22 are
state disclosures or itemizations**, which ADR 0024 stages for later; the
remaining five files are exactly the set extracted here — six instruments,
because the lease and the subscription share one template.

**`acroformFieldCount` is not the number of fields.** It counts widget
annotations: `merchant_legal_name` is one field with three widgets on the FRPA,
and one `formValues` entry fills all three. Confirmed by loading the PDFs with
pdf-lib, not inferred. A renderer that emitted one field per occurrence would ask
for the same fact three times.

**Four kinds of gap, all of them recorded rather than closed:**

| kind | count | example |
|---|---|---|
| `retired` | 2 | `guarantor_ssn` — the library refuses the slot, so builder output is not a drop-in |
| `compile-time` | 1 | `rollover_method` — the election picks a §8.2 clause, so there is no slot to fill |
| `unmodelled` | 4 | `merchant_primary_contact_title`, `subscriber_business_type` |
| `absent-from-instrument` | 4 | `permission-to-release.merchant_primary_contact_phone` |

**Eight widgets the builder would not emit at all.** `processor_name`,
`provider_address`, `provider_legal_name` and `commission_percentage` map to
`MCA_PROVIDER_BINDINGS` — facts the builder resolves from the provider profile at
publication and prints, rather than leaving as a widget. The platform would keep
sending values for names that no longer exist. This is the sharpest break found,
and closing it is a decision per name at the first publication.

**The lease and the subscription are one template in the send path.**
`documenso-templates.ts` has no `equipment-lease` kind and resolves
`subscription` to template 120. The library publishes the twin as two documents.
Recorded, not reconciled.

**A widget name carries the funder's own name.** `lombard_signer_name` /
`lombard_signer_title` on the lease. A second funder cannot reuse them, so the
name has to change at the first publication — the concrete case for ADR 0023's
decision that Pacta owns the record of what was published.

## Files

- `packages/bizrethink/mca/publish/live-template-contract.json` — generated, the
  names/recipients/signer counts as published
- `packages/bizrethink/mca/publish/template-parity.ts` — binding or stated gap,
  per widget, per instrument
- `packages/bizrethink/mca/publish/template-parity.test.ts` — 35 assertions; each
  gap kind is checked against the library, so a gap that closes fails
- `scripts/mca/extract-template-contract.mjs` — regenerates the JSON from a
  `lombard-platform` checkout, by hand, never in CI

## What this does not do

No renderer change, no publication path, no `templateId` record. Those are the
work items in `docs/design/mca-template-publication.md`, and they now have a
contract to be measured against instead of an assertion that they match.
