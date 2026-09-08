/**
 * The six negotiated agreements, and which one a clause belongs to.
 *
 * A THIRD AXIS, AND THE FIRST ONE THAT IS ABOUT A DOCUMENT. `McaJurisdiction`
 * says which state's law a disclosure is a creature of;
 * `McaTransactionType` says which kind of financing it is prescribed for. Both
 * are properties of a REGULATOR'S form. Nothing in the negotiated corpus is a
 * creature of any state's law — these are our contracts, in our words — so the
 * question that organises them is simply which agreement they are in, which is
 * a fact about our own publishing and not about anybody's statute.
 *
 * Keeping it a separate type is the same discipline `jurisdictions.ts` argues
 * for at length. Folding "the Equipment Lease" into `McaJurisdiction` would
 * turn `disclosuresFor` from a statement about which law applies into a
 * statement about which document is being assembled, and the property that
 * makes adding a twelfth state safe would be gone.
 *
 * WHY THE LIST IS WRITTEN OUT AND ASSERTED, NOT DERIVED FROM THE CLAUSE FILES.
 * Because a list that grows itself from the files present cannot notice a
 * missing document, and one was missing. `MCA-CLAUSE-LIBRARY-PHASE0.md` counts
 * five negotiated agreements and 140 clauses; `CONTRACT_INDEX.md` publishes
 * six. The Subscription Agreement is the omission — and it is the document
 * REVIEW-01 actually reviewed. REVIEW-02 found why the omission was easy to
 * make and expensive to keep: the Subscription is the Equipment Lease with its
 * vocabulary swapped and its clause numbering identical, so **every Equipment
 * Lease finding lands twice, in two live templates, and a fix applied to one
 * and not the other is a divergence nothing checks for**
 * (`phase0-corpus-omits-the-subscription-agreement-entirely`).
 *
 * That is also why a clause carries `instruments` in the plural. The twin is
 * not two clauses that happen to agree; it is one clause published in two
 * documents, and representing it as two copies is how the divergence gets
 * written in rather than caught.
 */
export type McaInstrument =
  | 'frpa'
  | 'equipment-lease'
  | 'subscription'
  | 'iso-pra'
  | 'payzli-split-funding'
  | 'permission-to-release';

export const MCA_INSTRUMENTS: readonly McaInstrument[] = [
  'frpa',
  'equipment-lease',
  'subscription',
  'iso-pra',
  'payzli-split-funding',
  'permission-to-release',
];

/**
 * Who signs opposite Lombard.
 *
 * `merchant` and `iso-partner` are not two names for a counterparty; they are
 * two different regulatory positions. A merchant is a *recipient* under 10 CCR
 * §900 and 23 NYCRR §600, owed a disclosure. An ISO partner is a *broker* under
 * the same regulations, owed nothing and constrained in what it may say. The
 * ISO PRA's §2.6 exists entirely because of that difference.
 */
export type McaCounterparty = 'merchant' | 'iso-partner' | 'processor';

export type McaInstrumentRecord = {
  id: McaInstrument;
  title: string;
  counterparty: McaCounterparty;
  /**
   * The Lombard entity that is party to it.
   *
   * RECORDED BECAUSE IT IS NOT ONE ENTITY, AND ONE OF THEM IS BARELY
   * DOCUMENTED. Three published documents are with Lombard Pay LLC, and
   * `CONTRACT_INDEX.md` names only Lombard Capital LLC (REVIEW-02,
   * `two-lombard-entities-one-of-which-appears-nowhere-authoritative`). The
   * FRPA carries the phrase "an Equipment Lease Agreement between Merchant and
   * Lombard Pay LLC" verbatim four times, three of them in clauses no review
   * had examined until REVIEW-02.
   */
  entity: string;
  /** The vendored body text in `source-documents/`. */
  sourceDocument: string;
  /**
   * The normalised digest of that file's body, as it stood when the clause
   * bodies below were transcribed from it.
   *
   * Empty string until an instrument's clauses are imported — see
   * `bodiesVerifiedAt`, which is the field that says whether this one means
   * anything yet.
   */
  sourceDigest: string;
  /**
   * ISO date the clause bodies were last checked against that document, or
   * null when no clause has been imported for this instrument.
   *
   * A DATE AND A DIGEST, FOR THE REASON THE REST OF THIS PACKAGE GIVES. The
   * date is the claim; the digest is what re-executes it. A date without a
   * digest is a date somebody typed, and re-stamping the date after a digest
   * breaks — instead of re-reading the document — is the one move the whole
   * mechanism exists to make impossible by accident.
   */
  bodiesVerifiedAt: string | null;
};

export const INSTRUMENTS: Record<McaInstrument, McaInstrumentRecord> = {
  frpa: {
    id: 'frpa',
    title: 'Future Receivables Purchase Agreement',
    counterparty: 'merchant',
    entity: 'Lombard Capital LLC',
    sourceDocument: 'Lombard_FRPA_v4.txt',
    sourceDigest: '322e70399945de2199e34d1c7ca2915cb4bbe654dd9857beda04ed590d33075e',
    bodiesVerifiedAt: '2026-09-08',
  },
  'equipment-lease': {
    id: 'equipment-lease',
    title: 'Equipment Lease Agreement',
    counterparty: 'merchant',
    entity: 'Lombard Pay LLC',
    sourceDocument: 'Lombard_Equipment_Lease_Agreement_v1.txt',
    sourceDigest: '3aa412d121d10c7664db29ffd6c2a8bbac288777372406c985b02c18df450126',
    bodiesVerifiedAt: '2026-09-08',
  },
  subscription: {
    id: 'subscription',
    title: 'Subscription Agreement',
    counterparty: 'merchant',
    entity: 'Lombard Pay LLC',
    sourceDocument: 'Lombard_Subscription_Agreement_v2.txt',
    sourceDigest: '11c732a5de69c73d4492c7d5f5f2e239aeb9833aee680988487d3cd6b200adad',
    bodiesVerifiedAt: '2026-09-08',
  },
  'iso-pra': {
    id: 'iso-pra',
    title: 'ISO Partner Referral Agreement',
    counterparty: 'iso-partner',
    entity: 'Lombard Pay LLC',
    sourceDocument: 'Lombard_ISO_Partner_Referral_Agreement_v2.txt',
    sourceDigest: 'e63dd6f3622465d6fa6b403335c9b57f56dc4fc0495e9e326271f638bbc76e8e',
    bodiesVerifiedAt: '2026-09-07',
  },
  'payzli-split-funding': {
    id: 'payzli-split-funding',
    title: 'Payzli Split Funding Authorization',
    counterparty: 'processor',
    entity: 'Lombard Capital LLC',
    sourceDocument: 'Lombard_Payzli_Split_Funding_Authorization_v2.txt',
    sourceDigest: '2c077ddff1656c3f6c94fa9ae1563779947fcb6900abd785cd47c672083d2d21',
    bodiesVerifiedAt: '2026-09-08',
  },
  'permission-to-release': {
    id: 'permission-to-release',
    title: 'Permission to Release',
    counterparty: 'merchant',
    entity: 'Lombard Capital LLC',
    sourceDocument: 'Lombard_Permission_to_Release_v1.txt',
    sourceDigest: 'b18c51387a2c0ebc01b96034b88041a5676d02b32c2df2ae5d80960e25b5ec64',
    bodiesVerifiedAt: '2026-09-08',
  },
};

/**
 * The instruments a merchant is actually handed.
 *
 * The ISO PRA is the one a merchant never sees, and that is not a detail: its
 * §2.6 exists because California and New York regulate what a broker may put in
 * front of a recipient. An agreement builder that assembled it into a
 * merchant's document set would be handing the merchant the contract that
 * governs how it is not to be sold to.
 */
export const merchantFacing = (): McaInstrument[] =>
  MCA_INSTRUMENTS.filter((id) => INSTRUMENTS[id].counterparty === 'merchant');
