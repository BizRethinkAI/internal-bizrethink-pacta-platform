import type { McaClause } from '../types';

/**
 * The Equipment Lease Agreement — section 4.
 *
 * Draft bodies may differ from the retained shipped source (ADR 0012).
 * Source digests preserve that historical evidence; twins.test.ts checks
 * the two current drafts against each other. The 2026-09-12 report/contact/
 * signature rewrite remains unapproved and does not rebuild a stored template.
 */
export const EQUIPMENT_LEASE_GUARANTY: McaClause[] = [
  {
    slug: 'equipment-lease.guarantor-information',
    whyThisClause: { kind: 'discretionary' },
    variance: {
      kind: 'fixed',
      because: 'misattributed',
      note: 'These fields identify the equipment provider’s guarantor, not the receivables funder’s; the FRPA guaranty-scope answer cannot decide this separate guaranty.',
    },
    version: 1,
    instrument: 'equipment-lease',
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
    examinedBy: [{ review: 'REVIEW-02', findings: [] }],
  },
  {
    slug: 'equipment-lease.guaranty-of-payment',
    whyThisClause: { kind: 'discretionary' },
    variance: {
      kind: 'fixed',
      because: 'misattributed',
      note: 'This is a guaranty to the equipment provider of return and specified conduct; the receivables funder’s guaranty-scope answer does not choose its obligations.',
    },
    version: 1,
    instrument: 'equipment-lease',
    kind: 'clause',
    includeWhen: null,
    section: 'guaranty',
    sortKey: 20,
    heading: 'Guaranty of Payment',
    body: 'To induce {{equipmentAffiliate}} to enter into this Lease and purchase the Equipment for Lessee, and knowing that {{equipmentAffiliate}} is relying on this guaranty as a condition to entering into this Lease, I, the undersigned (the “Guarantor”), individually guarantee to {{equipmentAffiliate}} only the following obligations of Lessee to {{equipmentAffiliate}} under this Lease, and nothing else: (a) return of the Equipment when required, or payment of its fair market value if it is not returned; (b) that Lessee has not committed fraud or made any material misrepresentation of present fact in connection with this Lease; and (c) that Lessee has not acted with intent to deprive us of the Equipment. I am not personally liable for any monthly lease payment, for any amount accelerated under Section [[clause:equipment-lease.default-remedies]](b)(ii), or for any obligation arising because Lessee’s business has slowed, ceased, or failed. Subject to those limits, I make this guaranty irrespective of any other circumstance which might otherwise constitute a defense to this Lease and/or this Guaranty. {{equipmentAffiliate}} shall not be required to proceed against Lessee or the Equipment or enforce any other remedy before proceeding against me. I agree to pay all attorneys’ fees and other expenses {{equipmentAffiliate}} incurs in enforcing any term of this Guaranty. I consent to any extension or modification granted to Lessee, and the release and/or compromise of any obligation of Lessee or any other obligors and guarantors shall not in any way release me from my obligations under this Guaranty. This is a continuing Guaranty and shall bind my heirs, successors, and assigns, and may be enforced by or for the benefit of any assignee or successor of {{equipmentAffiliate}}.',
    source: { kind: 'attorney-drafted', author: null },
    status: 'draft',
    appliesInStates: [],
    examinedBy: [{ review: 'REVIEW-02', findings: ['el-3-14-was-not-conformed-when-4-2-was-narrowed'] }],
  },
  /*
    THE SENTENCE THAT OUTRANKS EVERYTHING ELSE IN THIS CHANGE.

    WHAT WAS WRONG. Three things, in one paragraph a guarantor reads as
    boilerplate, on paper signed by a natural person.

    (1) SERVICE EFFECTIVE ON MAILING, WITH THE RECEIPT EXPRESSLY IRRELEVANT.
        "{{equipmentAffiliate}} may properly serve me with legal process via
        certified mail to my address set forth herein or to my current or last
        known address, and upon such mailing, service shall be effective
        irrespective of whether a signed certified mail return receipt is
        returned to {{equipmentAffiliate}}." That is how a judgment is entered
        against somebody who never learned of the case, and it is worse than the
        v4 §7.12 the 2026-09-09 memo rated Critical: §7.12 at least required the
        envelope to come back.
    (2) A WAIVER OF THE OBJECTION, WITH ITS OWN REASON RECITED FIRST. "I
        understand that the cost of litigating in Florida may be in excess of the
        amount at stake in the litigation. Nonetheless, I waive any objection
        that such courts are an inconvenient forum or venue, irrespective of the
        actual amount at issue." The clause states the ground the objection rests
        on and takes it away in the next word.
    (3) THE NONRELIANCE REPRESENTATION FRPA §7.22 DELETED. "MY DECISION TO ENTER
        INTO THIS GUARANTY IS NOT BASED ON ANY PROMISE MADE BY ANYONE, WHETHER
        WRITTEN OR ORAL, THAT IS NOT SET FORTH IN THIS LEASE AND GUARANTY."
        §7.22's reasoning applies here unchanged, and §7.22 deleted rather than
        narrowed because narrowing leaves a clause that reads as though it works:
        a blanket nonreliance assertion, obtained at signature, about statements
        the signer heard before signature, should not waive a claim for fraud or
        a statutory disclosure claim.

    REVIEW-02 RAISED (1), AND ITS PROPOSED FIX IS NOW SUPERSEDED — WHICH HAS TO
    BE SAID, BECAUSE THE MANIFEST STILL CARRIES IT.
    `el-4-3-makes-service-effective-on-mailing-where-the-frpa-requires-receipt`
    proposes: *"Conform 4.3 to FRPA 7.12: service complete on actual receipt or
    on return as refused or undeliverable, with a stated period to respond."*
    That is v4's §7.12 verbatim, and the `disputes-service` rewrite deleted it AS
    the defect — completion on non-delivery and a contractual response period are
    two of the three mechanisms it removed. Conforming to the fix would have
    imported into a personal guaranty the thing the FRPA had just got rid of.
    Nothing was built on it: the manifest records the entry `open`, "No document
    change made."

    WHAT CHANGED. Service is left to the procedural law of the court and to that
    court's orders — FRPA §10.1's rule, stated for a document that has no Section
    10 to point at. The three mechanisms are denied by name: a returned, refused
    or undeliverable mailing is not service, an operational notice under §3.16 is
    not service, and neither is evidence that service was made. The time to
    respond is the time the law or the court gives. The address duty survives,
    because a guarantor should keep an address current, and loses its
    consequence. The nonreliance sentence is deleted, and what replaces it is the
    sentence §7.22 ends on.

    DEPARTURE 1 — THE HEADING CHANGES, for FRPA §7.13's reason and not §7.23's.
    "Independent Decision" named the nonreliance representation, and that
    representation is gone. §7.23 kept a misleading heading deliberately so that
    a reader told about a provision could still find it; that argument does not
    reach a heading whose subject no longer exists anywhere in either document.

    DEPARTURE 2 — THE CROSS-REFERENCE SENTENCE IS KEPT ALMOST WORD FOR WORD,
    including the gratuitous "this Lease" / "the Subscription" asymmetry that
    `TWIN_VOCABULARY_EXCEPTIONS` records as a finding. Rewriting it would delete
    a recorded observation about the two documents without fixing anything, and
    the sentence does its job now that §3.15 says something worth pointing at.
    Only "forum selection clause" becomes "venue provision", because §3.15 no
    longer selects a forum.

    DEPARTURE 3 — CONNECTICUT IS NOT CITED IN THE BODY, AND NOT ONLY BECAUSE OF
    THE HOUSE RULE. REVIEW-02 checked Conn. Gen. Stat. §36a-861(6)(E) and
    concluded the chapter does not reach a lease. VERIFIED that the exclusion
    exists and says what the review says, in
    `mca/sources/CT-CGS-36a-861-872.txt`. UNVERIFIED, and pointing the other way
    for ONE twin: §42a-2A-102 is not vendored anywhere in this repository,
    Article 2A's definition of "lease" excludes a transaction that creates a
    security interest, and the Equipment Lease's own §3.6 says it creates one
    "rather than a true lease" while the Subscription's §3.6 says the transaction
    "shall be treated as a lease". So the exclusion REVIEW-02 relies on may reach
    one of these documents and not its twin. The drafting answers the question
    rather than resolving it: neither document gives up notice, a judicial
    hearing or a prior court order, so §36a-868 has nothing to bite on either
    way. Whoever vendors §42a-2A-102 should read §3.6 of both twins beside it.

    NO WIDGET IS TOUCHED, because this clause has none — checked against the
    vendored body rather than assumed.
  */
  {
    slug: 'equipment-lease.independent-decision-governing-law',
    whyThisClause: { kind: 'discretionary' },
    variance: {
      kind: 'fixed',
      because: 'load-bearing',
      note: 'The equipment guaranty needs the same governing-law and lawful-service framework as its own agreement; selecting FRPA arbitration cannot remove those terms.',
    },
    version: 1,
    instrument: 'equipment-lease',
    kind: 'clause',
    includeWhen: null,
    section: 'guaranty',
    sortKey: 30,
    heading: 'Governing Law; Service of Legal Process',
    body: 'I agree and acknowledge that this Guaranty is subject to the governing law and venue provision reflected in this Lease at Section [[clause:equipment-lease.governing-law-and-venue]] (Governing Law and Venue). If any part of this Guaranty is not enforceable, the remaining provisions will remain valid and enforceable.\nService of a summons, a complaint or other legal process on me must be made in a manner that the procedural law of the court in which the proceeding is brought, and any applicable order of that court, authorizes. A mailing that is returned, refused or undeliverable is not service on me, and neither is a notice given under Section [[clause:equipment-lease.notices]]; neither is evidence that service was made. The time I have to respond to a proceeding is the time that procedural law or an order of the court gives me, and this Guaranty neither shortens it nor starts it running on an event of its own.\nThis Guaranty gives up nothing that applicable law does not permit to be given up. It contains no agreement by me to accept service in advance of a proceeding, no waiver of valid service, no waiver of an objection to jurisdiction or venue, no waiver of a notice, a hearing or a prior court order that applicable law requires before a prejudgment remedy is obtained, and no confession of judgment. I may accept service, or give up service, after a proceeding has begun, in the manner the law then applicable permits.\nThis Guaranty does not waive a claim for fraud or misrepresentation, a right applicable law does not permit to be waived, or a required disclosure. My signature is not a representation about what I was told before signing it, and no recital in this Lease or this Guaranty is evidence of one.\nI agree to promptly notify {{equipmentAffiliate}} of any change of my address and that of the Lessee. A failure to do so does not make an otherwise invalid service valid.',
    source: { kind: 'attorney-drafted', author: null },
    status: 'draft',
    appliesInStates: [],
    examinedBy: [
      { review: 'REVIEW-02', findings: ['el-4-3-makes-service-effective-on-mailing-where-the-frpa-requires-receipt'] },
    ],
  },
  /*
    THE SAME THREE WAIVERS AGAIN, ONE SECTION LATER AND ONE SIGNER DOWN.

    WHAT WAS WRONG. §3.15A, §3.15B and §3.15C bind the customer. This Section
    binds the natural person who guarantees the customer, in the same three
    respects: "I VOLUNTARILY AND FREELY WAIVE TRIAL BY JURY IN CONNECTION WITH
    ANY DISPUTE OVER THIS GUARANTY"; "I agree, in my personal capacity, not to
    pursue a claim ... as a lead plaintiff, class representative, or as part of a
    class action or other representative action"; and "Any permitted cause of
    action I may have ... must be commenced within one year from the accrual of
    that cause of action."

    That is four copies of each rule across two live templates, and it is the
    reason the property in `__tests__/the-twins-cannot-undo-the-frpa.test.ts` is
    stated over the SET. Read alone this is a short paragraph; read over the
    corpus it is the same provision the FRPA deleted, written four times in the
    documents the FRPA's own signer signs next.

    WHAT CHANGED — the same three answers as §3.15, deliberately identical so
    that the guaranty and the agreement cannot drift apart the way §3.14 and §4.2
    did: a mutual, self-limiting jury waiver; no class, collective or
    representative waiver; and the law's limitation periods with nothing
    shortened anywhere.

    THE ONE-YEAR PERIOD IS NOT REPLACED BY ANOTHER PERIOD, for FRPA §7.19's
    reason. The two-year figure attributed to the 2026-09-09 memo appears nowhere
    in `lombard-contracts`, in either review register, or in the memo material
    this repository holds. Reinstating a mutual period is a one-line owner
    decision and nothing in this draft resists it.

    THE HEADING CHANGES because the clause no longer contains a class-action
    waiver, which is FRPA §7.13's rule: a heading naming machinery that is gone
    tells a reader the opposite of the truth.

    `el-4-4-guarantor-waives-on-the-lessees-behalf-with-no-authority-recital` IS
    RECORDED `implemented` AND WAS NOT, IN THE SENSE THE FINDING MEANS. The
    manifest note says it was applied by BROADENING §3.15C's protected-person
    list to match the list this clause carried — which conforms the two lists and
    says nothing about authority. The last sentence deals with the authority
    point directly: nothing in this Section is given up on anybody else's behalf.

    NOT FIXED HERE, AND IT IS THE SAME SHAPE ONE CLAUSE LATER. §4.6 has the
    guarantor consent "on my behalf and on behalf of Lessee" to recorded calls,
    automated dialling and prerecorded messages, with no recital of authority to
    bind the entity. It is a consent rather than a waiver of a protection, it is
    outside the property this change asserts, and it is reported rather than
    redrafted.
  */
  {
    slug: 'equipment-lease.jury-trial-and-class-action-waiver',
    whyThisClause: { kind: 'discretionary' },
    variance: {
      kind: 'fixed',
      because: 'misattributed',
      note: 'These procedural choices belong to the equipment guaranty’s parties; the FRPA dispute-resolution answer does not select an alternative for them.',
    },
    version: 1,
    instrument: 'equipment-lease',
    kind: 'clause',
    includeWhen: null,
    section: 'guaranty',
    sortKey: 40,
    heading: 'Jury Trial, Class Proceedings, and Limitation of Actions',
    body: '{{equipmentAffiliate}} and I each waive trial by jury in an action arising out of or relating to this Guaranty, to the extent the law of the forum gives effect to a waiver of that right made before a dispute has arisen. Where the law of the forum does not give effect to such a waiver, this Section has no effect and each of us retains the right to trial by jury. This waiver is mutual, it is limited to {{equipmentAffiliate}} and me, and it does not reach a claim applicable law requires to be tried to a jury.\nNo party waives a right to bring, to defend, or to take part in a class, collective, representative or public-enforcement proceeding that applicable law permits. Whether such a proceeding is available, and in what form, is for the court to determine under applicable law and its own rules. I keep whatever share of a recovery such a proceeding awards me and any right to costs or to a fee award that applicable law gives me.\nThe limitation period, the accrual rule, and any tolling or discovery rule that applicable law supplies apply to a claim by each party to this Guaranty alike, whoever brings it and whoever it is brought against. This Guaranty does not shorten any of them, and neither this Guaranty nor Section [[clause:equipment-lease.governing-law-and-venue]] shortens one anywhere else. A claim that applicable law does not permit to be shortened or given up is unaffected by this Guaranty.\nI give up nothing under this Section on behalf of anyone but myself.',
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
    instrument: 'equipment-lease',
    kind: 'clause',
    includeWhen: null,
    section: 'guaranty',
    sortKey: 50,
    heading: 'Individual Report Instructions; Reporting Duties',
    body: "By my separate individual signature as Guarantor, I authorize {{equipmentAffiliate}} to obtain one consumer report about me only to evaluate my proposed limited guaranty under this Lease, before {{equipmentAffiliate}} accepts this Lease. Before I sign, {{equipmentAffiliate}} shall identify the reporting agency and the equipment transaction to me, explain this purpose and duration, and give me the complete Agreement. It shall document a permissible purpose under the Fair Credit Reporting Act and any additional authority state law requires. A signature only for Lessee gives no individual report permission.\nThis permission expires upon the initial decision, withdrawal of the application or acceptance of this Lease, whichever occurs first, and I may revoke it before it is used by a reasonable communication received by {{equipmentAffiliate}}. It authorizes no recurring report or later report for review, servicing or collection; a later report requires new, specific individual instructions and a separately documented lawful purpose. It does not authorize the receivables funder, an unrelated affiliate or another equipment provider to obtain a report. Giving report instructions does not make me liable for any obligation beyond Section [[clause:equipment-lease.guaranty-of-payment]].\nIf {{equipmentAffiliate}} furnishes information to a consumer reporting agency, it shall comply with the accuracy, correction, investigation, notice and dispute duties applicable to it. It shall not report an equipment payment or other amount as my personal debt if I do not owe it under that Guaranty. I may report an inaccuracy at _______________«44»_______________ or through another applicable dispute channel; this does not restrict my right to dispute with a consumer reporting agency.\nIf {{equipmentAffiliate}} takes an adverse action with respect to me based in whole or in part on my consumer report, it shall give the notices required by FCRA §615(a) without waiting for a request. The notice shall identify the adverse action; give the agency's name, address and telephone number, including its toll-free number where required; explain that the agency did not make the decision and cannot give the specific reasons for it; and state my right to request a free copy from that agency within 60 days after receiving the notice and to dispute the accuracy or completeness of its report. If a numerical credit score was used, the written or electronic credit-score and related disclosures required by law must also be provided. This Section waives no statutory right.",
    source: { kind: 'attorney-drafted', author: null },
    status: 'draft',
    appliesInStates: [],
    examinedBy: [
      { review: 'REVIEW-02', findings: ['el-4-5-fcra-authorisation-runs-to-a-different-entity-than-the-frpas'] },
    ],
  },
  {
    slug: 'equipment-lease.communications-consent',
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
    instrument: 'equipment-lease',
    kind: 'clause',
    includeWhen: null,
    section: 'guaranty',
    sortKey: 60,
    heading: 'Contact, Consent and Recording',
    body: "{{equipmentAffiliate}} may contact Lessee and an individually identified Guarantor to administer and lawfully service this Lease by a method applicable law permits. Where an automated call, an artificial or prerecorded voice call, or a text message requires consent, {{equipmentAffiliate}} shall first obtain and record it from the person legally entitled to consent for the specified number. Providing a number, using it to call us, or our obtaining it elsewhere does not by itself establish every consent the law requires. Signing this Agreement does not itself give another person's consent or blanket consent to automated, prerecorded or marketing contact.\nMarketing consent shall be obtained separately, identify the seller and the number to be called or messaged, carry the disclosures and signature applicable law requires, and be optional and not a condition of obtaining equipment, this Lease or any product or service. No consent is given here for an unnamed affiliate or as a blanket override of a do-not-call request.\nA recipient may revoke consent at any time by any reasonable means, including STOP in reply to a text, telephone, email or writing. Revocation applies to consent-dependent servicing or collection contact as well as marketing; servicing or collection does not preserve a revoked consent. {{equipmentAffiliate}} shall honor revocation within the period applicable law allows and thereafter use only a method lawful without that consent. Section [[clause:equipment-lease.notices]] (Notices) does not restrict these methods or delay a revocation; a written request by postal mail is not required.\nBefore recording a call, {{equipmentAffiliate}} shall give the notice and obtain the consent required by applicable law from each participant, and offer an unrecorded alternative where practicable. A signature to this Agreement is not another participant's recording consent.",
    source: { kind: 'attorney-drafted', author: null },
    status: 'draft',
    appliesInStates: [],
    examinedBy: [{ review: 'REVIEW-02', findings: [] }],
  },
  {
    slug: 'equipment-lease.acknowledgment',
    whyThisClause: { kind: 'discretionary' },
    variance: {
      kind: 'fixed',
      because: 'load-bearing',
      note: 'The separate equipment agreement and guaranty need signatures and capacity identified for their own obligations; a signature on the receivables purchase cannot replace them.',
    },
    version: 2,
    instrument: 'equipment-lease',
    kind: 'clause',
    includeWhen: null,
    section: 'guaranty',
    sortKey: 70,
    heading: 'Acknowledgment and Signature Capacities',
    body: "BEFORE SIGNING, EACH SIGNER SHALL RECEIVE THE COMPLETE AGREEMENT AND THE COMPLETED LESSEE AND EQUIPMENT INFORMATION GRID. Each signer may consult an attorney or other advisor. {{equipmentAffiliate}} shall provide a complete executed copy to each signer.\nSignatures\nIN WITNESS WHEREOF, the parties have executed this Equipment Lease Agreement as of the Effective Date. A person signing for Lessee represents that they have authority to bind Lessee in that capacity. Signing for Lessee does not make that signer a guarantor. Only a person who separately signs in the individual Guarantor capacity agrees to the Guaranty, and that signature binds that person to only the obligations Section [[clause:equipment-lease.guaranty-of-payment]] expressly guarantees, subject to its limits and the other protections of the Guaranty. It does not adopt every payment duty in this Lease or enlarge the Guaranty through an acknowledgment. No person signs for another individual or gives that individual's report, contact or recording consent.",
    source: { kind: 'attorney-drafted', author: null },
    status: 'draft',
    appliesInStates: [],
    examinedBy: [{ review: 'REVIEW-02', findings: [] }],
  },
];
