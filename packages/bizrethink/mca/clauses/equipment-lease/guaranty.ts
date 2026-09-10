import type { McaClause } from '../types';

/**
 * The Equipment Lease Agreement — section 4.
 *
 * Bodies are the words the shipped document prints. Both
 * `__tests__/bodies-match-the-document.test.ts` and
 * `__tests__/twins.test.ts` re-check them on every run — the first against
 * this document, the second against the twin.
 */
export const EQUIPMENT_LEASE_GUARANTY: McaClause[] = [
  {
    slug: 'equipment-lease.guarantor-information',
    version: 1,
    instrument: 'equipment-lease',
    kind: 'field-group',
    includeWhen: null,
    number: '4.1',
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
    examinedBy: [{ review: 'REVIEW-02', findings: [] }],
  },
  {
    slug: 'equipment-lease.guaranty-of-payment',
    version: 1,
    instrument: 'equipment-lease',
    kind: 'clause',
    includeWhen: null,
    number: '4.2',
    section: 'guaranty',
    sortKey: 20,
    heading: 'Guaranty of Payment',
    body: 'To induce {{equipmentAffiliate}} to enter into this Lease and purchase the Equipment for Lessee, and knowing that {{equipmentAffiliate}} is relying on this guaranty as a condition to entering into this Lease, I, the undersigned (the “Guarantor”), individually guarantee to {{equipmentAffiliate}} only the following obligations of Lessee to {{equipmentAffiliate}} under this Lease, and nothing else: (a) return of the Equipment when required, or payment of its fair market value if it is not returned; (b) that Lessee has not committed fraud or made any material misrepresentation of present fact in connection with this Lease; and (c) that Lessee has not acted with intent to deprive us of the Equipment. I am not personally liable for any monthly lease payment, for any amount accelerated under Section 3.12(b)(ii), or for any obligation arising because Lessee’s business has slowed, ceased, or failed. Subject to those limits, I make this guaranty irrespective of any other circumstance which might otherwise constitute a defense to this Lease and/or this Guaranty. {{equipmentAffiliate}} shall not be required to proceed against Lessee or the Equipment or enforce any other remedy before proceeding against me. I agree to pay all attorneys’ fees and other expenses {{equipmentAffiliate}} incurs in enforcing any term of this Guaranty. I consent to any extension or modification granted to Lessee, and the release and/or compromise of any obligation of Lessee or any other obligors and guarantors shall not in any way release me from my obligations under this Guaranty. This is a continuing Guaranty and shall bind my heirs, successors, and assigns, and may be enforced by or for the benefit of any assignee or successor of {{equipmentAffiliate}}.',
    source: { kind: 'attorney-drafted', author: null },
    status: 'draft',
    appliesInStates: [],
    examinedBy: [{ review: 'REVIEW-02', findings: ['el-3-14-was-not-conformed-when-4-2-was-narrowed'] }],
  },
  {
    slug: 'equipment-lease.independent-decision-governing-law',
    version: 1,
    instrument: 'equipment-lease',
    kind: 'clause',
    includeWhen: null,
    number: '4.3',
    section: 'guaranty',
    sortKey: 30,
    heading: 'Independent Decision; Governing Law',
    body: 'I REPRESENT AND WARRANT THAT MY DECISION TO ENTER INTO THIS GUARANTY IS NOT BASED ON ANY PROMISE MADE BY ANYONE, WHETHER WRITTEN OR ORAL, THAT IS NOT SET FORTH IN THIS LEASE AND GUARANTY. I agree and acknowledge that this Guaranty is subject to the governing law provision and forum selection clause reflected in this Lease at Section 3.15 (Governing Law and Venue). If any part of this Guaranty is not enforceable, the remaining provisions will remain valid and enforceable. I understand that the cost of litigating in Florida may be in excess of the amount at stake in the litigation. Nonetheless, I waive any objection that such courts are an inconvenient forum or venue, irrespective of the actual amount at issue. {{equipmentAffiliate}} may properly serve me with legal process via certified mail to my address set forth herein or to my current or last known address, and upon such mailing, service shall be effective irrespective of whether a signed certified mail return receipt is returned to {{equipmentAffiliate}}. I agree to promptly notify {{equipmentAffiliate}} of any change of my address and that of the Lessee.',
    source: { kind: 'attorney-drafted', author: null },
    status: 'draft',
    appliesInStates: [],
    examinedBy: [
      { review: 'REVIEW-02', findings: ['el-4-3-makes-service-effective-on-mailing-where-the-frpa-requires-receipt'] },
    ],
  },
  {
    slug: 'equipment-lease.jury-trial-and-class-action-waiver',
    version: 1,
    instrument: 'equipment-lease',
    kind: 'clause',
    includeWhen: null,
    number: '4.4',
    section: 'guaranty',
    sortKey: 40,
    heading: 'Jury Trial and Class Action Waiver',
    body: 'I VOLUNTARILY AND FREELY WAIVE TRIAL BY JURY IN CONNECTION WITH ANY DISPUTE OVER THIS GUARANTY. I agree, in my personal capacity, not to pursue a claim against {{equipmentAffiliate}}, its assigns, or servicing agents, as a lead plaintiff, class representative, or as part of a class action or other representative action. Any permitted cause of action I may have against {{equipmentAffiliate}}, or its assignee, its servicing agent, or their employees and attorneys, must be commenced within one year from the accrual of that cause of action.',
    source: { kind: 'attorney-drafted', author: null },
    status: 'draft',
    appliesInStates: [],
    examinedBy: [
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
    slug: 'equipment-lease.credit-reporting-authorization',
    version: 1,
    instrument: 'equipment-lease',
    kind: 'clause',
    includeWhen: null,
    number: '4.5',
    section: 'guaranty',
    sortKey: 50,
    heading: 'Credit Reporting Authorization',
    body: 'I expressly authorize {{equipmentAffiliate}} or its servicing agents or assigns continuing authority to obtain one or more consumer credit reports from a credit bureau or credit reporting agency and to conduct one or more credit checks concerning my credit history. I acknowledge that {{equipmentAffiliate}} may furnish information relating to this Lease and Guaranty to one or more credit reporting agencies. If I believe that any information that {{equipmentAffiliate}} furnishes to a credit reporting agency is inaccurate, I will notify {{equipmentAffiliate}} of that inaccuracy in writing at _______________«44»_______________ or as may be designated by {{equipmentAffiliate}} or any assignee. I understand that upon my request, {{equipmentAffiliate}} will inform me whether or not a credit report was requested, and if such report was requested, of the name and address of the consumer reporting agency that furnished the report.',
    source: { kind: 'attorney-drafted', author: null },
    status: 'draft',
    appliesInStates: [],
    examinedBy: [
      { review: 'REVIEW-02', findings: ['el-4-5-fcra-authorisation-runs-to-a-different-entity-than-the-frpas'] },
    ],
  },
  {
    slug: 'equipment-lease.communications-consent',
    version: 1,
    instrument: 'equipment-lease',
    kind: 'clause',
    includeWhen: null,
    number: '4.6',
    section: 'guaranty',
    sortKey: 60,
    heading: 'Communications Consent',
    body: 'I, on my behalf and on behalf of Lessee, expressly consent to receive: (1) telephone calls on a recorded line, including but not limited to collection calls and/or telemarketing calls regarding offers by or on behalf of {{equipmentAffiliate}}, its assignee, or its servicing agent, via automated dialer technology, via text, and using prerecorded messages, to the telephone number(s) (including wireless numbers) which I provide to {{equipmentAffiliate}}, or which I use to call {{equipmentAffiliate}} or its assignee, or which {{equipmentAffiliate}} learns about through other means; and (2) emails and text messages, including but not limited to collection messages and/or marketing or advertising messages regarding offers by or on behalf of {{equipmentAffiliate}}, to the email address or telephone number which I provide to {{equipmentAffiliate}}. In the event the telephone number(s) or email address which I have provided are changed or relinquished by me, I agree to promptly notify {{equipmentAffiliate}} of any such changes. I am not required to consent to the marketing or telemarketing portion of the foregoing as a condition of qualifying for or obtaining the lease or any product or service. To opt out of marketing or promotional contact, I may send written notice to the address set forth in Section 3.16 (Notices).',
    source: { kind: 'attorney-drafted', author: null },
    status: 'draft',
    appliesInStates: [],
    examinedBy: [{ review: 'REVIEW-02', findings: [] }],
  },
  {
    slug: 'equipment-lease.acknowledgment',
    version: 1,
    instrument: 'equipment-lease',
    kind: 'clause',
    includeWhen: null,
    number: '4.7',
    section: 'guaranty',
    sortKey: 70,
    heading: 'Acknowledgment',
    body: 'BY SIGNING BELOW, I ACKNOWLEDGE THAT I HAVE READ THIS GUARANTY AND ALL PAGES OF THE LEASE, THAT ALL BLANKS IN SECTION 1 WERE FILLED IN AT THE TIME OF SIGNING, THAT I HAVE BEEN GIVEN A COPY OR AN OPPORTUNITY TO MAKE A COPY, AND THAT I AGREE TO BE BOUND BY ALL THE TERMS OF THIS GUARANTY AND LEASE. I understand that I may consult an attorney or other advisor before signing this Guaranty and Lease.\nSignatures\nIN WITNESS WHEREOF, the parties have executed this Equipment Lease Agreement as of the Effective Date. Each of Lessee and Guarantor represents that he or she is authorized to sign this Agreement, legally binding Lessee and Guarantor to comply with its terms.',
    source: { kind: 'attorney-drafted', author: null },
    status: 'draft',
    appliesInStates: [],
    examinedBy: [{ review: 'REVIEW-02', findings: [] }],
  },
];
