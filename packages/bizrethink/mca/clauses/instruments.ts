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
  | 'split-funding'
  | 'permission-to-release';

export const MCA_INSTRUMENTS: readonly McaInstrument[] = [
  'frpa',
  'equipment-lease',
  'subscription',
  'iso-pra',
  'split-funding',
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
  /** The vendored body text in `source-documents/`. */
};

export const INSTRUMENTS: Record<McaInstrument, McaInstrumentRecord> = {
  frpa: {
    id: 'frpa',
    title: 'Future Receivables Purchase Agreement',
    counterparty: 'merchant',
  },
  'equipment-lease': {
    id: 'equipment-lease',
    title: 'Equipment Lease Agreement',
    counterparty: 'merchant',
  },
  subscription: {
    id: 'subscription',
    title: 'Subscription Agreement',
    counterparty: 'merchant',
  },
  'iso-pra': {
    id: 'iso-pra',
    title: 'ISO Partner Referral Agreement',
    counterparty: 'iso-partner',
  },
  'split-funding': {
    id: 'split-funding',
    title: 'Split Funding Authorization',
    counterparty: 'processor',
  },
  'permission-to-release': {
    id: 'permission-to-release',
    title: 'Permission to Release',
    counterparty: 'merchant',
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
