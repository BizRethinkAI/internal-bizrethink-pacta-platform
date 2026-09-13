import { describe, expect, it } from 'vitest';

import { mcaClauseFingerprint } from '../approval';
import { documentLines, linesNotAccountedFor } from '../documents';
import { ALL_MCA_CLAUSES } from '../library';

const find = (slug: string) => {
  const clause = ALL_MCA_CLAUSES.find((entry) => entry.slug === slug);
  if (!clause) {
    throw new Error(`Missing fixture: ${slug}`);
  }
  return clause;
};

describe('document fields express the reviewed funding and identity bargain', () => {
  it('keeps equipment, prior principal, unpaid charges and cash distinct from the purchased amount', () => {
    const fields = find('frpa.merchant-and-funding-information').fields ?? [];
    expect(fields.map((field) => field.label).join('\n')).not.toMatch(
      /Payback|Purchased Amount less Net Amount Funded/,
    );
    for (const binding of [
      'funding.purchasePrice',
      'funding.purchasedAmount',
      'funding.cashToMerchant',
      'funding.priorPrincipal',
      'funding.priorReceivablesSettlement',
      'funding.priorUnpaidCharges',
      'funding.otherDeductions',
      'funding.financeCharge',
      'funding.financeChargeMethod',
      'equipment.upfrontCharge',
      'equipment.deferredCharge',
    ]) {
      expect(fields, binding).toEqual(expect.arrayContaining([expect.objectContaining({ binding })]));
    }
  });

  it('represents the contacts, funding conditions and dates that the agreement actually references', () => {
    const fields = find('frpa.merchant-and-funding-information').fields ?? [];
    for (const binding of [
      'provider.noticeEmail',
      'provider.noticeAddress',
      'provider.reconciliationEmail',
      'funding.conditions',
      'funding.deadline',
      'funding.offerExpiresAt',
      'funding.effectiveDate',
      'funding.exhibits',
      'broker.compensation',
    ]) {
      expect(fields, binding).toEqual(expect.arrayContaining([expect.objectContaining({ binding })]));
    }
    expect(fields).toEqual(
      expect.arrayContaining([expect.objectContaining({ binding: 'merchant.dba', required: false })]),
    );
  });

  it.each([
    ['frpa.guarantor-information-9-1', '«37»'],
    ['equipment-lease.guarantor-information', '«22»'],
    ['subscription.guarantor-information', '«22»'],
  ])('%s provides separate repeatable identities and signatures without a full SSN slot', (slug, retiredWidget) => {
    const clause = find(slug);
    expect(clause).toMatchObject({ repeatFor: 'guarantor' });
    const fields = clause.fields ?? [];
    expect(fields.some((field) => /Social Security|full tax/i.test(field.label) || field.kind === 'ssn')).toBe(false);
    expect(fields.map((field) => field.widget)).not.toContain(retiredWidget);
    for (const binding of [
      'guarantor.kind',
      'guarantor.legalName',
      'guarantor.noticeAddress',
      'guarantor.signature',
      'guarantor.signedDate',
    ]) {
      expect(fields, binding).toEqual(expect.arrayContaining([expect.objectContaining({ binding, required: true })]));
    }
    expect(fields).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          binding: 'guarantor.signerName',
          requiredWhen: { binding: 'guarantor.kind', equals: 'entity' },
        }),
        expect.objectContaining({
          binding: 'guarantor.signerCapacity',
          requiredWhen: { binding: 'guarantor.kind', equals: 'entity' },
        }),
      ]),
    );
    expect(clause).toMatchObject({
      retiredFields: expect.arrayContaining([
        expect.objectContaining({ widget: retiredWidget, reason: expect.stringMatching(/secure|separate/i) }),
      ]),
    });
  });

  it('uses stable current placeholders while keeping source anchors as historical evidence', () => {
    for (const clause of ALL_MCA_CLAUSES.filter((entry) => entry.fields)) {
      const fields = clause.fields ?? [];
      expect(new Set(fields.map((field) => field.widget)).size).toBe(fields.length);
      for (const field of fields) {
        expect(field).toMatchObject({
          binding: expect.stringMatching(/^(merchant|provider|funding|equipment|broker|guarantor|account|processor)\./),
        });
        expect(field.widget).toMatch(/^\{\{field:[a-zA-Z0-9.-]+\}\}$/);
      }
    }
  });

  it('invalidates approval when the repeatable signer boundary changes', () => {
    const original = find('frpa.guarantor-information-9-1');
    expect(mcaClauseFingerprint({ ...original, repeatFor: undefined })).not.toBe(mcaClauseFingerprint(original));
  });

  it('does not let new fields without source anchors account for unrelated historical document lines', () => {
    const file = 'Lombard_FRPA_v4.txt';
    const grid = documentLines(file).find((line) => line.startsWith('[TABLE] 1.1 MERCHANT INFORMATION'));
    expect(grid).toBeDefined();
    const missing = linesNotAccountedFor(
      file,
      [{ heading: 'New fields', body: '', fields: [{ widget: '{{field:merchant.legalName}}' }] }],
      [],
    );
    expect(missing).toContain(grid);
  });
});
