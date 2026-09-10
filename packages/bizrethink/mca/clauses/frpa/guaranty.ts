import type { McaClause } from '../types';

/**
 * Sections 9 and 10 — the personal guaranty and service of process.
 *
 * Bodies are the words the shipped document prints.
 * `__tests__/frpa-coverage.test.ts` additionally asserts that NOTHING in the
 * document is missing from the library — the direction that fails silently.
 */
export const FRPA_GUARANTY: McaClause[] = [
  {
    slug: 'frpa.guarantor-information-9-1',
    version: 1,
    instrument: 'frpa',
    kind: 'field-group',
    includeWhen: null,
    number: '9.1',
    section: 'guaranty',
    sortKey: 10,
    heading: 'Guarantor Information',
    body: '',
    /*
      Six blanks, «35»-«40», exactly as Section 9 prints them. The body stays
      empty and that is now a statement rather than an omission: this section
      holds a table, and `kind` says so.

      Title is the one optional field. A guarantor signing in a personal
      capacity may hold no office, and the 2026-09-09 counsel memo asks for
      corporate and personal capacity to be kept distinct rather than merged.

      The SSN is collected here and MUST NOT be reproduced in distributed
      copies; the same memo raises it. Nothing in this package distributes
      anything, so that is a rendering obligation recorded where the field is.
    */
    fields: [
      { label: 'Full Name', widget: '«35»', kind: 'text', required: true },
      { label: 'Title', widget: '«36»', kind: 'text', required: false },
      { label: 'Social Security Number', widget: '«37»', kind: 'ssn', required: true },
      { label: 'Home Address', widget: '«38»', kind: 'text', required: true },
      { label: 'Phone', widget: '«39»', kind: 'text', required: true },
      { label: 'Email', widget: '«40»', kind: 'text', required: true },
    ],
    source: { kind: 'attorney-drafted', author: null },
    status: 'draft',
    appliesInStates: [],
    examinedBy: [
      { review: 'REVIEW-01', findings: ['frpa-guarantor-widget-bound-to-merchant'] },
      { review: 'REVIEW-02', findings: ['frpa-9-5-refers-to-guarantors-the-form-cannot-collect'] },
    ],
  },
  {
    slug: 'frpa.guaranty-of-performance-9-2',
    version: 1,
    instrument: 'frpa',
    kind: 'clause',
    includeWhen: null,
    number: '9.2',
    section: 'guaranty',
    sortKey: 20,
    heading: 'Guaranty of Performance',
    body: 'The undersigned Guarantor(s) hereby guarantee to {{funder}} (“Buyer”) only the following, and nothing else in this Agreement (the “Guaranteed Obligations”): (a) that Merchant has not committed fraud in connection with this Agreement; (b) that no representation or warranty of present fact made by Merchant in this Agreement was incorrect, false or misleading in any material respect when made, other than any representation as to Merchant’s future intentions, anticipations or expectations; and (c) that Merchant has not acted with the intent to interfere with Buyer’s right to collect the Receipts purchased under this Agreement, including by the conduct described in Section 5.17 or Section 6.1.8. This Guaranty does not guarantee the repayment of the Receipts, the performance of any other covenant in this Agreement, or Merchant’s business performance. For the avoidance of doubt, no Guarantor has any liability under this Guaranty arising from a decline in Merchant’s sales, the cessation or failure of Merchant’s business, Merchant’s insolvency, or any bankruptcy filing by or against Merchant. Guarantor’s obligations are due at the time of any breach by Merchant of any of the Guaranteed Obligations under this Agreement.',
    source: { kind: 'attorney-drafted', author: null },
    status: 'draft',
    appliesInStates: [],
    examinedBy: [
      {
        review: 'REVIEW-01',
        findings: [
          'default-on-any-term-no-cure-no-materiality',
          'frpa-buyer-named-by-three-widgets',
          'guarantor-termination-notice-is-default',
          'guaranty-covers-every-covenant',
          'guaranty-reaches-business-failure',
        ],
      },
      {
        review: 'REVIEW-02',
        findings: [
          'frpa-5-11-and-5-13-route-personal-liability-through-the-narrowed-9-2',
          'frpa-9-4-creates-guarantor-liability-on-merchant-bankruptcy',
          'frpa-undefined-capitalised-terms-in-the-unexamined-clauses',
        ],
      },
    ],
  },
  {
    slug: 'frpa.guarantor-waivers-9-4',
    version: 1,
    instrument: 'frpa',
    kind: 'clause',
    includeWhen: null,
    number: '9.4',
    section: 'guaranty',
    sortKey: 40,
    heading: 'Guarantor Waivers',
    body: 'In the event that Merchant breaches any of the Guaranteed Obligations, Buyer may enforce its rights under this Guaranty without first seeking to obtain payment from Merchant, any other guarantor, or any Collateral or Additional Collateral Buyer may hold pursuant to this Guaranty. Buyer does not have to notify Guarantor of any of the following events, and Guarantor will not be released from its obligations under this Guaranty if it is not notified of: (i) Buyer’s failure to receive in a timely manner any amount due under this Agreement; (ii) any adverse change in Merchant’s financial condition or business; (iii) any sale or other disposition of any collateral securing the Guaranteed Obligations; (iv) Buyer’s acceptance of this Guaranty; and (v) any renewal, extension, or other modification of this Agreement.\nIn addition, Buyer may take any of the following actions without releasing Guarantor: (i) renew, extend, or otherwise modify this Agreement; (ii) release Merchant from its obligations to Buyer; (iii) sell, release, impair, waive, or otherwise fail to realize upon any collateral securing the Guaranteed Obligations; and (iv) foreclose on any collateral in a manner that impairs or precludes Guarantor’s right to obtain reimbursement.\nUntil the Purchased Amount and all other amounts payable under this Agreement have been received by Buyer in full, Guarantor shall not seek reimbursement from Merchant or any other guarantor for any amounts paid by it under this Guaranty. Guarantor waives and shall not seek to exercise any of the following rights against Merchant, any other guarantor, or any collateral provided by Merchant or any other guarantor for any amounts paid by it, or acts performed by it, under this Guaranty: (i) subrogation; (ii) reimbursement; (iii) performance; (iv) indemnification; or (v) contribution. In the event that Buyer must return any amount paid by Merchant or any other guarantor because that person has become subject to a proceeding under the United States Bankruptcy Code or any similar law, Guarantor’s obligations under this Guaranty shall include that amount.',
    source: { kind: 'attorney-drafted', author: null },
    status: 'draft',
    appliesInStates: [],
    examinedBy: [
      {
        review: 'REVIEW-02',
        findings: [
          'debt-vocabulary-the-language-guard-would-not-catch',
          'frpa-9-4-creates-guarantor-liability-on-merchant-bankruptcy',
        ],
      },
    ],
  },
  {
    slug: 'frpa.joint-and-several-liability-9-5',
    version: 1,
    instrument: 'frpa',
    kind: 'clause',
    includeWhen: null,
    number: '9.5',
    section: 'guaranty',
    sortKey: 50,
    heading: 'Joint and Several Liability',
    body: 'The obligations of the persons or entities constituting Guarantors under this Guaranty are joint and several.',
    source: { kind: 'attorney-drafted', author: null },
    status: 'draft',
    appliesInStates: [],
    examinedBy: [{ review: 'REVIEW-02', findings: ['frpa-9-5-refers-to-guarantors-the-form-cannot-collect'] }],
  },
  {
    slug: 'frpa.guarantor-acknowledgement-9-6',
    version: 1,
    instrument: 'frpa',
    kind: 'clause',
    includeWhen: null,
    number: '9.6',
    section: 'guaranty',
    sortKey: 60,
    heading: 'Guarantor Acknowledgement',
    body: 'Guarantor acknowledges (i) the seriousness of the provisions of this Guaranty, and (ii) has had a full opportunity to consult with counsel of its choice or has decided not to avail himself or herself of that opportunity.',
    source: { kind: 'attorney-drafted', author: null },
    status: 'draft',
    appliesInStates: [],
    examinedBy: [
      {
        review: 'REVIEW-02',
        findings: [
          'frpa-4-8-conditions-the-counsel-review-7-22-promises',
          'frpa-7-10-jury-waiver-recites-what-7-22-contemplates-is-false',
        ],
      },
    ],
  },
  {
    slug: 'frpa.section-10-1',
    version: 1,
    instrument: 'frpa',
    kind: 'clause',
    includeWhen: null,
    number: '10.1',
    section: 'service',
    sortKey: 10,
    heading: '',
    body: 'Merchant hereby irrevocably and unconditionally waives personal service of any summons, complaint, or other process, which may be made by any other means permitted by New York or Florida law. Merchant further agrees to waive any objection to the absence of formal service of process.',
    source: { kind: 'attorney-drafted', author: null },
    status: 'draft',
    appliesInStates: [],
    examinedBy: [
      { review: 'REVIEW-01', findings: ['ct-prejudgment-remedy-waiver', 'service-without-notice-vs-commitment-9'] },
    ],
  },
  {
    slug: 'frpa.section-10-2',
    version: 1,
    instrument: 'frpa',
    kind: 'clause',
    includeWhen: null,
    number: '10.2',
    section: 'service',
    sortKey: 20,
    heading: '',
    body: 'Guarantor hereby irrevocably and unconditionally waives personal service of any summons, complaint, or other process, which may be made by any other means permitted by New York or Florida law. Guarantor further agrees to waive any objection to the absence of formal service of process.',
    source: { kind: 'attorney-drafted', author: null },
    status: 'draft',
    appliesInStates: [],
    examinedBy: [{ review: 'REVIEW-01', findings: ['ct-prejudgment-remedy-waiver'] }],
  },
  {
    slug: 'frpa.section-10-3',
    version: 1,
    instrument: 'frpa',
    kind: 'clause',
    includeWhen: null,
    number: '10.3',
    section: 'service',
    sortKey: 30,
    heading: '',
    body: 'MERCHANT HEREBY AGREES TO ACCEPT SERVICE OF ANY SUMMONS, COMPLAINT, OR OTHER PROCESS BY ELECTRONIC MAIL AT _____________«48»_____________ OR BY UNITED STATES POSTAL SERVICE AT ____________________________«49»____________________________ OR BY ANY OTHER MEANS PERMITTED BY NEW YORK OR FLORIDA LAW.',
    source: { kind: 'attorney-drafted', author: null },
    status: 'draft',
    appliesInStates: [],
    examinedBy: [{ review: 'REVIEW-02', findings: [] }],
  },
  {
    slug: 'frpa.section-10-4',
    version: 1,
    instrument: 'frpa',
    kind: 'clause',
    includeWhen: null,
    number: '10.4',
    section: 'service',
    sortKey: 40,
    heading: '',
    body: 'GUARANTOR HEREBY AGREES TO ACCEPT SERVICE OF ANY SUMMONS, COMPLAINT, OR OTHER PROCESS BY ELECTRONIC MAIL AT _____________«50»_____________ OR BY UNITED STATES POSTAL SERVICE AT ____________________________«51»____________________________ OR BY ANY OTHER MEANS PERMITTED BY NEW YORK OR FLORIDA LAW.',
    source: { kind: 'attorney-drafted', author: null },
    status: 'draft',
    appliesInStates: [],
    examinedBy: [{ review: 'REVIEW-02', findings: [] }],
  },
  {
    slug: 'frpa.section-10-5',
    version: 1,
    instrument: 'frpa',
    kind: 'clause',
    includeWhen: null,
    number: '10.5',
    section: 'service',
    sortKey: 50,
    heading: '',
    body: 'Merchant or Guarantor shall notify Buyer of any changes to its physical address or email address for service. Unless Buyer is notified of a change in address, all addresses shall be presumed to be accurate.',
    source: { kind: 'attorney-drafted', author: null },
    status: 'draft',
    appliesInStates: [],
    examinedBy: [{ review: 'REVIEW-02', findings: [] }],
  },
  {
    slug: 'frpa.section-10-6',
    version: 1,
    instrument: 'frpa',
    kind: 'clause',
    includeWhen: null,
    number: '10.6',
    section: 'service',
    sortKey: 60,
    heading: '',
    body: 'This Section shall supersede any notice requirements in this Agreement with respect to service of process.',
    source: { kind: 'attorney-drafted', author: null },
    status: 'draft',
    appliesInStates: [],
    examinedBy: [{ review: 'REVIEW-02', findings: [] }],
  },
];
