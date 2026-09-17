# feat/mca-field-triage — the gap the other way round

**Stacked on `feat/mca-publication-field-plan` (#292) → #290 → #289.**

## Why this exists

#292 measured parity forwards: of the names the live templates carry, how many
can the builder produce. 72 of 89. That reading was incomplete and flattering.

Backwards, the builder's documents contain **41 deal fields the live templates
have no widget for at all**. Publish one today and a merchant is handed blanks
where those fields sit, and nothing on the sending side could fill them, because
there is nothing to send them to.

That is not a defect in the clause library. ADR 0012 retired fidelity to the v4
documents, and the itemization and offer detail authored since is the point of
having a clause library rather than six Word files. It is a consequence that has
to be settled before publication, and this is the settlement.

## The decision, as directed

Reclassify first, then a short change on the caller's side.

| kind | n | what happens to it |
|---|---|---|
| `programme` | 12 | goes into the provider profile; the builder sets it in type at publication. No widget, no caller change. |
| `per-deal` | 27 | needs a **new widget name** — the only part that costs the caller anything |
| `control` | 1 | `guarantor.kind` drives `requiredWhen` and is never printed |
| `duplicate` | 1 | `merchant.signerCapacity` is the same fact as `signers.merchant.capacity`, which the live templates already call `merchant_signer_title` |

`newWidgetNames()` prints the 27 on their own, because that list is the ask on
`lombard-platform` and nothing else here is.

## Also done: a signer's email stops being a document field

Six of the original 50 were `signers.*.email`. A signer's email is how the
envelope reaches the person — supplied per send in the recipients payload — and
no live template has a widget for one. It is still collected and still reported
when missing, because a party with no address cannot be sent to; it is simply no
longer printed into a document the merchant signs.

## What the test does and does not check

It checks the triage is **complete** (every unreachable field is classified),
**consistent** (no proposed name means two things; a name already in use keeps
the meaning it already has), and **not padded** (nothing classified that is
already reachable, or that the provider profile already resolves). The
unreachable set is derived from the library rather than listed, so a clause that
gains a field fails this until somebody says which kind it is.

It does **not** check the classification is right. That is a judgement, and the
two ARGUABLE ones are marked in the file:

- `funding.deadline` — read as a standing rule of the programme. Quoted per deal
  it would be per-deal instead.
- `merchant.formationState` — it is plainly per-merchant, and the FRPA already
  carries it as `merchant_state_of_incorporation`. It appears here only because
  the lease's live template has no such widget; the fix proposed is to give the
  lease the same name rather than to invent one.

## A modelling error worth recording

The first version keyed reachability globally and the test caught it:
`guarantor.email` has a widget on the FRPA and none on the lease, so a binding
can be reachable and unreachable at once depending on the document.
**Reachability is per instrument.** The rule now is that nothing may be triaged
which every instrument carrying it can already fill.

## Not in this change

The twelve provider-profile fields are not yet in `ZMcaProviderProfile` — each
needs a schema field and validation, and that is the next piece. The renderer is
still untouched.
