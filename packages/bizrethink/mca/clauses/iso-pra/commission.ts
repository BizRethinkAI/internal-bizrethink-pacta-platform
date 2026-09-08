import type { McaClause } from '../types';

/**
 * SECTION A — COMMISSION STRUCTURE.
 *
 * Bodies are the words the shipped document prints, and
 * `__tests__/bodies-match-the-document.test.ts` re-finds every one of them
 * in `source-documents/Lombard_ISO_Partner_Referral_Agreement_v2.txt` on every
 * run. Edit one here and the test goes red, which is correct: the document is
 * where a clause is amended, and this library follows it.
 */
export const ISO_PRA_COMMISSION: McaClause[] = [
  {
    slug: 'iso-pra.commission-rate',
    version: 1,
    instrument: 'iso-pra',
    number: 'A.1',
    section: 'commission',
    sortKey: 10,
    heading: 'Commission Rate',
    body: 'Company shall pay ISO Partner a commission equal to _«2»_% of the amount advanced for each merchant cash advance successfully funded as a result of ISO Partner’s introduction. The commission is payable solely out of the Origination Fee actually collected by Company on that transaction and shall not exceed that Origination Fee. If no Origination Fee is collected on a transaction, no commission is payable on it. This default rate is subject to adjustment by mutual written agreement based on volume performance or special arrangements.',
    source: { kind: 'attorney-drafted', author: null },
    status: 'draft',
    appliesInStates: [],
    examinedBy: [
      {
        review: 'REVIEW-01',
        findings: ['iso-a1-fee-not-tied-to-origination-revenue', 'iso-renewal-rate-fixed-above-variable-base'],
      },
      { review: 'REVIEW-02', findings: ['iso-a1-commission-out-of-a-fee-the-company-may-not-collect'] },
    ],
  },
  {
    slug: 'iso-pra.when-commission-is-earned',
    version: 1,
    instrument: 'iso-pra',
    number: 'A.2',
    section: 'commission',
    sortKey: 20,
    heading: 'When Commission Is Earned',
    body: 'Commission is earned at the time of successful funding disbursement to the referred merchant. No commission is payable on declined, withdrawn, or unfunded applications.',
    source: { kind: 'attorney-drafted', author: null },
    status: 'draft',
    appliesInStates: [],
    examinedBy: [
      {
        review: 'REVIEW-02',
        findings: [
          'iso-a1-commission-out-of-a-fee-the-company-may-not-collect',
          'iso-a2-a4-no-clawback-when-the-merchant-cancels-under-frpa-4-14',
        ],
      },
    ],
  },
  {
    slug: 'iso-pra.payment-timing',
    version: 1,
    instrument: 'iso-pra',
    number: 'A.3',
    section: 'commission',
    sortKey: 30,
    heading: 'Payment Timing',
    body: 'Earned commissions shall be paid within thirty (30) days of funding disbursement, and may be paid earlier at Company’s discretion, via ACH transfer or wire to the bank account designated by ISO Partner. There is no minimum payout threshold. Payment at thirty days coincides with the close of the one-hundred-percent clawback window in Section A.4, and precedes the fifty-percent window, so any clawback is recovered as set-off under that Section rather than by withholding payment here.',
    source: { kind: 'attorney-drafted', author: null },
    status: 'draft',
    appliesInStates: [],
    examinedBy: [
      {
        review: 'REVIEW-01',
        findings: ['iso-a3-minimum-payout-threshold', 'iso-a3-pays-before-clawback-window-closes'],
      },
    ],
  },
  /*
   * NUMBERED A.4 HERE AND §A.5 IN REVIEW-01.
   *
   * `iso-a5-clawback-window-and-tiers` is a REVIEW-01 blocker against "§A.5
   * Clawback Provision". The clause it is about is this one; the fixes that
   * review produced removed the section above it and everything below moved
   * up. It is the clearest case in the corpus for why `examinedBy` attaches a
   * finding to a clause by judgement rather than by matching the locus
   * string — a match would break precisely when a review had been acted on.
   */
  {
    slug: 'iso-pra.clawback-provision',
    version: 1,
    instrument: 'iso-pra',
    number: 'A.4',
    section: 'commission',
    sortKey: 40,
    heading: 'Clawback Provision',
    body: 'If a funded merchant breaches its purchase agreement within thirty (30) days following funding disbursement, ISO Partner shall repay one hundred percent (100%) of the commission paid on that transaction. If the breach occurs after the thirtieth (30th) day but within forty-five (45) days following funding disbursement, ISO Partner shall repay fifty percent (50%) of that commission. No commission is repayable in respect of a breach occurring after the forty-fifth (45th) day. Repayment is mandatory and is not subject to Company’s election; Company’s failure to demand repayment on any transaction is not a waiver of its right to demand it on any other. Company shall recover a clawback amount first by setting it off against commissions otherwise payable to ISO Partner, on any transaction and in any later payment cycle, and ISO Partner agrees that set-off is the ordinary and expected mechanism. Only to the extent an amount remains unrecovered ninety (90) days after Company gives notice of it does it become a debt payable in cash on demand. Company shall give ISO Partner written notice identifying the transaction and the amount before applying any set-off. Clawback amounts shall not exceed the commission actually paid on that funding. This Section survives termination or expiry of this Agreement.',
    source: { kind: 'attorney-drafted', author: null },
    status: 'draft',
    appliesInStates: [],
    examinedBy: [
      {
        review: 'REVIEW-01',
        findings: ['iso-a5-clawback-window-and-tiers', 'iso-clawback-does-not-survive-termination'],
      },
      {
        review: 'REVIEW-02',
        findings: [
          'iso-a2-a4-no-clawback-when-the-merchant-cancels-under-frpa-4-14',
          'debt-vocabulary-the-language-guard-would-not-catch',
        ],
      },
    ],
  },
  /*
   * READ BY REVIEW-01 AND NOTHING WAS RAISED.
   *
   * Recorded as `findings: []`, which is not the same as clean. REVIEW-02
   * puts it exactly: "`—` means read and no finding. That is not the same as
   * clean; it means I could not demonstrate anything." An empty
   * `examinedBy`, by contrast, would mean nobody had read it at all, and the
   * test refuses that.
   */
  {
    slug: 'iso-pra.commission-transparency',
    version: 1,
    instrument: 'iso-pra',
    number: 'A.5',
    section: 'commission',
    sortKey: 50,
    heading: 'Commission Transparency',
    body: 'ISO Partner shall have access to a real-time partner portal at app.lombardpay.com displaying all submitted applications, funding statuses, earned commissions, and payout history.',
    source: { kind: 'attorney-drafted', author: null },
    status: 'draft',
    appliesInStates: [],
    examinedBy: [{ review: 'REVIEW-01', findings: [] }],
  },
  /*
   * ADDED IN ANSWER TO A REVIEW-01 FINDING, AND EXAMINED ONLY BY REVIEW-02.
   *
   * REVIEW-01 raised `iso-no-bar-on-partner-charging-merchant` against
   * "Section A (whole)" — there was no bar on the partner charging the
   * merchant anywhere in the agreement. This clause is the answer to it. It
   * is not recorded as examined by REVIEW-01, because REVIEW-01 did not read
   * it: Phase 0's appendix lists A.6 among the clauses no review had
   * examined, and REVIEW-02 is where it was finally read — raising three
   * findings, one of which is that the remedy in its final sentence sends the
   * merchant's money to Company rather than back to the merchant.
   */
  {
    slug: 'iso-pra.sole-compensation',
    version: 1,
    instrument: 'iso-pra',
    number: 'A.6',
    section: 'commission',
    sortKey: 60,
    heading: 'Sole Compensation',
    body: 'The commission payable by Company under this Section A is ISO Partner’s sole and entire compensation in connection with any merchant it introduces. ISO Partner shall not charge, accept or solicit any fee, commission or other consideration from a merchant, directly or indirectly, in connection with any financing. If ISO Partner receives any such payment it shall disclose the payment to Company in writing immediately and refund it to the merchant who paid it, and shall provide Company with evidence of the refund.',
    source: { kind: 'attorney-drafted', author: null },
    status: 'draft',
    appliesInStates: [],
    examinedBy: [
      {
        review: 'REVIEW-02',
        findings: [
          'iso-a6-remedy-sends-the-merchants-money-to-company',
          'iso-a6-and-frpa-7-21-give-different-answers-about-a-merchant-paid-fee',
          'iso-a1-commission-out-of-a-fee-the-company-may-not-collect',
        ],
      },
    ],
  },
];
