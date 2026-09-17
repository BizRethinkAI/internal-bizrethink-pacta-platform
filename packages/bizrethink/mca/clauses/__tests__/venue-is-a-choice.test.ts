import { describe, expect, it } from 'vitest';
import { selectClauses } from '../../engine/select-clauses';
import { LOMBARD_FACTS } from '../facts';
import { libraryFor } from '../library';

/**
 * Venue leaves §7.5, because a fact may only gate a whole clause.
 *
 * §7.5 answered three questions at once — who is bound, which law governs, and
 * where an action is brought — so `venueRule` decided a limb of it. ADR 0013's
 * rule is that the clause is then carrying two rules and the fix is to separate
 * them, which is what this does: binding effect and governing law stay ungated,
 * and venue becomes an exhaustive pair.
 *
 * The earlier refusal also said the funder-state arm could not be drafted at
 * all, because nothing named the funder's state. The provider interview now
 * collects it.
 */
const venueOf = (venueRule: 'merchant-state' | 'funder-state') =>
  selectClauses({ instrument: 'frpa', facts: { ...LOMBARD_FACTS, venueRule } }).selected.map((clause) => clause.slug);

describe('venue is a choice with a clause behind each answer', () => {
  it('selects exactly one venue clause for either answer', () => {
    const merchant = venueOf('merchant-state');
    const funder = venueOf('funder-state');

    expect(merchant).toContain('frpa.venue-7-5');
    expect(merchant).not.toContain('frpa.venue-funder-state-7-5');
    expect(funder).toContain('frpa.venue-funder-state-7-5');
    expect(funder).not.toContain('frpa.venue-7-5');
  });

  it('keeps binding effect and governing law in every template', () => {
    for (const rule of ['merchant-state', 'funder-state'] as const) {
      expect(venueOf(rule)).toContain('frpa.binding-effect-governing-law-venue-and-jurisdiction-7-5');
    }
  });

  it('shares one citation identity, so a cross-reference resolves either way', () => {
    const alternative = libraryFor('frpa').find((clause) => clause.slug === 'frpa.venue-funder-state-7-5');

    expect(alternative?.referenceId).toBe('frpa.venue-7-5');
  });

  it('leaves the venue rule out of the clause that no longer states it', () => {
    const governing = libraryFor('frpa').find(
      (clause) => clause.slug === 'frpa.binding-effect-governing-law-venue-and-jurisdiction-7-5',
    );

    expect(governing?.body).toContain('substantive law of the state of Merchant');
    expect(governing?.body).not.toContain('shall be brought in a state court');
    expect(governing?.variance.kind === 'fixed' && governing.variance.because).not.toBe('unwritable');
  });

  it('names the funder forum from the provider answer, not from a hardcoded state', () => {
    const alternative = libraryFor('frpa').find((clause) => clause.slug === 'frpa.venue-funder-state-7-5');

    expect(alternative?.body).toContain('{{field:provider.venueForum}}');
    expect(alternative?.body).not.toMatch(/Florida|New York|Pasco/);
  });
});

/**
 * The two arms are not symmetrical, and that is deliberate.
 *
 * Merchant-state venue satisfies Va. Code §6.2-2234(A) by construction, which
 * is why the base form needs no Virginia variant — so that arm implements it
 * and asks for a Virginia-admitted reviewer. The funder-state arm implements
 * nothing: no statute requires a funder's forum, and the profile refuses it for
 * a Virginia programme. Claiming Virginia there would route a Virginia attorney
 * to approve the clause Virginia can never use.
 */
describe('only one arm claims Virginia', () => {
  const clause = (slug: string) => libraryFor('frpa').find((entry) => entry.slug === slug);

  it('implements the Virginia rule on the merchant-state arm', () => {
    const merchantState = clause('frpa.venue-7-5');

    expect(merchantState?.whyThisClause.kind).toBe('implements');
    expect(merchantState?.appliesInStates).toEqual(['US-VA']);
  });

  it('claims nothing statutory on the funder-state arm', () => {
    const funderState = clause('frpa.venue-funder-state-7-5');

    expect(funderState?.whyThisClause.kind).toBe('discretionary');
    expect(funderState?.appliesInStates).toEqual([]);
  });
});
