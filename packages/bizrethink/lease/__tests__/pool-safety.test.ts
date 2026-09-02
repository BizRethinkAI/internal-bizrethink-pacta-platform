import { describe, expect, it } from 'vitest';

import { FL_LIBRARY } from '../clauses/us-fl';
import { FL_NON_WAIVABLE } from '../rule-packs/us-fl-non-waivable';

const clause = (slug: string) => FL_LIBRARY.find((c) => c.slug === slug);

/*
  THE POOL.

  Two failures met in one paragraph. The clause disclaimed liability — void
  under §83.47(1)(b), and §83.47(2) lets the tenant recover damages AND fees
  where a landlord knowingly uses a void provision, so the sentence paid the
  other side's lawyer. And Chapter 515, which governs the safety feature that
  actually stops a drowning, appeared nowhere in the library at all: a grep for
  515, barrier and drowning returned nothing.

  A landlord who reads "at their own risk" believes he is covered and skips the
  real control. That is the harm — not the unenforceability.
*/
describe('the pool clause allocates duty, not risk', () => {
  it('never disclaims liability for the pool', () => {
    const pool = clause('maintenance.pool-split');

    expect(pool).toBeDefined();
    expect(pool?.body).not.toMatch(/at\s+(their|his|her|its)\s+own\s+risk/i);
    expect(pool?.body).not.toMatch(/assumes?\s+(all|any)\s+risk/i);
  });

  it('keeps the maintenance split that was always right', () => {
    const pool = clause('maintenance.pool-split');

    // Landlord pays the service and owns the equipment; tenant does the chores.
    expect(pool?.body).toMatch(/professional pool maintenance at Landlord's cost/);
    expect(pool?.body).toMatch(/pool pump, filtration/);
  });
});

describe('the Chapter 515 safety feature is named and protected', () => {
  const safety = clause('maintenance.pool-safety');

  it('exists, and only on a property with a pool', () => {
    expect(safety).toBeDefined();
    expect(safety?.includeWhen?.({ hasPool: true } as never)).toBe(true);
    expect(safety?.includeWhen?.({ hasPool: false } as never)).toBe(false);
  });

  it('cites the Act it implements', () => {
    expect(safety?.requiredBy).toMatch(/515/);
  });

  it('names the installed feature rather than describing pools in general', () => {
    // The feature varies by property, so it is a variable, not prose.
    expect(safety?.body).toMatch(/\{\{poolSafetyFeature\}\}/);
    expect(safety?.variables.map((v) => v.name)).toContain('poolSafetyFeature');
  });

  it('forbids defeating the feature, in the words people actually use', () => {
    const body = safety?.body ?? '';

    for (const word of ['disable', 'prop', 'obstruct']) {
      expect(body.toLowerCase()).toContain(word);
    }
  });

  it('keeps repair of the feature with the landlord', () => {
    expect(safety?.body).toMatch(/Landlord shall/);
  });

  it('requires the tenant to report a failure', () => {
    expect(safety?.body).toMatch(/report/i);
  });
});

/*
  The guard that should have caught the old sentence must now catch it, so a
  later edit cannot reintroduce it quietly.
*/
describe('the guard now sees the sentence it used to miss', () => {
  const liability = FL_NON_WAIVABLE.find((r) => r.id === 'non-waivable.liability');

  it('flags the exact clause text we shipped', () => {
    const shipped = "Tenant and Tenant's guests use the pool at their own risk.";

    expect((liability?.waiverSignals ?? []).some((s) => s.test(shipped))).toBe(true);
  });
});
