import { describe, expect, it } from 'vitest';
import type { SeedProperty } from '../server-only/seed-from-property';
import { seedMatterFromProperty } from '../server-only/seed-from-property';

/**
 * Opening a new lease with everything the property already knows.
 *
 * Six of the eight questions on the interview's old first step were already
 * answered by the property record, and the landlord and notice address were
 * being re-typed for every tenancy. This is what removes that.
 *
 * COPIED, NEVER REFERENCED. The seeded values are written onto the matter and
 * the matter is thereafter the only source. A lease that read its party list
 * live from the property would have its signers silently rewritten whenever
 * the property row was edited — and party order decides where signature fields
 * land, so the result is a lease countersigned by the wrong person with
 * nothing red anywhere. These tests pin that.
 */

const property: SeedProperty = {
  id: 'prop_1',
  label: '29090 Picana Ln',
  addressLine: '29090 Picana Lane',
  city: 'Wesley Chapel',
  state: 'FL',
  postalCode: '33543',
  county: 'Pasco',
  propertyType: 'single-family',
  yearBuilt: 2005,
  hasPool: true,
  hasHoa: true,
  hoaName: 'Estancia at Wiregrass Ranch',
  includedAppliances: 'refrigerator, oven and range',
  landlords: [
    { name: 'Shwet Prabhat', email: 'shwet@example.com' },
    { name: 'Ambika Prabhat', email: 'ambika@example.com' },
  ],
  noticeName: 'Shwet Prabhat',
  noticeAddress: '537 Lochaven Rd, Wesley Chapel, FL 33543',
};

describe('the landlord comes from the property', () => {
  it('seeds every landlord as a signing party', () => {
    const { parties } = seedMatterFromProperty(property);

    expect(parties).toEqual([
      { name: 'Shwet Prabhat', role: 'landlord', email: 'shwet@example.com' },
      { name: 'Ambika Prabhat', role: 'landlord', email: 'ambika@example.com' },
    ]);
  });

  it('seeds no tenant — that is the question the interview now opens with', () => {
    expect(seedMatterFromProperty(property).parties.every((p) => p.role === 'landlord')).toBe(true);
  });

  it('puts landlords first, so tenants appended later keep a stable order', () => {
    // Recipient placeholders are numbered positionally across this list, so
    // the order a lease starts in is the order signatures attach in.
    expect(seedMatterFromProperty(property).parties[0].role).toBe('landlord');
  });

  it('seeds the §83.50 notice name and address', () => {
    const { values } = seedMatterFromProperty(property);

    expect(values.noticeName).toBe('Shwet Prabhat');
    expect(values.noticeAddress).toBe('537 Lochaven Rd, Wesley Chapel, FL 33543');
  });

  it('copies rather than references, so later edits cannot reach a live lease', () => {
    const seeded = seedMatterFromProperty(property);

    // Mutating the source must not touch what was seeded.
    property.landlords.push({ name: 'Someone Else', email: 'x@example.com' });

    expect(seeded.parties).toHaveLength(2);

    property.landlords.pop();
  });
});

describe('the property facts that decide which clauses apply', () => {
  it('seeds the load-bearing facts', () => {
    const { facts } = seedMatterFromProperty(property);

    expect(facts.propertyType).toBe('single-family');
    expect(facts.propertyYearBuilt).toBe(2005);
    expect(facts.hasPool).toBe(true);
    expect(facts.hasHoa).toBe(true);
  });

  it('seeds the venue county, which decides where a proceeding is brought', () => {
    expect(seedMatterFromProperty(property).values.venueCounty).toBe('Pasco');
  });

  it('assembles the property address as one line', () => {
    expect(seedMatterFromProperty(property).values.propertyAddress).toBe('29090 Picana Lane, Wesley Chapel, FL 33543');
  });

  it('leaves an unknown year built as null rather than guessing', () => {
    // Null makes the federal lead-paint disclosure unconditional. A plausible
    // default would silently drop it.
    const unknown = seedMatterFromProperty({ ...property, yearBuilt: null });

    expect(unknown.facts.propertyYearBuilt).toBeNull();
  });
});

describe('what is deliberately left empty', () => {
  it('seeds no money at all', () => {
    const { money } = seedMatterFromProperty(property);

    expect(money.rent.monthlyUsd).toBeNull();
    expect(money.term.startDate).toBeNull();
    expect(money.deposit.securityUsd).toBeNull();
  });

  it('seeds zero for money already held, because zero is a real answer', () => {
    // Distinct from null. A new tenancy holds nothing; the held-versus-
    // collected split is the whole reason this feature exists.
    const { money } = seedMatterFromProperty(property);

    expect(money.deposit.alreadyHeldUsd).toBe(0);
    expect(money.deposit.advanceRentHeldUsd).toBe(0);
  });
});

describe('a property set up before landlords existed', () => {
  it('seeds no parties rather than throwing', () => {
    const legacy = { ...property, landlords: [], noticeName: null, noticeAddress: null };

    expect(seedMatterFromProperty(legacy).parties).toEqual([]);
  });

  it('leaves the notice fields unset so the interview still asks', () => {
    const legacy = { ...property, landlords: [], noticeName: null, noticeAddress: null };
    const { values } = seedMatterFromProperty(legacy);

    expect(values.noticeName ?? null).toBeNull();
  });
});
