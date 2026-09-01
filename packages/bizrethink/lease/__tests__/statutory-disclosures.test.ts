import { describe, expect, it } from 'vitest';
import type { ClauseFacts } from '../clauses/types';
import { assertPublishable } from '../clauses/types';
import { FL_STATUTORY_DISCLOSURES, RADON_STATUTORY_TEXT } from '../clauses/us-fl/statutory-disclosures';

/**
 * Tier 1 of the clause library: text the State of Florida and the federal
 * government prescribe. Public domain, and in several cases required verbatim —
 * Fla. Stat. §404.056(5) is not satisfied by a paraphrase.
 *
 * These are the clauses we can author with total confidence and no attorney,
 * which is why they come first.
 */

const bySlug = (slug: string) => {
  const clause = FL_STATUTORY_DISCLOSURES.find((c) => c.slug === slug);

  if (!clause) {
    throw new Error(`no clause ${slug}`);
  }

  return clause;
};

const facts = (overrides: Partial<ClauseFacts> = {}): ClauseFacts => ({
  termMonths: 12,
  depositHeldUsd: 6900,
  advanceRentHeldUsd: 6900,
  depositCarriedInUsd: 0,
  advanceRentCarriedInUsd: 0,
  propertyYearBuilt: 2005,
  petsPermitted: true,
  hasNamedOccupants: false,
  hasHoa: true,
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
  ...overrides,
});

describe('radon — Fla. Stat. §404.056(5)', () => {
  it('reproduces the statutory language exactly', () => {
    // Substituted or paraphrased language does not satisfy the statute, so
    // this assertion is the actual compliance control, not a formatting test.
    expect(RADON_STATUTORY_TEXT).toBe(
      'RADON GAS: Radon is a naturally occurring radioactive gas that, when it has accumulated in a building in sufficient quantities, may present health risks to persons who are exposed to it over time. Levels of radon that exceed federal and state guidelines have been found in buildings in Florida. Additional information regarding radon and radon testing may be obtained from your county health department.',
    );
  });

  it('is always included and flagged verbatim', () => {
    const radon = bySlug('disclosure.radon');

    expect(radon.includeWhen).toBeNull();
    expect(radon.source).toMatchObject({ kind: 'statute', verbatimRequired: true });
  });
});

describe('flood — Fla. Stat. §83.512, effective 1 Oct 2025', () => {
  it('applies to a term of one year or longer', () => {
    const flood = bySlug('disclosure.flood');

    expect(flood.includeWhen?.(facts({ termMonths: 12 }))).toBe(true);
    expect(flood.includeWhen?.(facts({ termMonths: 24 }))).toBe(true);
  });

  it('does not apply to a short term', () => {
    const flood = bySlug('disclosure.flood');

    expect(flood.includeWhen?.(facts({ termMonths: 6 }))).toBe(false);
  });

  it('is a standalone document, not part of the lease body', () => {
    // The statute requires a separate written disclosure and does not permit
    // it to be buried in the lease. Placement is therefore load-bearing.
    expect(bySlug('disclosure.flood').placement).toBe('standalone-disclosure');
  });

  it('carries the three knowledge statements the statute prescribes', () => {
    const flood = bySlug('disclosure.flood');
    const names = flood.variables.map((v) => v.name);

    expect(names).toContain('landlordKnowsOfFlooding');
    expect(names).toContain('landlordFiledFloodClaim');
    expect(names).toContain('landlordReceivedFloodAssistance');
  });
});

describe('security deposit notice — Fla. Stat. §83.49(3)', () => {
  it('is required whenever a deposit is held, including one carried in', () => {
    const notice = bySlug('deposit.statutory-notice');

    expect(notice.includeWhen?.(facts({ depositHeldUsd: 6900 }))).toBe(true);

    // The trap in the 2026 Zillow lease: a deposit carried over from a prior
    // tenancy is still held, so the notice obligation does not disappear just
    // because nothing is collected at signing.
    expect(notice.includeWhen?.(facts({ depositHeldUsd: 6300 }))).toBe(true);
  });

  it('is omitted when no deposit is held at all', () => {
    expect(bySlug('deposit.statutory-notice').includeWhen?.(facts({ depositHeldUsd: 0 }))).toBe(false);
  });
});

describe('lead-based paint — 42 U.S.C. §4852d', () => {
  it('applies to pre-1978 housing only', () => {
    const lead = bySlug('disclosure.lead-paint');

    expect(lead.includeWhen?.(facts({ propertyYearBuilt: 1972 }))).toBe(true);
    expect(lead.includeWhen?.(facts({ propertyYearBuilt: 2005 }))).toBe(false);
  });

  it('applies when the build year is unknown', () => {
    // Not knowing is not evidence of post-1978 construction. Fail safe.
    expect(bySlug('disclosure.lead-paint').includeWhen?.(facts({ propertyYearBuilt: null }))).toBe(true);
  });

  it('is federal, not Florida-specific', () => {
    expect(bySlug('disclosure.lead-paint').jurisdiction).toBe('US');
  });
});

describe('library invariants', () => {
  it('gives every clause a unique slug', () => {
    const slugs = FL_STATUTORY_DISCLOSURES.map((c) => c.slug);

    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it('sources every clause from a statute and cites it', () => {
    for (const clause of FL_STATUTORY_DISCLOSURES) {
      expect(clause.source.kind).toBe('statute');

      if (clause.source.kind === 'statute') {
        expect(clause.source.citation).toMatch(/(Fla\. Stat\.|U\.S\.C\.)/);
      }
    }
  });

  it('holds every clause below published until its text is verified', () => {
    // None of these have been checked against the current statute by a human,
    // so none may render for an organisation that is not BizRethink-internal.
    const problems = FL_STATUTORY_DISCLOSURES.flatMap(assertPublishable);

    expect(problems).toEqual([]);
    expect(FL_STATUTORY_DISCLOSURES.every((c) => c.status !== 'published')).toBe(true);
  });

  it('refuses to publish statutory text with no verification date', () => {
    const unverified = { ...bySlug('disclosure.radon'), status: 'published' as const };

    expect(assertPublishable(unverified)).toEqual([
      'disclosure.radon: statutory text published without a verification date',
    ]);
  });
});
