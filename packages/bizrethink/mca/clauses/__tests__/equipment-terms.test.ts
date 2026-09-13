import { describe, expect, it } from 'vitest';

import { MCA_EQUIPMENT_FIELDS } from '../fields';
import { libraryFor } from '../library';

describe.each(['equipment-lease', 'subscription'] as const)('%s equipment bargain', (instrument) => {
  const library = libraryFor(instrument);
  const record = (suffix: string) => {
    const clause = library.find((entry) => entry.slug === `${instrument}.${suffix}`);
    if (!clause) {
      throw new Error(`Missing ${instrument}.${suffix}`);
    }
    return clause;
  };
  const body = (suffix: string) => record(suffix).body;

  it('prices the equipment separately and supplies the complete payment schedule', () => {
    const bindings = MCA_EQUIPMENT_FIELDS.map((field) => field.binding);
    expect(bindings).toEqual(
      expect.arrayContaining([
        'equipment.description',
        'equipment.serialNumbers',
        'equipment.monthlyCharge',
        'equipment.termMonths',
        'equipment.interimCharge',
        'equipment.deliveryCharge',
        'equipment.installationCharge',
        'equipment.estimatedTaxes',
        'equipment.scheduledTotal',
        'equipment.deliveryDate',
        'equipment.commencementDate',
        'equipment.finalPaymentDate',
        'equipment.providerLegalName',
        'equipment.providerEntityType',
        'equipment.providerFormationState',
        'equipment.providerNoticeAddress',
        'equipment.returnAddress',
        'equipment.lossPayee',
      ]),
    );
    expect(body('total-payments-estimate')).toMatch(/interim/i);
    expect(body('total-payments-estimate')).toMatch(/delivery.*installation/i);
    expect(body('total-payments-estimate')).toMatch(/not.*prescribed.*disclosure/i);
    expect(body('title-to-equipment')).toMatch(/same equipment twice/i);
  });

  it('never uses a receivables default to increase a sweep or duplicate equipment charges', () => {
    const text = body('payment-of-amounts-due');
    expect(text).not.toMatch(/percentage rises to one hundred percent|ten percent.*past-due|for each month.*unpaid/i);
    expect(text).toMatch(/does not increase.*Specified Percentage/i);
    expect(text).toMatch(/Purchased Amount/i);
    expect(text).toMatch(/No late fee|no late fee/i);
    expect(text).toMatch(/invoice/i);
  });

  it('requires signed acceptance and an identified commencement date', () => {
    expect(body('effective-date-term-and-interim-rent')).not.toMatch(/earlier of.*deliver|date designated by us/i);
    expect(body('effective-date-term-and-interim-rent')).toMatch(/both parties.*sign/i);
    expect(body('effective-date-term-and-interim-rent')).toMatch(/no.*overlap/i);
  });

  it('does not manufacture attachment, priority or a power to sign for the merchant', () => {
    const text = body('title-to-equipment');
    expect(text).not.toMatch(/deemed to have a first|irrevocably appoint|from the date of this Agreement/i);
    expect(text).toMatch(/attachment/i);
    expect(text).toMatch(/priority.*not guaranteed/i);
    expect(text).toMatch(/described Equipment/i);
  });

  it('preserves cure, lawful recovery and one accounting for all recovery', () => {
    const text = body('default-remedies');
    expect(text).not.toMatch(/immediately without notice|five percent.*reasonable damages|take it in satisfaction/i);
    expect(text).toMatch(/ten.*business days/i);
    expect(text).toMatch(/breach of the peace/i);
    expect(text).toMatch(/redemption/i);
    expect(text).toMatch(/surplus/i);
    expect(text).toMatch(/no double recovery/i);
    expect(text).toMatch(/not.*default under this Agreement/i);
  });

  it('limits each guarantor to that guarantor’s own intentional conduct', () => {
    const text = body('guaranty-of-payment');
    expect(text).not.toMatch(
      /Lessee has not committed|Subscriber has not committed|irrespective of any other|consent to any extension/i,
    );
    expect(text).toMatch(/Guarantor.s own intentional/i);
    expect(text).toMatch(/no liability for.*monthly/i);
    expect(text).toMatch(/innocent mistake/i);
    expect(text).toMatch(/separately signed consent/i);
    expect(text).toMatch(/aggregate.*cost limit/i);
  });

  it('preserves express promises and excludes provider fault from indemnity', () => {
    expect(body('warranties')).not.toMatch(/All warranties express or implied.*disclaimed/i);
    expect(body('warranties')).toMatch(/express warranties/i);
    expect(body('warranties')).toMatch(/MERCHANTABILITY.*FITNESS FOR A PARTICULAR PURPOSE/);
    expect(body('indemnification')).toMatch(/our negligence/i);
    expect(body('limitation-on-liability')).toMatch(/fraud.*negligence/i);
    expect(body('use-return-of-equipment-and-insurance')).not.toMatch(
      /at any time.*enter|possibly result.*charged \$100/i,
    );
    expect(body('use-return-of-equipment-and-insurance')).toMatch(/reasonable notice/i);
  });

  it('remains a draft subject to fresh approval after changing the bargain', () => {
    for (const suffix of ['payment-of-amounts-due', 'title-to-equipment', 'default-remedies', 'guaranty-of-payment']) {
      expect(record(suffix).version).toBeGreaterThan(1);
      expect(record(suffix).status).toBe('draft');
      expect(record(suffix).source).toEqual({ kind: 'attorney-drafted', author: null });
    }
  });
});

it('distinguishes $1 completion from a subscription renewal without a purchase option', () => {
  const lease =
    libraryFor('equipment-lease').find((entry) =>
      entry.slug.endsWith('.purchase-return-or-continuation-of-equipment-at-end-of-lease-term'),
    )?.body ?? '';
  const subscription =
    libraryFor('subscription').find((entry) =>
      entry.slug.endsWith('.return-or-continuation-of-equipment-at-end-of-subscription-term'),
    )?.body ?? '';
  expect(lease).toMatch(/elect.*purchase.*signing/i);
  expect(lease).toMatch(/final scheduled.*payment/i);
  expect(lease).toMatch(/no automatic renewal/i);
  expect(lease).not.toMatch(/if you do not tell us|must give us written notice at least thirty/i);
  expect(subscription).toMatch(/no purchase option/i);
  expect(subscription).toMatch(/month-to-month/i);
  expect(subscription).toMatch(/billing stops/i);
});
