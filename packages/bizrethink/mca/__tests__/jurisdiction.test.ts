import { describe, expect, it } from 'vitest';
import { MCA_JURISDICTIONS, type McaJurisdiction } from '../jurisdictions';
import { disclosuresFor, MCA_DISCLOSURES } from '../registry';

/*
  INVARIANT 2 — no state's text can reach another state's document.

  Not hypothetical. Our California disclosure shipped to production carrying
  New York's phrasing of a prescribed sentence, inside a row 10 CCR §914 closes
  with "shall include only". It survived a human reading both regulations side
  by side. The filter below is what makes a twelfth state safe to add rather
  than a twelfth chance to make the same mistake.

  Modelled on `lease/clauses/library.ts`'s `libraryFor`, read for shape only —
  a merchant-cash-advance package must not import from a rental-lease package.
*/

const pairs = MCA_JURISDICTIONS.flatMap((a) =>
  MCA_JURISDICTIONS.filter((b) => b !== a).map((b) => [a, b] as [McaJurisdiction, McaJurisdiction]),
);

describe('the jurisdiction axis filters', () => {
  it.each(MCA_JURISDICTIONS)('%s returns only its own specs', (jurisdiction) => {
    const got = disclosuresFor(jurisdiction);

    expect(got.length).toBeGreaterThan(0);
    expect(got.every((d) => d.jurisdiction === jurisdiction)).toBe(true);
  });

  it('every spec is reachable from exactly one jurisdiction', () => {
    for (const spec of MCA_DISCLOSURES) {
      const reachable = MCA_JURISDICTIONS.filter((j) => disclosuresFor(j).some((d) => d.slug === spec.slug));

      expect(reachable).toEqual([spec.jurisdiction]);
    }
  });

  it('the eleven jurisdictions and the eleven specs are the same eleven', () => {
    expect([...MCA_DISCLOSURES].map((d) => d.jurisdiction).sort()).toEqual([...MCA_JURISDICTIONS].sort());
  });

  it.each(pairs)('nothing from %s is reachable from %s', (a, b) => {
    const from = new Set(disclosuresFor(a).map((d) => d.slug));

    expect(disclosuresFor(b).filter((d) => from.has(d.slug))).toEqual([]);
  });
});

/*
  INVARIANT 4 — "Lombard-specific" is not a jurisdiction.

  Federal, state, regulatory and generic are jurisdictional. Product- and
  tenant-specific are a different axis, and folding them together breaks the
  property that makes adding a state safe: `disclosuresFor` would stop being a
  statement about which law applies.
*/
describe('the axis is jurisdictional and nothing else', () => {
  it.each(MCA_JURISDICTIONS)('%s names a jurisdiction, not a product or a tenant', (jurisdiction) => {
    expect(jurisdiction).toMatch(/^US-[A-Z]{2}$/);
  });
});

/*
  The specific pair that shipped a defect. Four words: §914(a)(2)(C)(ii) says
  "on what amounts will be deducted"; §600.6(b) says "on the amounts that will
  be deducted". Pinned by their text rather than by a slug, because the defect
  was never a wrong slug — it was the right form carrying the wrong sentence.
*/
describe('California and New York cannot borrow each other’s words', () => {
  const textOf = (jurisdiction: McaJurisdiction) => JSON.stringify(disclosuresFor(jurisdiction));

  const CA_PHRASING = 'on what amounts will be deducted';
  const NY_PHRASING = 'on the amounts that will be deducted';

  it('California says what California prescribes', () => {
    expect(textOf('US-CA')).toContain(CA_PHRASING);
    expect(textOf('US-CA')).not.toContain(NY_PHRASING);
  });

  it('New York says what New York prescribes', () => {
    expect(textOf('US-NY')).toContain(NY_PHRASING);
    expect(textOf('US-NY')).not.toContain(CA_PHRASING);
  });

  /*
    They are structurally different forms, not one form with different strings.
    Anything that edits "the state disclosures" as a set is wrong by
    construction for these two — which is exactly how the defect got in: a
    sweep that was correct for nine states and unlawful in two.
  */
  it('are different tables, not one table twice', () => {
    const ca = disclosuresFor('US-CA')[0];
    const ny = disclosuresFor('US-NY')[0];

    if (!ca || !ny || !('rows' in ca) || !('rows' in ny)) {
      throw new Error('CA and NY are prescribed forms and should have rows');
    }

    expect(ca.rows).toHaveLength(10);
    expect(ny.rows).toHaveLength(11);
    expect(ny.rows.map((r) => r.label)).toContain('Collateral Requirements');
    expect(ca.rows.map((r) => r.label)).not.toContain('Collateral Requirements');
  });
});
