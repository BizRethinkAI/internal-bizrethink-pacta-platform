import type {
  ContractTerms,
  DisclosureEnvelope,
  Jurisdiction,
  OfferSummaryInstance,
  PaymentDayConvention,
  TermUnit,
} from '../types';

/**
 * Lombard's field names → the statutory quantities.
 *
 * THIS FILE IS ON THE TENANT AXIS, NOT THE JURISDICTION AXIS, and the
 * separation is deliberate rather than tidy. Federal, state, regulatory and
 * generic are jurisdictional; product- and tenant-specific is a different thing
 * entirely, and folding the two together is what breaks the property that makes
 * adding a state safe. `check.ts`, `identities.ts` and `authorities.ts` know
 * nothing about Lombard, `funding_provided`, `frpa.json` or any other vendor
 * artefact, and nothing in this directory is imported by any of them.
 *
 * What lives here is the one thing that IS tenant-shaped: the mapping from a
 * particular provider's form-field names to the quantities the regulation
 * defines. A second provider gets a second adapter and no change anywhere else.
 */

/** `"$50,000.00"` → 5_000_000 cents. Strict: a value it cannot read is an error, never a zero. */
export const parseUsd = (raw: string | undefined, field: string): number => {
  if (raw === undefined || raw.trim() === '') {
    throw new Error(`${field}: no value`);
  }

  const cleaned = raw.replace(/[$,\s]/g, '');

  if (!/^-?\d+(\.\d{1,2})?$/.test(cleaned)) {
    throw new Error(`${field}: ${JSON.stringify(raw)} is not a dollar amount`);
  }

  // Via string rather than `* 100`: 49.67 * 100 is 4966.999999999999.
  const [whole, frac = ''] = cleaned.replace('-', '').split('.');

  return (cleaned.startsWith('-') ? -1 : 1) * (Number(whole) * 100 + Number(frac.padEnd(2, '0')));
};

const optionalUsd = (raw: string | undefined, field: string): number | null =>
  raw === undefined || raw.trim() === '' ? null : parseUsd(raw, field);

/** `"67.4"` or `"15"` → a fraction. The forms write percentages without the sign. */
export const parsePercentAsFraction = (raw: string | undefined, field: string): number => {
  if (raw === undefined || raw.trim() === '') {
    throw new Error(`${field}: no value`);
  }

  const n = Number(raw.replace(/[%\s,]/g, ''));

  if (!Number.isFinite(n)) {
    throw new Error(`${field}: ${JSON.stringify(raw)} is not a percentage`);
  }

  return n / 100;
};

export type LombardOfferSummaryValues = Record<string, string>;

export type ReadOptions = {
  /**
   * Which calendar days carry a payment, read off the Payment Terms row of the
   * rendered form. Not defaulted: the whole point of `PaymentDayConvention` is
   * that the value comes from the document. Pass null where the row was not
   * captured and every convention is evaluated.
   */
  paymentDayConvention: PaymentDayConvention | null;
  /**
   * Whether the Estimated Term figure counts elapsed days or payments. Also not
   * defaulted — see `UNRESOLVED_READINGS.term-unit`.
   */
  termUnit: TermUnit;
};

/**
 * Read the Payment Terms row's own words.
 *
 * §914(a)(7)(B)(i) requires that row to carry "a short explanation of when
 * daily payments will be required. For example, on weekdays or every calendar
 * day", so the convention the APR must be computed on is disclosed ON THE FORM.
 * Reading it from there rather than assuming it is the difference between
 * checking the document and checking our belief about the document.
 */
export const conventionFromPaymentTerms = (rowText: string): PaymentDayConvention | null => {
  const text = rowText.toLowerCase();

  if (/business day|weekday|monday\s*[–—-]\s*friday/.test(text)) {
    return 'business-days';
  }

  if (/every calendar day|each calendar day|calendar day/.test(text)) {
    return 'every-calendar-day';
  }

  return null;
};

export const readOfferSummary = (values: LombardOfferSummaryValues, opts: ReadOptions): OfferSummaryInstance => ({
  amountFinanced: parseUsd(values.funding_provided, 'funding_provided'),
  recipientFunds: optionalUsd(values.recipient_funds, 'recipient_funds'),
  estimatedApr: parsePercentAsFraction(values.estimated_apr, 'estimated_apr'),
  financeCharge: parseUsd(values.finance_charge, 'finance_charge'),
  estimatedTotalPaymentAmount: parseUsd(values.estimated_total_payment_amount, 'estimated_total_payment_amount'),
  estimatedPayment: parseUsd(values.estimated_payment, 'estimated_payment'),
  estimatedMonthlyCost: optionalUsd(values.estimated_monthly_cost, 'estimated_monthly_cost'),
  estimatedTerm: Number(values.estimated_term_days),
  termUnit: opts.termUnit,
  specifiedPercentage:
    values.specified_percentage === undefined
      ? null
      : parsePercentAsFraction(values.specified_percentage, 'specified_percentage'),
  estimatedAvgMonthlyIncome: optionalUsd(values.estimated_avg_monthly_income, 'estimated_avg_monthly_income'),
  maximumNonInterestFinanceCharge: optionalUsd(
    values.maximum_non_interest_finance_charge,
    'maximum_non_interest_finance_charge',
  ),
  paymentDayConvention: opts.paymentDayConvention,
});

/**
 * The FRPA's §1 grid and Appendix A fee schedule.
 *
 * Every fee named here is one Appendix A describes as "deducted from Purchase
 * Price at funding", which is §900(a)(23)'s "withheld from the proceeds of the
 * financing at any time" — so each one is a prepaid finance charge. A new fee
 * added to the agreement must be added here too, and there is nothing in this
 * package that would notice if it were not. That is a real gap and it is listed
 * in `limits.ts` under `consistency-is-not-truth`.
 */
export const readContractTerms = (values: Record<string, string>): ContractTerms => {
  const fees: ContractTerms['feesWithheldAtFunding'] = [];
  const named: [string, string][] = [
    ['origination_fee', 'Origination Fee'],
    ['ach_program_fee', 'ACH Program Fee'],
    ['equipment_upfront_fee', 'Equipment Cost Paid at Funding'],
  ];

  for (const [key, label] of named) {
    const amount = optionalUsd(values[key], key);

    if (amount !== null && amount > 0) {
      fees.push({ label, amount });
    }
  }

  return {
    purchasePrice: parseUsd(values.purchase_price, 'purchase_price'),
    purchasedAmount: parseUsd(values.purchased_amount, 'purchased_amount'),
    equipmentCostDeferred: optionalUsd(values.equipment_defer_amount, 'equipment_defer_amount') ?? 0,
    priorBalanceCarried: optionalUsd(values.prior_balances, 'prior_balances') ?? 0,
    feesWithheldAtFunding: fees,
  };
};

export const readEnvelope = (args: {
  jurisdiction: Jurisdiction;
  offerSummary: LombardOfferSummaryValues;
  contract?: Record<string, string>;
  options: ReadOptions;
}): DisclosureEnvelope => ({
  jurisdiction: args.jurisdiction,
  offerSummary: readOfferSummary(args.offerSummary, args.options),
  contract: args.contract ? readContractTerms(args.contract) : undefined,
});
