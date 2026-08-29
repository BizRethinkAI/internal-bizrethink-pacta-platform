import { describe, expect, it } from 'vitest';

import type { CustomClauseInput } from '../clauses/custom';
import { scanCustomClauses } from '../engine/guardrails';
import { FL_NON_WAIVABLE } from '../rule-packs/us-fl-non-waivable';

/**
 * Guardrails on clauses the landlord writes themselves.
 *
 * THE ASYMMETRY DECIDES THE DESIGN. A false "this clause is fine" is far worse
 * than no check at all, because it manufactures confidence. So this scan is
 * built to be loud about what it matched and honest about what it cannot know:
 * it reports the statutory rule and the words it found, and lets a human draw
 * the conclusion. It never says a clause is void — that is a judgment about a
 * specific provision, which is the line this project holds everywhere.
 *
 * TWO TIERS, because a keyword scan cannot tell a waiver from a restatement.
 * "Tenant waives all rights under Chapter 83" is unambiguous and blocks.
 * "Landlord may enter to inspect" is merely in territory the statute governs,
 * and only warns — a clause that RESTATES a protection would otherwise be
 * blocked for protecting the tenant, which would teach people to ignore it.
 */

const clause = (body: string, heading = 'Custom clause'): CustomClauseInput => ({
  heading,
  body,
  section: 'general',
  asserts: [],
});

const scan = (body: string) =>
  scanCustomClauses({ clauses: [clause(body)], facts: {} as never, values: {}, pack: FL_NON_WAIVABLE });

describe('explicit waivers block', () => {
  it('catches a blanket waiver of Part II rights', () => {
    const findings = scan('Tenant waives all rights and remedies under Chapter 83, Part II.');

    expect(findings.some((f) => f.severity === 'blocks')).toBe(true);
    expect(findings[0].citation).toMatch(/83\.47/);
  });

  it('catches "hereby waives"', () => {
    expect(scan('Tenant hereby waives any right to withhold rent.').some((f) => f.severity === 'blocks')).toBe(true);
  });

  it('catches an attempt to limit the landlord’s liability', () => {
    const findings = scan('Landlord shall not be liable for any damages arising under law.');

    expect(findings.some((f) => f.severity === 'blocks')).toBe(true);
  });

  it('states the statutory rule and the words it matched, not a verdict', () => {
    const finding = scan('Tenant waives all rights under Chapter 83.')[0];

    expect(finding.statute).toMatch(/83\.47/);
    expect(finding.matched.join(' ').toLowerCase()).toContain('waives');
    // Never a conclusion about this clause.
    expect(`${finding.statute} ${finding.message}`.toLowerCase()).not.toMatch(
      /this clause is (void|invalid)|you should|we recommend/,
    );
  });
});

describe('a negation flips the meaning entirely', () => {
  /*
    The single most important distinction this scan makes, and the one a
    keyword match gets wrong by default. Caught by these tests during
    development: an earlier "does this clause read protectively?" heuristic
    was broad enough to downgrade "Landlord shall not be liable for any
    damages" — which is not a protection, it is the waiver formula itself.
  */
  it('does not block a clause that DISCLAIMS a waiver', () => {
    const findings = scan('Tenant does not waive any rights under Chapter 83.');

    expect(findings.every((f) => f.severity !== 'blocks')).toBe(true);
  });

  it('still blocks "shall not be liable", whose "not" is part of the waiver', () => {
    const findings = scan('Landlord shall not be liable for any damages arising under law.');

    expect(findings.some((f) => f.severity === 'blocks')).toBe(true);
  });

  it('still reports the negated clause, because the subject still matters', () => {
    expect(scan('Tenant does not waive any rights under Chapter 83.').length).toBeGreaterThan(0);
  });
});

describe('statutory territory warns rather than blocks', () => {
  it('warns when a clause touches utility interruption', () => {
    const findings = scan('Landlord may discontinue water service if rent is late.');

    expect(findings.some((f) => f.citation.includes('83.67'))).toBe(true);
  });

  it('warns when a clause touches lock changes', () => {
    expect(scan('Landlord may change the locks upon default.').length).toBeGreaterThan(0);
  });

  it('does NOT block a clause that restates a protection', () => {
    // The critical false positive. A clause protecting the tenant must not be
    // blocked for mentioning the same subject the statute governs.
    const findings = scan('Landlord shall not change the locks or interrupt any utility service.');

    expect(findings.every((f) => f.severity !== 'blocks')).toBe(true);
  });

  it('says nothing about an ordinary clause', () => {
    expect(scan('Landlord shall replace the pool pump when it fails in ordinary use.')).toEqual([]);
  });

  it('says nothing about a clause on a subject the statute does not reserve', () => {
    expect(scan('Tenant shall change the air filter monthly at Tenant’s expense.')).toEqual([]);
  });
});

describe('non-waivable maintenance duties', () => {
  it('flags an attempt to shift the building-code obligation', () => {
    // §83.51(1) is not among the duties a lease may reassign, even for a
    // single-family home — only §83.51(2)(a) duties can be.
    const findings = scan('Tenant is responsible for compliance with all applicable building and housing codes.');

    expect(findings.some((f) => f.citation.includes('83.51'))).toBe(true);
  });
});

describe('contradiction with the answers already given', () => {
  const withFacts = (body: string, facts: Record<string, unknown>, values: Record<string, unknown> = {}) =>
    scanCustomClauses({
      clauses: [clause(body)],
      facts: facts as never,
      values: values as never,
      pack: FL_NON_WAIVABLE,
    });

  it('catches "no pets" when the interview permitted pets', () => {
    const findings = withFacts('No pets of any kind are permitted on the premises.', { petsPermitted: true });

    expect(findings.some((f) => f.ruleId === 'contradiction.pets')).toBe(true);
  });

  it('catches a clause permitting pets when the interview did not', () => {
    const findings = withFacts('Tenant may keep one dog under 40 pounds.', { petsPermitted: false });

    expect(findings.some((f) => f.ruleId === 'contradiction.pets')).toBe(true);
  });

  it('says nothing when the clause agrees with the answers', () => {
    expect(withFacts('Tenant may keep one dog under 40 pounds.', { petsPermitted: true })).toEqual([]);
  });

  it('catches a monthly rent figure that disagrees with the answered rent', () => {
    const findings = withFacts('The monthly rent shall be $5,000.00.', {}, { monthlyRentUsd: 6900 });

    expect(findings.some((f) => f.ruleId === 'contradiction.rent')).toBe(true);
    expect(findings[0].message).toMatch(/6,900|6900/);
  });

  it('ignores a figure that is not being called the monthly rent', () => {
    // A late fee, a key charge, a pet fee — all legitimately different numbers.
    expect(withFacts('A late fee of $100.00 applies.', {}, { monthlyRentUsd: 6900 })).toEqual([]);
  });

  it('accepts a monthly rent figure that matches', () => {
    expect(withFacts('The monthly rent shall be $6,900.00.', {}, { monthlyRentUsd: 6900 })).toEqual([]);
  });
});

describe('reporting', () => {
  it('attributes every finding to the clause it came from', () => {
    const findings = scanCustomClauses({
      clauses: [clause('Nothing unusual here.', 'A'), clause('Tenant waives all rights under Chapter 83.', 'B')],
      facts: {} as never,
      values: {},
      pack: FL_NON_WAIVABLE,
    });

    expect(findings).toHaveLength(1);
    expect(findings[0].clauseHeading).toBe('B');
  });

  it('reports every rule a clause trips, not just the first', () => {
    const findings = scan('Tenant waives all rights, and Landlord may shut off electricity and change the locks.');

    expect(new Set(findings.map((f) => f.ruleId)).size).toBeGreaterThan(1);
  });
});
