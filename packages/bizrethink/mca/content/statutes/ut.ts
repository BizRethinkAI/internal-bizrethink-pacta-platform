import type { ContentStatute } from '../types';

/**
 * Utah — Utah Code §7-27-201(2).
 *
 * Six items, no prescribed labels. Reads as the same model act as Florida,
 * Louisiana and Georgia, and differs from all three in paragraph (f): Utah and
 * Georgia want a reference to the paragraph that creates "each cost or
 * discount", where Florida and Louisiana want one to the provision creating
 * "the contractual rights of the parties related to prepayment".
 *
 * Both are satisfied by the same citation in our form. They are still different
 * obligations, and if the drafting ever diverges they will stop coinciding.
 */
export const UT_DISCLOSURE: ContentStatute = {
  slug: 'ut-disclosure',
  citation: 'Utah Code §7-27-201(2)',
  sourceFile: 'UT-Title-7-Ch-27.txt',
  jurisdiction: 'US-UT',
  status: 'published',
  source: {
    kind: 'statute',
    citation: 'Utah Code §7-27-201(2)',
    verbatimRequired: false,
    verbatimVerifiedAt: '2026-09-06',
  },
  // Digest re-computed 2026-09-07 after a vendoring header was added to the
  // source file recording where it came from. The STATUTORY TEXT is byte-identical;
  // only the header above it changed, so `verbatimVerifiedAt` stands rather than
  // being re-stamped. Saying that out loud because "the digest broke, I updated
  // it" is exactly the move this mechanism exists to make someone justify.
  sourceDigest: 'f5535bf4ab354050b4bec4ec6450008efd5edf8cdb78f72f442521a5ff6d1924',
  section: null,
  requirements: [
    {
      citation: 'Utah Code §7-27-201(2)(a)',
      requires: 'The total amount of funds provided to the business.',
      row: 'Total Funds Provided',
      evidence: ['gross amount'],
    },
    {
      citation: 'Utah Code §7-27-201(2)(b)',
      requires: 'The total amount of funds disbursed, if less than (a).',
      row: 'Total Funds Disbursed',
      evidence: ['after deductions'],
    },
    {
      citation: 'Utah Code §7-27-201(2)(c)',
      requires: 'The total amount to be paid to the provider.',
      row: 'Total Amount to Repay',
      evidence: ['remit to Provider'],
    },
    {
      citation: 'Utah Code §7-27-201(2)(d)',
      requires: 'The total dollar cost, being the difference between (a) and (c).',
      row: 'Total Dollar Cost',
      evidence: ['Total Amount to Repay', 'Total Funds Provided'],
    },
    {
      citation: 'Utah Code §7-27-201(2)(e)(ii)',
      requires:
        'Where payments may vary: the manner, frequency and estimated amount of the initial payment. The methodology and the circumstances that may cause a payment to vary belong in the AGREEMENT under §7-27-201(3), not in this disclosure.',
      row: 'Estimated Periodic Payment',
      evidence: ['Each Workday', 'Specified Percentage'],
    },
    {
      citation: 'Utah Code §7-27-201(2)(f)',
      requires:
        'Whether there are costs or discounts associated with prepayment, including a reference to the paragraph in the agreement that creates each cost or discount.',
      row: 'Prepayment',
      evidence: ['no prepayment penalty', 'does not offer a prepayment discount', 'FRPA §8.3'],
    },
  ],
};
