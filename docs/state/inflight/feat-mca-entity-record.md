# feat/mca-entity-record — the entity, saved once

ADR 0026's first piece. The legal entity that issues a document becomes a saved
record, so a funder names itself once rather than once per document.

Additive: nothing uses it yet. Templates are untouched and keep their inline
entity details.

## What an entity is, and what it is not

**Our side.** The six identity fields the profile's `ZEntity` already carries,
plus what only the buyer used to have — reconciliation, servicing phone, venue
state and county, website, credit-dispute address. Under ADR 0026 every slot
that used to be buyer, equipment provider or broker *company* is the same thing.

**Not a counterparty.** The merchant, guarantor, ISO partner, processor and
report subject all come from the caller at send time. There will never be a row
here per broker, for the same reason there is not one per deal. The test asserts
this rather than trusting `.strict()` stays where it is: four counterparty field
names are rejected by name.

## Identity and policy are separate columns

Identity is who they are. Policy is how the programme runs — venue rule,
guaranty scope, renewal model, equipment, recipient states, fees. **Policy
decides which clauses a document contains**, which is why it belongs to the
entity running the programme rather than to each document separately: two
documents from one programme must not disagree about the guaranty.

## The contradiction check moved with it

A funder-state forum on a programme serving Virginia is still refused —
Va. Code §6.2-2234(A) — and a funder-state forum with nowhere named is refused
too.

That check is Pacta's business because it is a contradiction **inside the
goods**: the entity claims two incompatible things about itself. Telling a
funder where it may operate would not be, and this does not.

## Writing needs ADMIN or MANAGER; reading does not

Changing an entity changes which clauses every document it issues contains, so
it is a programme decision — the authority ADR 0016 required for provider
policy, for the same reason. Asserted in the service, not in a route.

Compare-and-swap on a version, like a revision: two people editing one entity is
a conflict to report, not a silent last write.

An entity is **edited**, unlike a revision, which is why it has a version rather
than a history. What must not happen — an edit reaching a document already
published — is prevented by **copying** the entity into the revision, which is
the next piece, not by refusing the edit.

## Parsed on the way out, not cast

`getMcaEntity` re-parses the stored row. A row written before a schema change,
or edited outside this service, would otherwise flow into clause selection as
though valid. Failing loudly beats putting an unreadable programme in front of a
reviewer as though it were readable.

## Not in this change

No UI, no template wiring, no migration of existing templates — they are test
data and will be superseded (ADR 0026 §8). The compiler still returns a set of
documents; making it return one is the next and largest piece.
