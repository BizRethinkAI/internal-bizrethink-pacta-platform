import type { ContentStatute } from '../types';

/**
 * Louisiana — La. R.S. 9:3137.10(2), the Revenue-Based Financing Act.
 *
 * Six items, no prescribed labels. Paragraph (e) is Louisiana's own: unlike
 * Utah and Georgia, which push the methodology and the circumstances of
 * variation into the agreement, Louisiana requires BOTH inside the disclosure
 * itself — "a description of the methodology for calculating any variable
 * payment, and the circumstances under which payments may vary". Florida
 * §559.9613(2)(e)2. reads the same way.
 *
 * So the same row satisfies four states for three different reasons, and the
 * evidence pinned below is not the same set.
 */
export const LA_DISCLOSURE: ContentStatute = {
  slug: 'la-disclosure',
  citation: 'La. R.S. 9:3137.10(2)',
  sourceFile: 'LA-Act-198.txt',
  jurisdiction: 'US-LA',
  status: 'published',
  source: {
    kind: 'statute',
    citation: 'La. R.S. 9:3137.10(2)',
    verbatimRequired: false,
    verbatimVerifiedAt: '2026-09-06',
  },
  sourceDigest: '089e31b3518f0960ab4317b29d88e1853c1ff1f42cfeb5ddb8bf9c6bc479a6ac',
  section: null,
  requirements: [
    {
      citation: 'La. R.S. 9:3137.10(2)(a)',
      requires: 'The total amount of funds provided to the business.',
      row: 'Total Funds Provided',
      evidence: ['gross amount'],
    },
    {
      citation: 'La. R.S. 9:3137.10(2)(b)',
      requires:
        'The total amount of funds disbursed, if less than (a), as a result of fees deducted or withheld at disbursement, any amount paid to the provider to satisfy a prior balance, and any amount paid to a third party on behalf of the business.',
      row: 'Total Funds Disbursed',
      // The statute names three categories of deduction, and the row names all
      // three. Pinned individually: a form that mentioned only fees would still
      // read as a complete sentence.
      evidence: ['fees deducted or withheld at disbursement', 'satisfy a prior balance', 'third party'],
    },
    {
      citation: 'La. R.S. 9:3137.10(2)(c)',
      requires: 'The total amount to be paid to the provider.',
      row: 'Total Amount to Repay',
      evidence: ['remit to Provider'],
    },
    {
      citation: 'La. R.S. 9:3137.10(2)(d)',
      requires: 'The total dollar cost, being the difference between (a) and (c).',
      row: 'Total Dollar Cost',
      evidence: ['Total Amount to Repay', 'Total Funds Provided'],
    },
    {
      citation: 'La. R.S. 9:3137.10(2)(e)',
      requires:
        'Where payments vary: the manner and frequency of payments, the estimated amount of the initial payment, a description of the methodology for calculating any variable payment, AND the circumstances under which payments may vary — all in the disclosure.',
      row: 'Estimated Periodic Payment',
      evidence: ['Each Workday', 'Specified Percentage', 'will vary'],
    },
    {
      citation: 'La. R.S. 9:3137.10(2)(f)',
      requires:
        'Whether there are costs or discounts associated with prepayment, including a reference to the paragraph in the agreement that creates each cost or discount.',
      row: 'Prepayment',
      evidence: ['no prepayment penalty', 'does not offer a prepayment discount', 'FRPA §8.3'],
    },
  ],
};
