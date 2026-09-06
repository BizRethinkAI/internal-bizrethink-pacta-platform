import type { ContentStatute } from '../types';

/**
 * Missouri — SB 1359 §(2), the commercial financing disclosure provisions.
 *
 * Missouri prescribes labels as Kansas does, and capitalises them where Kansas
 * writes them lower case: "This disclosure shall be labeled 'Total Amount of
 * Funds Provided'". Our matcher folds case, so that difference is recorded here
 * rather than enforced — but it is a difference, and the two files stay apart.
 *
 * Missouri also drops one clause Kansas keeps. Kansas §2(b)(2) counts "any
 * amount paid to the provider to satisfy a prior balance" among the deductions;
 * Missouri §(2)(b) names only fees withheld and third-party payments. Same six
 * items, not the same six items.
 */
export const MO_DISCLOSURE: ContentStatute = {
  slug: 'mo-disclosure',
  citation: 'Mo. SB 1359 §(2)',
  sourceFile: 'MO-SB-1359.txt',
  requirements: [
    {
      citation: 'Mo. SB 1359 §(2)(a)',
      requires: 'Total amount of funds provided, labeled "total amount of funds provided".',
      row: 'Total Amount of Funds Provided',
      labelPrescribed: true,
      evidence: ['gross amount'],
    },
    {
      citation: 'Mo. SB 1359 §(2)(b)',
      requires: 'Total amount of funds disbursed if less than (1), labeled "total amount of funds disbursed".',
      row: 'Total Amount of Funds Disbursed',
      labelPrescribed: true,
      evidence: ['after deductions'],
    },
    {
      citation: 'Mo. SB 1359 §(2)(c)',
      requires: 'Total amount to be paid to the provider, labeled "total of payments".',
      row: 'Total of Payments',
      labelPrescribed: true,
      evidence: ['remit to Provider'],
    },
    {
      citation: 'Mo. SB 1359 §(2)(d)',
      requires:
        'Total dollar cost, determined by subtracting the total amount of funds provided from the total of payments; the calculation shall include any fees or charges deducted by the provider from (1). Labeled "total dollar cost of financing".',
      row: 'Total Dollar Cost of Financing',
      labelPrescribed: true,
      // Kansas is explicit that deducted fees stay inside the cost, which
      // Florida and Utah leave implicit. Pinned separately for that reason.
      evidence: ['Total of Payments', 'Total Amount of Funds Provided', 'deducts'],
    },
    {
      citation: 'Mo. SB 1359 §(2)(e)',
      requires:
        'Where payments vary: the manner, frequency and estimated amount of the initial payment, labeled "estimated payments".',
      row: 'Estimated Payments',
      labelPrescribed: true,
      evidence: ['Each Workday', 'Specified Percentage', 'will vary'],
    },
    {
      citation: 'Mo. SB 1359 §(2)(f)',
      requires:
        'Whether there are costs or discounts associated with prepayment, including a reference to the paragraph in the agreement creating the contractual right to prepayment. Labeled "prepayment".',
      row: 'Prepayment',
      labelPrescribed: true,
      evidence: ['no prepayment penalty', 'does not offer a prepayment discount', 'FRPA §8.3'],
    },
  ],
};
