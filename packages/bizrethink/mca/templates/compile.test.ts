import { describe, expect, it } from 'vitest';

import { contentFor } from '../catalogue';
import { compileMcaTemplate } from './compile';
import { providerFixture } from './profile.fixture';

describe('the provider interview produces a reusable document-package template', () => {
  it('assembles clauses and required fields while excluding guidance and inactive instruments', () => {
    const result = compileMcaTemplate(providerFixture());
    expect(result.documents.map((entry) => entry.instrument)).toEqual(['frpa']);
    const entries = result.documents.flatMap((doc) => doc.items);
    expect(entries.some((entry) => entry.slug === 'frpa.merchant-and-funding-information')).toBe(true);
    expect(entries.some((entry) => entry.slug === 'frpa.guarantor-fields')).toBe(true);
    expect(entries.some((entry) => entry.kind === 'guidance')).toBe(false);
    expect(
      entries.filter((entry) => entry.kind === 'clause').every((entry) => /^\d+\.\d+$/.test(entry.number ?? '')),
    ).toBe(true);
    expect(entries.filter((entry) => entry.kind !== 'clause').every((entry) => entry.number === null)).toBe(true);
  });

  it('keeps required identification before the operative parties clause', () => {
    const items = compileMcaTemplate(providerFixture()).documents[0]?.items ?? [];
    expect(items.findIndex((item) => item.slug === 'frpa.party-identification')).toBeGreaterThanOrEqual(0);
    expect(items.findIndex((item) => item.slug === 'frpa.party-identification')).toBeLessThan(
      items.findIndex((item) => item.slug === 'frpa.parties'),
    );
  });

  it('uses provider identity without copying the example funder or asserting Florida formation', () => {
    const items = compileMcaTemplate(providerFixture()).documents.flatMap((doc) => doc.items);
    const identity = items.find((item) => item.slug === 'frpa.party-identification')?.body ?? '';
    expect(identity).toContain('Example Receipts Inc.');
    expect(identity).toContain('corporation');
    expect(identity).toContain('DE');
    expect(identity).not.toMatch(/Florida limited liability company|Lombard|\{\{funder\}\}/);
  });

  it('never treats a provider-supplied processor form as future transaction acceptance', () => {
    expect(compileMcaTemplate(providerFixture()).externalDocuments).toEqual([
      expect.objectContaining({ instrument: 'split-funding', acceptance: 'required-per-transaction' }),
    ]);
    expect(compileMcaTemplate(providerFixture()).documents.map((doc) => doc.instrument)).not.toContain('split-funding');
  });

  it('lists state disclosure requirements without deciding future applicability or readiness', () => {
    const result = compileMcaTemplate(providerFixture());
    expect([...new Set(result.requirements.map((entry) => entry.jurisdiction))].sort()).toEqual(['US-CA', 'US-FL']);
    expect(result.requirements.every((entry) => entry.applicability === 'determine-per-transaction')).toBe(true);
    expect(result.readyToSend).toBe(false);
  });

  it('removes guarantor fields with the no-guaranty option but retains the liability limits', () => {
    const profile = providerFixture();
    const result = compileMcaTemplate({ ...profile, policy: { ...profile.policy, guarantyScope: 'none' } });
    const entries = result.documents.flatMap((doc) => doc.items);
    expect(entries.some((entry) => entry.slug === 'frpa.guarantor-fields')).toBe(false);
    expect(entries.some((entry) => entry.slug === 'frpa.sales-of-receipts-not-a-loan-2-1')).toBe(true);
  });

  it('pins policy and exact content without time-dependent fingerprints', () => {
    const profile = providerFixture();
    const first = compileMcaTemplate(profile);
    expect(first.fingerprint).toMatch(/^[a-f0-9]{64}$/);
    expect(compileMcaTemplate(profile).fingerprint).toBe(first.fingerprint);
    expect(
      compileMcaTemplate({ ...profile, buyer: { ...profile.buyer, legalName: 'Another Buyer LLC' } }).fingerprint,
    ).not.toBe(first.fingerprint);
    const entry = contentFor('frpa').find((item) => item.slug === 'frpa.granting-clause');
    if (!entry) {
      throw new Error('The granting clause is required for this test.');
    }
    const body = entry.body;
    try {
      entry.body = `${body} Changed drafting.`;
      expect(compileMcaTemplate(profile).fingerprint).not.toBe(first.fingerprint);
    } finally {
      entry.body = body;
    }
  });

  it('pins selected content across server bundles without hashing a predicate’s printed code', () => {
    const profile = providerFixture();
    const entry = contentFor('frpa').find((item) => item.slug === 'frpa.guarantor-fields');
    if (!entry?.includeWhen) {
      throw new Error('The guarantor field group must have a selection predicate.');
    }
    const includeWhen = entry.includeWhen;
    const first = compileMcaTemplate(profile);
    try {
      // Bundlers can rename parameters or change expression formatting without
      // changing the selected content for the saved provider policy.
      entry.includeWhen = (compiledFacts) => compiledFacts.guarantyScope !== 'none';
      expect(entry.includeWhen.toString()).not.toBe(includeWhen.toString());
      expect(compileMcaTemplate(profile)).toEqual(first);

      entry.includeWhen = () => false;
      const changed = compileMcaTemplate(profile);
      expect(changed.documents[0]?.items.some((item) => item.slug === entry.slug)).toBe(false);
      expect(changed.fingerprint).not.toBe(first.fingerprint);
    } finally {
      entry.includeWhen = includeWhen;
    }
  });
});

it('assembles both offered equipment options, the channel agreement and report permission with their own identities', () => {
  const profile = providerFixture();
  const { reconciliationEmail: _email, reconciliationAddress: _address, ...entity } = profile.buyer;
  const result = compileMcaTemplate({
    ...profile,
    policy: { ...profile.policy, equipment: 'merchant-elects', brokerChannel: true, consumerReportPulled: true },
    equipmentProvider: { ...entity, legalName: 'Separate Equipment LLC', entityType: 'limited liability company' },
    broker: {
      company: { ...entity, legalName: 'Separate Channel Inc.' },
      portalUrl: 'https://partners.example.invalid',
      commissionPercentage: 2.75,
      fixedIsoTermsAccepted: true,
    },
  });
  expect(result.documents.map((document) => document.instrument).sort()).toEqual([
    'equipment-lease',
    'frpa',
    'iso-pra',
    'permission-to-release',
    'subscription',
  ]);
  const iso = result.documents.find((document) => document.instrument === 'iso-pra');
  expect(iso?.items.find((item) => item.slug === 'iso-pra.parties')?.body).toContain('Separate Channel Inc.');
  expect(iso?.items.find((item) => item.slug === 'iso-pra.commission-rate')?.body).toContain('2.75%');
  expect(iso?.items.find((item) => item.slug === 'iso-pra.commission-transparency')?.body).toContain(
    'https://partners.example.invalid',
  );
  expect(JSON.stringify(result)).not.toMatch(/app\.lombardpay\.com|\{\{funder\}\}|\{\{equipmentAffiliate\}\}/);
  for (const document of result.documents) {
    expect(document.items.every((item) => !item.body.includes('[['))).toBe(true);
  }
});

it('does not invent an equipment counterparty when the programme offers none', () => {
  const result = compileMcaTemplate(providerFixture());
  expect(
    result.documents
      .flatMap((document) => document.items)
      .map((item) => item.body)
      .join('\n'),
  ).not.toMatch(/\{\{field:equipment\.providerLegalName\}\}|Lombard|app\.lombardpay\.com/);
});

it('fails closed instead of dropping an orphaned required document block', () => {
  const entry = contentFor('frpa').find((item) => item.slug === 'frpa.party-identification');
  if (!entry || entry.kind !== 'document-block') {
    throw new Error('Required identity block is missing.');
  }
  const placement = entry.placement;
  try {
    entry.placement = { before: 'frpa.missing-anchor' };
    expect(() => compileMcaTemplate(providerFixture())).toThrow('Required MCA content has no placement');
  } finally {
    entry.placement = placement;
  }
});

it('fails closed on cyclic required-content placement', () => {
  const entry = contentFor('frpa').find((item) => item.slug === 'frpa.party-identification');
  if (!entry || entry.kind !== 'document-block') {
    throw new Error('Required identity block is missing.');
  }
  const placement = entry.placement;
  try {
    entry.placement = { before: entry.slug };
    expect(() => compileMcaTemplate(providerFixture())).toThrow();
  } finally {
    entry.placement = placement;
  }
});
