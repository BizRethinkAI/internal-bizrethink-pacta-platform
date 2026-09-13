import { compileMcaTemplate } from '../templates/compile';
import { providerFixture } from '../templates/profile.fixture';
import { fillMcaDraft } from './fill';
import { emptyMcaDraftInput } from './input';

/** Synthetic review data only; never a product default or evidence of signing/acceptance. */
export const filledDraftFixture = () => {
  const profile = providerFixture();
  profile.buyer.servicingPhone = '+1 555 010 0200';
  const input = emptyMcaDraftInput();
  input.reference = 'SYNTHETIC-DRAFT-001';
  input.values = {
    'merchant.legalName': 'Example Merchant Inc.',
    'merchant.dba': 'Example Shop',
    'merchant.documentTaxIdentifier': '12-3456789',
    'merchant.entityType': 'corporation',
    'merchant.formationState': 'Florida',
    'merchant.contactName': 'Merchant Contact',
    'merchant.phone': '+1 555 010 0300',
    'merchant.email': 'merchant@example.invalid',
    'merchant.businessAddress': '20 Example Avenue, Miami, FL 33101',
    'merchant.noticeAddress': 'PO Box 30, Miami, FL 33101',
    'account.bankName': 'Example Bank',
    'account.documentIdentifier': '****4321',
    'account.routingNumber': '123456780',
    'funding.purchasePrice': '10000.00',
    'funding.purchasedAmount': '14000.00',
    'funding.specifiedPercentage': '10',
    'funding.collectionFrequency': 'Each processor settlement',
    'funding.estimatedDailyHoldback': '100.00',
    'funding.holdbackEffectiveDate': '2026-09-13',
    'funding.priorPrincipal': '0.00',
    'funding.priorUnpaidCharges': '0.00',
    'funding.priorReceivablesSettlement': '0.00',
    'funding.originationFee': '500.00',
    'funding.cashToMerchant': '9500.00',
    'funding.otherDeductions': 'None',
    'funding.financeCharge': '4500.00',
    'funding.financeChargeMethod': 'Synthetic supplied calculation; statutory method review remains outstanding',
    'funding.conditions': 'Separate document and compliance clearance remains required',
    'funding.deadline': '2026-09-20, 5:00 p.m. Eastern',
    'funding.offerExpiresAt': '2026-09-19, 5:00 p.m. Eastern',
    'funding.effectiveDate': '2026-09-13',
    'funding.exhibits': 'Processor form and required disclosures remain to be finalized',
  };
  input.signers.merchant = { name: 'Merchant Signer', email: 'merchant-signer@example.invalid', capacity: 'President' };
  input.signers.buyer = { name: 'Buyer Signer', email: 'buyer-signer@example.invalid', capacity: 'Authorized officer' };
  input.guarantors.frpa = [
    {
      kind: 'individual',
      legalName: 'First Test Guarantor',
      noticeAddress: '40 Example Lane, Miami, FL 33101',
      phone: '+1 555 010 0400',
      email: 'guarantor@example.invalid',
      signerName: '',
      signerCapacity: '',
    },
  ];
  return { template: compileMcaTemplate(profile), input, draft: fillMcaDraft(compileMcaTemplate(profile), input) };
};

/** Exercises the distinct equipment, channel and individual-report documents. */
export const allOptionsDraftFixture = () => {
  const { input, template } = filledDraftFixture();
  const {
    reconciliationEmail: _email,
    reconciliationAddress: _address,
    servicingPhone: _phone,
    ...entity
  } = template.profile.buyer;
  const offered = compileMcaTemplate({
    ...template.profile,
    policy: {
      ...template.profile.policy,
      equipment: 'merchant-elects',
      brokerChannel: true,
      consumerReportPulled: true,
    },
    equipmentProvider: {
      ...entity,
      legalName: 'Example Equipment LLC',
      entityType: 'limited liability company',
      creditDisputeAddress: 'PO Box 50, Dover, DE 19901',
    },
    broker: {
      company: { ...entity, legalName: 'Example Channel Inc.' },
      portalUrl: 'https://partners.example.invalid',
      commissionPercentage: 2.75,
      fixedIsoTermsAccepted: true,
    },
  });
  input.equipmentElection = 'lease';
  input.includeChannelAgreement = true;
  input.reportSubjects = [
    { name: 'First Report Subject', reportingAgency: 'Example Agency One' },
    { name: 'Second Report Subject', reportingAgency: 'Example Agency Two' },
  ];
  input.values['iso.partnerLegalName'] = 'Example Referral Partner LLC';
  input.values['iso.effectiveDate'] = '2026-09-13';
  input.guarantors['equipment-lease'] = [
    {
      ...input.guarantors.frpa[0],
      kind: 'entity',
      legalName: 'Equipment Guarantor LLC',
      signerName: 'Equipment Guarantor Officer',
      signerCapacity: 'Manager',
    },
  ];
  input.signers.equipmentProvider = {
    name: 'Equipment Officer',
    capacity: 'Manager',
    email: 'equipment@example.invalid',
  };
  input.signers.isoCompany = { name: 'Channel Officer', capacity: 'President', email: 'channel@example.invalid' };
  input.signers.isoPartner = {
    name: 'Referral Partner Officer',
    capacity: 'Manager',
    email: 'referral@example.invalid',
  };
  return { template: offered, input, draft: fillMcaDraft(offered, input) };
};
