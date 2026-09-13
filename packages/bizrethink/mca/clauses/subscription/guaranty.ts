import type { McaClause } from '../types';

/**
 * The Subscription Agreement — section 4.
 *
 * Draft bodies may differ from the retained shipped source (ADR 0012).
 * Source digests preserve that historical evidence; twins.test.ts checks
 * the two current drafts against each other. The 2026-09-12 report/contact/
 * signature rewrite remains unapproved and does not rebuild a stored template.
 */
export const SUBSCRIPTION_GUARANTY: McaClause[] = [
  {
    slug: 'subscription.guarantor-information',
    whyThisClause: { kind: 'discretionary' },
    variance: {
      kind: 'fixed',
      because: 'misattributed',
      note: 'These fields identify the equipment provider’s guarantor, not the receivables funder’s; the FRPA guaranty-scope answer cannot decide this separate guaranty.',
    },
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
    whyThisClause: { kind: 'discretionary' },
    variance: {
      kind: 'fixed',
      because: 'misattributed',
      note: 'This is a guaranty to the equipment provider of return and specified conduct; the receivables funder’s guaranty-scope answer does not choose its obligations.',
    },
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
    whyThisClause: { kind: 'discretionary' },
    variance: {
      kind: 'fixed',
      because: 'load-bearing',
      note: 'The equipment guaranty needs the same governing-law and lawful-service framework as its own agreement; selecting FRPA arbitration cannot remove those terms.',
    },
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
    whyThisClause: { kind: 'discretionary' },
    variance: {
      kind: 'fixed',
      because: 'misattributed',
      note: 'These procedural choices belong to the equipment guaranty’s parties; the FRPA dispute-resolution answer does not select an alternative for them.',
    },
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
    whyThisClause: {
      kind: 'implements',
      citation:
        '15 U.S.C. §§1681b(a)(2), (f), 1681m(a), 1681s-2(a), (b) (individual instructions, permissible use, adverse-action and applicable furnishing duties)',
    },
    variance: {
      kind: 'fixed',
      because: 'misattributed',
      note: 'Only the individual authorizes this equipment provider’s one initial underwriting report. The receivables funder’s report preference cannot supply that authority; the one-report scope is authored, not a universal FCRA limit.',
    },
    version: 2,
    instrument: 'subscription',
    kind: 'clause',
    includeWhen: null,
    section: 'guaranty',
    sortKey: 50,
    heading: 'Individual Report Instructions; Reporting Duties',
    body: "By my separate individual signature as Guarantor, I authorize {{equipmentAffiliate}} to obtain one consumer report about me only to evaluate my proposed limited guaranty under this Subscription, before {{equipmentAffiliate}} accepts this Subscription. Before I sign, {{equipmentAffiliate}} shall identify the reporting agency and the equipment transaction to me, explain this purpose and duration, and give me the complete Agreement. It shall document a permissible purpose under the Fair Credit Reporting Act and any additional authority state law requires. A signature only for Subscriber gives no individual report permission.\nThis permission expires upon the initial decision, withdrawal of the application or acceptance of this Subscription, whichever occurs first, and I may revoke it before it is used by a reasonable communication received by {{equipmentAffiliate}}. It authorizes no recurring report or later report for review, servicing or collection; a later report requires new, specific individual instructions and a separately documented lawful purpose. It does not authorize the receivables funder, an unrelated affiliate or another equipment provider to obtain a report. Giving report instructions does not make me liable for any obligation beyond Section [[clause:subscription.guaranty-of-payment]].\nIf {{equipmentAffiliate}} furnishes information to a consumer reporting agency, it shall comply with the accuracy, correction, investigation, notice and dispute duties applicable to it. It shall not report an equipment payment or other amount as my personal debt if I do not owe it under that Guaranty. I may report an inaccuracy at _______________«44»_______________ or through another applicable dispute channel; this does not restrict my right to dispute with a consumer reporting agency.\nIf {{equipmentAffiliate}} takes an adverse action with respect to me based in whole or in part on my consumer report, it shall give the notices required by FCRA §615(a) without waiting for a request. The notice shall identify the adverse action; give the agency's name, address and telephone number, including its toll-free number where required; explain that the agency did not make the decision and cannot give the specific reasons for it; and state my right to request a free copy from that agency within 60 days after receiving the notice and to dispute the accuracy or completeness of its report. If a numerical credit score was used, the written or electronic credit-score and related disclosures required by law must also be provided. This Section waives no statutory right.",
    source: { kind: 'attorney-drafted', author: null },
    status: 'draft',
    appliesInStates: [],
    examinedBy: [{ review: 'REVIEW-01', findings: ['sub-provider-name-25-separate-widgets'] }],
  },
  {
    slug: 'subscription.communications-consent',
    whyThisClause: {
      kind: 'implements',
      citation:
        '47 CFR §64.1200(a)(1)-(3), (10)-(11), (f)(9) (applicable calling-consent, written-consent and revocation requirements)',
    },
    variance: {
      kind: 'fixed',
      because: 'misattributed',
      note: 'Consent for equipment-provider contact belongs to the called individual; a funder profile cannot give consent on that person’s or provider’s behalf.',
    },
    version: 2,
    instrument: 'subscription',
    kind: 'clause',
    includeWhen: null,
    section: 'guaranty',
    sortKey: 60,
    heading: 'Contact, Consent and Recording',
    body: "{{equipmentAffiliate}} may contact Subscriber and an individually identified Guarantor to administer and lawfully service this Subscription by a method applicable law permits. Where an automated call, an artificial or prerecorded voice call, or a text message requires consent, {{equipmentAffiliate}} shall first obtain and record it from the person legally entitled to consent for the specified number. Providing a number, using it to call us, or our obtaining it elsewhere does not by itself establish every consent the law requires. Signing this Agreement does not itself give another person's consent or blanket consent to automated, prerecorded or marketing contact.\nMarketing consent shall be obtained separately, identify the seller and the number to be called or messaged, carry the disclosures and signature applicable law requires, and be optional and not a condition of obtaining equipment, this Subscription or any product or service. No consent is given here for an unnamed affiliate or as a blanket override of a do-not-call request.\nA recipient may revoke consent at any time by any reasonable means, including STOP in reply to a text, telephone, email or writing. Revocation applies to consent-dependent servicing or collection contact as well as marketing; servicing or collection does not preserve a revoked consent. {{equipmentAffiliate}} shall honor revocation within the period applicable law allows and thereafter use only a method lawful without that consent. Section [[clause:subscription.notices]] (Notices) does not restrict these methods or delay a revocation; a written request by postal mail is not required.\nBefore recording a call, {{equipmentAffiliate}} shall give the notice and obtain the consent required by applicable law from each participant, and offer an unrecorded alternative where practicable. A signature to this Agreement is not another participant's recording consent.",
    source: { kind: 'attorney-drafted', author: null },
    status: 'draft',
    appliesInStates: [],
    examinedBy: [{ review: 'REVIEW-01', findings: ['sub-provider-name-25-separate-widgets'] }],
  },
  {
    slug: 'subscription.acknowledgment',
    whyThisClause: { kind: 'discretionary' },
    variance: {
      kind: 'fixed',
      because: 'load-bearing',
      note: 'The separate equipment agreement and guaranty need signatures and capacity identified for their own obligations; a signature on the receivables purchase cannot replace them.',
    },
    version: 2,
    instrument: 'subscription',
    kind: 'clause',
    includeWhen: null,
    section: 'guaranty',
    sortKey: 70,
    heading: 'Acknowledgment and Signature Capacities',
    body: "BEFORE SIGNING, EACH SIGNER SHALL RECEIVE THE COMPLETE AGREEMENT AND THE COMPLETED SUBSCRIBER AND EQUIPMENT INFORMATION GRID. Each signer may consult an attorney or other advisor. {{equipmentAffiliate}} shall provide a complete executed copy to each signer.\nSignatures\nIN WITNESS WHEREOF, the parties have executed this Subscription Agreement as of the Effective Date. A person signing for Subscriber represents that they have authority to bind Subscriber in that capacity. Signing for Subscriber does not make that signer a guarantor. Only a person who separately signs in the individual Guarantor capacity agrees to the Guaranty, and that signature binds that person to only the obligations Section [[clause:subscription.guaranty-of-payment]] expressly guarantees, subject to its limits and the other protections of the Guaranty. It does not adopt every payment duty in this Subscription or enlarge the Guaranty through an acknowledgment. No person signs for another individual or gives that individual's report, contact or recording consent.",
    source: { kind: 'attorney-drafted', author: null },
    status: 'draft',
    appliesInStates: [],
    examinedBy: [{ review: 'REVIEW-01', findings: [] }],
  },
];
