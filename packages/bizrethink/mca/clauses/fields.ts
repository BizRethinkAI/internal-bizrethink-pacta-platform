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
  // Both venue clauses name the state of the merchant's principal place of
  // business, and it lived only inside the free-text business address, where
  // no check could read it. State of formation is a different fact: a Delaware
  // company trading in Virginia is a Virginia recipient.
  field('merchant.principalState', 'Merchant — State of Principal Place of Business', 'text', true),
  field('merchant.signerCapacity', 'Merchant — Authorized Signer Capacity', 'text', true, '«5»'),
  field('merchant.contactName', 'Merchant — Primary Contact', 'text', true, '«6»'),
  field('merchant.phone', 'Merchant — Phone', 'text', true, '«7»'),
  field('merchant.email', 'Merchant — Email for Notices', 'text', true, '«8»'),
  field('merchant.businessAddress', 'Merchant — Business Address', 'text', true, '«9»'),
  field('merchant.noticeAddress', 'Merchant — Mailing Address for Notices', 'text', true, '«10»'),
  field('merchant.designatedEmail', 'Merchant — Different Designated Notice Email (if any)', 'text', false),
  field('merchant.designatedNoticeAddress', 'Merchant — Different Designated Notice Address (if any)', 'text', false),
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
  field('provider.legalName', 'Buyer — Legal Name'),
  field('provider.entityType', 'Buyer — Entity Type'),
  field('provider.organizationState', 'Buyer — Formation Jurisdiction'),
  field('provider.principalAddress', 'Buyer — Principal Address'),
  field('provider.noticeAddress', 'Buyer — Mailing Address for Notices'),
  field('provider.noticeEmail', 'Buyer — Email for Notices'),
  field('provider.venueForum', 'Buyer — Forum for actions under the Agreement', 'text', false),
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

/** Equipment has its own counterparty, price, term, insurance and completion schedule. */
export const MCA_EQUIPMENT_FIELDS: ClauseField[] = [
  field('merchant.legalName', 'Customer — Legal Name', 'text', true, '«0»'),
  field('merchant.dba', 'Customer — DBA (if any)', 'text', false, '«1»'),
  field('merchant.documentTaxIdentifier', 'Customer — EIN or masked tax identifier', 'text', false, '«2»'),
  field('merchant.entityType', 'Customer — Entity Type', 'text', true, '«3»'),
  field('merchant.formationState', 'Customer — State of Formation', 'text', true, '«4»'),
  field('merchant.phone', 'Customer — Phone', 'text', true, '«6»'),
  field('merchant.email', 'Customer — Notice Email', 'text', true, '«9»'),
  field('merchant.noticeAddress', 'Customer — Notice Address', 'text', true, '«10»'),
  field('merchant.businessAddress', 'Customer — Business Address', 'text', true, '«11»'),
  field('equipment.description', 'Equipment — Manufacturer and Model', 'text', true, '«12»'),
  field('equipment.serialNumbers', 'Equipment — Serial Numbers (record on delivery)', 'text', false),
  field('equipment.quantity', 'Equipment — Quantity', 'text', true, '«13»'),
  field('equipment.location', 'Equipment — Installation Site', 'text', true, '«14»'),
  field('equipment.monthlyCharge', 'Equipment — Monthly Charge', 'currency', true, '«15»'),
  field('equipment.termMonths', 'Equipment — Initial Term in Months', 'text', true, '«16»'),
  field('equipment.agreementNumber', 'Equipment — Agreement Number'),
  field('equipment.effectiveDate', 'Equipment — Effective Date', 'date', true, '«20»'),
  field('equipment.scheduledDeliveryDate', 'Equipment — Agreed Delivery Date', 'date'),
  field('equipment.deliveryDate', 'Equipment — Actual Delivery Date (record on delivery)', 'date', false),
  field('equipment.commencementDate', 'Equipment — Agreed Commencement Date', 'date'),
  field('equipment.finalPaymentDate', 'Equipment — Final Scheduled Payment Date', 'date'),
  field('equipment.interimCharge', 'Equipment — Itemized Interim Charge', 'currency'),
  field('equipment.deliveryCharge', 'Equipment — Delivery Charge', 'currency'),
  field('equipment.installationCharge', 'Equipment — Installation Charge', 'currency'),
  field(
    'equipment.purchasePrice',
    'Equipment — Completion Purchase Price ($1 for Lease; $0 for Subscription)',
    'currency',
  ),
  field('equipment.estimatedTaxes', 'Equipment — Estimated Taxes', 'currency'),
  field('equipment.taxBasis', 'Equipment — Tax Jurisdiction, Base and Rate'),
  field('equipment.scheduledTotal', 'Equipment — Supplied Itemized Scheduled Total', 'currency'),
  field('equipment.paymentSchedule', 'Equipment — Each Amount and Due Date, Including Initial Payment'),
  field('equipment.providerLegalName', 'Equipment Provider — Legal Name', 'text', true, '«37»'),
  field('equipment.providerEntityType', 'Equipment Provider — Entity Type'),
  field('equipment.providerFormationState', 'Equipment Provider — Formation State'),
  field('equipment.providerAddress', 'Equipment Provider — Principal Address', 'text', true, '«41»'),
  field('equipment.providerNoticeAddress', 'Equipment Provider — Notice Address', 'text', true, '«43»'),
  field('equipment.providerNoticeEmail', 'Equipment Provider — Notice Email'),
  field('equipment.creditDisputeAddress', 'Equipment Provider — Credit Reporting Dispute Address'),
  field('equipment.returnAddress', 'Equipment — Return Address', 'text', true, '«42»'),
  field('equipment.insuranceRequirements', 'Equipment — Required Coverage and Amount'),
  field('equipment.lossPayee', 'Equipment — Loss Payee and Insurable Interest', 'text', true, '«45»'),
  field('equipment.compatibility', 'Equipment — Express Compatibility Commitments'),
  field('equipment.softwareSchedule', 'Software — Rights Granted, Third-party Terms and Support'),
  field('equipment.supplierWarranties', 'Equipment — Supplier Warranties and Service Process'),
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

/** Provider/channel identity stays separate from merchant transaction facts. */
export const MCA_ISO_FIELDS: ClauseField[] = [
  field('iso.companyLegalName', 'Company — Legal Name', 'text', true, '«10»'),
  field('iso.partnerLegalName', 'ISO Partner — Legal Name', 'text', true, '«1»'),
  field('iso.effectiveDate', 'ISO Agreement — Effective Date', 'date', true, '«0»'),
  field('iso.commissionPercentage', 'ISO — Commission Percentage', 'text', true, '«2»'),
  field('iso.portalUrl', 'Company — Partner Portal URL'),
];

/** Execution locations are reviewable helpers. The draft filler never accepts signature/date values. */
export const mcaExecutionFields = (
  roles: readonly ('buyer' | 'merchant' | 'equipmentProvider' | 'isoCompany' | 'isoPartner')[],
): ClauseField[] =>
  roles.flatMap((role) => {
    const labels = {
      buyer: 'Buyer',
      merchant: 'Merchant',
      equipmentProvider: 'Equipment Provider',
      isoCompany: 'ISO Company',
      isoPartner: 'ISO Partner',
    };
    // A SIGNER'S EMAIL IS NOT A DOCUMENT FIELD. It is how the envelope reaches
    // the person, supplied per send in the recipients payload, and no live
    // template has a widget for one. The envelope owns it, and
    // printing it into the page would duplicate a fact the envelope already
    // holds, in a document the merchant signs.
    return [
      field(`signers.${role}.name`, `${labels[role]} — Authorized Signer Printed Name`),
      field(`signers.${role}.capacity`, `${labels[role]} — Signer Capacity`),
      field(`signers.${role}.signature`, `${labels[role]} — Separate Signature`, 'signature'),
      field(`signers.${role}.signedDate`, `${labels[role]} — Signature Date`, 'date'),
    ];
  });

export const MCA_REPORT_FIELDS: ClauseField[] = [
  field('transaction.reference', 'Permission — Identified Transaction Reference'),
  field('funding.effectiveDate', 'Permission — Application or Agreement Date', 'date'),
  field('merchant.legalName', 'Permission — Merchant Legal Name'),
  field('merchant.dba', 'Permission — Merchant DBA (if any)', 'text', false),
  field('merchant.businessAddress', 'Permission — Merchant Principal Address'),
  field('report.subjectName', 'Individual Instructions — Report Subject Full Legal Name'),
  field('report.reportingAgency', 'Individual Instructions — Consumer Reporting Agency'),
];
