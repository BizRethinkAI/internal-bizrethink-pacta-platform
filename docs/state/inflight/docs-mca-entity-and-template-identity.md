# docs/mca-entity-and-template-identity — ADR 0026, proposed

**Documentation only.** Written as `Proposed`, read back by the owner, and
accepted against this text rather than against a recollection of the
conversation that produced it.

## What it settles

**entity + type = one template.** A saved template stops being a package of
documents and becomes one entity's version of one document.

The evidence that decided it: `lombard-api` holds five separate published
templates, each with its own `templateId`, each sent on its own. **The package
is ours and exists nowhere else** — the caller has never seen one.

## What was verified rather than assumed

- **Only one cross-instrument clause reference exists** in the whole library:
  the ISO PRA's commission clause cites FRPA sections. The other four documents
  are entirely self-contained, so separating them costs one rewording.
- **`provider_legal_name` on the live ISO PRA is the Company — our side**, while
  `iso_partner_legal_name` is the broker. That is what establishes the line
  between what Pacta holds and what the caller sends, rather than an argument
  about it.
- **`processor_name` is a live widget on the FRPA**, which is why no template
  selects a processor.

## A correction it forces

#292 classified `processor_name` and `commission_percentage` as `printed` —
resolved at publication — because they sit in `MCA_PROVIDER_BINDINGS`. They are
not our side, so they are widgets. That set has to split: entity identity
prints, everything else in it is a widget.

I had flagged those as "the sharpest break found" and framed them as a deliberate
difference to reconcile. They were not a break; I had misread which side owns
the fact.

## Two directions proposed and withdrawn before this one

Worth recording, because the reasoning moved twice:

1. **Three entity slots per template** (buyer / equipment provider / broker
   company), each pointing at a saved record. Withdrawn: the broker is a
   counterparty that comes from the caller, so it was never our entity.
2. **No entity record at all; the caller sends provider identity.** Withdrawn by
   the owner in favour of this, accepting that the caller's send path changes.

## Not in this change

No code. The restructure is large — the compiler returns one document instead of
a set — and starts from this, now that it is accepted. Three fields whose side
is unclear are recorded as open at the end of the ADR; none blocks the compiler,
and each is a one-line change once settled.
