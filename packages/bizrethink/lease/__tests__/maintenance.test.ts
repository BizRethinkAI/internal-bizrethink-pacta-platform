import { describe, expect, it } from 'vitest';
import type { ClauseFacts } from '../clauses/types';
import { FL_LIBRARY } from '../clauses/us-fl';
import { selectClauses } from '../engine/select-clauses';

/**
 * Maintenance is the part of a Florida lease where the statute actually
 * constrains what may be agreed, and where the two prior leases for this
 * property drafted most loosely.
 *
 * Fla. Stat. §83.51 splits into two halves that behave very differently:
 *
 *   §83.51(1) — structural soundness, roof, windows, doors, floors, steps,
 *   porches, exterior walls, foundations, plumbing in reasonable working
 *   condition, and compliance with applicable building and housing codes.
 *   NOT waivable, on any property type.
 *
 *   §83.51(2) — extermination, locks and keys, garbage removal, and functioning
 *   facilities for heat and running water. May be "altered or modified in
 *   writing" for a single-family home or duplex, and only for those.
 *
 * 29090 Picana Ln is a single-family home, which is precisely why the repair
 * threshold and the pool/lawn split are available to it. On a condo or a
 * multi-family unit they are not, and the engine must simply not offer them.
 */

const SINGLE_FAMILY: ClauseFacts = {
  landlordRentsFiveOrMoreUnits: false,
  termMonths: 12,
  depositHeldUsd: 6900,
  advanceRentHeldUsd: 6900,
  depositCarriedInUsd: 0,
  advanceRentCarriedInUsd: 0,
  propertyYearBuilt: 2005,
  petsPermitted: true,
  hasNamedOccupants: false,
  hasHoa: true,
  hasCdd: false,
  // Derived in hydrateMatter; stated here because these fixtures drive clause
  // selection directly rather than going through it.
  hasPetFees: false,
  hasHoaLeaseRequirements: false,
  hasHoaGoverningDocuments: false,
  hasConditionReport: false,
  prorationApplies: false,
  propertyType: 'single-family',
  hasPool: true,
  hasYardAllocation: true,
  hasTenantYardDuty: true,
  lateFeePolicy: 'tiered',
  terminationOnSale: true,
  holdoverPenalty: true,
  earlyTerminationOffered: true,
  nonRenewalNoticeRequired: true,
  electronicNoticesElected: false,
};

const allSlugs = (facts: ClauseFacts) => {
  const { selected, addenda, standaloneDisclosures } = selectClauses({ facts, library: FL_LIBRARY });

  return [...selected, ...addenda, ...standaloneDisclosures].map((c) => c.slug);
};

const bySlug = (slug: string) => {
  const clause = FL_LIBRARY.find((c) => c.slug === slug);

  if (!clause) {
    throw new Error(`no clause ${slug}`);
  }

  return clause;
};

describe('the non-waivable half of §83.51', () => {
  it('states the landlord obligation on every property type', () => {
    for (const propertyType of ['single-family', 'duplex', 'multi-family', 'condo'] as const) {
      expect(allSlugs({ ...SINGLE_FAMILY, propertyType })).toContain('maintenance.landlord-statutory');
    }
  });

  it('is not superseded by anything in the library', () => {
    // If any clause could displace the §83.51(1) statement, the lease could be
    // drafted to look as though the obligation had been shifted. Nothing may.
    const supersedersOfStatutory = FL_LIBRARY.filter((c) => c.supersedes.includes('maintenance.landlord-statutory'));

    expect(supersedersOfStatutory).toEqual([]);
  });
});

describe('the alterable half of §83.51, and where it may be altered', () => {
  it('offers the maintenance shift on a single-family home', () => {
    expect(allSlugs(SINGLE_FAMILY)).toContain('maintenance.shift-single-family');
  });

  it('offers it on a duplex', () => {
    expect(allSlugs({ ...SINGLE_FAMILY, propertyType: 'duplex' })).toContain('maintenance.shift-single-family');
  });

  it('withholds it on a condo', () => {
    expect(allSlugs({ ...SINGLE_FAMILY, propertyType: 'condo' })).not.toContain('maintenance.shift-single-family');
  });

  it('withholds it on a multi-family unit', () => {
    expect(allSlugs({ ...SINGLE_FAMILY, propertyType: 'multi-family' })).not.toContain(
      'maintenance.shift-single-family',
    );
  });
});

describe('the tenant repair threshold', () => {
  it('is available only where §83.51(2) may be modified', () => {
    expect(allSlugs(SINGLE_FAMILY)).toContain('maintenance.tenant-repair-threshold');
    expect(allSlugs({ ...SINGLE_FAMILY, propertyType: 'condo' })).not.toContain('maintenance.tenant-repair-threshold');
  });

  it('carves the non-waivable obligations back out', () => {
    // The 2026 lease's clause A made the tenant responsible for "any item,
    // system, or component within the Premises" under $150 — wide enough to
    // read onto the roof and the plumbing, which cannot be shifted. The
    // replacement must say so on its face.
    const threshold = bySlug('maintenance.tenant-repair-threshold');

    expect(threshold.body).toContain('83.51(1)');
    expect(threshold.requiredBy).toBeUndefined();
    expect(threshold.asserts).toContain('tenant-repair-threshold');
  });

  it('exposes the threshold as a variable rather than baking in a figure', () => {
    const names = bySlug('maintenance.tenant-repair-threshold').variables.map((v) => v.name);

    expect(names).toContain('repairThresholdUsd');
  });
});

describe('pool and lawn', () => {
  it('includes the pool split only where there is a pool', () => {
    expect(allSlugs(SINGLE_FAMILY)).toContain('maintenance.pool-split');
    expect(allSlugs({ ...SINGLE_FAMILY, hasPool: false })).not.toContain('maintenance.pool-split');
  });

  /*
    The gate used to be "does the landlord provide lawn service", which decided
    the ALLOCATION as well as the presence of the clause: off meant no clause,
    and a yard nobody had been made responsible for. It is now simply "has
    anything been allocated".
  */
  it('includes the lawn split only where something has been allocated', () => {
    expect(allSlugs(SINGLE_FAMILY)).toContain('maintenance.lawn-split');
    expect(allSlugs({ ...SINGLE_FAMILY, hasYardAllocation: false })).not.toContain('maintenance.lawn-split');
  });

  it('no longer hard-codes who mows, since that is now an answer', () => {
    const clause = FL_LIBRARY.find((entry) => entry.slug === 'maintenance.lawn-split');

    expect(clause?.body).toContain('{{yardDuties}}');
    expect(clause?.body).not.toMatch(/Landlord shall provide lawn mowing/);
  });
});

describe('pets', () => {
  it('attaches a pet addendum when pets are permitted', () => {
    expect(allSlugs(SINGLE_FAMILY)).toContain('pets.addendum');
  });

  it('omits it entirely when they are not', () => {
    // Not "no pets are permitted under this addendum" — no addendum at all.
    expect(allSlugs({ ...SINGLE_FAMILY, petsPermitted: false })).not.toContain('pets.addendum');
  });

  it('places the pet terms in an addendum rather than the body', () => {
    expect(bySlug('pets.addendum').placement).toBe('addendum');
  });

  it('carves out assistance animals', () => {
    // A pet clause that does not distinguish an assistance animal is a fair
    // housing problem, not merely an incomplete one.
    expect(bySlug('pets.addendum').body.toLowerCase()).toContain('assistance');
  });
});

/*
  This clause used to carry three figures: a lockout fee, a key fee expressed as
  a floor "or the actual cost if greater", and a charge for refusing an
  inspection. All three are gone — see out-of-state-landlord.test.ts for why
  each one failed. What remains is a cost, not a tariff, so there is no amount
  to ask for and nothing to characterise as rent.
*/
describe('administrative charges', () => {
  it('charges a documented cost rather than a schedule of figures', () => {
    const fees = bySlug('fees.administrative');

    expect(fees.variables).toEqual([]);
    expect(fees.body).toMatch(/actual documented cost/i);
  });

  it('does not dress a cost up as rent', () => {
    // Calling everything rent turns a key dispute into a three-day notice.
    expect(bySlug('fees.administrative').body).not.toContain('additional rent');
  });
});

describe('maintenance.storm does not pay for damage the tenant caused', () => {
  const storm = () => {
    const clause = FL_LIBRARY.find((c) => c.slug === 'maintenance.storm');
    if (!clause) {
      throw new Error('maintenance.storm is missing');
    }
    return clause;
  };

  /*
    THE SENTENCE THAT ATE THE ONE BEFORE IT. The clause tells the tenant to
    bring the patio furniture in, and then says, without qualification, that
    "Landlord is responsible for the cost of storm damage".

    Read literally that covers the garden table the tenant left out, which then
    went through the window — the exact failure the preceding sentence exists
    to prevent. A duty whose breach costs the tenant nothing is not a duty.

    Bounded, not reversed: the landlord still carries ordinary storm damage,
    which is the point of the clause and is where §83.63 puts the risk anyway.
  */
  it('carves out damage caused by the tenant ignoring this clause', () => {
    const { body } = storm();

    expect(body).toMatch(/except to the extent/i);
    expect(body).toMatch(/Tenant'?s failure to comply/i);
  });

  it('still puts ordinary storm damage and debris on the landlord', () => {
    const { body } = storm();

    expect(body).toMatch(/Landlord is responsible for the cost of storm damage/i);
    expect(body).toMatch(/removal of storm debris/i);
  });

  /*
    NOBODY WAS TOLD TO PUT THE SHUTTERS UP. "Close and secure windows and
    doors" does not reach accordion shutters, panels or fabric screens, and the
    tenant is the only person at the property — this landlord is in North
    Carolina. Conditional prose rather than a new fact: a house without
    shutters simply never satisfies the condition.
  */
  it('assigns storm shutters, and their removal afterwards', () => {
    const { body } = storm();

    expect(body).toMatch(/shutters, panels or screens/i);
    expect(body).toMatch(/Tenant shall deploy them/i);
    expect(body).toMatch(/remove them/i);
  });

  /*
    And the two protections that were already right must survive the edit.
  */
  it('keeps the emergency suspension and §83.63', () => {
    const { body } = storm();

    expect(body).toMatch(/declared state of emergency/i);
    expect(body).toMatch(/83\.63/);
  });
});

describe('fees.administrative does not charge for a device it never replaces', () => {
  const fees = () => {
    const clause = FL_LIBRARY.find((c) => c.slug === 'fees.administrative');
    if (!clause) {
      throw new Error('fees.administrative is missing');
    }
    return clause;
  };

  /*
    "EACH KEY, REMOTE OR ACCESS DEVICE" SWEPT IN SOMEBODY ELSE'S PROPERTY.

    An association amenity card is not the landlord's to replace. Estancia's
    district says so in terms — "Facility Access Cards are the property of the
    District" — and its manager confirmed the cards simply deactivate at the
    end of the lease term. So the landlord incurs no replacement cost, and a
    clause charging the "actual documented cost of replacing" one charges a
    cost that does not exist. Meanwhile the charge that DOES exist, the
    association's own fee for a card not handed back, went unallocated.

    Generic wording: this clause is selected in North Carolina too, so it says
    "an association or other community body" rather than naming a Florida
    community development district.
  */
  it('carves out a device the association issued', () => {
    const { body } = fees();

    expect(body).toMatch(/association or other community body/i);
    expect(body).toMatch(/remains that body\u2019s property/i);
  });

  it('routes the surrender and the charge to that body instead', () => {
    const { body } = fees();

    expect(body).toMatch(/surrender it as that body requires/i);
    expect(body).toMatch(/pay any charge it makes/i);
  });

  it("still charges the landlord's own keys at documented cost", () => {
    const { body } = fees();

    expect(body).toMatch(/actual documented cost of replacing/i);
    expect(body).toMatch(/re-keying/i);
  });
});
