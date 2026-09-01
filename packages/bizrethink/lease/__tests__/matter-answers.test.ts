import { readFileSync } from 'node:fs';

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
  /*
    Utilities were SEEDED into `values` at matter creation and then editable as
    two free-text boxes. Three things followed, and a real lease hit all three:

      - a matter created before the property had utilities kept two empty
        required boxes forever, and adding the utilities to the property
        afterwards could not reach it;
      - the two boxes could be edited into disagreeing about who pays for what,
        which is the defect the property rows were introduced to remove;
      - the property row set and the lease prose could drift with nothing able
        to notice.

    Derived from the property now, on every read. Unlike the party list, no
    order here is load-bearing and nothing is signed positionally, so there is
    no reason to freeze a copy at creation.
  */
  it('derives both utility lists from the property, not from stored values', () => {
    const { values } = hydrateMatter({
      ...matter,
      values: { ...matter.values, tenantUtilities: 'whatever was typed here in March' },
      propertyUtilities: [
        { service: 'electricity', provider: 'Withlacoochee', phone: '', paidBy: 'tenant' },
        { service: 'trash collection', provider: 'Coastal', phone: '', paidBy: 'landlord' },
      ],
    });

    expect(values.tenantUtilities).toBe('electricity (Withlacoochee)');
    expect(values.landlordUtilities).toBe('trash collection (Coastal)');
    expect(values.tenantUtilities).not.toContain('March');
  });

  it('never puts a utility on both sides or on neither', () => {
    const { values } = hydrateMatter({
      ...matter,
      propertyUtilities: [{ service: 'water', provider: '', phone: '', paidBy: 'tenant' }],
    });

    expect(values.tenantUtilities).toBe('water');
    // 'none' rather than empty: the clause interpolates this mid-sentence.
    expect(values.landlordUtilities).toBe('none');
  });

  it('says "none" rather than leaving a required variable unfilled', () => {
    const { values } = hydrateMatter({ ...matter, propertyUtilities: [] });

    expect(values.tenantUtilities).toBe('none');
    expect(values.landlordUtilities).toBe('none');
  });

  /*
    Yard duty was a boolean with the split hard-coded in the clause. It is rows
    now, and BOTH the clause's gate and its prose are re-derived here rather
    than stored — a stored copy would survive an edit to the rows and print an
    allocation nobody agreed.
  */
  it('derives the yard clause gate from the rows', () => {
    expect(hydrateMatter(matter).facts.hasYardAllocation).toBe(false);

    const allocated = hydrateMatter({
      ...matter,
      yardTasks: [{ task: 'Mowing and edging', doneBy: 'tenant', frequency: '', notes: '' }],
    });

    expect(allocated.facts.hasYardAllocation).toBe(true);
  });

  it('derives the yard prose, and ignores a stale stored copy of it', () => {
    const { values } = hydrateMatter({
      ...matter,
      values: { ...matter.values, yardDuties: 'Landlord shall do absolutely everything.' },
      yardTasks: [{ task: 'Palm and tree trimming', doneBy: 'tenant', frequency: '', notes: '' }],
    });

    expect(values.yardDuties).toContain('Tenant shall');
    expect(values.yardDuties).not.toContain('absolutely everything');
  });

  /*
    An unassigned row is not an allocation. Gating on "are there rows" rather
    than "is anything allocated" would render the clause with no duties in it.
  */
  it('does not open the clause for rows nobody has been given', () => {
    const { facts } = hydrateMatter({
      ...matter,
      yardTasks: [{ task: 'Mowing and edging', doneBy: '', frequency: '', notes: '' }],
    });

    expect(facts.hasYardAllocation).toBe(false);
  });

  it('tolerates a matter stored before the column existed', () => {
    expect(hydrateMatter({ ...matter, yardTasks: null }).facts.hasYardAllocation).toBe(false);
  });

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

/**
 * ONE derivation, not two.
 *
 * The doc comment on matter-answers.ts says the mapping used to live in both
 * the tRPC router and the preview route, and that the copies drifted. It did
 * not say that the router's copy was still there — it was, and it derived the
 * party variables itself while the preview called hydrateMatter.
 *
 * That is invisible until a derived value is added to one and not the other,
 * at which point the landlord previews one document and the signers receive a
 * different one. Source-level because the router needs a database to run and
 * this needs to fail on the commit that reintroduces the copy.
 */
describe('the router does not keep its own copy of the derivation', () => {
  const router = readFileSync(new URL('../../server-only/trpc/lease-builder-router.ts', import.meta.url), 'utf8');

  it('delegates to hydrateMatter', () => {
    expect(router).toMatch(/import\s*{[^}]*hydrateMatter[^}]*}\s*from/);
  });

  it('does not derive party values a second time', () => {
    expect(router).not.toMatch(/derivePartyValues\s*\(/);
  });

  it('does not derive the yard prose a second time', () => {
    expect(router).not.toMatch(/renderYardDuties\s*\(/);
  });
});

/**
 * Every render path supplies the property.
 *
 * There are three: the landlord's preview, the reviewer's copy, and the tRPC
 * router that actually sends. The reviewer's is the one that matters most —
 * a lawyer marking up a document that differs from the one being signed is
 * worse than no review at all — and it is also the one most easily forgotten,
 * because it lives in `_recipient+` rather than next to the other two.
 *
 * Utilities are read live from the property, so a caller that does not pass
 * them renders a lease whose utility clause says "none" on both sides.
 */
describe('the render paths', () => {
  const routes = [
    'apps/remix/app/routes/_authenticated+/t.$teamUrl+/leases.$id.preview.tsx',
    'apps/remix/app/routes/_recipient+/lease-review.$token.document.tsx',
  ];

  for (const route of routes) {
    it(`${route.split('/').pop()} passes the property's utilities`, () => {
      const body = readFileSync(new URL(`../../../../${route}`, import.meta.url), 'utf8');

      expect(body).toContain('renderInputForMatter');
      expect(body).toMatch(/propertyUtilities:/);
    });
  }
});
