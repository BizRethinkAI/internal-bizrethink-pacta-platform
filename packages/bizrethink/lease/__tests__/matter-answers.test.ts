import { describe, expect, it } from 'vitest';

import { hydrateMatter } from '../server-only/matter-answers';

/**
 * Turning a stored matter back into a full answer set.
 *
 * This exists because the mapping was duplicated — once in the tRPC router and
 * once in the preview route — and the copies drifted the moment the party list
 * landed. The preview kept building its signers from `values.landlordNames`,
 * a variable that is now DERIVED from the party list rather than stored, so
 * every preview rendered "LANDLORD — TO BE CONFIRMED" no matter who was
 * actually signing.
 *
 * One function, three callers: the router, the landlord's preview, and the
 * reviewer's copy. A reviewer reading a different document from the one the
 * landlord previewed would defeat the entire point of a review.
 */

const matter = {
  facts: { propertyType: 'single-family', petsPermitted: false },
  money: {
    rent: { monthlyUsd: 6900, dueDayOfMonth: 1 },
    term: { startDate: '2026-09-01' },
    deposit: { securityUsd: 6900, alreadyHeldUsd: 0, advanceRentUsd: 6900, advanceRentHeldUsd: 0, prepaidRentUsd: 0 },
    prorationMethod: 'actual-days-in-month',
  },
  values: { endDate: '2027-08-31', propertyAddress: '29090 Picana Ln' },
  customClauses: [],
  parties: [
    { name: 'Shwet Prabhat', role: 'landlord', email: 'a@example.com' },
    { name: 'Tenant One', role: 'tenant', email: 'b@example.com' },
    { name: 'Tenant Two', role: 'tenant', email: 'c@example.com' },
  ],
};

describe('hydrateMatter', () => {
  it('derives the party name variables from the party list, not from stored values', () => {
    const { values } = hydrateMatter(matter);

    expect(values.landlordNames).toBe('Shwet Prabhat');
    expect(values.tenantNames).toBe('Tenant One and Tenant Two');
  });

  it('produces render parties in stored order, because recipient numbering is positional', () => {
    expect(hydrateMatter(matter).parties.map((p) => p.name)).toEqual(['Shwet Prabhat', 'Tenant One', 'Tenant Two']);
  });

  it('never leaks a signing email into the rendered document', () => {
    for (const party of hydrateMatter(matter).parties) {
      expect(Object.keys(party)).toEqual(['name', 'role']);
    }
  });

  it('recomputes derived money rather than trusting what was stored', () => {
    // A stored derived value is one that can go stale. Editing the rent must
    // not leave a persisted top-up stating a figure that no longer follows
    // from its own inputs — the exact defect this feature exists to prevent.
    const stale = { ...matter, values: { ...matter.values, monthlyRentUsd: 1 } };

    expect(hydrateMatter(stale).values.monthlyRentUsd).toBe(6900);
  });

  it('carries the rent due day through as a value', () => {
    expect(hydrateMatter(matter).values.rentDueDay).toBe(1);
  });

  it('survives a matter saved before the party list existed', () => {
    // Rows created before the parties column default to []. They must hydrate
    // to empty names rather than throwing, so the interview still loads and
    // the parties step can be filled in.
    const legacy = { ...matter, parties: [] };

    expect(hydrateMatter(legacy).values.landlordNames).toBe('');
    expect(hydrateMatter(legacy).parties).toEqual([]);
  });

  it('tolerates a null parties column', () => {
    expect(hydrateMatter({ ...matter, parties: null }).parties).toEqual([]);
  });
});
