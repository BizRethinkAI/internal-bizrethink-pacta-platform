import { describe, expect, it } from 'vitest';

import { FL_LIBRARY } from '../clauses/us-fl';

const clause = (slug: string) => FL_LIBRARY.find((c) => c.slug === slug);
const body = (slug: string) => clause(slug)?.body ?? '';

/*
  THE REPAIR THRESHOLD HAD NO CEILING.

  "minor repairs ... where the cost of the individual repair does not exceed
  $150" is per-repair. Ten $140 repairs is $1,400 in a year, each of them
  individually minor, and nothing said otherwise. Both adversarial reviews
  flagged it, and neither could tell from the text whether one failed appliance
  could be billed as three repairs.

  Two limits, chosen by the landlord: an annual ceiling, and a rule that one
  defect is one repair.
*/
describe('the repair obligation has a ceiling', () => {
  it('caps the year, not just the item', () => {
    expect(body('maintenance.tenant-repair-threshold')).toMatch(/\{\{repairAnnualCapUsd\}\}/);
  });

  it('says one defect is one repair', () => {
    // Otherwise a $400 appliance failure becomes three $135 "minor" repairs.
    expect(body('maintenance.tenant-repair-threshold')).toMatch(/single defect|one defect/i);
  });

  it('asks for the cap as its own answer', () => {
    const names = clause('maintenance.tenant-repair-threshold')?.variables.map((v) => v.name) ?? [];

    expect(names).toContain('repairAnnualCapUsd');
  });

  it("still carves out §83.51(1), which is not the landlord's to shift", () => {
    expect(body('maintenance.tenant-repair-threshold')).toMatch(/§83\.51\(1\)/);
  });
});

/*
  TERMITES ARE NOT SOMETHING A TENANT CAUSES.

  §83.51(2)(a)4 lets a single-family landlord shift the whole list — rats, mice,
  roaches, ants, wood-destroying organisms, bedbugs. Lawful, and both reviews
  called it unreasonable: termite treatment is structural, often preexisting,
  frequently thousands of dollars, and never the tenant's doing.

  The statutory list stays intact where it is shifted; wood-destroying organisms
  come back to the landlord explicitly, so there is nothing to argue about.
*/
describe('wood-destroying organisms stay with the landlord', () => {
  it('is not in the list shifted to the tenant', () => {
    // The enumeration of what Tenant takes, up to the full stop. Termites are
    // named after it, as Landlord's — so the phrase appears; the point is WHERE.
    const shifted = body('maintenance.shift-single-family').split('being extermination of')[1]?.split('.')[0] ?? '';

    expect(shifted).toMatch(/rats/i);
    expect(shifted).not.toMatch(/wood-destroying organisms/i);
  });

  it("is named as the landlord's, rather than merely omitted", () => {
    // Silence would leave it arguable. It is said.
    expect(body('maintenance.shift-single-family')).toMatch(
      /wood-destroying organisms[^.]*Landlord|Landlord[^.]*wood-destroying organisms/i,
    );
  });

  it('keeps the rest of the statutory list with the tenant', () => {
    for (const pest of ['rats', 'mice', 'roaches', 'ants', 'bedbugs']) {
      expect(body('maintenance.shift-single-family')).toMatch(new RegExp(pest, 'i'));
    }
  });
});

/*
  A STORM CLAUSE, BECAUSE THE STATUTE STOPS SHORT.

  §83.63 gives the tenant termination and rent abatement when the premises are
  damaged — read on 2026-09-04, and it is complete on that question, so a
  casualty clause would add nothing.

  What it says NOTHING about is who acts before and after. Verified: the section
  contains no provision on securing the property, clearing debris, or preparing
  for a storm. On a Florida property with a pool and a tenant-maintained yard
  that gap has an owner by default — the HOA cure clause, which gives the tenant
  fourteen days and a bill for fronds a hurricane brought down.
*/
describe('storm preparation and debris are allocated', () => {
  const storm = clause('maintenance.storm');

  it('exists', () => {
    expect(storm).toBeDefined();
  });

  it('asks the tenant only for what a tenant can do', () => {
    expect(storm?.body).toMatch(/secure|bring in/i);
    expect(storm?.body).toMatch(/outdoor furniture|loose/i);
  });

  it('puts storm debris and damage on the landlord', () => {
    expect(storm?.body).toMatch(/Landlord[^.]*(debris|damage)/i);
  });

  it('suspends the yard and association duties while an emergency is declared', () => {
    // Otherwise the tenant is in breach of a trimming obligation during a
    // hurricane, and the association clause bills him for it.
    expect(storm?.body).toMatch(/suspend|does not apply/i);
    expect(storm?.body).toMatch(/emergency/i);
  });

  it('does not restate §83.63, which is complete without us', () => {
    expect(storm?.body).not.toMatch(/may terminate this Lease and immediately vacate/i);
  });
});
