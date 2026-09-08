import type { ContentStatute } from '../types';

/**
 * Florida — Commercial Financing Disclosure Law, Fla. Stat. §559.9613(2).
 *
 * Six lettered items. No prescribed table, no prescribed sentence, no "shall
 * include only" anywhere in the act — which is why the cross-state sweep that
 * added a prepayment-discount sentence was lawful here and unlawful in
 * California and New York. Paragraph (f) asks for exactly that sentence.
 */
export const FL_DISCLOSURE: ContentStatute = {
  slug: 'fl-disclosure',
  citation: 'Fla. Stat. §559.9613(2)',
  sourceFile: 'FL-HB-1353.txt',
  jurisdiction: 'US-FL',
  status: 'published',
  source: {
    kind: 'statute',
    citation: 'Fla. Stat. §559.9613(2)',
    // Florida prescribes no sentence and no label. There is nothing of ours
    // that must reproduce its words.
    verbatimRequired: false,
    verbatimVerifiedAt: '2026-09-06',
  },
  sourceDigest: '5d534783a6c8b480e3b09a933c1d351f8a3b2fbd402df4cf8d0efcae93b5109a',
  // CS/HB 1353 enacts part XIII of ch. 559 and nothing else.
  section: null,
  requirements: [
    {
      citation: 'Fla. Stat. §559.9613(2)(a)',
      requires: 'The total amount of funds provided to the business under the terms of the agreement.',
      row: 'Total Funds Provided',
      evidence: ['gross amount'],
    },
    {
      citation: 'Fla. Stat. §559.9613(2)(b)',
      requires:
        'The total amount of funds disbursed if less than (a), as a result of fees deducted or withheld at disbursement, amounts paid to satisfy a prior balance, and amounts paid to third parties.',
      row: 'Total Funds Disbursed',
      evidence: ['after deductions'],
    },
    {
      citation: 'Fla. Stat. §559.9613(2)(c)',
      requires: 'The total amount to be paid to the provider under the terms of the agreement.',
      row: 'Total Amount to Repay',
      evidence: ['remit to Provider'],
    },
    {
      citation: 'Fla. Stat. §559.9613(2)(d)',
      requires: 'The total dollar cost, calculated as the difference between the amount in (a) and the amount in (c).',
      row: 'Total Dollar Cost',
      // The subtraction is against funds PROVIDED, not funds disbursed. Pinned
      // because the two differ by the origination fee, and the wrong one
      // understates the cost of the financing.
      evidence: ['Total Amount to Repay', 'Total Funds Provided'],
    },
    {
      citation: 'Fla. Stat. §559.9613(2)(e)2.',
      requires:
        'Where payments may vary: the manner and frequency of payments, the estimated amount of the initial payment, a description of the methodology for calculating any variable payment, and the circumstances under which payments may vary.',
      row: 'Estimated Periodic Payment',
      evidence: ['Each Workday', 'Specified Percentage', 'will vary'],
    },
    {
      citation: 'Fla. Stat. §559.9613(2)(f)',
      requires:
        'Whether there are any costs or discounts associated with prepayment, including a reference to the provision in the agreement which creates the contractual rights of the parties related to prepayment.',
      row: 'Prepayment',
      // Three separate obligations in one paragraph: costs, discounts, and the
      // cross-reference. All three are evidence, so dropping any one fails.
      evidence: ['no prepayment penalty', 'does not offer a prepayment discount', 'FRPA §8.3'],
    },
  ],
};
