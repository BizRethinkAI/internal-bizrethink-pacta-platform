import type { McaClause } from '../types';

/**
 * SECTION I — REFERRAL DUTIES.
 *
 * Bodies are the words the shipped document prints, and
 * `__tests__/bodies-match-the-document.test.ts` re-finds every one of them
 * in `source-documents/Lombard_ISO_Partner_Referral_Agreement_v2.txt` on every
 * run. Edit one here and the test goes red, which is correct: the document is
 * where a clause is amended, and this library follows it.
 */
export const ISO_PRA_REFERRAL_DUTIES: McaClause[] = [
  {
    slug: 'iso-pra.appointment',
    whyThisClause: { kind: 'discretionary' },
    variance: {
      kind: 'fixed',
      because: 'load-bearing',
      note: 'The agreement must define the nonexclusive referral appointment and its authority limits; no alternate broker appointment is authored.',
    },
    version: 1,
    instrument: 'iso-pra',
    kind: 'clause',
    includeWhen: null,
    section: 'referral-duties',
    sortKey: 10,
    heading: 'Appointment',
    body: 'Company hereby appoints ISO Partner as a non-exclusive independent referral agent for the purpose of introducing prospective merchants to Company for payment processing. Merchant cash advance funding is available to such merchants through Company’s ordinary underwriting path, and a commission is earned only if and when such a merchant funds. ISO Partner is not an employee, agent, or legal representative of Company and shall not hold itself out as such.',
    source: { kind: 'attorney-drafted', author: null },
    status: 'draft',
    appliesInStates: [],
    examinedBy: [
      {
        review: 'REVIEW-01',
        findings: ['iso-partner-is-a-broker-despite-referral-agent-label', 'iso-recital-funding-not-processing'],
      },
    ],
  },
  /*
   * The unqualified bar in the final sentence is what ISO PRA 2.6(b) relies
   * on to keep 10 CCR §952(b)-(c) and 23 NYCRR §600.21(b)-(c) from engaging
   * at all. The two clauses are one argument in two places, which is why
   * REVIEW-01's `iso-partner-may-communicate-terms-in-own-name` is against
   * this sentence and 1.3 together.
   */
  {
    slug: 'iso-pra.referral-obligations',
    whyThisClause: { kind: 'discretionary' },
    variance: {
      kind: 'fixed',
      because: 'no-alternative',
      note: 'The no-specific-offer communication rule is the chosen referral-only channel model; disclosure law can permit compliant broker communications and does not compel this universal ban.',
    },
    version: 1,
    instrument: 'iso-pra',
    kind: 'clause',
    includeWhen: null,
    section: 'referral-duties',
    sortKey: 20,
    heading: 'Referral Obligations',
    body: 'ISO Partner agrees to refer merchant applicants in good faith, providing accurate and complete information via the Company’s online portal. ISO Partner shall submit only those merchants that ISO Partner reasonably believes operate a legitimate business and are suitable candidates for merchant cash advance funding. ISO Partner shall not, in any capacity and in any party’s name, communicate to a merchant any specific commercial financing offer, any proposed amount, rate, factor, term or payment, or any assessment of approval likelihood, whether before or after underwriting. All such communication is made by Company directly to the merchant.',
    source: { kind: 'attorney-drafted', author: null },
    status: 'draft',
    appliesInStates: [],
    examinedBy: [
      {
        review: 'REVIEW-01',
        findings: [
          'iso-partner-may-communicate-terms-in-own-name',
          'iso-partner-is-a-broker-despite-referral-agent-label',
        ],
      },
    ],
  },
  {
    slug: 'iso-pra.approval-of-applications',
    whyThisClause: { kind: 'discretionary' },
    variance: {
      kind: 'fixed',
      because: 'load-bearing',
      note: 'Underwriting approval belongs to Company in this referral-only model; no alternative delegated approval authority is authored.',
    },
    version: 1,
    instrument: 'iso-pra',
    kind: 'clause',
    includeWhen: null,
    section: 'referral-duties',
    sortKey: 30,
    heading: 'Approval of Applications',
    body: 'ISO Partner acknowledges that all merchant applications must be approved by Company at its sole discretion and will become effective only upon such approval. ISO Partner will not at any time make any promise or create any impression that an application will be approved, or communicate any term on which it might be approved. Company reserves the right to accept or deny any and all prospective merchants.',
    source: { kind: 'attorney-drafted', author: null },
    status: 'draft',
    appliesInStates: [],
    examinedBy: [{ review: 'REVIEW-01', findings: ['iso-partner-may-communicate-terms-in-own-name'] }],
  },
  {
    slug: 'iso-pra.duty-to-notify',
    whyThisClause: { kind: 'discretionary' },
    variance: {
      kind: 'fixed',
      because: 'no-alternative',
      note: 'The ISO’s adverse-information reporting covenant is the only authored notification rule; no alternate reporting threshold or period is offered.',
    },
    version: 1,
    instrument: 'iso-pra',
    kind: 'clause',
    includeWhen: null,
    section: 'referral-duties',
    sortKey: 40,
    heading: 'Duty to Notify',
    body: 'ISO Partner shall promptly notify Company in writing of any adverse information relating to a referred merchant, including but not limited to: (i) information regarding the merchant’s financial distress, (ii) changes in the merchant’s business operations or ownership, (iii) suspected fraud or misrepresentation, or (iv) any information that could indicate Company may incur losses on a funded deal.',
    source: { kind: 'attorney-drafted', author: null },
    status: 'draft',
    appliesInStates: [],
    examinedBy: [{ review: 'REVIEW-01', findings: [] }],
  },
  {
    slug: 'iso-pra.marketing-materials',
    whyThisClause: {
      kind: 'implements',
      citation: '15 U.S.C. §45(a)(1) (unfair or deceptive acts or practices within FTC jurisdiction)',
    },
    variance: {
      kind: 'fixed',
      because: 'no-alternative',
      note: 'Company approval of materials and accurate marketing are the only authored channel controls; no alternative marketing-approval process is authored.',
    },
    version: 1,
    instrument: 'iso-pra',
    kind: 'clause',
    includeWhen: null,
    section: 'referral-duties',
    sortKey: 50,
    heading: 'Marketing Materials',
    body: 'ISO Partner shall only use marketing and promotional materials that have received prior written approval from Company. ISO Partner shall not misrepresent Company’s products, services, rates, or terms in any marketing activity.',
    source: { kind: 'attorney-drafted', author: null },
    status: 'draft',
    appliesInStates: [],
    examinedBy: [{ review: 'REVIEW-01', findings: [] }],
  },
  {
    slug: 'iso-pra.representatives',
    whyThisClause: { kind: 'discretionary' },
    variance: {
      kind: 'fixed',
      because: 'load-bearing',
      note: 'The referral model needs responsibility for the ISO’s personnel and a removal mechanism; the broker-channel answer does not select alternate personnel terms.',
    },
    version: 1,
    instrument: 'iso-pra',
    kind: 'clause',
    includeWhen: null,
    section: 'referral-duties',
    sortKey: 60,
    heading: 'Representatives',
    body: 'ISO Partner shall ensure that each of its employees, contractors, and other personnel involved in referral activities complies with the terms of this Agreement. ISO Partner shall be responsible for the actions of its representatives. ISO Partner shall remove any representative from participation in referral activities under this Agreement promptly on request by Company.',
    source: { kind: 'attorney-drafted', author: null },
    status: 'draft',
    appliesInStates: [],
    examinedBy: [{ review: 'REVIEW-02', findings: ['iso-1-6-representative-removal-is-a-request-with-no-obligation'] }],
  },
];
