import type { Authority, Jurisdiction } from './types';

/**
 * Every statutory quotation this package relies on, verbatim from the vendored
 * primary text, tagged with the state it came from.
 *
 * TWO RULES, BOTH LOAD-BEARING.
 *
 * 1. A quotation is authority. Everything else is our reading, and lives in an
 *    identity's `derivation` field where it is labelled as such. California's
 *    disclosure shipped once carrying New York's phrasing of a prescribed
 *    sentence; the way that does not recur is that no string in this package
 *    reaches a document without a state attached to it.
 * 2. Every `text` below is asserted to appear in its own `sourceFile` by
 *    `instance-authorities.test.ts`. A quotation that has drifted from the
 *    statute — or was never in it — fails the suite rather than sitting there
 *    lending false weight to a check.
 */

const ca = (citation: string, text: string): Authority => ({
  citation,
  text,
  sourceFile: 'CA-10CCR-900-956.txt',
  jurisdiction: 'CA',
});

const ny = (citation: string, text: string): Authority => ({
  citation,
  text,
  sourceFile: 'NY-23NYCRR-600.txt',
  jurisdiction: 'NY',
});

/** Amount financed: funds provided, minus any prepaid finance charge. */
export const AMOUNT_FINANCED: Record<Jurisdiction, Authority> = {
  CA: ca(
    '10 CCR §900(a)(1)(A)',
    'With respect to sales-based financing, the amount of funds to be provided by the financer to the recipient or on the recipient’s behalf, minus any prepaid finance charge.',
  ),
  NY: ny(
    '23 NYCRR §600.1(a)(1)',
    'sales‐based financing, the amount of funds to be provided by the financer to the recipient or on the recipient’s behalf, minus any prepaid finance charge;',
  ),
};

/** Prepaid finance charge: includes anything withheld from the proceeds. */
export const PREPAID_FINANCE_CHARGE: Record<Jurisdiction, Authority> = {
  CA: ca(
    '10 CCR §900(a)(23)',
    'means any finance charge paid separately to the financer in cash, check or electronic funds transfer before or at consummation of a transaction, or withheld from the proceeds of the financing at any time.',
  ),
  NY: ny(
    '23 NYCRR §600.1(ac)',
    'Prepaid finance charge means any finance charge paid separately to the financer in cash, check, or electronic funds transfer before or at consummation of a transaction, or withheld from the proceeds of the financing at any time.',
  ),
};

/** Recipient funds: the net amount given DIRECTLY to the recipient. */
export const RECIPIENT_FUNDS: Record<Jurisdiction, Authority> = {
  CA: ca(
    '10 CCR §900(a)(26)',
    'means the net amount to be given directly to the recipient in the form of cash, check, or electronic funds transfer to an account the recipient controls.',
  ),
  NY: ny(
    '23 NYCRR §600.1(af)',
    'Recipient funds means the net amount to be given directly to the recipient in the form of cash, check, or electronic funds transfer to an account the recipient controls.',
  ),
};

/** Finance charge limb 1: every Reg Z charge. */
export const FINANCE_CHARGE_REG_Z: Record<Jurisdiction, Authority> = {
  CA: ca(
    '10 CCR §943(a)(1)',
    'For all commercial financing transactions, all charges that would be included in the finance charge under 12 C.F.R. Part 1026.4 (1-1-21 Edition)',
  ),
  NY: ny(
    '23 NYCRR §600.2(a)(1)',
    'for all commercial financing transactions, all charges that would be included in the finance charge under the federal Truth in Lending Act, Regulation Z, 12 C.F.R. section 1026.4 (as amended)',
  ),
};

/** Finance charge limb 2: the discount on the receivables. */
export const FINANCE_CHARGE_DISCOUNT: Record<Jurisdiction, Authority> = {
  CA: ca(
    '10 CCR §943(a)(2)',
    'In any accounts receivable purchase transaction that is not a factoring transaction, the discount taken on the face value of the accounts receivable;',
  ),
  NY: ny(
    '23 NYCRR §600.2(a)(2)',
    'in any accounts receivable purchase transaction that is not a factoring transaction, the discount taken on the face value of the accounts receivable;',
  ),
};

/** The APR must be an Appendix J rate, and must carry every finance charge. */
export const APR_METHOD: Record<Jurisdiction, Authority> = {
  CA: ca(
    '10 CCR §940(a)',
    'the annual percentage rate shall be determined in accordance with either the United States Rule method or the actuarial method, as both are set forth in Appendix J, 12 C.F.R. Part 1026 (1-1-21 Edition), and which is incorporated herein by this reference.',
  ),
  NY: ny(
    '23 NYCRR §600.3(b)',
    'The annual percentage rate is a measure of the cost of credit, expressed as a yearly rate, that relates the amount and timing of value received by the recipient to the amount and timing of payments made',
  ),
};

/** The fourth row: the total dollar amount of estimated payments. */
export const TOTAL_PAYMENT_ROW: Record<Jurisdiction, Authority> = {
  CA: ca(
    '10 CCR §914(a)(5)(B)',
    'the total dollar amount of estimated payments the recipient will make during the term of the contract.',
  ),
  NY: ny(
    '23 NYCRR §600.6(e)(2)',
    'total dollar amount of estimated payments the recipient will make during the term of the contract; and',
  ),
};

/** The fifth row: the AVERAGE amount of estimated periodic payments. */
export const PERIODIC_PAYMENT_ROW: Record<Jurisdiction, Authority> = {
  CA: ca(
    '10 CCR §914(a)(6)(B)(i)',
    'The average amount of estimated periodic payments calculated in accordance with section 942, followed by a forward slash (/) and the frequency of periodic payments.',
  ),
  NY: ny(
    '23 NYCRR §600.6(f)(1)',
    'average amount of estimated periodic payments calculated in accordance with section 600.7, followed by a forward slash (/) and the frequency of periodic payments;',
  ),
};

/** Estimated monthly cost: total over the term, divided by months in the term. */
export const ESTIMATED_MONTHLY_COST: Record<Jurisdiction, Authority> = {
  CA: ca(
    '10 CCR §900(a)(12)',
    'means the estimated average total amount paid by the recipient (periodic and irregular payments) over the estimated term of the contract, divided by the number of months in the estimated term of the contract.',
  ),
  NY: ny(
    '23 NYCRR §600.1(r)',
    'Estimated monthly cost means the estimated average total amount paid by the recipient (periodic and irregular payments) over the estimated term of the contract, divided by the number of months in the estimated term of the contract.',
  ),
};

/** The Itemization of Amount Financed, and exactly when it is required. */
export const ITEMIZATION_REQUIRED: Record<Jurisdiction, Authority> = {
  CA: ca(
    '10 CCR §956(a)',
    'and the amount financed is greater than the recipient funds, the provider shall also provide a disclosure entitled “Itemization of Amount Financed”.',
  ),
  NY: ny(
    '23 NYCRR §600.17(a)',
    'and the amount financed is greater than the recipient funds, the provider shall also provide a disclosure entitled “Itemization of Amount Financed.”',
  ),
};

/** The prepayment row's cap is a portion OF the finance charge. */
export const PREPAYMENT_CAP: Record<Jurisdiction, Authority> = {
  CA: ca(
    '10 CCR §914(a)(10)(A)',
    'If you pay off the financing faster than required, you still must pay all or a portion of the finance charge, up to $[maximum non-interest finance charge] based upon our estimates.',
  ),
  NY: ny(
    '23 NYCRR §600.6(j)(1)',
    'you still must pay all or a portion of the finance charge, up to $[maximum non-interest finance charge] based upon our estimates.',
  ),
};

/** The estimated stream must be built from the income projection and the split. */
export const ESTIMATED_STREAM_INPUTS: Record<Jurisdiction, Authority> = {
  CA: ca(
    '10 CCR §942(a)',
    'a provider shall use the estimated monthly sales, income or receipts projection described in subdivision (b) of section 930 or the internal estimated sales, income, or receipts projection described in subdivision (a)(3) of section 931, accounting for:',
  ),
  NY: ny(
    '23 NYCRR §600.7(a)',
    'When calculating the estimated payments and reasonably anticipated true-ups for sales-based financing, a provider shall use the estimated monthly sales, income or receipts projection described in section 600.8(b) of this Part or the internal estimated sales projection described in section 600.9(a)(3) of this Part, accounting for:',
  ),
};

/** The APR row states the average monthly income the calculation assumes. */
export const APR_ROW_ASSUMED_INCOME: Record<Jurisdiction, Authority> = {
  CA: ca(
    '10 CCR §914(a)(3)(C)',
    'This calculation assumes your estimated average monthly income through [description of particular payment channel or mechanism] will be [average monthly income estimate determined in accordance with sections 930 or 931].',
  ),
  NY: ny(
    '23 NYCRR §600.6(c)(3)',
    'This calculation assumes your estimated average monthly income through [description of particular payment channel or mechanism] will be [average monthly income estimate',
  ),
};
