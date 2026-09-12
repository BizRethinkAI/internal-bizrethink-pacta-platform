import type { McaClause } from '../types';

/**
 * The Subscription Agreement — section 4.
 *
 * Bodies are the words the shipped document prints. Both
 * `__tests__/bodies-match-the-document.test.ts` and
 * `__tests__/twins.test.ts` re-check them on every run — the first against
 * this document, the second against the twin.
 */
export const SUBSCRIPTION_GUARANTY: McaClause[] = [
  {
    slug: 'subscription.guarantor-information',
    version: 1,
    instrument: 'subscription',
    kind: 'field-group',
    includeWhen: null,
    section: 'guaranty',
    sortKey: 10,
    heading: 'Guarantor Information',
    body: '',
    /*
      Four blanks, «21»-«24». Fewer than the FRPA's six — no Title and no Email
      — and that difference is real, not an import gap: the twins collect a
      Phone NUMBER where the FRPA collects a Phone.

      The two twins number these IDENTICALLY, which is why `widget` is required
      on every field. A group copied from one to the other reads as correct.
    */
    fields: [
      { label: 'Full Name', widget: '«21»', kind: 'text', required: true },
      { label: 'Social Security Number', widget: '«22»', kind: 'ssn', required: true },
      { label: 'Home Address', widget: '«23»', kind: 'text', required: true },
      { label: 'Phone Number', widget: '«24»', kind: 'text', required: true },
    ],
    source: { kind: 'attorney-drafted', author: null },
    status: 'draft',
    appliesInStates: [],
    examinedBy: [{ review: 'REVIEW-01', findings: [] }],
  },
  {
    slug: 'subscription.guaranty-of-payment',
    version: 1,
    instrument: 'subscription',
    kind: 'clause',
    includeWhen: null,
    section: 'guaranty',
    sortKey: 20,
    heading: 'Guaranty of Payment',
    body: 'To induce {{equipmentAffiliate}} to enter into this Subscription and purchase the Equipment for Subscriber, and knowing that {{equipmentAffiliate}} is relying on this guaranty as a condition to entering into this Subscription, I, the undersigned (the “Guarantor”), individually guarantee to {{equipmentAffiliate}} only the following obligations of Subscriber to {{equipmentAffiliate}} under the Subscription, and nothing else: (a) return of the Equipment when required, or payment of its fair market value if it is not returned; (b) that Subscriber has not committed fraud or made any material misrepresentation of present fact in connection with the Subscription; and (c) that Subscriber has not acted with intent to deprive us of the Equipment. I am not personally liable for any monthly subscription charge, for any amount accelerated under Section [[clause:subscription.default-remedies]](b)(ii), or for any obligation arising because Subscriber’s business has slowed, ceased, or failed. Subject to those limits, I make this guaranty irrespective of any other circumstance which might otherwise constitute a defense to the Subscription and/or this Guaranty. {{equipmentAffiliate}} shall not be required to proceed against Subscriber or the Equipment or enforce any other remedy before proceeding against me. I agree to pay all attorneys’ fees and other expenses {{equipmentAffiliate}} incurs in enforcing any term of this Guaranty. I consent to any extension or modification granted to Subscriber, and the release and/or compromise of any obligation of Subscriber or any other obligors and guarantors shall not in any way release me from my obligations under this Guaranty. This is a continuing Guaranty and shall bind my heirs, successors, and assigns, and may be enforced by or for the benefit of any assignee or successor of {{equipmentAffiliate}}.',
    source: { kind: 'attorney-drafted', author: null },
    status: 'draft',
    appliesInStates: [],
    examinedBy: [
      {
        review: 'REVIEW-01',
        findings: [
          'guaranty-distinction-preserved-beneficiary-blank',
          'sub-payment-guaranty-defeats-commitment-3',
          'sub-provider-name-25-separate-widgets',
        ],
      },
      { review: 'REVIEW-02', findings: ['el-3-14-was-not-conformed-when-4-2-was-narrowed'] },
    ],
  },
  /*
    THE SUBSCRIPTION HALF OF ONE REWRITE, and the reasons are NOT repeated here.
    They are set out in full above §4.3 in `equipment-lease/guaranty.ts`, because
    a reason duplicated in two files is the twin problem in comment form:
    `twins.test.ts` checks that the two bodies agree and nothing checks that two
    prose explanations still do.

    AND ONE WORD DIFFERS BY DESIGN. The cross-reference reads "reflected in the
    Subscription" where the Equipment Lease reads "reflected in this Lease" —
    the gratuitous asymmetry `TWIN_VOCABULARY_EXCEPTIONS` records for §4.3. It is
    carried through the rewrite rather than tidied, so the recorded finding about
    these two documents stays true.
  */
  {
    slug: 'subscription.independent-decision-governing-law',
    version: 1,
    instrument: 'subscription',
    kind: 'clause',
    includeWhen: null,
    section: 'guaranty',
    sortKey: 30,
    heading: 'Governing Law; Service of Legal Process',
    body: 'I agree and acknowledge that this Guaranty is subject to the governing law and venue provision reflected in the Subscription at Section [[clause:subscription.governing-law-and-venue]] (Governing Law and Venue). If any part of this Guaranty is not enforceable, the remaining provisions will remain valid and enforceable.\nService of a summons, a complaint or other legal process on me must be made in a manner that the procedural law of the court in which the proceeding is brought, and any applicable order of that court, authorizes. A mailing that is returned, refused or undeliverable is not service on me, and neither is a notice given under Section [[clause:subscription.notices]]; neither is evidence that service was made. The time I have to respond to a proceeding is the time that procedural law or an order of the court gives me, and this Guaranty neither shortens it nor starts it running on an event of its own.\nThis Guaranty gives up nothing that applicable law does not permit to be given up. It contains no agreement by me to accept service in advance of a proceeding, no waiver of valid service, no waiver of an objection to jurisdiction or venue, no waiver of a notice, a hearing or a prior court order that applicable law requires before a prejudgment remedy is obtained, and no confession of judgment. I may accept service, or give up service, after a proceeding has begun, in the manner the law then applicable permits.\nThis Guaranty does not waive a claim for fraud or misrepresentation, a right applicable law does not permit to be waived, or a required disclosure. My signature is not a representation about what I was told before signing it, and no recital in this Subscription or this Guaranty is evidence of one.\nI agree to promptly notify {{equipmentAffiliate}} of any change of my address and that of the Subscriber. A failure to do so does not make an otherwise invalid service valid.',
    source: { kind: 'attorney-drafted', author: null },
    status: 'draft',
    appliesInStates: [],
    examinedBy: [
      { review: 'REVIEW-01', findings: ['sub-provider-name-25-separate-widgets'] },
      { review: 'REVIEW-02', findings: ['el-4-3-makes-service-effective-on-mailing-where-the-frpa-requires-receipt'] },
    ],
  },
  /*
    THE SUBSCRIPTION HALF OF ONE REWRITE, and the reasons are NOT repeated here.
    They are set out in full above §4.4 in `equipment-lease/guaranty.ts`, because
    a reason duplicated in two files is the twin problem in comment form:
    `twins.test.ts` checks that the two bodies agree and nothing checks that two
    prose explanations still do.
  */
  {
    slug: 'subscription.jury-trial-and-class-action-waiver',
    version: 1,
    instrument: 'subscription',
    kind: 'clause',
    includeWhen: null,
    section: 'guaranty',
    sortKey: 40,
    heading: 'Jury Trial, Class Proceedings, and Limitation of Actions',
    body: '{{equipmentAffiliate}} and I each waive trial by jury in an action arising out of or relating to this Guaranty, to the extent the law of the forum gives effect to a waiver of that right made before a dispute has arisen. Where the law of the forum does not give effect to such a waiver, this Section has no effect and each of us retains the right to trial by jury. This waiver is mutual, it is limited to {{equipmentAffiliate}} and me, and it does not reach a claim applicable law requires to be tried to a jury.\nNo party waives a right to bring, to defend, or to take part in a class, collective, representative or public-enforcement proceeding that applicable law permits. Whether such a proceeding is available, and in what form, is for the court to determine under applicable law and its own rules. I keep whatever share of a recovery such a proceeding awards me and any right to costs or to a fee award that applicable law gives me.\nThe limitation period, the accrual rule, and any tolling or discovery rule that applicable law supplies apply to a claim by each party to this Guaranty alike, whoever brings it and whoever it is brought against. This Guaranty does not shorten any of them, and neither this Guaranty nor Section [[clause:subscription.governing-law-and-venue]] shortens one anywhere else. A claim that applicable law does not permit to be shortened or given up is unaffected by this Guaranty.\nI give up nothing under this Section on behalf of anyone but myself.',
    source: { kind: 'attorney-drafted', author: null },
    status: 'draft',
    appliesInStates: [],
    examinedBy: [
      { review: 'REVIEW-01', findings: ['sub-provider-name-25-separate-widgets'] },
      {
        review: 'REVIEW-02',
        findings: [
          'el-3-15-jury-waiver-is-one-sided-where-the-frpas-is-mutual',
          'el-4-4-guarantor-waives-on-the-lessees-behalf-with-no-authority-recital',
        ],
      },
    ],
  },
  {
    slug: 'subscription.credit-reporting-authorization',
    version: 1,
    instrument: 'subscription',
    kind: 'clause',
    includeWhen: null,
    section: 'guaranty',
    sortKey: 50,
    heading: 'Credit Reporting Authorization',
    body: 'I expressly authorize {{equipmentAffiliate}} or its servicing agents or assigns continuing authority to obtain one or more consumer credit reports from a credit bureau or credit reporting agency and to conduct one or more credit checks concerning my credit history. I acknowledge that {{equipmentAffiliate}} may furnish information relating to this Subscription and Guaranty to one or more credit reporting agencies. If I believe that any information that {{equipmentAffiliate}} furnishes to a credit reporting agency is inaccurate, I will notify {{equipmentAffiliate}} of that inaccuracy in writing at _______________«44»_______________ or as may be designated by {{equipmentAffiliate}} or any assignee. I understand that upon my request, {{equipmentAffiliate}} will inform me whether or not a credit report was requested, and if such report was requested, of the name and address of the consumer reporting agency that furnished the report.',
    source: { kind: 'attorney-drafted', author: null },
    status: 'draft',
    appliesInStates: [],
    examinedBy: [{ review: 'REVIEW-01', findings: ['sub-provider-name-25-separate-widgets'] }],
  },
  {
    slug: 'subscription.communications-consent',
    version: 1,
    instrument: 'subscription',
    kind: 'clause',
    includeWhen: null,
    section: 'guaranty',
    sortKey: 60,
    heading: 'Communications Consent',
    body: 'I, on my behalf and on behalf of Subscriber, expressly consent to receive: (1) telephone calls on a recorded line, including but not limited to collection calls and/or telemarketing calls regarding offers by or on behalf of {{equipmentAffiliate}}, its assignee, or its servicing agent, via automated dialer technology, via text, and using prerecorded messages, to the telephone number(s) (including wireless numbers) which I provide to {{equipmentAffiliate}}, or which I use to call {{equipmentAffiliate}} or its assignee, or which {{equipmentAffiliate}} learns about through other means; and (2) emails and text messages, including but not limited to collection messages and/or marketing or advertising messages regarding offers by or on behalf of {{equipmentAffiliate}}, to the email address or telephone number which I provide to {{equipmentAffiliate}}. In the event the telephone number(s) or email address which I have provided are changed or relinquished by me, I agree to promptly notify {{equipmentAffiliate}} of any such changes. I am not required to consent to the marketing or telemarketing portion of the foregoing as a condition of qualifying for or obtaining the subscription or any product or service. To opt out of marketing or promotional contact, I may send written notice to the address set forth in Section [[clause:subscription.notices]] (Notices).',
    source: { kind: 'attorney-drafted', author: null },
    status: 'draft',
    appliesInStates: [],
    examinedBy: [{ review: 'REVIEW-01', findings: ['sub-provider-name-25-separate-widgets'] }],
  },
  {
    slug: 'subscription.acknowledgment',
    version: 1,
    instrument: 'subscription',
    kind: 'clause',
    includeWhen: null,
    section: 'guaranty',
    sortKey: 70,
    heading: 'Acknowledgment',
    body: 'BY SIGNING BELOW, I ACKNOWLEDGE THAT I HAVE READ THIS GUARANTY AND ALL PAGES OF THE SUBSCRIPTION, THAT ALL BLANKS IN THE SUBSCRIBER AND EQUIPMENT INFORMATION GRID WERE FILLED IN AT THE TIME OF SIGNING, THAT I HAVE BEEN GIVEN A COPY OR AN OPPORTUNITY TO MAKE A COPY, AND THAT I AGREE TO BE BOUND BY ALL THE TERMS OF THIS GUARANTY AND SUBSCRIPTION. I understand that I may consult an attorney or other advisor before signing this Guaranty and Subscription.\nSignatures\nIN WITNESS WHEREOF, the parties have executed this Subscription Agreement as of the Effective Date. Each of Subscriber and Guarantor represents that he or she is authorized to sign this Agreement, legally binding Subscriber and Guarantor to comply with its terms.',
    source: { kind: 'attorney-drafted', author: null },
    status: 'draft',
    appliesInStates: [],
    examinedBy: [{ review: 'REVIEW-01', findings: [] }],
  },
];
