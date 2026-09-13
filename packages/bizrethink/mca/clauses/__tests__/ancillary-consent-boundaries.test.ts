import { describe, expect, it } from 'vitest';

import { assertPublishable } from '../../../provenance/types';
import { selectClauses } from '../../engine/select-clauses';
import { mcaClauseFingerprint } from '../approval';
import { LOMBARD_FACTS } from '../facts';
import { ALL_MCA_CLAUSES, libraryFor } from '../library';
import legacyRelease from './permission-to-release-legacy.fixture.json';

const get = (slug: string) => {
  const clause = ALL_MCA_CLAUSES.find((entry) => entry.slug === slug);

  if (!clause) {
    throw new Error(`Missing clause: ${slug}`);
  }

  return clause;
};

const text = (slug: string) => get(slug).body;
const release = libraryFor('permission-to-release');
const equipment = ['equipment-lease', 'subscription'] as const;
const revised = [
  ...release,
  ...equipment.flatMap((instrument) =>
    ['credit-reporting-authorization', 'communications-consent', 'acknowledgment'].map((suffix) =>
      get(`${instrument}.${suffix}`),
    ),
  ),
];

// These are drafting regressions, not a legal-compliance oracle. Each forbidden
// route includes an independent legacy sentence that proves the detector fires.
const routes = [
  [
    'deemed guarantor',
    /If no separate Personal Guarantor signs below/,
    'If no separate Personal Guarantor signs below, the person signing represents that they are the Personal Guarantor',
  ],
  [
    'recurring reports',
    /periodically without further consent|continuing authority to obtain one or more/,
    'I expressly authorize continuing authority to obtain one or more consumer credit reports',
  ],
  [
    'continuing qualification',
    /ongoing program qualification monitoring|qualification or continuation in any funding program/,
    'ongoing program qualification monitoring during the term of any agreement',
  ],
  [
    'information-source immunity',
    /any and all liability arising from disclosures/,
    'Merchant releases each Information Source from any and all liability arising from disclosures',
  ],
  [
    'consent for another person',
    /I, on my behalf and on behalf of (?:Lessee|Subscriber), expressly consent/,
    'I, on my behalf and on behalf of Lessee, expressly consent to receive calls',
  ],
  [
    'discovered-number consent',
    /or which .+learns about through other means/,
    'or which the provider learns about through other means',
  ],
  [
    'guarantor adopts every payment',
    /bound by all the terms of this Guaranty and (?:Lease|Subscription)/i,
    'I agree to be bound by all the terms of this Guaranty and Lease',
  ],
] as const;

describe.each(routes)('the ancillary documents close %s', (_name, detector, legacy) => {
  it('detects the original affirmative grant', () => {
    expect(legacy).toMatch(detector);
  });

  it('is absent across all three revised instruments', () => {
    expect(revised.filter((clause) => detector.test(clause.body)).map((clause) => clause.slug)).toEqual([]);
  });
});

describe('the release authorizes the identified transaction and signer', () => {
  it('limits business records to the identified transaction and FRPA purposes', () => {
    expect(text('permission-to-release.preamble')).toMatch(/identified before signature/);
    const trade = text('permission-to-release.trade-landlord-and-bank-information');
    const history = text('permission-to-release.banking-brokerage-and-processing-history');

    expect(trade).toMatch(/reasonably necessary/);
    expect(trade).toMatch(/specific suspected diversion/);
    expect(history).toMatch(/verify Purchased Receipts/);
    expect(history).toMatch(/reconcil/i);
    expect(`${trade} ${history}`).toMatch(/does not authorize a consumer report on an individual/);
  });

  it('requires the report subject to sign individually for one underwriting report', () => {
    const body = text('permission-to-release.credit-bureau-authorization');

    expect(body).toMatch(/only the individual who signs/i);
    expect(body).toMatch(/one consumer report/);
    expect(body).toMatch(/underwrit/i);
    expect(body).toMatch(/before the Purchase Date/);
    expect(body).toMatch(/separately documented permissible purpose/);
    expect(body).toMatch(/no recurring|not recurring/i);
  });

  it('creates no guaranty even when the profile has no guarantor', () => {
    const selected = selectClauses({
      instrument: 'permission-to-release',
      facts: { ...LOMBARD_FACTS, guarantyScope: 'none', consumerReportPulled: true },
    }).selected;
    const capacity = selected.find((clause) => clause.slug === 'permission-to-release.personal-guarantor');

    expect(capacity?.heading).toBe('Signature Capacities; No Guaranty');
    expect(capacity?.body).toMatch(/only on behalf of Merchant/);
    expect(capacity?.body).toMatch(/separate individual signature/);
    expect(capacity?.body).toMatch(/creates no personal guaranty/);
    expect(capacity?.body).toMatch(/copy.*each signer/);
  });

  it('ends the grants and keeps revocation separate from lawful record retention', () => {
    const body = text('permission-to-release.continuing-authorization-reliance');

    expect(body).toMatch(/declined or withdrawn/);
    expect(body).toMatch(/completed or terminated/);
    expect(body).toMatch(/revoke.*prospectively/);
    expect(body).toMatch(/lawfully retain/);
    expect(body).toMatch(/does not authorize new access/);
  });

  it('limits sharing and preserves claims instead of immunizing every source', () => {
    const body = text('permission-to-release.release-of-information-sources');

    expect(body).toMatch(/minimum necessary/);
    expect(body).toMatch(/confidentiality, security and purpose restrictions/);
    expect(body).toMatch(/shall not sell/);
    expect(body).toMatch(/unrelated marketing/);
    expect(body).toMatch(/releases no claim/);
    expect(body).toMatch(/waives no statutory/);
  });

  it('changes the fingerprint of every revised release clause without approving it', () => {
    expect(release.map((clause) => clause.slug)).toEqual(legacyRelease.map((clause) => clause.slug));

    for (const old of legacyRelease) {
      const current = get(old.slug);

      expect(mcaClauseFingerprint(current)).not.toBe(
        mcaClauseFingerprint({ ...current, heading: old.heading, body: old.body, version: 1 }),
      );
    }
  });
});

describe.each([
  'permission-to-release.fair-credit-reporting-act-acknowledgment',
  ...equipment.map((instrument) => `${instrument}.credit-reporting-authorization`),
])('%s retains adverse-action rights', (slug) => {
  it('requires the notice, agency details, free-report and dispute rights without a prior request', () => {
    const body = text(slug);

    expect(body).toMatch(/adverse action/);
    expect(body).toMatch(/without waiting for a request/);
    expect(body).toMatch(/name, address and telephone number/);
    expect(body).toMatch(/did not make the decision/);
    expect(body).toMatch(/free copy/);
    expect(body).toMatch(/60 days/);
    expect(body).toMatch(/accuracy or completeness/);
    expect(body).toMatch(/credit score/);
    expect(body).toMatch(/written or electronic/);
  });
});

describe.each(equipment)('%s keeps the provider and individual distinct', (instrument) => {
  it('limits the individual report to the equipment guaranty, without authorizing the receivables funder', () => {
    const body = text(`${instrument}.credit-reporting-authorization`);

    expect(body).toContain('{{equipmentAffiliate}}');
    expect(body).toMatch(/one consumer report/);
    expect(body).toMatch(/before.*accepts/);
    expect(body).toMatch(/only to evaluate my proposed limited guaranty/);
    expect(body).toMatch(/does not authorize.*receivables funder/);
    expect(body).toMatch(/does not make me liable/);
    expect(body).toMatch(/shall not report.*do not owe/);
  });

  it('requires optional marketing consent separately for a specified recipient number', () => {
    const body = text(`${instrument}.communications-consent`);

    expect(body).toMatch(/person legally entitled to consent/);
    expect(body).toMatch(/Marketing consent.*separately/);
    expect(body).toMatch(/not a condition/);
    expect(body).toMatch(/number to be called or messaged/);
    expect(body).toMatch(/does not itself give.*consent/);
  });

  it('allows reasonable revocation methods for servicing as well as marketing and separates recording', () => {
    const body = text(`${instrument}.communications-consent`);

    expect(body).toMatch(/any reasonable means/);
    expect(body).toMatch(/STOP/);
    expect(body).toMatch(/telephone/);
    expect(body).toMatch(/email/);
    expect(body).toMatch(/servicing or collection/i);
    expect(body).toMatch(/lawful without.*consent/);
    expect(body).toMatch(/notices.*does not restrict/i);
    expect(body).toMatch(/Before recording/);
    expect(body).toMatch(/each participant/);
  });

  it('makes the individual signature bind only the existing limited guaranty', () => {
    const body = text(`${instrument}.acknowledgment`);

    expect(body).toContain(`[[clause:${instrument}.guaranty-of-payment]]`);
    expect(body).toMatch(/only the obligations/);
    expect(body).toMatch(/Signing for (?:Lessee|Subscriber) does not make that signer a guarantor/);
    expect(body).toMatch(/another individual/);
  });
});

it('retains all fourteen revised records as unapproved drafts at a new version', () => {
  expect(revised).toHaveLength(14);

  for (const clause of revised) {
    expect(clause.version, clause.slug).toBe(2);
    expect(clause.status).toBe('draft');
    expect(clause.source).toEqual({ kind: 'attorney-drafted', author: null });
    expect(assertPublishable({ ...clause, status: 'published' })).toContain(
      `${clause.slug}: attorney-drafted text published without a named reviewer`,
    );
    expect(clause.examinedBy.length).toBeGreaterThan(0);
  }
});
