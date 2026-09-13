import { describe, expect, it } from 'vitest';
import { compileMcaTemplate } from '../templates/compile';
import { providerFixture } from '../templates/profile.fixture';
import { fillMcaDraft } from './fill';
import { emptyMcaDraftInput } from './input';

const template = () => compileMcaTemplate(providerFixture());

describe('transaction filling cannot silently change provider policy or invent completion', () => {
  it('reports missing transaction fields and remains an unsigned internal draft', () => {
    const result = fillMcaDraft(template(), emptyMcaDraftInput());
    expect(result.readyToSend).toBe(false);
    expect(result.missing).toContainEqual(expect.objectContaining({ binding: 'merchant.legalName' }));
    expect(result.blockers).toContainEqual(expect.objectContaining({ kind: 'legal-review' }));
    expect(result.blockers).toContainEqual(expect.objectContaining({ kind: 'disclosures' }));
    expect(result.blockers).toContainEqual(expect.objectContaining({ kind: 'processor-acceptance' }));
  });
  it.each([
    'provider.legalName',
    'processor.approvedProcessors',
    'not.a.field',
    'guarantor.signature',
    'guarantor.signedDate',
  ])('rejects the forbidden fill key %s', (binding) => {
    expect(() => fillMcaDraft(template(), { ...emptyMcaDraftInput(), values: { [binding]: 'invented' } })).toThrow();
  });
  it.each(['123-45-6789', '123456789'])('refuses a full personal identifier %s in the document tax field', (value) => {
    expect(() =>
      fillMcaDraft(template(), { ...emptyMcaDraftInput(), values: { 'merchant.documentTaxIdentifier': value } }),
    ).toThrow();
  });
  it('allows a properly designated EIN and a masked deposit account, but never a full account', () => {
    expect(() =>
      fillMcaDraft(template(), {
        ...emptyMcaDraftInput(),
        values: { 'merchant.documentTaxIdentifier': '12-3456789', 'account.documentIdentifier': '****1234' },
      }),
    ).not.toThrow();
    expect(() =>
      fillMcaDraft(template(), { ...emptyMcaDraftInput(), values: { 'account.documentIdentifier': '123456789012' } }),
    ).toThrow();
  });
  it.each(['-1.00', '100.001', '1e5', 'Infinity', '1,000.00'])('rejects ambiguous or invalid money %s', (value) => {
    expect(() =>
      fillMcaDraft(template(), { ...emptyMcaDraftInput(), values: { 'funding.purchasePrice': value } }),
    ).toThrow();
  });
  it('uses one supplied purchase price in both placements, independently of equipment and finance charge', () => {
    const result = fillMcaDraft(template(), {
      ...emptyMcaDraftInput(),
      values: {
        'funding.purchasePrice': '10000.00',
        'funding.purchasedAmount': '14000.00',
        'funding.financeCharge': '5000.00',
      },
    });
    const fields = result.documents.flatMap((document) => document.items.flatMap((item) => item.fields));
    expect(fields.filter((field) => field.binding === 'funding.purchasePrice').map((field) => field.value)).toEqual([
      '10000.00',
      '10000.00',
    ]);
    expect(fields.find((field) => field.binding === 'funding.financeCharge')?.value).toBe('5000.00');
  });
  it('rejects an equipment election or individual report outside the saved provider programme', () => {
    expect(() => fillMcaDraft(template(), { ...emptyMcaDraftInput(), equipmentElection: 'lease' })).toThrow();
    expect(() =>
      fillMcaDraft(template(), {
        ...emptyMcaDraftInput(),
        reportSubjects: [{ name: 'Test Person', reportingAgency: 'Test Agency' }],
      }),
    ).toThrow();
  });
  it('does not accept a forged signature or processor acceptance as ordinary draft input', () => {
    expect(() => fillMcaDraft(template(), { ...emptyMcaDraftInput(), processorSplitAccepted: true })).toThrow();
    expect(() => fillMcaDraft(template(), { ...emptyMcaDraftInput(), signature: 'Signed' })).toThrow();
  });
});

it('selects the merchant’s equipment election and keeps each guaranty in its own instrument', () => {
  const profile = providerFixture();
  const { reconciliationEmail: _email, reconciliationAddress: _address, ...entity } = profile.buyer;
  const offered = compileMcaTemplate({
    ...profile,
    policy: { ...profile.policy, equipment: 'merchant-elects' },
    equipmentProvider: entity,
  });
  const input = emptyMcaDraftInput();
  input.equipmentElection = 'lease';
  const common = {
    kind: 'individual' as const,
    noticeAddress: 'Synthetic notice address',
    phone: '',
    email: 'test@example.invalid',
    signerName: '',
    signerCapacity: '',
  };
  input.guarantors.frpa = [
    { ...common, legalName: 'First FRPA Person' },
    {
      ...common,
      kind: 'entity',
      legalName: 'Second FRPA Entity',
      signerName: 'Entity Officer',
      signerCapacity: 'President',
    },
  ];
  input.guarantors['equipment-lease'] = [{ ...common, legalName: 'Equipment Person' }];
  const result = fillMcaDraft(offered, input);
  expect(result.documents.map((document) => document.instrument)).toEqual(['frpa', 'equipment-lease']);
  const frpa = result.documents.find((document) => document.instrument === 'frpa')!;
  const lease = result.documents.find((document) => document.instrument === 'equipment-lease')!;
  expect(
    frpa.items
      .filter((item) => item.repeatFor)
      .map((item) => item.fields.find((field) => field.binding === 'guarantor.legalName')?.value),
  ).toEqual(['First FRPA Person', 'Second FRPA Entity']);
  expect(frpa.signatures).toContainEqual(
    expect.objectContaining({ partyName: 'Second FRPA Entity', signerName: 'Entity Officer', capacity: 'President' }),
  );
  expect(
    lease.signatures.filter((signature) => signature.role === 'Guarantor').map((signature) => signature.partyName),
  ).toEqual(['Equipment Person']);
  expect(JSON.stringify(lease)).not.toContain('First FRPA Person');
  expect(input.guarantors.frpa).toHaveLength(2);
  expect(
    result.documents
      .flatMap((document) => document.items.flatMap((item) => item.fields))
      .filter((field) => field.kind === 'signature')
      .every((field) => field.value === null),
  ).toBe(true);
});

it('creates one permission copy per individual without substituting the merchant representative', () => {
  const profile = providerFixture();
  const offered = compileMcaTemplate({ ...profile, policy: { ...profile.policy, consumerReportPulled: true } });
  const input = emptyMcaDraftInput();
  input.signers.merchant = { name: 'Business Representative', capacity: 'Officer', email: 'business@example.invalid' };
  input.reportSubjects = [
    { name: 'Individual One', reportingAgency: 'Agency One' },
    { name: 'Individual Two', reportingAgency: 'Agency Two' },
  ];
  const result = fillMcaDraft(offered, input);
  const copies = result.documents.filter((document) => document.instrument === 'permission-to-release');
  expect(copies.map((document) => document.id)).toEqual(['permission-to-release-1', 'permission-to-release-2']);
  expect(copies[0].signatures).toContainEqual(
    expect.objectContaining({ role: 'Individual report subject', signerName: 'Individual One' }),
  );
  expect(copies[0].signatures).toContainEqual(
    expect.objectContaining({ role: 'Merchant', signerName: 'Business Representative' }),
  );
  expect(JSON.stringify(copies[0])).not.toContain('Individual Two');
  expect(copies[1].items.flatMap((item) => item.fields)).toContainEqual(
    expect.objectContaining({ binding: 'report.reportingAgency', value: 'Agency Two' }),
  );
  expect(result.readyToSend).toBe(false);
});

it('reports missing entity capacity and rejects a lease charge added to purchased receipts', () => {
  const input = emptyMcaDraftInput();
  input.guarantors.frpa = [
    {
      kind: 'entity',
      legalName: 'Example Entity',
      noticeAddress: 'Example Address',
      phone: '',
      email: '',
      signerName: '',
      signerCapacity: '',
    },
  ];
  const result = fillMcaDraft(template(), input);
  expect(result.missing).toContainEqual(expect.objectContaining({ binding: 'guarantor.signerCapacity' }));
  expect(() => fillMcaDraft(template(), { ...input, values: { 'equipment.deferredCharge': '100.00' } })).toThrow();
});

it.each(['0', '-1', '100.01', '1e2', 'ten'])('rejects an invalid specified percentage %s', (value) => {
  expect(() =>
    fillMcaDraft(template(), { ...emptyMcaDraftInput(), values: { 'funding.specifiedPercentage': value } }),
  ).toThrow();
});
