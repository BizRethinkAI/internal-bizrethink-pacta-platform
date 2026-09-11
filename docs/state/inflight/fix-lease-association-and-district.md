# fix/lease-association-and-district

Nine clause defects found by reading the **rendered** Picana lease against the
association and district documents, rather than by reading clause source. Two
prior review findings are withdrawn on the same evidence.

## Why the rendered document, not the source

The 5 September adversarial review was run against clause source and the matter
record. It reported `hoa.compliance`'s "all of the obligations of the Owner" as
FIXED by `0cc2e00cc`, which narrowed it to use, occupancy and conduct.

The rendered PDF shows 11.1 and 11.3 two paragraphs apart saying opposite
things. The narrowing landed in the library clause; 11.3 prints
`hoaLeaseRequirements`, a typed answer, which still carried the unbounded
wording the declaration compels. **A defect introduced through a value is
invisible to a source read.** That is the method lesson, and it is why the
three rendering defects below were never noticed either.

## Changed

| Clause | v | What |
|---|---|---|
| `hoa.lease-requirements` | 3 | Bounds the compelled "all obligations of the Owner" — not the money of ownership, not what the governing law makes non-delegably the landlord's |
| `hoa.amenity-access` | 4 | Splits registration by who can act; closes the fee list; survives a change of amenity operator |
| `cdd.assessments` | 2 | Recovers district fines, administrative and property-damage reimbursements, facility charges and forfeited deposits; covers a suspension applied to the address |
| `deposit.escrow-notice` | 2 | Gated on the §83.49(2) five-unit exemption the compelled-set already documented in prose |
| `maintenance.storm` | 2 | Carves out tenant-caused damage; assigns shutters |
| `rent.base` | 2 | States a payment method, from a variable, never credentials |
| `insurance.renters` | 2 | A lapse is a breach; force-placed cover confined to the landlord's own interest |
| `fees.administrative` | 2 | An association-issued access device is that body's property, not a landlord replacement cost |
| `general.entire-agreement` | 2 | Addendum prevails over the body — the specific governs the general |

New: fact `landlordRentsFiveOrMoreUnits`, variables `rentPaymentMethod` and
`amenityRegistrationDays`, each with an interview field.

## Withdrawn, and why

**Deposit clock.** The review said §83.49(3)(a) runs from termination of the
rental agreement. It does not: "Upon the vacating of the premises for
termination of the rental agreement." The trigger is vacating. `deposit.return`
was already right, and the proposed change would have started the clock before
a holdover tenant was out. Unchanged.

**Pool alarm.** The review wanted §515.27 restored to 8.7 with an "all openings
/ 85 dB A" standard. The 2026-09-03 statutory walk had already ruled chapter 515
out: it imposes no lease disclosure duty. `requiredBy: 'Ch. 515'` is correct and
stays — `requiredBy` means *implements*, which `why-this-clause.ts` keeps
deliberately distinct from *compelled*, exactly as `access.entry` implements
§83.53(2). Unchanged.

## Guards added

- `hoa.lease-requirements` and `insurance.renters` are `generic`; both new
  carve-outs are stated by effect rather than by citation, and tests pin that
  no state statute appears in either. Reaches §83.51(1) in Florida and §42-52
  in North Carolina.
- `rent.base` rejects any 6+ digit run, so nobody writes bank credentials into
  a clause that is handed to an association under the declaration.
- `landlordRentsFiveOrMoreUnits` is added to the pinned Florida-leak list: it
  gates a Florida-only clause and is dead in North Carolina, which §42-50
  answers differently.

## Not in this PR

Matter values for the live lease — association name, the district name's
trailing space, the holdover flag, the two new answers. Those are answers, not
library text, and are set through the interview.
