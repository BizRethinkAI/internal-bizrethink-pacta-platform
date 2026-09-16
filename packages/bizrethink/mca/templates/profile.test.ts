import { describe, expect, it } from 'vitest';

import { ZMcaProviderProfile } from './profile';
import { providerFixture } from './profile.fixture';

describe('the provider interview describes the provider, not a future merchant transaction', () => {
  it('accepts actual identities and the supported net card-split policy', () => {
    expect(ZMcaProviderProfile.safeParse(providerFixture()).success).toBe(true);
  });

  it.each([
    'processorSplitAccepted',
    'merchant',
    'purchasePrice',
    'guarantors',
    'equipmentElection',
  ])('rejects the transaction fact %s from permanent policy', (key) => {
    const profile = providerFixture();
    expect(ZMcaProviderProfile.safeParse({ ...profile, policy: { ...profile.policy, [key]: true } }).success).toBe(
      false,
    );
  });

  it.each([
    ['collectionMethod', 'ach-only'],
    ['collectionMethod', 'split-with-ach-backstop'],
    ['settlementBase', 'gross'],
    // `venueRule: 'funder-state'` left this list when §7.5 split and the
    // interview began collecting the funder's forum.
    ['disputeResolution', 'arbitration'],
    ['supportedTermsConfirmed', false],
  ])('does not substitute the baseline for unsupported %s=%s', (key, value) => {
    const profile = providerFixture();
    expect(ZMcaProviderProfile.safeParse({ ...profile, policy: { ...profile.policy, [key]: value } }).success).toBe(
      false,
    );
  });

  it.each(
    [[], ['US-FL', 'US-FL'], ['US-XX']].map((states) => [states]),
  )('requires a nonempty, unique supported jurisdiction selection: %j', (recipientStates) => {
    const profile = providerFixture();
    expect(ZMcaProviderProfile.safeParse({ ...profile, policy: { ...profile.policy, recipientStates } }).success).toBe(
      false,
    );
  });

  it('does not invent an equipment affiliate or an ISO contracting company', () => {
    const profile = providerFixture();
    for (const choice of [{ equipment: 'merchant-elects' }, { brokerChannel: true }]) {
      expect(ZMcaProviderProfile.safeParse({ ...profile, policy: { ...profile.policy, ...choice } }).success).toBe(
        false,
      );
    }
  });

  it('rejects unresolved template syntax in an identity instead of turning input into another slot', () => {
    const profile = providerFixture();
    expect(
      ZMcaProviderProfile.safeParse({ ...profile, buyer: { ...profile.buyer, legalName: '{{funder}}' } }).success,
    ).toBe(false);
  });

  it('requires the supplied entity type and state instead of asserting every buyer is a Florida LLC', () => {
    const profile = providerFixture();
    expect(
      ZMcaProviderProfile.safeParse({ ...profile, buyer: { ...profile.buyer, entityType: '', organizationState: '' } })
        .success,
    ).toBe(false);
  });
});

/**
 * A funder-state forum needs a forum, and Virginia will not have one.
 *
 * Va. Code §6.2-2234(A) makes a provision mandating a forum outside the
 * Commonwealth unenforceable for a covered transaction, and a Virginia
 * recipient is defined by its principal place of business. A merchant-state
 * rule satisfies that by construction, which is why the base form has no
 * Virginia variant; a funder-state rule does not.
 */
describe('a funder-state forum is validated, not assumed', () => {
  const withVenue = (policy: Record<string, unknown>, buyer: Record<string, unknown> = {}) => {
    const base = providerFixture();
    return { ...base, buyer: { ...base.buyer, ...buyer }, policy: { ...base.policy, ...policy } };
  };

  it('refuses funder-state venue with no forum named', () => {
    expect(ZMcaProviderProfile.safeParse(withVenue({ venueRule: 'funder-state' })).success).toBe(false);
  });

  it('accepts a named forum', () => {
    const profile = withVenue({ venueRule: 'funder-state' }, { venueState: 'Florida', venueCounty: 'Pasco County' });

    expect(ZMcaProviderProfile.safeParse(profile).success).toBe(true);
  });

  it('refuses a funder forum for a programme offered into Virginia', () => {
    const profile = withVenue(
      { venueRule: 'funder-state', recipientStates: ['US-FL', 'US-VA'] },
      { venueState: 'Florida' },
    );

    expect(ZMcaProviderProfile.safeParse(profile).success).toBe(false);
  });

  it('leaves merchant-state programmes alone, Virginia included', () => {
    const profile = withVenue({ venueRule: 'merchant-state', recipientStates: ['US-FL', 'US-VA'] });

    expect(ZMcaProviderProfile.safeParse(profile).success).toBe(true);
  });
});
