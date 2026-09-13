# MCA reusable content and extraction audit

The accepted unified workspace design separates catalogue membership from legal
importance. Required fields and document blocks remain part of an agreement's
review and assembly inputs. The clause catalogue contains only numbered operative
provisions. Prescribed disclosures remain separately typed and read-only.

`library.ts` exposes nineteen reusable items: seven field groups, ten document
blocks and two interview prompts. `../catalogue.ts` combines authored content only
for shared services; it does not widen `libraryFor` or the clause-selection API.
Use each item's declared `uses`, selection condition and `placement` when assembling
a package. Guidance with only an interview use never enters a contract. Guarantor
fields repeat in their own instrument and signer context; equipment fields belong
to the selected equipment instrument. A helper is not an optional obligation.

## Mapping decisions

| Input content | Destination |
|---|---|
| FRPA merchant/funding grid | Same identity, reusable field group |
| FRPA guarantor record | Numbered identity/capacity rule plus separate repeatable guarantor fields |
| Holdback and equipment question prompts | Interview-only guidance; operative definitions and limits remain numbered |
| Prior-transaction field label/widget | Separate field; settlement duties stay in the numbered clause |
| FRPA and equipment parties records | Identification sentence becomes a required document block; formation, funding and capacity rules stay numbered |
| FRPA execution legend | Required document block; adoption, capacity and delivery protections stay numbered |
| Equipment guarantor grids | Same identities, reusable field groups |
| Equipment schedules | New instrument-specific field groups using the reviewed shared field definitions |
| Equipment jury, class and limitation subclauses | Six independently numbered provisions extracted from the two governing-law records |
| Equipment guaranty section headings | Required document blocks; survival rules stay numbered |
| ISO parties, recitals and consideration | Four required document blocks, same identities |
| Remaining operative records, including lead-ins and release preamble | Numbered clauses |

This produces 210 clauses and nineteen reusable items. All 211 original identities
remain represented in the union. No legal sentence is deleted to make the count
work. Material drafting corrections were made separately in #204 and #206; #194's
consent/acknowledgment correction remains an integration prerequisite.

## What the migration proves

`migration.json` records the source revision
`ca31f30ba8cc5593a61a5d675cc51f3207208127`, original identity/version/body hashes,
ordered extraction segments and destination versions. The tests reconstruct every
input body exactly at the extraction versions. Historical printed subheading
prefixes live in the audit, not in active clause numbering. The prior-transaction
label/widget span is explicitly accounted for by its field binding. Original
field groups also carry hashes for fields, retired slots and repeat semantics.

This is a point-in-time extraction audit. Later deliberate edits must advance a
destination version and trigger the normal approval review. The audit then stops
demanding that old wording from that source row be reproduced; it still requires
all destination identities and non-regressing versions. This preserves ADR 0012's
rule that the old document is research input, not a permanent specification.

## Approval, findings and stored data

Moved or split records advance versions; new records start at version one and name
their `derivedFrom` identities. Fingerprints cover catalogue kind, fields, repeat
rules, retired slots, uses, placement and derivation in addition to wording and
selection. Whole-agreement review fingerprints cover both authored catalogues.
Old approvals cannot silently become approval of extracted or reclassified text.
Unchanged clause approvals retain the existing fingerprint contract.

Historical database rows stay on their original string identities. When approving
derived content, the router also checks unanswered counsel findings on its source
identities. It neither copies nor erases findings or approvals. Token holders can
only record findings within their assigned instrument; they cannot approve. The
staff view keeps access to historical findings and answers. Earlier vendored legal
review annotations remain internal, as ADR 0012 requires.

No schema migration or live database operation is needed for this separation.
No assumption was made that stored approvals or templates are absent. Existing
stored documents retain their contents. Provider interview, actual field-value
validation, rendered package generation and publication checks are the next stage;
the presence of a catalogue entry is not a claim that a transaction is ready to sign.
