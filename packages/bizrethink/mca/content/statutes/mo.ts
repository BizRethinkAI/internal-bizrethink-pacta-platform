import type { ContentStatute } from '../types';

/**
 * Missouri — Mo. Rev. Stat. §427.300.3(2), the commercial financing disclosure provisions.
 *
 * Missouri prescribes labels as Kansas does, and capitalises them where Kansas
 * writes them lower case: "This disclosure shall be labeled 'Total Amount of
 * Funds Provided'". Our matcher folds case, so that difference is recorded here
 * rather than enforced — but it is a difference, and the two files stay apart.
 *
 * Missouri also drops one clause Kansas keeps. Kansas §2(b)(2) counts "any
 * amount paid to the provider to satisfy a prior balance" among the deductions;
 * Missouri §427.300.3(2)(b) names only fees withheld and third-party payments. Same six
 * items, not the same six items.
 */
export const MO_DISCLOSURE: ContentStatute = {
  slug: 'mo-disclosure',
  citation: 'Mo. Rev. Stat. §427.300.3(2)',
  sourceFile: 'MO-RSMo-427.300.txt',
  jurisdiction: 'US-MO',
  status: 'published',
  source: {
    kind: 'statute',
    citation: 'Mo. Rev. Stat. §427.300.3(2)',
    // As Kansas: Missouri prescribes every label, and capitalises them where
    // Kansas writes them lower case.
    verbatimRequired: true,
    verbatimVerifiedAt: '2026-09-12',
  },
  sourceDigest: 'e6edd4442075f6bae15eb2dfe49d0b82f5e206af03df483a52404f9ebc511d43',
  // The current source contains §427.300 alone. Keep verification bounded to
  // its disclosure subsection, excluding definitions and the other duties.
  section: { from: '3. (1) A provider', to: '4. The provisions of this section' },
  requirements: [
    {
      citation: 'Mo. Rev. Stat. §427.300.3(2)(a)',
      requires: 'Total amount of funds provided, labeled "total amount of funds provided".',
      row: 'Total Amount of Funds Provided',
      labelPrescribed: true,
      evidence: ['gross amount'],
    },
    {
      citation: 'Mo. Rev. Stat. §427.300.3(2)(b)',
      requires: 'Total amount of funds disbursed if less than (1), labeled "total amount of funds disbursed".',
      row: 'Total Amount of Funds Disbursed',
      labelPrescribed: true,
      evidence: ['after deductions'],
    },
    {
      citation: 'Mo. Rev. Stat. §427.300.3(2)(c)',
      requires: 'Total amount to be paid to the provider, labeled "total of payments".',
      row: 'Total of Payments',
      labelPrescribed: true,
      evidence: ['remit to Provider'],
    },
    {
      citation: 'Mo. Rev. Stat. §427.300.3(2)(d)',
      requires:
        'Total dollar cost, determined by subtracting the total amount of funds provided from the total of payments; the calculation shall include any fees or charges deducted by the provider from (1). Labeled "total dollar cost of financing".',
      row: 'Total Dollar Cost of Financing',
      labelPrescribed: true,
      // Missouri, like Kansas, explicitly includes deducted fees in this
      // calculation. Florida and Utah leave that implicit.
      evidence: ['Total of Payments', 'Total Amount of Funds Provided', 'deducts'],
    },
    {
      citation: 'Mo. Rev. Stat. §427.300.3(2)(e)',
      requires:
        'Where payments vary: the manner, frequency and estimated amount of the initial payment, labeled "estimated payments".',
      row: 'Estimated Payments',
      labelPrescribed: true,
      evidence: ['Each Workday', 'Specified Percentage', 'will vary'],
    },
    {
      citation: 'Mo. Rev. Stat. §427.300.3(2)(f)',
      requires:
        'Whether there are costs or discounts associated with prepayment, including a reference to the paragraph in the agreement creating the contractual right to prepayment. Labeled "prepayment".',
      row: 'Prepayment',
      labelPrescribed: true,
      evidence: ['no prepayment penalty', 'does not offer a prepayment discount', 'FRPA §8.3'],
    },
  ],
};
