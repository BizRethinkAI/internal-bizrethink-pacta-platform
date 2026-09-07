import type { ContentStatute } from '../types';

/**
 * Georgia — O.C.G.A. §10-1-393.18(e)(3).
 *
 * SOURCE REPLACED 2026-09-07, and the verification date re-earned rather than
 * carried over. The previous source was a browser capture of law.justia.com — a
 * secondary publisher — and was INCOMPLETE: subsection (a)'s definitions and the
 * full text of (b)-(k) were not in it. So "advance fee", the term the broker
 * prohibition in (f)(1) turns on, was defined nowhere in what we held, while
 * this spec carried a verification date against it as though it were primary.
 *
 * That is the failure the provenance design exists to prevent, and it survived
 * because nothing checks whether a source IS primary — only that its bytes have
 * not moved. A digest over a secondary source is a faithful record of the wrong
 * document.
 *
 * Now Senate Bill 90 AS PASSED, from the Georgia General Assembly's own
 * document API. All six lettered disclosure items and the (f)(1) advance-fee
 * prohibition were re-checked against it before this date was written.
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
export const GA_DISCLOSURE: ContentStatute = {
  slug: 'ga-disclosure',
  citation: 'O.C.G.A. §10-1-393.18(e)(3)',
  sourceFile: 'GA-SB90-enrolled.txt',
  jurisdiction: 'US-GA',
  status: 'published',
  source: {
    kind: 'statute',
    citation: 'O.C.G.A. §10-1-393.18(e)(3)',
    verbatimRequired: false,
    verbatimVerifiedAt: '2026-09-07',
  },
  sourceDigest: 'a090725091f034702d5f8aac70c501f60b919f299778cf914a9febfa8b935112',
  section: null,
  requirements: [
    {
      citation: 'O.C.G.A. §10-1-393.18(e)(3)(A)',
      requires: 'The total amount of funds provided to the business.',
      row: 'Total Funds Provided',
      evidence: ['gross amount'],
    },
    {
      citation: 'O.C.G.A. §10-1-393.18(e)(3)(B)',
      requires:
        'The total amount of funds disbursed, if less than (a), as a result of fees deducted or withheld at disbursement, any amount paid to the provider to satisfy a prior balance, and any amount paid to a third party on behalf of the business.',
      row: 'Total Funds Disbursed',
      // The statute names three categories of deduction, and the row names all
      // three. Pinned individually: a form that mentioned only fees would still
      // read as a complete sentence.
      evidence: ['fees deducted or withheld at disbursement', 'satisfy a prior balance', 'third party'],
    },
    {
      citation: 'O.C.G.A. §10-1-393.18(e)(3)(C)',
      requires: 'The total amount to be paid to the provider.',
      row: 'Total Amount to Repay',
      evidence: ['remit to Provider'],
    },
    {
      citation: 'O.C.G.A. §10-1-393.18(e)(3)(D)',
      requires: 'The total dollar cost, being the difference between (a) and (c).',
      row: 'Total Dollar Cost',
      evidence: ['Total Amount to Repay', 'Total Funds Provided'],
    },
    {
      citation: 'O.C.G.A. §10-1-393.18(e)(3)(E)(ii)',
      requires:
        'Where payments may vary: the manner, frequency and estimated amount of the initial payment. The methodology and the circumstances that may cause a payment to vary belong in the AGREEMENT under §10-1-393.18(e)(4), not in this disclosure.',
      row: 'Estimated Initial Payment',
      evidence: ['Each Workday', 'Specified Percentage'],
    },
    {
      citation: 'O.C.G.A. §10-1-393.18(e)(3)(F)',
      requires:
        'Whether there are costs or discounts associated with prepayment, including a reference to the paragraph in the agreement that creates each cost or discount.',
      row: 'Prepayment',
      evidence: ['no prepayment penalty', 'does not offer a prepayment discount', 'FRPA §8.3'],
    },
  ],
};
