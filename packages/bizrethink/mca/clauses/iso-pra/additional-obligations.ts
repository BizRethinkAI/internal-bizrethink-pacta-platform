import type { McaClause } from '../types';

/**
 * SECTION II — ADDITIONAL OBLIGATIONS.
 *
 * Bodies are the words the shipped document prints, and
 * `__tests__/bodies-match-the-document.test.ts` re-finds every one of them
 * in `source-documents/Lombard_ISO_Partner_Referral_Agreement_v2.txt` on every
 * run. Edit one here and the test goes red, which is correct: the document is
 * where a clause is amended, and this library follows it.
 */
export const ISO_PRA_ADDITIONAL_OBLIGATIONS: McaClause[] = [
  {
    slug: 'iso-pra.compliance',
    whyThisClause: {
      kind: 'implements',
      citation: '15 U.S.C. §45(a)(1) (unfair or deceptive acts or practices within FTC jurisdiction)',
    },
    variance: {
      kind: 'fixed',
      because: 'load-bearing',
      note: 'The referral relationship needs a common compliance covenant and prohibition on deceptive conduct; it does not establish that every listed regulatory scheme applies to every ISO.',
    },
    version: 1,
    instrument: 'iso-pra',
    kind: 'clause',
    includeWhen: null,
    section: 'additional-obligations',
    sortKey: 10,
    heading: 'Compliance',
    body: 'ISO Partner agrees to comply with all applicable federal, state, and local laws and regulations, including but not limited to consumer protection laws, data privacy requirements, anti-money-laundering regulations, and sanctions compliance. ISO Partner shall not engage in any deceptive, unfair, or abusive practices in connection with merchant referrals.',
    source: { kind: 'attorney-drafted', author: null },
    status: 'draft',
    appliesInStates: [],
    examinedBy: [{ review: 'REVIEW-01', findings: ['iso-no-952-transmission-or-evidence-clause'] }],
  },
  {
    slug: 'iso-pra.know-your-partner-compliance',
    whyThisClause: { kind: 'discretionary' },
    variance: {
      kind: 'fixed',
      because: 'no-alternative',
      note: 'The ISO information covenant supports Company diligence, but does not establish an MCA-wide statutory AML onboarding duty; no alternative diligence clause is authored.',
    },
    version: 1,
    instrument: 'iso-pra',
    kind: 'clause',
    includeWhen: null,
    section: 'additional-obligations',
    sortKey: 20,
    heading: 'Know-Your-Partner Compliance',
    body: 'ISO Partner agrees to provide Company with accurate and complete information about ISO Partner and any representatives involved in performing functions under this Agreement, as necessary for Company’s compliance with due diligence, anti-money-laundering, and other regulatory requirements.',
    source: { kind: 'attorney-drafted', author: null },
    status: 'draft',
    appliesInStates: [],
    examinedBy: [{ review: 'REVIEW-01', findings: [] }],
  },
  {
    slug: 'iso-pra.merchant-funds',
    whyThisClause: { kind: 'discretionary' },
    variance: {
      kind: 'fixed',
      because: 'load-bearing',
      note: 'The referral-only model reserves disbursement to Company and needs a route for funds received in error; it does not offer the ISO custody of merchant funding.',
    },
    version: 1,
    instrument: 'iso-pra',
    kind: 'clause',
    includeWhen: null,
    section: 'additional-obligations',
    sortKey: 30,
    heading: 'Merchant Funds',
    body: 'Only Company shall disburse funds to merchants. ISO Partner acknowledges that all merchant funding shall be under the sole control of Company. If any merchant funds are sent to ISO Partner in error, ISO Partner shall be deemed to have received such funds in trust for Company and shall immediately remit them to Company.',
    source: { kind: 'attorney-drafted', author: null },
    status: 'draft',
    appliesInStates: [],
    examinedBy: [{ review: 'REVIEW-01', findings: [] }],
  },
  {
    slug: 'iso-pra.confidentiality',
    whyThisClause: { kind: 'discretionary' },
    variance: {
      kind: 'fixed',
      because: 'no-alternative',
      note: 'The channel confidentiality undertaking is the only authored information-sharing term; no alternative permission or duration is authored.',
    },
    version: 1,
    instrument: 'iso-pra',
    kind: 'clause',
    includeWhen: null,
    section: 'additional-obligations',
    sortKey: 40,
    heading: 'Confidentiality',
    body: 'ISO Partner agrees to keep confidential all proprietary information, merchant data, underwriting criteria, pricing structures, and business terms disclosed by Company. ISO Partner shall not disclose such information to any third party without prior written consent from Company. This obligation survives termination of this Agreement.',
    source: { kind: 'attorney-drafted', author: null },
    status: 'draft',
    appliesInStates: [],
    examinedBy: [{ review: 'REVIEW-01', findings: [] }],
  },
  {
    slug: 'iso-pra.audits',
    whyThisClause: { kind: 'discretionary' },
    variance: {
      kind: 'fixed',
      because: 'no-alternative',
      note: 'The Company audit right and cost allocation are the only authored partner-audit terms; a broker-channel choice does not select another audit regime.',
    },
    version: 1,
    instrument: 'iso-pra',
    kind: 'clause',
    includeWhen: null,
    section: 'additional-obligations',
    sortKey: 50,
    heading: 'Audits',
    body: 'Company may conduct an audit of ISO Partner’s records and operations to verify compliance with this Agreement. Audit costs shall be borne by Company unless the audit reveals material irregularities or breach, in which case ISO Partner shall bear the cost.',
    source: { kind: 'attorney-drafted', author: null },
    status: 'draft',
    appliesInStates: [],
    examinedBy: [{ review: 'REVIEW-01', findings: [] }],
  },
  /*
   * THIS CLAUSE FELL BETWEEN THE TWO CENSUSES, AND NOTHING WOULD HAVE SAID SO.
   *
   * It did not exist when REVIEW-01 ran: that review's
   * `iso-no-952-transmission-or-evidence-clause` reports the absence of
   * exactly this text and names "§2.1 Compliance" as the nearest existing
   * hook. So it was added afterwards, in answer to the finding.
   *
   * And it is not in Phase 0's appendix of unexamined clauses either — that
   * list was built from the corpus and named only A.2, A.6 and 1.6 for this
   * document. A clause added between a review and a census appears in
   * neither, and the census that was supposed to find unexamined text would
   * have reported this document fully covered.
   *
   * REVIEW-02 did read it — `iso-1-6-representative-removal-is-a-request-with-no-obligation`
   * reads 1.6 against 2.6(e) — and raised nothing against it. That is the
   * examination recorded below. It is thinner than it looks, and it is the
   * strongest claim the record actually supports.
   */
  {
    slug: 'iso-pra.commercial-financing-disclosures-california-and-new-york',
    whyThisClause: {
      kind: 'implements',
      citation: '10 CCR §952; 23 NYCRR §600.21 (covered provider/broker disclosure duties)',
    },
    variance: {
      kind: 'fixed',
      because: 'load-bearing',
      note: 'The elected direct-delivery route needs broker controls and a fallback for disclosures sent through the ISO; no alternative compliant delivery procedure is authored in this channel agreement.',
    },
    version: 1,
    instrument: 'iso-pra',
    kind: 'clause',
    includeWhen: null,
    section: 'additional-obligations',
    sortKey: 60,
    heading: 'Commercial Financing Disclosures (California and New York)',
    body: 'Company and ISO Partner acknowledge that delivering a merchant’s application documentation to Company is itself a brokering act under 10 CCR §900(a)(8), so ISO Partner may be a broker under California law whatever this Agreement calls it. The following applies to every California recipient and is not affected by that label. (a) Company elects the route permitted by 10 CCR §952(e) and 23 NYCRR §600.21(e): Company provides a copy of the compliant disclosures directly to the recipient. (b) ISO Partner shall not provide, present or communicate any specific commercial financing offer to any recipient, which is also the unqualified bar in Sections [[clause:iso-pra.referral-obligations]] and [[clause:iso-pra.approval-of-applications]], so §952(b) and §952(c), and 23 NYCRR §600.21(b) and (c), do not engage. Where a New York recipient is involved, Company also gives the recipient the written statement of how and by whom ISO Partner is compensated that 23 NYCRR §600.21(f) requires, on the face of the New York disclosure. (c) If Company nevertheless transmits disclosures to ISO Partner for a recipient, ISO Partner shall transmit those disclosures to the recipient unaltered before communicating anything about the offer, and shall provide Company evidence of transmission including the time of transmission within one business day. (d) ISO Partner shall preserve records of every such transmission for four years and produce them to Company on request. (e) A pattern of noncompliance with §952(b) is cause for immediate termination under Section [[clause:iso-pra.term-and-termination]]; Company will discontinue the relationship, which is the procedure §952(a)(3)(C) contemplates.',
    source: { kind: 'attorney-drafted', author: null },
    status: 'draft',
    appliesInStates: ['US-CA', 'US-NY'],
    examinedBy: [{ review: 'REVIEW-02', findings: [] }],
  },
];
