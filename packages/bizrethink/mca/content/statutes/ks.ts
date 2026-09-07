import type { ContentStatute } from '../types';

/**
 * Kansas — Commercial Financing Disclosure Act, SB 345 §2(b).
 *
 * The same six items as Florida, with one difference that matters: Kansas
 * dictates the LABEL of every one of them. "Such disclosure shall be labeled
 * 'total amount of funds provided'". Florida, Louisiana, Utah and Georgia,
 * whose acts otherwise read as the same model, do not.
 *
 * So a Kansas form with Florida's headings would be defective while saying
 * exactly the same things — which is the whole argument for keeping these
 * eleven states as eleven files.
 */
export const KS_DISCLOSURE: ContentStatute = {
  slug: 'ks-disclosure',
  citation: 'Kan. SB 345 §2(b)',
  sourceFile: 'KS-SB-345.txt',
  jurisdiction: 'US-KS',
  status: 'published',
  source: {
    kind: 'statute',
    citation: 'Kan. SB 345 §2(b)',
    /*
      TRUE HERE AND FALSE IN FLORIDA, THOUGH THE TWO ACTS OTHERWISE READ THE
      SAME. Kansas dictates the label of every one of the six items — "such
      disclosure shall be labeled 'total amount of funds provided'" — and a
      prescribed label is exact words that must be reproduced. Each one is
      re-checked against the bill by `verifyProvenance`.
    */
    verbatimRequired: true,
    verbatimVerifiedAt: '2026-09-06',
  },
  sourceDigest: '2e9d48751efe52ae6a29e74bb8f629fae4ba93bcd6c23148620c8ec43b339461',
  section: null,
  requirements: [
    {
      citation: 'Kan. SB 345 §2(b)(1)',
      requires: 'Total amount of funds provided, labeled "total amount of funds provided".',
      row: 'Total Amount of Funds Provided',
      labelPrescribed: true,
      evidence: ['total amount of funds'],
    },
    {
      citation: 'Kan. SB 345 §2(b)(2)',
      requires: 'Total amount of funds disbursed if less than (1), labeled "total amount of funds disbursed".',
      row: 'Total Amount of Funds Disbursed',
      labelPrescribed: true,
      evidence: ['after deductions'],
    },
    {
      citation: 'Kan. SB 345 §2(b)(3)',
      requires: 'Total amount to be paid to the provider, labeled "total of payments".',
      row: 'Total of Payments',
      labelPrescribed: true,
      evidence: ['total dollar amount of payments'],
    },
    {
      citation: 'Kan. SB 345 §2(b)(4)',
      requires:
        'Total dollar cost, determined by subtracting the total amount of funds provided from the total of payments; the calculation shall include any fees or charges deducted by the provider from (1). Labeled "total dollar cost of financing".',
      row: 'Total Dollar Cost of Financing',
      labelPrescribed: true,
      // Kansas is explicit that deducted fees stay inside the cost, which
      // Florida and Utah leave implicit. Pinned separately for that reason.
      evidence: ['Total of Payments', 'Total Amount of Funds Provided', 'deducts'],
    },
    {
      citation: 'Kan. SB 345 §2(b)(5)',
      requires:
        'Where payments vary: the manner, frequency and estimated amount of the initial payment, labeled "estimated payments".',
      row: 'Estimated Payments',
      labelPrescribed: true,
      evidence: ['Each Workday', 'Specified Percentage', 'will vary'],
    },
    {
      citation: 'Kan. SB 345 §2(b)(6)',
      requires:
        'Whether there are costs or discounts associated with prepayment, including a reference to the paragraph in the agreement creating the contractual right to prepayment. Labeled "prepayment".',
      row: 'Prepayment',
      labelPrescribed: true,
      evidence: ['no prepayment penalty', 'does not offer a prepayment discount', 'FRPA §8.3'],
    },
  ],
};
