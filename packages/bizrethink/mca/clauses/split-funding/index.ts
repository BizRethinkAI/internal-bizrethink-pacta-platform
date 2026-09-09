import type { NonClauseLine } from '../documents';
import type { McaClause } from '../types';
import { PAYZLI_LETTER } from './letter';

/**
 * The Payzli Split Funding Authorization — seven operative paragraphs and not
 * one number.
 *
 * IT IS A LETTER. Addressed to United Payment Systems LLC d/b/a Payzli,
 * instructing a processor to split card settlement to Lombard. It has no
 * sections, no clause numbers, and no headings, so every clause here is
 * identified by slug alone and the reviews cite it as "Paragraph 2".
 *
 * PHASE 0 COUNTED ITS ADDRESS AS A CLAUSE. Its appendix of unexamined clauses
 * lists "3350 Buschwood Park Drive, Suite 150, Tampa, FL 33618" — the second
 * line of the letterhead. REVIEW-02 caught it: *"The extraction that built the
 * appendix appears to have read a paragraph beginning `3350` the same way it
 * read `3.15`."* That is why the addressee block is declared non-clause here
 * with the reason attached, rather than merely omitted.
 *
 * THE SECOND PARAGRAPH CARRIES SIX FINDINGS, more than any other clause in the
 * corpus. It is the operative instruction — what Payzli is told to withhold,
 * from what, and until when — and three of REVIEW-02's fixes land on it: it
 * said "withhold or debit" where the FRPA promises no deposit-account debiting,
 * it stopped short of the FRPA's Completion Threshold, and it ceased on notice
 * where the FRPA ceases automatically.
 */
export const PAYZLI_CLAUSE_MODULES = { letter: PAYZLI_LETTER } as const;

export const PAYZLI_LIBRARY: McaClause[] = Object.values(PAYZLI_CLAUSE_MODULES).flat();

export const PAYZLI_SECTION_ORDER = ['letter'] as const;

/** Lines of the letter that belong to no paragraph, each with the reason. */
export const PAYZLI_NON_CLAUSE: NonClauseLine[] = [
  { anchor: 'United Payment Systems LLC', reason: 'the addressee' },
  {
    anchor: '3350 Buschwood Park Drive',
    reason:
      'the addressee’s street address — and the line Phase 0’s appendix counted as this document’s one unexamined clause',
  },
  { anchor: 'Re: Credit Card Receivables', reason: 'subject line' },
  { anchor: 'To Whom It May Concern:', reason: 'salutation' },
  { anchor: 'Sincerely,', reason: 'valediction' },
  { anchor: 'SELLER (', reason: 'signature block' },
  { anchor: '[TABLE] Signature:', reason: 'signature block' },
];
