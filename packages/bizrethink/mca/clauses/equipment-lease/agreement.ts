import type { McaClause } from '../types';

/**
 * Current draft equipment terms include the coordinated MCA-R08–R12 correction.
 * Source documents and historical review annotations remain provenance; changed
 * versions require fresh approval before publication. See the equipment handoff.
 */
export const EQUIPMENT_LEASE_AGREEMENT: McaClause[] = [
  {
    slug: 'equipment-lease.parties',
    whyThisClause: { kind: 'discretionary' },
    variance: {
      kind: 'fixed',
      because: 'load-bearing',
      note: 'The equipment agreement needs its own provider, customer and effective date; the receivables funder’s profile does not identify these contracting parties.',
    },
    version: 3,
    instrument: 'equipment-lease',
    kind: 'clause',

    includeWhen: null,
    section: 'agreement',
    sortKey: 1,
    heading: 'Parties',
    body: 'The completed grid identifies this Agreement, the parties, the Equipment, the payment schedule and the effective date. We are the equipment counterparty; naming a receivables funder, processor or service provider does not make it a party or establish an affiliation. This Agreement becomes effective only as Section [[clause:equipment-lease.effective-date-term-and-interim-rent]] provides.',
    source: { kind: 'attorney-drafted', author: null },
    status: 'draft',
    appliesInStates: [],
    examinedBy: [{ review: 'REVIEW-02', findings: [] }],
  },
  {
    slug: 'equipment-lease.total-payments-estimate',
    whyThisClause: { kind: 'discretionary' },
    variance: {
      kind: 'fixed',
      because: 'no-alternative',
      note: 'This is the equipment contract’s estimate from its monthly charge and term, not a prescribed commercial-financing disclosure; no alternate estimate text is authored.',
    },
    version: 2,
    instrument: 'equipment-lease',
    kind: 'clause',
    includeWhen: null,
    section: 'agreement',
    sortKey: 2,
    heading: 'Estimated Total Payments',
    body: 'The scheduled total in the Lessee and Equipment Information grid itemizes the monthly charges for the stated term, interim charge, delivery charge, installation charge, purchase price if applicable, and estimated taxes, with every amount counted once. It identifies amounts due at signing, each scheduled due date and the final payment date. Any tax estimate states its basis and is reconciled to the actual applicable tax; contingent repair or enforcement expenses are separately described and are not included as if certain to occur. We provide the completed schedule before you sign and a corrected schedule before an agreed change takes effect. This schedule is not a prescribed commercial-financing disclosure and does not replace a separate disclosure required by the transaction’s actual product classification and applicable law.',
    source: { kind: 'attorney-drafted', author: null },
    status: 'draft',
    appliesInStates: [],
    examinedBy: [{ review: 'REVIEW-02', findings: [] }],
  },
  {
    slug: 'equipment-lease.charges-billed',
    whyThisClause: { kind: 'discretionary' },
    variance: {
      kind: 'fixed',
      because: 'load-bearing',
      note: 'This billing pointer must lead to the equipment agreement’s own charge schedule; it does not select the receivables purchase’s collection method.',
    },
    version: 1,
    instrument: 'equipment-lease',
    kind: 'clause',
    includeWhen: null,
    section: 'agreement',
    sortKey: 3,
    heading: 'Billing',
    body: 'Lease charges and applicable taxes are billed as set out in this Agreement.',
    source: { kind: 'attorney-drafted', author: null },
    status: 'draft',
    appliesInStates: [],
    examinedBy: [{ review: 'REVIEW-02', findings: [] }],
  },
  {
    slug: 'equipment-lease.read-before-signing',
    whyThisClause: { kind: 'discretionary' },
    variance: {
      kind: 'fixed',
      because: 'no-alternative',
      note: 'The read-and-complete acknowledgment is the only authored equipment execution legend; no law is identified as requiring this exact warning.',
    },
    version: 1,
    instrument: 'equipment-lease',
    kind: 'clause',
    includeWhen: null,
    section: 'agreement',
    sortKey: 4,
    heading: 'Acknowledgment Before Signing',
    body: 'DO NOT SIGN UNTIL YOU HAVE READ, UNDERSTOOD, AND AGREED TO THE TERMS AND CONDITIONS ON ALL PAGES OF THIS AGREEMENT. NO ATTEMPT AT ORAL MODIFICATION OR RESCISSION OF THIS AGREEMENT OR ANY TERM THEREOF WILL BE BINDING UPON THE PARTIES. SEE SECTION [[clause:equipment-lease.entire-agreement]] OF THE TERMS AND CONDITIONS. BY SIGNING THIS AGREEMENT, THE UNDERSIGNED LESSEE ACKNOWLEDGES READING ALL PAGES OF THIS AGREEMENT, THAT ALL BLANK TERMS IN THE LESSEE AND EQUIPMENT INFORMATION GRID WERE FILLED IN AT THE TIME OF SIGNING, AND THAT LESSEE AGREES TO BE BOUND BY ALL THE TERMS OF THIS AGREEMENT.',
    source: { kind: 'attorney-drafted', author: null },
    status: 'draft',
    appliesInStates: [],
    examinedBy: [{ review: 'REVIEW-02', findings: [] }],
  },
  {
    slug: 'equipment-lease.equipment',
    whyThisClause: { kind: 'discretionary' },
    variance: {
      kind: 'fixed',
      because: 'load-bearing',
      note: 'The agreement must identify what equipment the provider supplies and the terms of that supply; no funder fact supplies another equipment description.',
    },
    version: 2,
    instrument: 'equipment-lease',
    kind: 'clause',
    includeWhen: null,
    section: 'agreement',
    sortKey: 10,
    heading: 'Equipment',
    body: 'We will provide the Equipment identified by manufacturer, model, quantity, serial number when available, and installation site in the Lessee and Equipment Information grid. Any substitution requires your written agreement to its identity, functionality and price before acceptance; we may not substitute equipment unilaterally. We will identify the processing systems with which the Equipment and included software are represented to operate, and deliver the stated installation, support and supplier warranty information before you sign. A change of processor may affect compatibility, but does not excuse a failure to meet our express promises or any right that applicable law preserves.',
    source: { kind: 'attorney-drafted', author: null },
    status: 'draft',
    appliesInStates: [],
    examinedBy: [{ review: 'REVIEW-02', findings: ['el-3-9-sole-and-exclusive-remedies-points-at-an-empty-set'] }],
  },
  {
    slug: 'equipment-lease.effective-date-term-and-interim-rent',
    whyThisClause: { kind: 'discretionary' },
    variance: {
      kind: 'fixed',
      because: 'no-alternative',
      note: 'The equipment commencement, fixed term and capped interim charge are the only authored duration terms; the receivables collection preference does not alter them.',
    },
    version: 2,
    instrument: 'equipment-lease',
    kind: 'clause',
    includeWhen: null,
    section: 'agreement',
    sortKey: 20,
    heading: 'Effective Date, Term, and Interim Rent',
    body: '(a) This Agreement becomes effective when both parties sign it and we deliver a complete copy to you. Delivery alone does not establish assent. The actual Delivery Date is recorded in the Lessee and Equipment Information grid; we deliver to the agreed site. (b) The Commencement Date and the number of months in the Lease Term are stated in that grid before signing. The Commencement Date may not precede delivery of the agreed usable Equipment. A delivery delay requires a corrected schedule accepted by both parties; it does not permit us to charge for an undelivered period or unilaterally choose a later commencement. The stated term is a fixed commitment, subject to this Agreement’s express completion, termination and remedy provisions and rights preserved by law. (c) Any interim charge runs only from the actual Delivery Date through the day preceding the agreed Commencement Date, at one-thirtieth of the monthly charge per day, capped at one monthly charge. There is no charge for overlap with a scheduled monthly period. If the stated commencement would fall more than thirty days after delivery, billing cannot start until the parties correct the schedule so that the interim period is no more than thirty days. The actual interim dates and charge must be itemized; amounts paid are credited once. (d) Processing compatibility and any dependence on a separate processing service must be identified before signing under Section [[clause:equipment-lease.equipment]]. Termination of that service does not itself enlarge this Agreement’s charges or the Guaranty.',
    source: { kind: 'attorney-drafted', author: null },
    status: 'draft',
    appliesInStates: [],
    examinedBy: [{ review: 'REVIEW-02', findings: [] }],
  },
  {
    slug: 'equipment-lease.site-preparation',
    whyThisClause: { kind: 'discretionary' },
    variance: {
      kind: 'fixed',
      because: 'no-alternative',
      note: 'The customer’s installation preparations are the only authored site duties; no funder fact selects a different installation allocation.',
    },
    version: 1,
    instrument: 'equipment-lease',
    kind: 'clause',
    includeWhen: null,
    section: 'agreement',
    sortKey: 30,
    heading: 'Site Preparation',
    body: 'You will prepare the installation site(s) for the Equipment, including without limitation the power supply circuits and phone lines, in conformance with the manufacturer’s and our specifications, and will make the site(s) available to us by the confirmed shipping date.',
    source: { kind: 'attorney-drafted', author: null },
    status: 'draft',
    appliesInStates: [],
    examinedBy: [{ review: 'REVIEW-02', findings: [] }],
  },
  {
    slug: 'equipment-lease.payment-of-amounts-due',
    whyThisClause: { kind: 'discretionary' },
    variance: {
      kind: 'fixed',
      because: 'misattributed',
      note: 'These are the equipment provider’s fixed charges and collection arrangements; the receivables funder’s collection method does not decide a separate provider’s billing terms.',
    },
    version: 2,
    instrument: 'equipment-lease',
    kind: 'clause',
    includeWhen: null,
    section: 'agreement',
    sortKey: 40,
    heading: 'Payment of Amounts Due',
    body: '(a) The completed payment schedule lists every scheduled charge and its due date, including any interim, delivery, installation and purchase charge. We may not add an unlisted periodic or transaction fee. No late fee, default interest, flat collection fee, upgrade fee or assumption fee is imposed by this Agreement. A separately requested change must be priced and signed before it takes effect. Actual permitted repair and enforcement expenses remain subject to Sections [[clause:equipment-lease.use-return-of-equipment-and-insurance]], [[clause:equipment-lease.indemnification]] and [[clause:equipment-lease.default-remedies]], including their caps and credits. (b) We send an itemized invoice to the agreed notice email at least ten days before a scheduled due date; a late invoice extends its due date by the missing notice days without a surcharge. Each regular monthly charge is due on the calendar day stated in the schedule, or the last day of a shorter month. Only with a separate authorization accepted by the processor may the invoiced fixed charge be billed to your processing account, from funds remaining after the actual purchased percentage of receipts has been remitted. A processing shortfall is shown on a separate invoice and is not itself an authorization to increase the deduction. Nothing here authorizes a bank-account debit. If the processor will not honor those limits, this collection method cannot be used and payment must be arranged separately in writing. Equipment billing does not increase a receivables purchase’s Specified Percentage or Purchased Amount, divert the purchased share of receipts, or authorize a default sweep. A receivables purchase’s completion does not authorize collecting equipment amounts through that purchase. (c) Taxes are limited to those legally payable by you on this transaction or Equipment, excluding our income taxes. We itemize the jurisdiction, taxable base, rate, actual liability and prior collections; an estimate is reconciled and any overpayment credited or refunded. No unsupported average property-tax charge applies. (d) All payments are credited to the identified invoice once. A cash purchase or equipment deduction recorded under another agreement must not also be billed here. Billing stops as Section [[clause:equipment-lease.purchase-return-or-continuation-of-equipment-at-end-of-lease-term]] provides, while only accrued, unpaid lawful obligations remain. Rights for nonconforming equipment or breach by us are preserved.',
    source: { kind: 'attorney-drafted', author: null },
    status: 'draft',
    appliesInStates: [],
    examinedBy: [{ review: 'REVIEW-02', findings: ['el-3-4a-declares-itself-exhaustive-and-is-not'] }],
  },
  {
    slug: 'equipment-lease.use-return-of-equipment-and-insurance',
    whyThisClause: { kind: 'discretionary' },
    variance: {
      kind: 'fixed',
      because: 'misattributed',
      note: 'Use, return and insurance concern the provider’s equipment; whether the funder offers equipment does not choose among alternative obligations within this separate agreement.',
    },
    version: 2,
    instrument: 'equipment-lease',
    kind: 'clause',
    includeWhen: null,
    section: 'agreement',
    sortKey: 50,
    heading: 'Use, Return of Equipment, and Insurance',
    body: '(a) Operate the Equipment with qualified personnel according to supplied instructions and maintain it in good condition, ordinary wear excepted. Do not make a material physical alteration, move it from the stated site, sublet it or create a conflicting consensual lien without our reasonable prior written consent while we retain an unsatisfied security interest. Comply with applicable operating laws and permits. (b) Inspection or repair requires reasonable notice, an agreed appointment during normal business hours and your consent to entry. This is not consent to forcible entry or self-help contrary to Section [[clause:equipment-lease.default-remedies]]. Labels may accurately identify our unsatisfied security interest; a label does not determine fixture status or lien priority. (c) Where return is required, use the identified return address and a tracked method, reference the agreement number, and retain a receipt. We provide reasonable packing instructions and acknowledge receipt. You owe only documented, reasonable repair costs for damage beyond ordinary wear for which you are responsible, after itemized evidence and an opportunity to dispute the charge. No automatic missing-reference or return-processing penalty applies. Required default accounting and value credits govern every recovery. (d) The grid identifies the required insurance, coverage amount and loss payee, limited to our unsatisfied security interest. We may not require insurance or claim proceeds exceeding our actual insurable interest. A casualty must be reported promptly; insurance and other recovery are credited once. Risk of loss and any resulting payment obligation remain subject to the applicable law, our performance obligations and the remedies and accounting limits of this Agreement.',
    source: { kind: 'attorney-drafted', author: null },
    status: 'draft',
    appliesInStates: [],
    examinedBy: [{ review: 'REVIEW-02', findings: ['el-3-4a-declares-itself-exhaustive-and-is-not'] }],
  },
  {
    slug: 'equipment-lease.title-to-equipment',
    whyThisClause: {
      kind: 'implements',
      citation:
        'UCC §§9-203, 9-509, as enacted in the governing jurisdiction (e.g. Fla. Stat. §§679.2031(2)(c), 679.509)',
    },
    variance: {
      kind: 'fixed',
      because: 'misattributed',
      note: 'Equipment title and any security interest follow this separate equipment transaction; the funder’s equipment offering and receivables collateral do not decide who owns this equipment.',
    },
    version: 2,
    instrument: 'equipment-lease',
    kind: 'clause',
    includeWhen: null,
    section: 'agreement',
    sortKey: 60,
    heading: 'Title to Equipment',
    body: 'This Agreement’s fixed term and nominal $1 ownership transfer are intended as equipment financing secured by the described Equipment, rather than a true lease that returns a meaningful residual interest to us. Any retained title is limited to the security interest recognized by applicable law; a label does not control classification. You grant us a security interest only in your rights in the described Equipment and its identifiable proceeds, securing only obligations actually owed under this Agreement. Attachment requires the applicable legal prerequisites, including value, your rights in the collateral and an authenticated security agreement. You authorize a financing statement limited to that collateral to the extent the filing law permits; you do not appoint us to sign another agreement or an amendment for you. Perfection requires the applicable filing or other legal steps, and priority is not guaranteed by this Agreement or a filing. On satisfaction of the secured obligations and completion under Section [[clause:equipment-lease.purchase-return-or-continuation-of-equipment-at-end-of-lease-term]], we release our interest and timely provide required termination and transfer records. The transaction’s actual classification and applicable disclosure requirements must be evaluated together; secured-transaction treatment does not itself exclude it from a statutory lease-financing disclosure category.\nEquipment Charged Only Once. This Agreement is not executed for Equipment already paid for through a cash purchase or equipment cost deducted or deferred under another agreement. You will never pay for the same equipment twice.',
    source: { kind: 'attorney-drafted', author: null },
    status: 'draft',
    appliesInStates: [],
    examinedBy: [{ review: 'REVIEW-02', findings: [] }],
  },
  {
    slug: 'equipment-lease.purchase-return-or-continuation-of-equipment-at-end-of-lease-term',
    whyThisClause: { kind: 'discretionary' },
    variance: {
      kind: 'fixed',
      because: 'misattributed',
      note: 'The merchant’s end-of-term equipment election includes a one-dollar purchase; the funder’s equipment-offering answer is not that election and cannot choose its alternative.',
    },
    version: 2,
    instrument: 'equipment-lease',
    kind: 'clause',
    includeWhen: null,
    section: 'agreement',
    sortKey: 70,
    heading: 'Purchase, Return or Continuation of Equipment at End of Lease Term',
    body: 'You elect to purchase the Equipment for one dollar ($1.00) by signing this Agreement. The dollar is separately itemized with the final scheduled monthly payment and is counted once in the scheduled total. On payment of the scheduled charges, that dollar and any other lawful amounts then due, ownership passes to you free of our interest and we provide a transfer receipt and required lien release. Billing of periodic charges stops at the end of the stated term; an unpaid accrued amount does not renew the term or generate another monthly charge. There is no automatic renewal, notice-to-purchase requirement or duty to return Equipment you have acquired. A different ownership arrangement requires a separately signed agreement before the original term expires.\nEarly completion. On request we provide an itemized quote showing accrued unpaid charges, remaining scheduled charges and the $1 price, all prior credits, any unearned charges or rebate required by law, and any additional discount offered for early payment. The quote is valid for ten business days and cannot exceed the amount of lawful scheduled payments otherwise remaining. No early-completion fee applies. Payment of that quote satisfies the secured obligations, transfers ownership and ends further billing. Return following an uncured default is governed exclusively by Section [[clause:equipment-lease.default-remedies]] and does not create a simultaneous automatic charge for full equipment value.',
    source: { kind: 'attorney-drafted', author: null },
    status: 'draft',
    appliesInStates: [],
    examinedBy: [{ review: 'REVIEW-02', findings: [] }],
  },
  {
    slug: 'equipment-lease.software-license',
    whyThisClause: { kind: 'discretionary' },
    variance: {
      kind: 'fixed',
      because: 'load-bearing',
      note: 'The equipment needs stated software-use rights and a boundary around manufacturer-owned software; selecting a receivables template cannot supply those license rights.',
    },
    version: 2,
    instrument: 'equipment-lease',
    kind: 'clause',
    includeWhen: null,
    section: 'agreement',
    sortKey: 80,
    heading: 'Software License',
    body: 'We grant only the software rights that we own or are authorized to grant, as identified in the software schedule delivered before signing. No ownership or perpetual right in a manufacturer’s or other third party’s software is promised by this Agreement. Applicable third-party license terms, processor dependencies and support limitations must be supplied or made accessible before signing; an undisclosed external term may not expand your payment obligations under this Agreement. For software we own and identify in the schedule as included with the purchased Equipment, we grant a nonexclusive license to operate that Equipment for as long as you own it, surviving completion. Any shorter or separate third-party license must be identified explicitly before signing. A transfer of Equipment does not transfer software ownership, and no clause promises compatibility beyond our express commitments.',
    source: { kind: 'attorney-drafted', author: null },
    status: 'draft',
    appliesInStates: [],
    examinedBy: [
      {
        review: 'REVIEW-02',
        findings: [
          'el-3-8-grants-no-licence-to-manufacturer-owned-software',
          'el-3-8-software-licence-has-no-survival-and-the-document-has-no-survival-clause',
        ],
      },
    ],
  },
  {
    slug: 'equipment-lease.limitation-on-liability',
    whyThisClause: { kind: 'discretionary' },
    variance: {
      kind: 'fixed',
      because: 'no-alternative',
      note: 'The equipment provider’s liability exclusions and cap have no authored alternative; they are contractual allocations, not a requirement to disclaim liability.',
    },
    version: 2,
    instrument: 'equipment-lease',
    kind: 'clause',
    includeWhen: null,
    section: 'agreement',
    sortKey: 90,
    heading: 'Limitation on Liability',
    body: 'Subject to the exceptions below, our aggregate liability for direct damages under this Agreement is limited to the scheduled charges paid or payable for the affected Equipment over the stated initial term. Neither party is liable to the other for consequential, incidental or special damages. These limitations do not apply to fraud, negligence causing personal injury or property damage, gross negligence, willful misconduct, breach of confidentiality or data-protection duties, infringement, title obligations, or liability that applicable law does not permit to be limited. They do not eliminate an express warranty, a right to reject nonconforming delivery, a required refund, or a remedy that applicable law makes nonwaivable. No disclaimer elsewhere enlarges these limitations.',
    source: { kind: 'attorney-drafted', author: null },
    status: 'draft',
    appliesInStates: [],
    examinedBy: [
      {
        review: 'REVIEW-02',
        findings: [
          'el-3-9-excludes-personal-injury-and-omits-the-carve-out-3-11-has',
          'el-3-9-sole-and-exclusive-remedies-points-at-an-empty-set',
        ],
      },
    ],
  },
  {
    slug: 'equipment-lease.warranties',
    whyThisClause: { kind: 'discretionary' },
    variance: {
      kind: 'fixed',
      because: 'no-alternative',
      note: 'Disclaiming equipment warranties is a commercial choice subject to statutory effectiveness requirements; no alternative warranty package is authored.',
    },
    version: 2,
    instrument: 'equipment-lease',
    kind: 'clause',
    includeWhen: null,
    section: 'agreement',
    sortKey: 100,
    heading: 'Warranties',
    body: '(a) We warrant our authority to provide the Equipment and any rights we expressly grant, and that delivery will conform to the agreed description and express functionality promises. Written supplier warranties and the process for obtaining service will be supplied before signing. We do not disclaim our express warranties or prevent you from enforcing a supplier warranty to which you are entitled. TO THE EXTENT APPLICABLE LAW PERMITS, WE DISCLAIM IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE. THIS EXCLUSION DOES NOT LIMIT EXPRESS WARRANTIES OR ANY WARRANTY OR REMEDY THAT CANNOT LAWFULLY BE EXCLUDED. (b) You will use the Equipment for business purposes. This statement does not make an otherwise consumer transaction commercial, waive a required disclosure, or establish eligibility for an exemption.',
    source: { kind: 'attorney-drafted', author: null },
    status: 'draft',
    appliesInStates: [],
    examinedBy: [{ review: 'REVIEW-02', findings: ['el-3-9-sole-and-exclusive-remedies-points-at-an-empty-set'] }],
  },
  {
    slug: 'equipment-lease.indemnification',
    whyThisClause: { kind: 'discretionary' },
    variance: {
      kind: 'fixed',
      because: 'no-alternative',
      note: 'This equipment indemnity and its aggregate ceiling are the only authored allocation; the receivables funder’s guaranty choice does not decide it.',
    },
    version: 2,
    instrument: 'equipment-lease',
    kind: 'clause',
    includeWhen: null,
    section: 'agreement',
    sortKey: 110,
    heading: 'Indemnification',
    body: 'You indemnify us against documented third-party claims to the extent caused by your material breach of this Agreement, negligence or willful misconduct in operating, altering or returning the Equipment. You do not indemnify us for our negligence, our breach, our fraud or misconduct, or the acts of persons for whom we are responsible. We must promptly notify you of a claim, permit a reasonable opportunity to participate in its defense and take reasonable steps to mitigate loss. Neither party may settle a claim imposing liability, an admission or a nonmonetary duty on the other without that party’s written consent. Your aggregate liability under this Section is capped at the scheduled monthly charges for the initial term; reasonable enforcement expenses also remain within the aggregate cost limit in Section [[clause:equipment-lease.default-remedies]] and cannot be recovered twice. This indemnity imposes no liability on a guarantor beyond the separately signed Guaranty in Section [[clause:equipment-lease.guaranty-of-payment]].',
    source: { kind: 'attorney-drafted', author: null },
    status: 'draft',
    appliesInStates: [],
    examinedBy: [
      {
        review: 'REVIEW-02',
        findings: [
          'el-3-9-excludes-personal-injury-and-omits-the-carve-out-3-11-has',
          'el-3-4a-declares-itself-exhaustive-and-is-not',
        ],
      },
    ],
  },
  {
    slug: 'equipment-lease.default-remedies',
    whyThisClause: { kind: 'discretionary' },
    variance: {
      kind: 'fixed',
      because: 'no-alternative',
      note: 'The equipment contract has its own default, present-value acceleration and recovery rules; no alternative remedy package is authored for this provider.',
    },
    version: 2,
    instrument: 'equipment-lease',
    kind: 'clause',
    includeWhen: null,
    section: 'agreement',
    sortKey: 120,
    heading: 'Default; Remedies',
    body: '(a) A material failure to perform an obligation actually due under this Agreement is a default only after written notice identifying the failure and ten business days after receipt to cure it, or any longer period required by law. A good-faith disputed invoice must be explained and corrected before its disputed portion is treated as overdue. A default or termination under a processing agreement, a receivables purchase agreement or any other agreement is not a default under this Agreement. (b) After an uncured default we may (i) terminate this Agreement’s future performance and require lawful return of the Equipment and payment of charges already earned and due, or (ii) seek actual damages available under the law governing the transaction. We do not automatically accelerate all future payments or label a fixed discount formula reasonable damages. Any future-payment claim must account for present value where required, avoided expense, mitigation, equipment recovery and other credits, and be established by a court or a separately signed settlement after the dispute. (c) Recovery must use lawful process. Self-help is permitted only where the governing law permits it, with no breach of the peace; this Agreement grants no advance permission to force entry. Mandatory notice, disposition, redemption, surplus, deficiency and acceptance-in-satisfaction requirements remain in force. Physical return alone is not an agreement to accept collateral in full satisfaction. We provide an itemized accounting of all payments, insurance proceeds, disposition proceeds or other legally required value credits, and reasonable permitted recovery expenses. No double recovery is allowed: equipment value cannot be recovered in addition to the same loss already satisfied by return, disposition or insurance. Any deficiency must be legally recoverable and proved, and any required surplus must be paid. (d) Actual, reasonable collection expenses, court costs and attorneys’ fees are recoverable only to the extent lawfully awarded or agreed in a separately signed post-dispute settlement. Across this Agreement, indemnity and Guaranty together, the aggregate cost limit is twenty-five percent (25%) of the non-fee amount lawfully recovered; no cost is counted twice or added to its own cap base. Each guarantor’s cost liability is also limited to twenty-five percent (25%) of that guarantor’s own non-fee liability and does not enlarge the aggregate cap. These cost limits create no obligation outside the limited scope of Section [[clause:equipment-lease.guaranty-of-payment]]. (e) Setoff requires advance written itemization and an amount actually due between the same parties. Disputed damages may be set off only after judgment or a separately signed settlement. No equipment recovery or setoff increases the Purchased Amount, changes a receivables purchase’s Specified Percentage, or expands its guaranty.',
    source: { kind: 'attorney-drafted', author: null },
    status: 'draft',
    appliesInStates: [],
    examinedBy: [{ review: 'REVIEW-02', findings: ['el-3-4a-declares-itself-exhaustive-and-is-not'] }],
  },
  {
    slug: 'equipment-lease.assignment',
    whyThisClause: { kind: 'discretionary' },
    variance: {
      kind: 'fixed',
      because: 'no-alternative',
      note: 'This separate provider’s assignment rights and customer-consent requirement have no authored alternative; a receivables assignment does not transfer this agreement.',
    },
    version: 1,
    instrument: 'equipment-lease',
    kind: 'clause',
    includeWhen: null,
    section: 'agreement',
    sortKey: 130,
    heading: 'Assignment',
    body: 'You may not assign or transfer this Agreement, by operation of law or otherwise, without our prior written consent. For purposes of this Agreement, any transfer of voting control of you or your parent shall be considered an assignment or transfer hereof. We may assign or transfer this Agreement and our rights and obligations hereunder, in whole or in part, to any third party without the necessity of obtaining your consent.',
    source: { kind: 'attorney-drafted', author: null },
    status: 'draft',
    appliesInStates: [],
    examinedBy: [{ review: 'REVIEW-02', findings: [] }],
  },
  /*
    THE GUARANTY LIMIT IN §4.2, UNDONE TWENTY CLAUSES EARLIER.

    WHAT WAS WRONG. "No guarantor shall have any right of subrogation to any of
    our rights in the Equipment or this Agreement or against you, and any such
    right of subrogation is hereby waived and released. All indebtedness ... is
    hereby subordinated to all of your present and future obligations ... until
    the obligations due to us are paid and satisfied in full."

    REVIEW-01 narrowed §4.2 to three items and said in terms that the Guarantor
    is not liable for a monthly payment, for an amount accelerated under
    §3.12(b)(ii), or for the business failing. This Section was never conformed:
    it subordinates insider debt until the WHOLE agreement is paid, including the
    payments §4.2 says the Guarantor does not owe, and it releases subrogation to
    the very Equipment §4.2(a) may make the Guarantor pay the fair market value
    of. REVIEW-02 raised it as
    `el-3-14-was-not-conformed-when-4-2-was-narrowed`, HIGH, and the
    `lombard-contracts` manifest still records it `open` with "Routed to counsel
    by REVIEW-02 and not yet put to one. No document change made."

    THE SAME SHAPE AS FRPA §7.21 AND §9.1, AND FOUND THE SAME WAY. The FRPA
    rewrite found four routes to guarantor liability and every one was found by
    an assertion stated over the SET rather than by reading a clause — §7.21 made
    a guarantor indemnify Buyer for "any act or omission by any ISO", which the
    2026-09-09 memo does not raise. This is the twins' version of that, and it
    was found by the same method.

    WHAT CHANGED. Both limbs are tied to the obligations §4.2 guarantees.
    Subordination ends when those obligations are satisfied, whatever else
    remains payable under the agreement. Subrogation is DEFERRED rather than
    released, and a guarantor who has paid the fair market value of Equipment
    under §4.2(a) is subrogated to our interest in that Equipment on payment —
    which is the interest §4.2(a) makes them buy.

    DEPARTURE FROM REVIEW-02's FIX. It also says "Move 3.14 into Section 4 where
    the rest of the guaranty lives, so the next person narrowing the guaranty
    sees it." Not done. A move renumbers two live documents, and `number` is what
    a reader sees on the page of a document that still prints 3.14. What replaces
    it is the first sentence, which sends a reader from here to §4.2, and the
    assertion in `__tests__/the-twins-cannot-undo-the-frpa.test.ts` that EVERY
    clause outside Section 4 binding a guarantor must cite §4.2 — which a move
    would not have given, because a move fixes one clause and an assertion covers
    the next one. Recorded for whoever renumbers: this is the clause to move
    first.
  */
  {
    slug: 'equipment-lease.lease-guaranty',
    whyThisClause: { kind: 'discretionary' },
    variance: {
      kind: 'fixed',
      because: 'load-bearing',
      note: 'This cross-reference and subordination rule must stay within the equipment guaranty’s defined obligations; the separate receivables guaranty does not supply them.',
    },
    version: 2,
    instrument: 'equipment-lease',
    kind: 'clause',
    includeWhen: null,
    section: 'agreement',
    sortKey: 140,
    heading: 'Lease Guaranty',
    body: 'Section [[clause:equipment-lease.guaranty-of-payment]] states the entire separately signed Guaranty; this Section imposes no additional liability and does not guarantee monthly charges or business success. When a Guarantor pays a covered loss, that Guarantor receives subrogation rights to the extent of the payment, subject to preventing duplicate recovery and preserving our remaining claim for that same covered loss. We will reasonably document those rights. No general subordination of debts owed to a Guarantor is created, and no payment may be collected twice by routing it through this Section.',
    source: { kind: 'attorney-drafted', author: null },
    status: 'draft',
    appliesInStates: [],
    examinedBy: [
      {
        review: 'REVIEW-02',
        findings: [
          'debt-vocabulary-the-language-guard-would-not-catch',
          'el-3-14-subordination-runs-in-the-wrong-direction',
          'el-3-14-was-not-conformed-when-4-2-was-narrowed',
        ],
      },
    ],
  },
  /*
    FOUR PROVISIONS UNDER ONE CAPTION, AND THE CAPTION IS THE LEAST OF IT.

    WHAT WAS WRONG. Florida law, and "The exclusive venue for any actions or
    claims arising under or related to this Lease shall be the appropriate state
    or federal court located in Pasco County, Florida" — in a form signed by a
    merchant and personally guaranteed by a natural person who may be in any of
    eleven states. Then three more provisions under the same caption: a jury
    waiver running only against "YOU", a class-action waiver running only against
    "YOU", and a one-year limitation period running only against "YOU". Those are
    the four defects FRPA §§7.5, 7.10, 7.11 and 7.19 were rewritten to remove,
    sitting in the document the same person signs next.

    REVIEW-02 RAISED TWO OF THEM AND NEITHER REVIEW ASKED ABOUT THE VENUE.
    `el-3-15-hides-three-waivers-under-a-miscellaneous-caption` is recorded
    implemented — the three got the sub-headings 3.15A, 3.15B and 3.15C this body
    still prints — and `el-3-15-jury-waiver-is-one-sided-where-the-frpas-is-
    mutual` is recorded open, "not yet put to" counsel. Neither review read this
    document as part of Lombard's merchant package, because it only became part
    of one when `instrumentsFor` began returning both twins on
    `equipment !== 'none'`.

    WHAT CHANGED, IN FOUR PARTS.

    (1) LAW AND FORUM BOTH MOVE TO THE CUSTOMER'S OWN STATE, matching FRPA §7.5
        and `LOMBARD_FACTS.venueRule`, which is `merchant-state`. "Exclusive"
        goes with them: the rule is symmetrical, neither party may require the
        other to litigate elsewhere, and it yields where a state fixes its own
        forum for an agreement of this kind.
    (2) THE JURY WAIVER BECOMES MUTUAL AND LIMITS ITSELF, in FRPA §7.10's shape.
        It operates only so far as the law of the forum gives effect to a
        predispute waiver; where that law does not, the Section has no effect and
        each party keeps the right. The owner's instruction against deleting a
        jury waiver nationally to answer one state's rule is honoured — the
        answer a jury waiver needs is per-FORUM at the time of suit, not
        per-template at the time of drafting, and a customer in one state can be
        sued in another.
    (3) THE CLASS WAIVER GOES, in FRPA §7.11's shape, and its sub-heading changes
        for FRPA §7.13's reason: a reader who finds "Class Action Waiver" and
        reads a clause that waives nothing has been told the opposite of the
        truth twice.
    (4) THE ONE-YEAR PERIOD GOES AND NO PERIOD REPLACES IT. FRPA §7.19 was
        redrafted mutual with no shortening because the two-year figure
        attributed to the 2026-09-09 memo exists nowhere but one orchestrator
        note — checked again here, in `lombard-contracts` and in both review
        registers, with the same result. A day count written into a form a
        natural person signs, on an unconfirmed premise, is what the standing
        rule against inventing commercial values exists to stop, and shortening a
        limitation period is the direction that costs the signer.

    ARTICLE 9 IS ADDED, AND IT IS NOT COSMETIC. §3.6 claims a security interest
    in the Equipment and, in the Equipment Lease, the right to file a financing
    statement to perfect it. A choice-of-law sentence cannot displace the UCC's
    mandatory perfection and priority rules, and once the governing law follows
    the customer around the country the point stops being theoretical. FRPA §7.5
    carries the same sentence; this is the document that actually takes the
    interest.

    WHY THE JUSTIFICATION IS NOT THE FRPA'S, WHICH MATTERS IF ANYONE REOPENS IT.
    VERIFIED, `mca/sources/VA-Code-6.2-2228-2238.txt`: Va. Code §6.2-2234(A),
    "Place for bringing action", makes a provision mandating a forum outside the
    Commonwealth unenforceable for a covered transaction, and §6.2-2228 defines
    "Recipient" as a person whose principal place of business is in the
    Commonwealth — so merchant-state satisfies Virginia by construction for the
    FRPA. **That statute governs sales-based financing, and an equipment lease is
    not sales-based financing.** It compels nothing here, and saying it did would
    be the fifth misattributed citation this vertical has had to correct. The
    reason here is the narrower one: one envelope should not send one signer to
    two courts under two laws, and an exclusive out-of-state forum against a
    natural person decides whether that person appears at all — which is what
    §4.3's own recital about the cost of litigating conceded before it waived the
    objection.

    THE GATE WAS REFUSED, ON ADR 0013's TEST AND NOT AS A SHORTCUT. The obvious
    candidate is `disputeResolution`, which gates FRPA §§7.10, 7.11, 7.19 and
    7.20 as one bundle. Refused, on three grounds, in the order ADR 0013 asks
    them.

      - **The fact decides a limb, not the clause.** This Section answers four
        questions: which law governs, where an action is brought, how perfection
        and priority are decided, and what happens to a jury, a class and a
        limitation period. `disputeResolution` answers the last. Gating the whole
        record on it would take governing law, venue and the Article 9 sentence
        away from an arbitration template — which is exactly why FRPA §7.5's gate
        was refused.
      - **The fact is misattributed here in a way it is not in the FRPA.** ADR
        0013's diagnostic: *if two limbs bind different parties or answer
        different questions, the fact is misattributed.* `disputeResolution`
        describes how disputes under the FUNDER's financing agreement are
        resolved. This is a different contract with a different entity —
        {{equipmentAffiliate}}, not {{funder}} — which FRPA §7.8's precedence
        order states in terms. `instrumentsFor` puts both twins in the envelope
        on `equipment` alone and reads `disputeResolution` for neither.
      - **The arbitration arm cannot be drafted.** There is no arbitration clause
        anywhere in the merchant-facing library. Gating §3.15 or §4.4 out under
        `arbitration` would leave a guaranty with no dispute-resolution provision
        and nothing to replace it: a hole, not an alternative. `facts.ts` states
        the standard for that case.

    So `includeWhen` stays `null` in both twins, and cross-reference does the work
    a gate would not: §4.3 points here, and §4.4 says neither it nor this Section
    shortens a period anywhere.

    CAPITALS ARE NOT USED, AND IT IS THE SAME OPEN QUESTION FRPA §7.10 RECORDS.
    Both baselines set these provisions in capitals; the rewritten FRPA does not,
    on the rule that capitals are for a disclosure a regulator requires to be
    conspicuous (7 TAC §86.310(d)) and that spending them elsewhere devalues the
    one that needs them. A jury waiver is nevertheless the classic place a court
    asks whether a term was conspicuous, and no vendored authority in this
    repository fixes what is required. Reported as an open question for counsel,
    now on three documents rather than one.

    THE FORM CHANGES, AND THE CHANGE IS HANDED BACK. The `.docx` in
    `lombard-contracts` still prints Florida law, Pasco County, the sub-heading
    "3.15B Class Action Waiver" and the three all-caps paragraphs. Conforming it
    is a change in that repository, made there and not here.
  */
  {
    slug: 'equipment-lease.governing-law-and-venue',
    whyThisClause: { kind: 'discretionary' },
    variance: {
      kind: 'fixed',
      because: 'misattributed',
      note: 'The funder’s venue and dispute facts concern its receivables purchase; this equipment provider’s contract has its own forum and procedural terms with no authored alternative.',
    },
    version: 2,
    instrument: 'equipment-lease',
    kind: 'clause',
    includeWhen: null,
    section: 'agreement',
    sortKey: 150,
    heading: 'Governing Law and Venue',
    body: 'This Agreement is governed by the substantive law of the state of your principal place of business stated in the Lessee and Equipment Information grid, subject to mandatory federal law and to applicable conflict-of-laws rules. An action arising out of or relating to this Agreement shall be brought in a state court of competent jurisdiction in that state, or in a federal court of competent jurisdiction sitting in that state. Neither you nor we may require the other to bring or defend such an action anywhere else, and nothing in this Section selects a court that lacks subject-matter jurisdiction. Where the law of a state fixes where an action under an agreement of this kind must be brought, that rule governs and this Section yields to it.\nPerfection, the effect of perfection or non-perfection, and the priority of a security interest described in Section [[clause:equipment-lease.title-to-equipment]] are governed by the mandatory rules of the Uniform Commercial Code that apply to them. This Section does not vary those rules and does not choose the law that decides them.\nIf any part of this Agreement is not enforceable, the remaining provisions will remain valid and enforceable.\nService of a summons, a complaint or other legal process is governed by Section [[clause:equipment-lease.independent-decision-governing-law]] and by the procedural law of the court in which the proceeding is brought. Nothing in this Section makes a mailing, an email or any other communication into service of legal process.\n',
    source: { kind: 'attorney-drafted', author: null },
    status: 'draft',
    appliesInStates: [],
    examinedBy: [
      {
        review: 'REVIEW-02',
        findings: [
          'el-3-15-hides-three-waivers-under-a-miscellaneous-caption',
          'el-3-15-jury-waiver-is-one-sided-where-the-frpas-is-mutual',
        ],
      },
    ],
  },
  {
    slug: 'equipment-lease.jury-trial-waiver',
    whyThisClause: { kind: 'discretionary' },
    variance: {
      kind: 'fixed',
      because: 'misattributed',
      note: 'The funder’s venue and dispute facts concern its receivables purchase; this equipment provider’s contract has its own forum and procedural terms with no authored alternative.',
    },
    version: 1,
    instrument: 'equipment-lease',
    includeWhen: null,
    section: 'agreement',
    sortKey: 150.1,
    heading: 'Jury Trial Waiver',
    body: 'You and we each waive trial by jury in an action arising out of or relating to this Agreement, to the extent the law of the forum gives effect to a waiver of that right made before a dispute has arisen. Where the law of the forum does not give effect to such a waiver, this Section has no effect and each of us retains the right to trial by jury. This waiver is mutual, it binds nobody who has not signed this Agreement, and it does not reach a claim applicable law requires to be tried to a jury.\n',
    source: { kind: 'attorney-drafted', author: null },
    status: 'draft',
    appliesInStates: [],
    examinedBy: [
      {
        review: 'REVIEW-02',
        findings: [
          'el-3-15-hides-three-waivers-under-a-miscellaneous-caption',
          'el-3-15-jury-waiver-is-one-sided-where-the-frpas-is-mutual',
        ],
      },
    ],
    kind: 'clause',
    derivedFrom: ['equipment-lease.governing-law-and-venue'],
  },
  {
    slug: 'equipment-lease.class-and-representative-proceedings',
    whyThisClause: { kind: 'discretionary' },
    variance: {
      kind: 'fixed',
      because: 'misattributed',
      note: 'The funder’s venue and dispute facts concern its receivables purchase; this equipment provider’s contract has its own forum and procedural terms with no authored alternative.',
    },
    version: 1,
    instrument: 'equipment-lease',
    includeWhen: null,
    section: 'agreement',
    sortKey: 150.2,
    heading: 'Class and Representative Proceedings',
    body: 'No party waives a right to bring, to defend, or to take part in a class, collective, representative or public-enforcement proceeding that applicable law permits. Whether such a proceeding is available, and in what form, is for the court to determine under applicable law and its own rules. A party that takes part in one keeps whatever share of a recovery it is awarded and any right to costs or to a fee award that applicable law gives it.\n',
    source: { kind: 'attorney-drafted', author: null },
    status: 'draft',
    appliesInStates: [],
    examinedBy: [
      {
        review: 'REVIEW-02',
        findings: [
          'el-3-15-hides-three-waivers-under-a-miscellaneous-caption',
          'el-3-15-jury-waiver-is-one-sided-where-the-frpas-is-mutual',
        ],
      },
    ],
    kind: 'clause',
    derivedFrom: ['equipment-lease.governing-law-and-venue'],
  },
  {
    slug: 'equipment-lease.limitation-of-actions',
    whyThisClause: { kind: 'discretionary' },
    variance: {
      kind: 'fixed',
      because: 'misattributed',
      note: 'The funder’s venue and dispute facts concern its receivables purchase; this equipment provider’s contract has its own forum and procedural terms with no authored alternative.',
    },
    version: 1,
    instrument: 'equipment-lease',
    includeWhen: null,
    section: 'agreement',
    sortKey: 150.3,
    heading: 'Limitation of Actions',
    body: 'The limitation period, the accrual rule, and any tolling or discovery rule that applicable law supplies apply to a claim by each party to this Agreement alike, whoever brings it and whoever it is brought against. This Agreement does not shorten any of them, and no other provision of this Agreement shortens one. A claim that applicable law does not permit to be shortened or given up is unaffected by this Agreement.',
    source: { kind: 'attorney-drafted', author: null },
    status: 'draft',
    appliesInStates: [],
    examinedBy: [
      {
        review: 'REVIEW-02',
        findings: [
          'el-3-15-hides-three-waivers-under-a-miscellaneous-caption',
          'el-3-15-jury-waiver-is-one-sided-where-the-frpas-is-mutual',
        ],
      },
    ],
    kind: 'clause',
    derivedFrom: ['equipment-lease.governing-law-and-venue'],
  },
  /*
    THE QUIET HALF OF THE SAME MACHINE, AND NO REVIEW NAMED IT.

    WHAT WAS WRONG. "Notices sent to the Lessee's last known address, as
    indicated in our records, shall constitute effective notice to the Lessee
    under this Agreement." Once §4.3 stops making a mailing into service, this
    sentence is still making a mailing into notice — at an address the customer
    may have left, held in our own records, with nothing requiring us to check
    it. Notice matters here: §3.12 turns on a default, and §3.7 turns on a
    thirty-day notice before the end of the term.

    THE FRPA CARRIED THE IDENTICAL PRESUMPTION AND DROPPED IT. §10.5's "presumed
    to be accurate" is the same rule in the same words, and
    `a-default-judgment-needs-a-served-defendant.test.ts` now asserts it never
    returns. This clause is the twins' copy of it, and it was found by sweeping
    the property over both documents rather than by reading the clause — no
    review, no memo and no brief names it.

    WHAT CHANGED. A notice goes to the address the customer gives in Section 1 or
    to a later one given in writing, and each party tells the other promptly of a
    change. The deemed-receipt rules for mail, courier and email are kept exactly
    as they were: they are ordinary, nothing raised them, and rewriting them
    would be inventing terms. What goes is the consequence. Sending to an address
    a party has said it no longer uses does not make the notice good, and failing
    to give a change of address does not make an otherwise ineffective notice
    effective — the two-sentence shape FRPA §7.12 uses for the same duty.

    AND THE TWO SUBJECTS ARE SEPARATED BY NAME. This Section governs notices;
    §4.3 governs legal process; neither is evidence of the other. FRPA §10.6 was
    rewritten for exactly this reason, having previously made Section 10
    supersede every notice provision in the Agreement.

    «43» STAYS, CHECKED AGAINST THE VENDORED BODY RATHER THAN ASSUMED. It is the
    AcroForm anchor the Lombard pipeline injects for our notice address (README
    rule 2), and a body that stops claiming it is a body the injector fills into
    nothing.
  */
  {
    slug: 'equipment-lease.notices',
    whyThisClause: { kind: 'discretionary' },
    variance: {
      kind: 'fixed',
      because: 'load-bearing',
      note: 'The separate equipment parties need notice destinations and effective-delivery rules distinct from judicial service; funder contact details do not replace them.',
    },
    version: 1,
    instrument: 'equipment-lease',
    kind: 'clause',
    includeWhen: null,
    section: 'agreement',
    sortKey: 160,
    heading: 'Notices',
    body: 'All notices under this Agreement must be in writing, if to you at the address you give in the Lessee and Equipment Information grid or at a later address you give us in writing, and if to us at _______________«43»_______________, Attn: Equipment Lease Department, or at a later address we or a subsequent assignee give you in writing. Each of us will tell the other promptly in writing of a change of address.\nA notice is given (i) if sent by mail or courier, on the earlier of five (5) days after mailing or actual receipt or, in the case of courier, when delivered, and (ii) if sent by email, on transmission, provided no bounce-back or other non-delivery report is received. A notice given in any other manner is effective when actually received.\nSending a notice to an address a party has told the other it no longer uses does not make that notice effective, and a failure to give a change of address does not make an otherwise ineffective notice effective. A notice given under this Section is not service of legal process and is not evidence that service was made; service of a summons, a complaint or other legal process is governed by Section [[clause:equipment-lease.independent-decision-governing-law]] and by the procedural law of the court.',
    source: { kind: 'attorney-drafted', author: null },
    status: 'draft',
    appliesInStates: [],
    examinedBy: [{ review: 'REVIEW-02', findings: [] }],
  },
  {
    slug: 'equipment-lease.electronic-signatures',
    whyThisClause: { kind: 'discretionary' },
    variance: {
      kind: 'fixed',
      because: 'no-alternative',
      note: 'This records the equipment parties’ agreement to electronic execution; legal recognition of electronic records does not require this particular consent clause.',
    },
    version: 1,
    instrument: 'equipment-lease',
    kind: 'clause',
    includeWhen: null,
    section: 'agreement',
    sortKey: 170,
    heading: 'Electronic Signatures',
    body: 'The parties agree that electronic signatures (including those executed via any commercially recognized electronic-signature platform) shall have the same force and effect as original ink signatures. Electronic copies of this Agreement shall be treated as originals for all purposes.',
    source: { kind: 'attorney-drafted', author: null },
    status: 'draft',
    appliesInStates: [],
    examinedBy: [{ review: 'REVIEW-02', findings: [] }],
  },
  {
    slug: 'equipment-lease.entire-agreement',
    whyThisClause: { kind: 'discretionary' },
    variance: {
      kind: 'fixed',
      because: 'load-bearing',
      note: 'The equipment bargain needs an identified document set and signed-change rule so another transaction cannot silently amend it.',
    },
    version: 1,
    instrument: 'equipment-lease',
    kind: 'clause',
    includeWhen: null,
    section: 'agreement',
    sortKey: 180,
    heading: 'Entire Agreement',
    body: 'This Agreement constitutes the entire agreement between the parties with respect to its subject matter, supersedes any previous agreements and understandings, and can be changed only by a written agreement signed by all parties. This Agreement may be executed in any number of counterparts and all of such counterparts taken together shall be deemed to constitute one and the same instrument.',
    source: { kind: 'attorney-drafted', author: null },
    status: 'draft',
    appliesInStates: [],
    examinedBy: [{ review: 'REVIEW-02', findings: [] }],
  },
  {
    slug: 'equipment-lease.survival',
    whyThisClause: { kind: 'discretionary' },
    variance: {
      kind: 'fixed',
      because: 'load-bearing',
      note: 'The equipment contract needs to say which license, liability and guaranty duties continue after its term; no alternate survival package is authored.',
    },
    version: 2,
    instrument: 'equipment-lease',
    kind: 'clause',
    includeWhen: null,
    section: 'agreement',
    sortKey: 190,
    heading: 'Survival',
    body: 'Sections [[clause:equipment-lease.software-license]] (Software License), [[clause:equipment-lease.limitation-on-liability]] (Limitation on Liability), [[clause:equipment-lease.indemnification]] (Indemnification) and [[clause:equipment-lease.lease-guaranty]] (Lease Guaranty) survive the expiry or termination of this Agreement.\n',
    source: { kind: 'attorney-drafted', author: null },
    status: 'draft',
    appliesInStates: [],
    examinedBy: [{ review: 'REVIEW-02', findings: [] }],
  },
];
