import type { McaClause } from '../types';

/**
 * Appendix A and the exhibits — fees, execution, and the instruments this one calls for.
 *
 * Bodies are the words the shipped document prints.
 * `__tests__/frpa-coverage.test.ts` additionally asserts that NOTHING in the
 * document is missing from the library — the direction that fails silently.
 */
export const FRPA_APPENDIX: McaClause[] = [
  {
    slug: 'frpa.appendix-a-fees-collectible',
    version: 1,
    instrument: 'frpa',
    kind: 'clause',
    includeWhen: null,
    number: 'Appendix A',
    section: 'appendix',
    sortKey: 10,
    heading: '',
    body: 'All fees are added to the Remaining Balance and are collectible via the same methods as the Purchased Amount. Fees may be voided by Buyer in its discretion, but voided fees remain on record for audit purposes.',
    source: { kind: 'attorney-drafted', author: null },
    status: 'draft',
    appliesInStates: [],
    examinedBy: [{ review: 'REVIEW-02', findings: [] }],
  },
  {
    slug: 'frpa.appendix-a-origination-fee-to-iso',
    version: 1,
    instrument: 'frpa',
    kind: 'clause',
    includeWhen: null,
    number: 'Appendix A',
    section: 'appendix',
    sortKey: 20,
    heading: '',
    body: 'Some or all of the Origination Fee may be paid to an independent sales organization (“ISO”). Otherwise, Buyer is NOT charging any ISO fees to Merchant. If Merchant is charged another such fee, Merchant acknowledges that it is not being charged by Buyer.',
    source: { kind: 'attorney-drafted', author: null },
    status: 'draft',
    appliesInStates: [],
    examinedBy: [{ review: 'REVIEW-02', findings: [] }],
  },
  {
    slug: 'frpa.appendix-a-attorneys-fees',
    version: 1,
    instrument: 'frpa',
    kind: 'clause',
    includeWhen: null,
    number: 'Appendix A',
    section: 'appendix',
    sortKey: 30,
    heading: '',
    body: 'Attorneys’ Fees / Collection Fees: Buyer may recover its attorneys’ fees and collection fees actually incurred and reasonable in amount. These are not calculated as a percentage of the undelivered Purchased Amount, and together with every other enforcement cost recoverable under this Agreement they are subject to the aggregate limit in Section 6.3.',
    source: { kind: 'attorney-drafted', author: null },
    status: 'draft',
    appliesInStates: [],
    examinedBy: [{ review: 'REVIEW-02', findings: [] }],
  },
  {
    slug: 'frpa.execution',
    version: 1,
    instrument: 'frpa',
    kind: 'clause',
    includeWhen: null,
    number: '',
    section: 'appendix',
    sortKey: 40,
    heading: '',
    body: 'IN WITNESS WHEREOF, the parties have executed this Agreement as of the Effective Date. Each of Merchant and Guarantor represents that he or she is authorized to sign this Agreement, legally binding Merchant and Guarantor to comply with the terms of this Agreement and that the information provided herein and in all of Buyer’s documents, forms, and recorded interviews is true, accurate, and complete in all respects. Any misrepresentation made by Merchant or Guarantor in connection with this Agreement may constitute a separate cause of action for fraud or intentional misrepresentation.',
    source: { kind: 'attorney-drafted', author: null },
    status: 'draft',
    appliesInStates: [],
    examinedBy: [{ review: 'REVIEW-02', findings: [] }],
  },
  {
    slug: 'frpa.exhibit-a-split-funding',
    version: 1,
    instrument: 'frpa',
    kind: 'clause',
    includeWhen: null,
    number: 'Exhibit A',
    section: 'appendix',
    sortKey: 50,
    heading: '',
    body: 'A separate Split Funding Authorization Letter shall be executed for each Approved Processor identified in Section 1.5, instructing the Approved Processor to remit the Specified Percentage of credit and debit card receipts directly to Buyer’s designated account. The form of the Split Funding Authorization is attached and incorporated by reference, and shall be executed contemporaneously with this Agreement.',
    source: { kind: 'attorney-drafted', author: null },
    status: 'draft',
    appliesInStates: [],
    examinedBy: [{ review: 'REVIEW-02', findings: [] }],
  },
  /*
    WHAT THIS EXHIBIT ACTUALLY DID. It incorporated a document by reference and
    described it in a way the document does not match — "for the purposes of
    underwriting, ONGOING PROGRAM QUALIFICATION, and post-default collection".
    Ongoing program qualification is the same defect as §4.4's "continuation in
    this program" and §4.16's "ongoing creditworthiness review": a completed sale
    has nothing to re-qualify for. An exhibit that recites a purpose the
    operative clauses have removed reinstates it by the back door.

    THE REFUTATION, AND WHY IT DOES NOT END WHERE THE MEMO ENDS IT. The
    2026-09-09 memo says the actual release "is missing", so one cannot conclude
    that Lombard lacks FCRA authority — which refutes our register's finding.
    That refutation stands and is adopted. **Its premise does not.** The
    Permission to Release is not missing from this project: the `.docx` is in
    `lombard-contracts/sources/` and the instrument is in this library as eight
    `permission-to-release.*` clauses.

    Reading it makes the position sharper rather than settling it. Its §3 grants
    credit-bureau authority over "Merchant and any Personal Guarantor ...
    individually", so authority is not absent on the face of the form; its §4
    then sources the FCRA §604(a)(2) "written instructions" to "The Personal
    Guarantor's signature below", and REVIEW-01 records that the form has no
    such signature line — `ptr-no-guarantor-signature-line`,
    `permission-guarantor-bound-without-signing`,
    `ptr-written-instructions-sourced-to-unsigned-frpa`. So the instrument the
    memo says would supply permissible purpose relies on a signature the
    instrument does not collect.

    **Neither conclusion is written into this exhibit or into §4.3.** What this
    exhibit does instead is state the requirements a release must meet, so that
    the question is answerable from the executed paper rather than argued from
    its absence. That is the whole of what a drafting agent can honestly do here.
    UNVERIFIED: nobody on this project has read 15 U.S.C. §1681b.

    DEPARTURE 1 — "LOMBARD CAPITAL LLC" BECOMES `{{funder}}`. The memo names the
    entity; the library may not. `tenant-agnostic.test.ts` pins three
    placeholders and §4.9 sets the precedent for using `{{funder}}` where a legal
    name has to appear.

    DEPARTURE 2 — THE GATE. `consumerReportPulled`, which the brief asks for and
    which survives ADR 0013's test where §4.3's does not: `instrumentsFor`
    already drops the whole `permission-to-release` instrument on this fact, so
    an ungated exhibit would point the FRPA at an instrument the suite does not
    contain. That is a dangling reference ACROSS instruments, which
    `select-clauses.test.ts` cannot see because it assembles one instrument at a
    time — asserted here instead.

    DEPARTURE 3 — THE SIGNATURE REQUIREMENT IS OPERATIVE, NOT DESCRIPTIVE. The
    memo says "a Merchant signature does not authorize reports on nonsignatory
    individuals". The exhibit says the release must be ON A FORM SIGNED BY THAT
    INDIVIDUAL, which is the requirement REVIEW-01 found the vendored form fails.
    §4.3 carries the same limit ungated, because it is the operative one and this
    exhibit is not always present.

    DEPARTURE 4 — "ATTACHED AND INCORPORATED BY REFERENCE" IS DROPPED IN FAVOUR
    OF DELIVERY. Incorporation by reference of a document the signer has not seen
    is how this clause came to be reviewed twice without its own text. The
    requirement is that the whole form is given before signature and a copy of
    the executed release is delivered to each signer.

    NOT FIXED HERE. The `permission-to-release` instrument itself — its §3
    "ongoing creditworthiness review", its §4 self-certification of statutory
    effect, its §5 photocopy rule, its §6 release of every information source,
    and the missing signature line. **No cluster in this wave owns it.**
  */
  {
    slug: 'frpa.exhibit-c-permission-to-release',
    version: 1,
    instrument: 'frpa',
    kind: 'clause',
    includeWhen: (facts) => facts.consumerReportPulled,
    number: 'Exhibit C',
    section: 'appendix',
    sortKey: 60,
    heading: '',
    body: 'A Permission to Release Information shall be given to Merchant in full before signature and shall be separately executed by the person with authority over the information it releases. It shall identify Buyer, {{funder}}, the information sources and the categories of information to be obtained, the permitted uses, the duration of the authorization, the persons to whom the information may be disclosed, and the notice and correction rights applicable law requires. Its permitted uses are limited to those Section 4.3, Section 4.4 and Section 4.7 allow, and it enlarges none of them.\nAuthority to obtain a consumer report on an individual shall be established and documented separately under applicable law, on a form signed by that individual. Merchant’s signature does not supply it for a person who has not signed, as Section 4.3 states.\nNo release authorizes unrelated marketing, disclosure beyond the recipients it names, a waiver of statutory rights, or a collection power this Agreement does not grant. The executed release shall be kept with the transaction record, and a copy of it shall be delivered to each signer.',
    source: { kind: 'attorney-drafted', author: null },
    status: 'draft',
    appliesInStates: [],
    examinedBy: [{ review: 'REVIEW-02', findings: [] }],
  },
];
