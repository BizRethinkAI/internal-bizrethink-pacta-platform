import type { ClauseField } from './types';

/** Current document bindings; source widgets are evidence, never fill instructions. */
const field = (
  binding: string,
  label: string,
  kind: ClauseField['kind'] = 'text',
  required = true,
  legacyWidget?: string,
  id = binding,
): ClauseField => ({
  binding,
  label,
  widget: `{{field:${id}}}`,
  kind,
  required,
  ...(legacyWidget ? { legacyWidget } : {}),
});

/** Values come from provider configuration or the transaction, never a label formula. */
export const MCA_FUNDING_FIELDS: ClauseField[] = [
  field('merchant.legalName', 'Merchant — Legal Name', 'text', true, '«0»'),
  field('merchant.dba', 'Merchant — DBA (if any)', 'text', false, '«1»'),
  field('merchant.documentTaxIdentifier', 'Merchant — EIN or masked tax identifier', 'text', false, '«2»'),
  field('merchant.entityType', 'Merchant — Entity Type', 'text', true, '«3»'),
  field('merchant.formationState', 'Merchant — State of Formation', 'text', true, '«4»'),
  field('merchant.signerCapacity', 'Merchant — Authorized Signer Capacity', 'text', true, '«5»'),
  field('merchant.contactName', 'Merchant — Primary Contact', 'text', true, '«6»'),
  field('merchant.phone', 'Merchant — Phone', 'text', true, '«7»'),
  field('merchant.email', 'Merchant — Email for Notices', 'text', true, '«8»'),
  field('merchant.businessAddress', 'Merchant — Business Address', 'text', true, '«9»'),
  field('merchant.noticeAddress', 'Merchant — Mailing Address for Notices', 'text', true, '«10»'),
  field('account.bankName', 'Deposit Account — Bank Name', 'text', true, '«11»'),
  field('account.documentIdentifier', 'Deposit Account — Document Identifier (masked)', 'text', true, '«12»'),
  field('account.routingNumber', 'Deposit Account — Routing Number', 'text', true, '«13»'),
  field('funding.purchasePrice', 'Funding Terms — Purchase Price / Funds Provided', 'currency', true, '«14»'),
  field('funding.factorRate', 'Funding Terms — Factor Rate', 'text', false, '«15»'),
  field(
    'equipment.deferredCharge',
    'Equipment — Separate Deferred Charge (excluded from Purchased Amount)',
    'currency',
    false,
    '«18»',
  ),
  field('funding.specifiedPercentage', 'Funding Terms — Specified Percentage of Card Receipts', 'text', true, '«17»'),
  field('funding.purchasedAmount', 'Funding Terms — Purchased Amount (receipts only)', 'currency', true, '«16»'),
  field('funding.collectionFrequency', 'Funding Terms — Processor Settlement Frequency', 'text', true, '«19»'),
  field(
    'funding.estimatedDailyHoldback',
    'Funding Terms — Estimated Daily Holdback (not a required payment)',
    'currency',
    true,
    '«20»',
  ),
  field('funding.holdbackEffectiveDate', 'Funding Terms — Holdback Estimate Effective Date', 'date', true, '«86»'),
  field(
    'funding.purchasePrice',
    'Itemization — Purchase Price / Funds Provided',
    'currency',
    true,
    '«21»',
    'itemization.purchasePrice',
  ),
  field('funding.priorPrincipal', 'Itemization — Prior Loan Principal Settled (if any)', 'currency', true, '«22»'),
  field(
    'funding.originationFeePercentage',
    'Itemization — Origination Fee Percentage (if used)',
    'text',
    false,
    '«23»',
  ),
  field('funding.originationFee', 'Itemization — Origination Fee Deducted', 'currency', true, '«24»'),
  field('equipment.upfrontCharge', 'Itemization — Separate Equipment Charge Paid at Funding', 'currency', true, '«84»'),
  field('funding.cashToMerchant', 'Itemization — Cash Disbursed to Merchant', 'currency', true, '«26»'),
  field(
    'funding.financeCharge',
    'Disclosure — Finance Charge / Financing Cost (supplied calculation, if applicable)',
    'currency',
    false,
    '«28»',
  ),
  field('processor.approvedProcessors', 'Approved Processors — All Approved Processors', 'text', true, '«27»'),
  field('funding.priorUnpaidCharges', 'Itemization — Separately Identified Unpaid Prior Charges', 'currency'),
  field(
    'funding.priorReceivablesSettlement',
    'Itemization — Prior Receivables Purchase Settlement (if any)',
    'currency',
  ),
  field(
    'funding.priorSettlementDetails',
    'Itemization — Prior Counterparty, Settlement Method and Payment Instructions',
    'text',
    false,
  ),
  field('funding.otherDeductions', 'Itemization — Other Deductions, Each Payee, Purpose and Amount', 'text'),
  field(
    'funding.financeChargeMethod',
    'Disclosure — Applicable Jurisdiction, Product and Calculation Method',
    'text',
    false,
  ),
  field('provider.noticeAddress', 'Buyer — Mailing Address for Notices'),
  field('provider.noticeEmail', 'Buyer — Email for Notices'),
  field('provider.reconciliationEmail', 'Buyer — Reconciliation Request Email'),
  field('provider.reconciliationAddress', 'Buyer — Reconciliation Request Mailing Address'),
  field('provider.servicingPhone', 'Buyer — Servicing Phone'),
  field('funding.conditions', 'Funding — Conditions That Must Be Satisfied'),
  field('funding.deadline', 'Funding — Deadline, Time and Time Zone'),
  field('funding.offerExpiresAt', 'Offer — Expiration Date, Time and Time Zone'),
  field('funding.effectiveDate', 'Agreement — Effective Date', 'date'),
  field('funding.exhibits', 'Agreement — Identified Exhibits and Versions'),
  field('broker.compensation', 'Broker / ISO — Identity, Compensation and Payee (if applicable)', 'text', false),
];

export const mcaGuarantorFields = (legacy: {
  name: string;
  address: string;
  phone: string;
  capacity?: string;
  email?: string;
}): ClauseField[] => [
  field('guarantor.kind', 'Guarantor — Individual or Entity'),
  field('guarantor.legalName', 'Guarantor — Full Legal Name', 'text', true, legacy.name),
  field('guarantor.noticeAddress', 'Guarantor — Address for Notices', 'text', true, legacy.address),
  field('guarantor.phone', 'Guarantor — Phone', 'text', true, legacy.phone),
  field('guarantor.email', 'Guarantor — Email for Notices', 'text', true, legacy.email),
  {
    ...field('guarantor.signerName', 'Entity Guarantor — Authorized Signer Printed Name', 'text', false),
    requiredWhen: { binding: 'guarantor.kind', equals: 'entity' },
  },
  {
    ...field('guarantor.signerCapacity', 'Entity Guarantor — Signer Capacity', 'text', false, legacy.capacity),
    requiredWhen: { binding: 'guarantor.kind', equals: 'entity' },
  },
  field('guarantor.signature', 'Guarantor — Separate Guaranty Signature', 'signature'),
  field('guarantor.signedDate', 'Guarantor — Signature Date', 'date'),
];

/** Explicit retirement preserves evidence without retaining a document-visible SSN slot. */
export const retiredGuarantorSsn = (widget: string) => ({
  widget,
  reason:
    'Full government identifiers are collected through a secure channel separate from the agreement; this source SSN slot is retired from document fields.',
});
