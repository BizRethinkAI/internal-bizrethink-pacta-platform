import { describe, expect, it } from 'vitest';

import { contentFor } from '../catalogue';
import type { McaInstrument } from '../clauses/instruments';
import { compileMcaTemplate, isMcaTemplateCurrent } from './compile';
import { providerFixture } from './profile.fixture';

/**
 * ADR 0026: **entity + type = one template.**
 *
 * This file used to assert package behaviour — that one compile produced
 * whichever set of documents the policy selected. That set existed nowhere
 * outside the compiler: `lombard-api` holds five separately published
 * templates, each with its own `templateId`, each sent on its own. The tests
 * that asserted the set are rewritten here to assert one document at a time,
 * which is what a template is and what the caller has always seen.
 */

const itemsOf = (instrument: McaInstrument = 'frpa', profile = providerFixture()) =>
  compileMcaTemplate(profile, instrument).documents[0]?.items ?? [];

/** Every document the all-options programme below is entitled to. */
const OFFERED = ['equipment-lease', 'frpa', 'iso-pra', 'permission-to-release', 'subscription'] as const;

/** A programme that offers every document the builder produces, with distinct names per party. */
const allOptions = () => {
  const profile = providerFixture();
  const { reconciliationEmail: _email, reconciliationAddress: _address, ...entity } = profile.buyer;

  return {
    ...profile,
    policy: {
      ...profile.policy,
      equipment: 'merchant-elects' as const,
      brokerChannel: true,
      consumerReportPulled: true,
    },
    equipmentProvider: { ...entity, legalName: 'Separate Equipment LLC', entityType: 'limited liability company' },
    broker: {
      company: { ...entity, legalName: 'Separate Channel Inc.' },
      portalUrl: 'https://partners.example.invalid',
      commissionPercentage: 2.75,
      fixedIsoTermsAccepted: true,
    },
  };
};

describe('the provider interview produces a template for one document', () => {
  it('compiles the document it was asked for, and nothing beside it', () => {
    const result = compileMcaTemplate(providerFixture(), 'frpa');

    expect(result.documents.map((entry) => entry.instrument)).toEqual(['frpa']);
    // Carried at the top level too, so a recompile can ask for the same one.
    expect(result.instrument).toBe('frpa');
  });

  it('assembles clauses and required fields while excluding guidance', () => {
    const entries = itemsOf('frpa');

    expect(entries.some((entry) => entry.slug === 'frpa.merchant-and-funding-information')).toBe(true);
    expect(entries.some((entry) => entry.slug === 'frpa.guarantor-fields')).toBe(true);
    expect(entries.some((entry) => entry.kind === 'guidance')).toBe(false);
    expect(
      entries.filter((entry) => entry.kind === 'clause').every((entry) => /^\d+\.\d+$/.test(entry.number ?? '')),
    ).toBe(true);
    expect(entries.filter((entry) => entry.kind !== 'clause').every((entry) => entry.number === null)).toBe(true);
  });

  it('keeps required identification before the operative parties clause', () => {
    const items = itemsOf('frpa');

    expect(items.findIndex((item) => item.slug === 'frpa.party-identification')).toBeGreaterThanOrEqual(0);
    expect(items.findIndex((item) => item.slug === 'frpa.party-identification')).toBeLessThan(
      items.findIndex((item) => item.slug === 'frpa.parties'),
    );
  });

  it('uses provider identity without copying the example funder or asserting Florida formation', () => {
    const identity = itemsOf('frpa').find((item) => item.slug === 'frpa.party-identification')?.body ?? '';

    expect(identity).toContain('Example Receipts Inc.');
    expect(identity).toContain('corporation');
    expect(identity).toContain('DE');
    expect(identity).not.toMatch(/Florida limited liability company|Lombard|\{\{funder\}\}/);
  });

  it('never treats a provider-supplied processor form as future transaction acceptance', () => {
    const result = compileMcaTemplate(providerFixture(), 'frpa');

    expect(result.externalDocuments).toEqual([
      expect.objectContaining({ instrument: 'split-funding', acceptance: 'required-per-transaction' }),
    ]);
    expect(result.documents.map((doc) => doc.instrument)).not.toContain('split-funding');
  });

  it('lists state disclosure requirements without deciding future applicability or readiness', () => {
    const result = compileMcaTemplate(providerFixture(), 'frpa');

    expect([...new Set(result.requirements.map((entry) => entry.jurisdiction))].sort()).toEqual(['US-CA', 'US-FL']);
    expect(result.requirements.every((entry) => entry.applicability === 'determine-per-transaction')).toBe(true);
    expect(result.readyToSend).toBe(false);
  });

  it('removes guarantor fields with the no-guaranty option but retains the liability limits', () => {
    const profile = providerFixture();
    const entries = itemsOf('frpa', { ...profile, policy: { ...profile.policy, guarantyScope: 'none' } });

    expect(entries.some((entry) => entry.slug === 'frpa.guarantor-fields')).toBe(false);
    expect(entries.some((entry) => entry.slug === 'frpa.sales-of-receipts-not-a-loan-2-1')).toBe(true);
  });

  it('pins policy and exact content without time-dependent fingerprints', () => {
    const profile = providerFixture();
    const first = compileMcaTemplate(profile, 'frpa');

    expect(first.fingerprint).toMatch(/^[a-f0-9]{64}$/);
    expect(compileMcaTemplate(profile, 'frpa').fingerprint).toBe(first.fingerprint);
    expect(
      compileMcaTemplate({ ...profile, buyer: { ...profile.buyer, legalName: 'Another Buyer LLC' } }, 'frpa')
        .fingerprint,
    ).not.toBe(first.fingerprint);

    const entry = contentFor('frpa').find((item) => item.slug === 'frpa.granting-clause');
    if (!entry) {
      throw new Error('The granting clause is required for this test.');
    }
    const body = entry.body;
    try {
      entry.body = `${body} Changed drafting.`;
      expect(compileMcaTemplate(profile, 'frpa').fingerprint).not.toBe(first.fingerprint);
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
    const first = compileMcaTemplate(profile, 'frpa');
    try {
      // Bundlers can rename parameters or change expression formatting without
      // changing the selected content for the saved provider policy.
      entry.includeWhen = (compiledFacts) => compiledFacts.guarantyScope !== 'none';
      expect(entry.includeWhen.toString()).not.toBe(includeWhen.toString());
      expect(compileMcaTemplate(profile, 'frpa')).toEqual(first);

      entry.includeWhen = () => false;
      const changed = compileMcaTemplate(profile, 'frpa');
      expect(changed.documents[0]?.items.some((item) => item.slug === entry.slug)).toBe(false);
      expect(changed.fingerprint).not.toBe(first.fingerprint);
    } finally {
      entry.includeWhen = includeWhen;
    }
  });
});

/**
 * WHICH DOCUMENTS A PROGRAMME MAY HAVE is still decided by policy; it no longer
 * decides what any one template contains. Asking for a document the programme
 * does not run is refused rather than quietly omitted, because a template for a
 * document nobody can lawfully send is worse than no template.
 */
describe('a template for a document the programme does not run', () => {
  it.each([
    { label: 'equipment lease with no equipment programme', instrument: 'equipment-lease' as const },
    { label: 'ISO PRA with no broker channel', instrument: 'iso-pra' as const },
    { label: 'report permission with no consumer report pulled', instrument: 'permission-to-release' as const },
  ])('refuses $label', ({ instrument }) => {
    expect(() => compileMcaTemplate(providerFixture(), instrument)).toThrow(/does not run/i);
  });

  /**
   * The processor's actual form stays externally controlled and separately
   * reviewed (ADR 0019), so the builder produces none — refused by name rather
   * than by policy, since no policy could ever enable it.
   */
  it('refuses a split funding letter outright, whatever the policy says', () => {
    expect(() => compileMcaTemplate(allOptions(), 'split-funding')).toThrow(/processor’s|never built/i);
  });
});

/**
 * Compiled ONE AT A TIME, which is the point of ADR 0026 — the ISO PRA no
 * longer needs the FRPA present to resolve a citation, so each document stands
 * on its own. This replaces a single assertion over a five-document package.
 */
describe('every document an all-options programme offers', () => {
  it.each(OFFERED)('compiles %s on its own, with no unresolved reference left in it', (instrument) => {
    const result = compileMcaTemplate(allOptions(), instrument);

    expect(result.documents.map((document) => document.instrument)).toEqual([instrument]);
    expect(result.documents[0]?.items.every((item) => !item.body.includes('[['))).toBe(true);
    expect(JSON.stringify(result)).not.toMatch(/app\.lombardpay\.com|\{\{funder\}\}|\{\{equipmentAffiliate\}\}/);
  });

  it('gives the channel agreement the broker’s own identity and terms', () => {
    const items = compileMcaTemplate(allOptions(), 'iso-pra').documents[0]?.items ?? [];

    expect(items.find((item) => item.slug === 'iso-pra.parties')?.body).toContain('Separate Channel Inc.');
    expect(items.find((item) => item.slug === 'iso-pra.commission-rate')?.body).toContain('2.75%');
    expect(items.find((item) => item.slug === 'iso-pra.commission-transparency')?.body).toContain(
      'https://partners.example.invalid',
    );
  });

  it('does not invent an equipment counterparty when the programme offers none', () => {
    expect(
      itemsOf('frpa')
        .map((item) => item.body)
        .join('\n'),
    ).not.toMatch(/\{\{field:equipment\.providerLegalName\}\}|Lombard|app\.lombardpay\.com/);
  });
});

/**
 * A SAVED TEMPLATE IS RECOMPILED FROM ITSELF to check it is still current, so
 * the snapshot has to remember which document it is. It did not, and recompiled
 * with no instrument at all — which under ADR 0026 has no meaning.
 */
describe('checking a saved template is still current', () => {
  it('recompiles the same document rather than assuming one', () => {
    for (const instrument of OFFERED) {
      expect(isMcaTemplateCurrent(compileMcaTemplate(allOptions(), instrument))).toBe(true);
    }
  });

  /**
   * The assertion that actually pins the coupling: an ISO PRA snapshot that
   * CLAIMS to be an FRPA must not check out. An implementation recompiling a
   * hardcoded instrument — which is what it did before ADR 0026 — passes the
   * test above and fails this one.
   */
  it('recompiles what the snapshot names, not what it happens to contain', () => {
    const iso = compileMcaTemplate(allOptions(), 'iso-pra');

    expect(isMcaTemplateCurrent({ ...iso, instrument: 'frpa' })).toBe(false);
  });
});

it('fails closed instead of dropping an orphaned required document block', () => {
  const entry = contentFor('frpa').find((item) => item.slug === 'frpa.party-identification');
  if (!entry || entry.kind !== 'document-block') {
    throw new Error('Required identity block is missing.');
  }
  const placement = entry.placement;
  try {
    entry.placement = { before: 'frpa.missing-anchor' };
    expect(() => compileMcaTemplate(providerFixture(), 'frpa')).toThrow('Required MCA content has no placement');
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
    expect(() => compileMcaTemplate(providerFixture(), 'frpa')).toThrow();
  } finally {
    entry.placement = placement;
  }
});
