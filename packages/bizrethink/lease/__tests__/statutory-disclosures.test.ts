import { describe, expect, it } from 'vitest';
import type { ClauseFacts } from '../clauses/types';
import { assertPublishable } from '../clauses/types';
import { FL_LIBRARY } from '../clauses/us-fl';
import { FL_STATUTORY_DISCLOSURES, RADON_STATUTORY_TEXT } from '../clauses/us-fl/statutory-disclosures';
import { selectClauses } from '../engine/select-clauses';

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
  // Derived in hydrateMatter; stated here because this fixture drives clause
  // selection directly rather than going through it.
  hasPetFees: false,
  hasHoaLeaseRequirements: false,
  hasHoaGoverningDocuments: false,
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

  /*
    "No money held", not "no deposit". This asserted `depositHeldUsd: 0` while
    the fixture still held 6,900 of advance rent — and passed, because the gate
    ignored advance rent. §83.49(1) does not: it attaches to money taken as
    security OR as advance rent, and the notice's own first sentence is about
    advance rents.
  */
  it('is omitted only when the landlord holds nothing at all', () => {
    const notice = bySlug('deposit.statutory-notice');

    expect(notice.includeWhen?.(facts({ depositHeldUsd: 0, advanceRentHeldUsd: 0 }))).toBe(false);
    expect(notice.includeWhen?.(facts({ depositHeldUsd: 0, advanceRentHeldUsd: 6900 }))).toBe(true);
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

  /*
    Radon and the deposit notice were read off the statute on 2026-09-02 and
    now carry a date, so this invariant needs a clause that has NOT been —
    the flood disclosure, whose text is still unchecked.
  */
  it('refuses to publish statutory text with no verification date', () => {
    const unverified = { ...bySlug('disclosure.flood'), status: 'published' as const };

    expect(assertPublishable(unverified)).toEqual([
      'disclosure.flood: statutory text published without a verification date',
    ]);
  });

  it('lets verified statutory text publish', () => {
    const verified = { ...bySlug('disclosure.radon'), status: 'published' as const };

    expect(assertPublishable(verified)).toEqual([]);
  });
});

/**
 * §83.49 attaches to money held, and advance rent is money held.
 *
 * Both notices gated on `depositHeldUsd > 0` alone. But §83.49(1) covers money
 * deposited "as security for performance of the rental agreement OR as advance
 * rent for other than the next immediate rental period", and the notice's own
 * first sentence is about advance rents — "THE LANDLORD MAY TRANSFER ADVANCE
 * RENTS TO THE LANDLORD'S ACCOUNT AS THEY ARE DUE".
 *
 * So a last-month's-rent-only lease — an ordinary Florida structure — went out
 * holding the tenant's money with no disclosure and no depository notice. That
 * is the omission §83.49(3)(a) penalises by forfeiting the landlord's right to
 * impose a claim against the money at all.
 */
const allSlugs = (f: ClauseFacts) => {
  const { selected, addenda, standaloneDisclosures } = selectClauses({ facts: f, library: FL_LIBRARY });

  return [...selected, ...addenda, ...standaloneDisclosures].map((clause) => clause.slug);
};

describe('deposit notices on a lease with advance rent and no deposit', () => {
  const advanceRentOnly = facts({ depositHeldUsd: 0, advanceRentHeldUsd: 6900 });

  it('gives the §83.49(3) disclosure', () => {
    expect(allSlugs(advanceRentOnly)).toContain('deposit.statutory-notice');
  });

  it('gives the §83.49(2) depository notice', () => {
    expect(allSlugs(advanceRentOnly)).toContain('deposit.escrow-notice');
  });

  it('still gives both where there is a deposit and no advance rent', () => {
    const depositOnly = facts({ depositHeldUsd: 6900, advanceRentHeldUsd: 0 });

    expect(allSlugs(depositOnly)).toContain('deposit.statutory-notice');
    expect(allSlugs(depositOnly)).toContain('deposit.escrow-notice');
  });

  /*
    And not where nothing is held. A notice about money the landlord does not
    have is noise in a document that is already long.
  */
  it('gives neither where the landlord holds nothing', () => {
    const nothing = facts({ depositHeldUsd: 0, advanceRentHeldUsd: 0 });

    expect(allSlugs(nothing)).not.toContain('deposit.statutory-notice');
    expect(allSlugs(nothing)).not.toContain('deposit.escrow-notice');
  });
});

/**
 * The §83.595(4) election is the one paragraph Florida writes for you.
 *
 * You may use that remedy only if you use the statute's words, and the body
 * read "pay ${{earlyTerminationFeeUsd}}" while the `usd` formatter already
 * emits a currency symbol. It rendered "pay $$4,600.00" — on a signed
 * addendum, in prescribed text.
 */
describe('the early-termination election', () => {
  const clause = FL_LIBRARY.find((entry) => entry.slug === 'termination.early-election');

  it('does not double the currency symbol', () => {
    expect(clause?.body).not.toContain('${{earlyTerminationFeeUsd}}');
    expect(clause?.body).toContain('{{earlyTerminationFeeUsd}}');
  });

  /*
    The general rule, since one hand-typed symbol in front of a formatted
    amount is easy to write twice: a `usd` variable formats its own currency,
    so no clause body may put a symbol in front of one.
  */
  it('and no clause anywhere does', () => {
    for (const entry of FL_LIBRARY) {
      const usd = entry.variables.filter((variable) => variable.type === 'usd').map((variable) => variable.name);

      for (const name of usd) {
        expect(entry.body, `${entry.slug} prefixes {{${name}}} with a dollar sign`).not.toContain(`\${{${name}}}`);
      }
    }
  });
});
