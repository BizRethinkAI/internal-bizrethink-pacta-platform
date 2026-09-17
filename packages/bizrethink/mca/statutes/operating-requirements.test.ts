import { describe, expect, it } from 'vitest';

import { MCA_JURISDICTIONS } from '../jurisdictions';
import { CT_VA_OBLIGATIONS } from './ct-va-obligations';
import { operatingRequirementsFor, statesWithoutAnOperatingRecord } from './operating-requirements';

/**
 * What a state requires of a funder who wants to operate there.
 *
 * ADR 0025 decision 2 put this in scope: the vertical is custodian of the
 * changing landscape around merchant cash advance, and a registration duty is
 * part of that landscape even though it lives in no document the builder
 * produces.
 *
 * QUOTED, NEVER ADVISED. The same discipline the disclosures already run under
 * (ADR 0008): verbatim from a vendored source, cited to section, re-matched on
 * every run, and **verified, never approved**. It reports what the statute says.
 * It does not tell anybody what to do, and nothing here refuses anything —
 * choosing to operate in a state is the entity's decision.
 */

describe('what a programme’s states require of the funder', () => {
  it('returns the registration duties for a state that has them', () => {
    const virginia = operatingRequirementsFor(['US-VA']);

    expect(virginia.length).toBeGreaterThan(0);

    for (const requirement of virginia) {
      expect(requirement.jurisdiction).toBe('US-VA');
      expect(requirement.bearsOn).toBe('registration');
      expect(requirement.citation).toMatch(/Va\. Code/);
    }
  });

  it('carries the statute’s own words, not a summary of them', () => {
    const [first] = operatingRequirementsFor(['US-VA']);
    const source = CT_VA_OBLIGATIONS.find((obligation) => obligation.id === first.id);

    expect(first.text).toBe(source?.text);
    expect(first.text.length).toBeGreaterThan(80);
  });

  it('answers for several states at once, in a stable order', () => {
    const both = operatingRequirementsFor(['US-VA', 'US-CT']);
    const reversed = operatingRequirementsFor(['US-CT', 'US-VA']);

    expect(both.map((requirement) => requirement.id)).toEqual(reversed.map((requirement) => requirement.id));
    expect(new Set(both.map((requirement) => requirement.jurisdiction))).toEqual(new Set(['US-CT', 'US-VA']));
  });

  it('reports only registration duties, not every obligation in the statute', () => {
    const everything = operatingRequirementsFor(['US-CT', 'US-VA']);

    expect(everything.every((requirement) => requirement.bearsOn === 'registration')).toBe(true);
    expect(everything.length).toBeLessThan(CT_VA_OBLIGATIONS.length);
  });
});

/**
 * THE SILENCE IS THE DANGEROUS PART, and this is the half that matters most.
 *
 * A programme declaring California gets an empty list. Empty could mean "this
 * state asks nothing of you" or "we have not looked" — and those are opposite
 * facts with opposite consequences. The library holds registration text for two
 * states, so for the other nine it must say so out loud rather than return
 * nothing and let the reader infer.
 */
describe('a state we hold no record for says so', () => {
  it('names every state the library cannot answer for', () => {
    expect(statesWithoutAnOperatingRecord(['US-CA', 'US-VA', 'US-NY'])).toEqual(['US-CA', 'US-NY']);
  });

  it('is empty only when every state asked about is covered', () => {
    expect(statesWithoutAnOperatingRecord(['US-CT', 'US-VA'])).toEqual([]);
  });

  /**
   * Pinned, so extending coverage is a visible diff rather than something that
   * quietly happens. Nine of eleven states have no registration record today.
   */
  it('holds a registration record for two of the eleven states', () => {
    const covered = MCA_JURISDICTIONS.filter((state) => operatingRequirementsFor([state]).length > 0);

    expect(covered).toEqual(['US-CT', 'US-VA']);
    expect(statesWithoutAnOperatingRecord(MCA_JURISDICTIONS)).toHaveLength(9);
  });

  it('asks about nothing and gets nothing, rather than everything', () => {
    expect(operatingRequirementsFor([])).toEqual([]);
    expect(statesWithoutAnOperatingRecord([])).toEqual([]);
  });
});
