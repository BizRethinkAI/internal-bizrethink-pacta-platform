import type { McaInstrument } from '../clauses/instruments';

/**
 * What the builder would put in each widget of the templates now in use.
 *
 * ADR 0023 §3: parity before the first publication. This is the measurement it
 * asks for, and the thing being matched is the **AcroForm widget name**, not
 * the field label — `lombard-platform` prefills by name (`formValues`) and
 * sends `prefillFields: []`. The names themselves are pinned in
 * `live-template-contract.json`, extracted from the records the platform ships;
 * this file says, for each of them, either which binding fills it or why
 * nothing does.
 *
 * A GAP IS A CLAIM ABOUT THE LIBRARY, so `template-parity.test.ts` checks each
 * one against the library rather than trusting the note. A gap that closes
 * fails the test, which is the point: the list is meant to shrink deliberately
 * and never to rot quietly.
 */
export type WidgetParity =
  /** A field a clause of this instrument carries; the builder emits this widget. */
  | { binding: string }
  /** Deliberately not emitted. The document is different from the live one, on purpose. */
  | { gap: 'retired'; why: string }
  /** Not a fill slot here at all: clause selection settles it before a widget could exist. */
  | { gap: 'compile-time'; why: string }
  /** The library holds no fact for this. `candidate` names the binding it would be given. */
  | { gap: 'unmodelled'; why: string; candidate?: string }
  /** The binding exists, but no clause of THIS instrument carries it. */
  | { gap: 'absent-from-instrument'; binding: string; why: string }
  /** ADR 0019: the processor's document, used exactly as supplied. */
  | { gap: 'processor-controlled'; why: string };

const RETIRED_SSN = {
  gap: 'retired',
  why: 'Full government identifiers are collected through a secure channel separate from the agreement (`retiredGuarantorSsn`). Builder output is therefore not a drop-in for this template.',
} as const;

const PROCESSOR = (field: string): WidgetParity => ({
  gap: 'processor-controlled',
  why: `Payzli's ${field}. ADR 0019: the letter is the processor's, used exactly as supplied and never authored here.`,
});

/**
 * The lease and the subscription are one clause published in two documents
 * (`instruments.ts`), so they fill one template's widgets identically. The
 * platform agrees more than the library does: it has no `equipment-lease` kind
 * and resolves `subscription` to this same template.
 */
const EQUIPMENT: Record<string, WidgetParity> = {
  effective_date: { binding: 'equipment.effectiveDate' },
  equipment_description: { binding: 'equipment.description' },
  equipment_location: { binding: 'equipment.location' },
  equipment_quantity: { binding: 'equipment.quantity' },
  guarantor_full_name: { binding: 'guarantor.legalName' },
  guarantor_home_address: { binding: 'guarantor.noticeAddress' },
  guarantor_home_phone: { binding: 'guarantor.phone' },
  guarantor_ssn: RETIRED_SSN,
  // The widget name carries the funder's own name. A second funder publishing
  // from this builder cannot reuse it, so the name has to change at the first
  // publication and the platform has to be told — the clearest single argument
  // for ADR 0023's decision that Pacta owns the record of what was published.
  lombard_signer_name: { binding: 'signers.equipmentProvider.name' },
  lombard_signer_title: { binding: 'signers.equipmentProvider.capacity' },
  monthly_subscription_amount: { binding: 'equipment.monthlyCharge' },
  provider_address: { binding: 'equipment.providerAddress' },
  provider_legal_name: { binding: 'equipment.providerLegalName' },
  subscriber_business_address: { binding: 'merchant.businessAddress' },
  subscriber_business_type: {
    gap: 'unmodelled',
    why: 'The trade the merchant is in ("Restaurant", "Retail"). Underwriting context rather than a term of the agreement, and no clause states it.',
    candidate: 'merchant.businessType',
  },
  subscriber_cell_phone: {
    gap: 'unmodelled',
    why: 'A second phone number beside the business line. The notice clauses name one number, and nothing distinguishes a mobile.',
    candidate: 'merchant.mobilePhone',
  },
  subscriber_dba_name: { binding: 'merchant.dba' },
  subscriber_email: { binding: 'merchant.email' },
  subscriber_entity_type: { binding: 'merchant.entityType' },
  subscriber_legal_name: { binding: 'merchant.legalName' },
  subscriber_mailing_address: { binding: 'merchant.noticeAddress' },
  subscriber_phone: { binding: 'merchant.phone' },
  subscriber_signer_name: { binding: 'signers.merchant.name' },
  subscriber_signer_title: { binding: 'signers.merchant.capacity' },
  subscriber_state: {
    gap: 'absent-from-instrument',
    binding: 'merchant.principalState',
    why: 'The state of the business, which the FRPA needs for its venue guard and carries as a field. No lease or subscription clause asks for it.',
  },
  subscriber_tax_id: { binding: 'merchant.documentTaxIdentifier' },
  subscription_start_date: { binding: 'equipment.commencementDate' },
  subscription_term_months: { binding: 'equipment.termMonths' },
};

export const WIDGET_PARITY: Record<McaInstrument, Record<string, WidgetParity>> = {
  frpa: {
    aba_routing_number: { binding: 'account.routingNumber' },
    bank_name: { binding: 'account.bankName' },
    buyer_signer_name: { binding: 'signers.buyer.name' },
    buyer_signer_title: { binding: 'signers.buyer.capacity' },
    // The live widget takes a full account number; the binding is masked by
    // schema and cannot hold one. Same widget, narrower value.
    checking_account_number: { binding: 'account.documentIdentifier' },
    effective_date: { binding: 'funding.effectiveDate' },
    equipment_defer_amount: { binding: 'equipment.deferredCharge' },
    equipment_upfront_fee: { binding: 'equipment.upfrontCharge' },
    estimated_daily_holdback: { binding: 'funding.estimatedDailyHoldback' },
    factor_rate: { binding: 'funding.factorRate' },
    guarantor_email: { binding: 'guarantor.email' },
    guarantor_full_name: { binding: 'guarantor.legalName' },
    guarantor_home_address: { binding: 'guarantor.noticeAddress' },
    guarantor_phone: { binding: 'guarantor.phone' },
    guarantor_ssn: RETIRED_SSN,
    guarantor_title: { binding: 'guarantor.signerCapacity' },
    holdback_effective_date: { binding: 'funding.holdbackEffectiveDate' },
    merchant_business_address: { binding: 'merchant.businessAddress' },
    merchant_dba_name: { binding: 'merchant.dba' },
    merchant_entity_type: { binding: 'merchant.entityType' },
    merchant_legal_name: { binding: 'merchant.legalName' },
    merchant_mailing_address: { binding: 'merchant.noticeAddress' },
    merchant_primary_contact_email: { binding: 'merchant.email' },
    merchant_primary_contact_name: { binding: 'merchant.contactName' },
    merchant_primary_contact_phone: { binding: 'merchant.phone' },
    merchant_primary_contact_title: {
      gap: 'unmodelled',
      why: "The job title of the day-to-day contact, who need not be the signer. `merchant.signerCapacity` is the signer's authority to bind and is a different fact.",
      candidate: 'merchant.contactTitle',
    },
    merchant_signer_name: { binding: 'signers.merchant.name' },
    merchant_signer_title: { binding: 'signers.merchant.capacity' },
    merchant_state_of_incorporation: { binding: 'merchant.formationState' },
    merchant_tax_id: { binding: 'merchant.documentTaxIdentifier' },
    net_amount_funded: { binding: 'funding.cashToMerchant' },
    origination_fee: { binding: 'funding.originationFee' },
    origination_fee_pct: { binding: 'funding.originationFeePercentage' },
    prior_balances: { binding: 'funding.priorPrincipal' },
    processor_name: { binding: 'processor.approvedProcessors' },
    provider_address: { binding: 'provider.principalAddress' },
    purchase_price: { binding: 'funding.purchasePrice' },
    purchased_amount: { binding: 'funding.purchasedAmount' },
    remittance_frequency: { binding: 'funding.collectionFrequency' },
    rollover_method: {
      gap: 'compile-time',
      why: 'Deduct and carry are alternative §8.2 clauses (`frpa.rollover-methods-8-2`, `frpa.rollover-carry-method-8-2`), so the election decides which wording is in the document rather than what a widget says. Printing the method into a slot beside wording that already states it is how the two disagree.',
    },
    specified_percentage: { binding: 'funding.specifiedPercentage' },
    total_cost_of_financing: { binding: 'funding.financeCharge' },
  },
  'equipment-lease': EQUIPMENT,
  subscription: EQUIPMENT,
  'iso-pra': {
    commission_percentage: { binding: 'iso.commissionPercentage' },
    company_signer_name: { binding: 'signers.isoCompany.name' },
    company_signer_title: { binding: 'signers.isoCompany.capacity' },
    effective_date: { binding: 'iso.effectiveDate' },
    iso_partner_dba_name: {
      gap: 'unmodelled',
      why: 'A trading name for the partner. The agreement names the partner by legal name throughout, and §2.6 constrains what the partner may say under either name.',
      candidate: 'iso.partnerDba',
    },
    iso_partner_legal_name: { binding: 'iso.partnerLegalName' },
    iso_partner_principal_name: { binding: 'signers.isoPartner.name' },
    iso_partner_principal_title: { binding: 'signers.isoPartner.capacity' },
    provider_legal_name: { binding: 'iso.companyLegalName' },
  },
  'permission-to-release': {
    effective_date: { binding: 'funding.effectiveDate' },
    guarantor_name: { binding: 'report.subjectName' },
    merchant_business_address: { binding: 'merchant.businessAddress' },
    merchant_dba_name: { binding: 'merchant.dba' },
    merchant_legal_name: { binding: 'merchant.legalName' },
    merchant_primary_contact_email: {
      gap: 'absent-from-instrument',
      binding: 'merchant.email',
      why: 'The permission identifies the merchant and the report subject; no clause of it gives an address for notices, because nothing is served under it.',
    },
    merchant_primary_contact_phone: {
      gap: 'absent-from-instrument',
      binding: 'merchant.phone',
      why: 'As above. The live form reproduces the FRPA contact block; the clauses here do not ask for it.',
    },
    merchant_signer_name: { binding: 'signers.merchant.name' },
    merchant_signer_title: { binding: 'signers.merchant.capacity' },
    provider_legal_name: {
      gap: 'absent-from-instrument',
      binding: 'provider.legalName',
      why: 'The recipient of the released information is named in the clause body rather than in a field, so there is no binding for it on this instrument.',
    },
  },
  'split-funding': {
    frpa_effective_date: PROCESSOR('date of the agreement the split is opened for'),
    merchant_dba_name: PROCESSOR('merchant trading name'),
    merchant_legal_name: PROCESSOR('merchant legal name'),
    merchant_principal_name: PROCESSOR('signing principal'),
    merchant_principal_title: PROCESSOR('signing principal’s title'),
    provider_address: PROCESSOR('payee address'),
    provider_bank_account: PROCESSOR('payee account number'),
    provider_bank_name: PROCESSOR('payee bank'),
    provider_bank_routing: PROCESSOR('payee routing number'),
    provider_contact: PROCESSOR('payee contact'),
    provider_legal_name: PROCESSOR('payee legal name'),
    purchased_amount: PROCESSOR('amount the split runs against'),
    split_percentage: PROCESSOR('percentage withheld'),
  },
};
