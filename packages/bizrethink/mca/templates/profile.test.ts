import { describe, expect, it } from 'vitest';

import { compileMcaTemplate } from './compile';
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
    // `disputeResolution: 'arbitration'` left this list when the clauses behind
    // it became selectable; the values above still have none.
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
 * A funder that arbitrates can say so.
 *
 * The arbitration bundle is authored — §7.26 arbitrates, and the jury, class
 * and counterclaim waivers belong to the court programme — but the profile
 * pinned `disputeResolution` to `courts`, so no funder could ever select it and
 * the clause could never appear in a package. ADR 0020 §5.6: a lawful term a
 * funder wants is a term the platform supports.
 */
describe('the funder chooses courts or arbitration', () => {
  it('accepts arbitration', () => {
    const profile = {
      ...providerFixture(),
      policy: { ...providerFixture().policy, disputeResolution: 'arbitration' as const },
    };

    expect(() => ZMcaProviderProfile.parse(profile)).not.toThrow();
  });

  it('still refuses a value with no clauses behind it', () => {
    const profile = {
      ...providerFixture(),
      policy: { ...providerFixture().policy, disputeResolution: 'mediation' as unknown as 'courts' },
    };

    expect(() => ZMcaProviderProfile.parse(profile)).toThrow();
  });

  it('selects the arbitration clause and drops the court waivers', () => {
    const profile = {
      ...providerFixture(),
      policy: { ...providerFixture().policy, disputeResolution: 'arbitration' as const },
    };
    const slugs = compileMcaTemplate(profile)
      .documents.flatMap((document) => document.items)
      .map((item) => item.slug);

    expect(slugs).toContain('frpa.arbitration-7-26');
    expect(slugs).not.toContain('frpa.jury-trial-waiver-7-10');
    expect(slugs).not.toContain('frpa.class-action-waiver-7-11');
    expect(slugs).not.toContain('frpa.counterclaim-waiver-7-20');
  });

  it('keeps the court programme exactly as it was', () => {
    const slugs = compileMcaTemplate(providerFixture())
      .documents.flatMap((document) => document.items)
      .map((item) => item.slug);

    expect(slugs).toContain('frpa.jury-trial-waiver-7-10');
    expect(slugs).toContain('frpa.class-action-waiver-7-11');
    expect(slugs).toContain('frpa.counterclaim-waiver-7-20');
    expect(slugs).not.toContain('frpa.arbitration-7-26');
  });
});
