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
    ['venueRule', 'funder-state'],
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
