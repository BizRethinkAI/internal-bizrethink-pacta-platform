/**
 * Who the parties are, as roles rather than names.
 *
 * WHY THIS EXISTS, AND WHY IT IS LATE. The first import of this library kept
 * every party name verbatim: 22 clause bodies said `Lombard Pay LLC`, the
 * instrument was called `payzli-split-funding`, and `entity` sat on the
 * instrument record. Every test passed, because every test asked whether the
 * text matched Lombard's document — and it did.
 *
 * That made the library one funder's paperwork. Pacta already serves two MCA
 * clients, and the lease builder — the pattern this vertical was told to follow
 * — does not make the mistake: 28 of its 52 clause bodies carry
 * `{{landlordNames}}`, `{{tenantNames}}`, `{{propertyAddress}}`. A lease library
 * tied to one property would be pointless.
 *
 * THE DRIFT HAS A CAUSE WORTH KEEPING. The lease clauses were RE-AUTHORED from a
 * requirements inventory of two executed leases, because their prose belongs to
 * Zillow and to First In's forms vendor — see `provenance/types.ts`, which makes
 * copying them unrepresentable in the type. Re-authoring produces placeholders
 * for free. The MCA documents are ours, so verbatim import was available, and
 * the verification built on top of it made verbatim look mandatory. It is
 * mandatory for the IMPORT. It was never mandatory for the library.
 */

/**
 * The parties a merchant-cash-advance document set names.
 *
 * THREE BECAUSE THE CORPUS HAS THREE, not because three is a tidy number.
 *
 * `funder` and `equipmentAffiliate` are deliberately NOT one role. They are two
 * different legal entities in Lombard's set — Lombard Capital LLC buys the
 * receivables, Lombard Pay LLC leases the equipment — and the FRPA
 * cross-references the second four times. REVIEW-02 raised that one of them
 * "appears nowhere authoritative"; collapsing them into a single placeholder
 * would have quietly resolved a question somebody still has to answer.
 */
export const PARTY_ROLES = ['funder', 'equipmentAffiliate', 'processor'] as const;

export type PartyRole = (typeof PARTY_ROLES)[number];

export const ROLE_LABELS: Record<PartyRole, string> = {
  funder: 'The entity that purchases the receivables — the FRPA’s Buyer',
  equipmentAffiliate: 'The affiliate that leases or subscribes equipment to the merchant',
  processor: 'The card processor instructed to split settlement',
};

/**
 * One MCA client's parties.
 *
 * A TENANT RECORD, NOT A LIBRARY RECORD, and the distinction is the whole point
 * of this file. `mca/README.md` rule 4 already said it for disclosures —
 * *"Jurisdiction is one axis; tenant is another … product- or tenant-specific is
 * not, and folding them together breaks the property that makes adding a state
 * safe"* — and the clause library broke that rule in spirit while obeying it in
 * letter.
 */
/**
 * One tenant's copy of one instrument, and what is known about it.
 *
 * The digest and the date live HERE, not on the instrument, and that is the
 * correction this file exists to make. "The Future Receivables Purchase
 * Agreement" is a kind of document; "Lombard_FRPA_v4.txt, hashing to e236a2…,
 * whose clause bodies were last read on 2026-09-08" is a fact about one client's
 * paper. Putting the second on the first is what made the library single-tenant
 * while every test passed.
 */
export type TenantDocument = {
  file: string;
  /** Normalised digest of the file's body, as it stood when bodies were read. */
  digest: string;
  /** ISO date the clause bodies were last checked against it, or null. */
  bodiesVerifiedAt: string | null;
};

export type McaTenant = {
  /** Stable key. Not a display name and not a party name. */
  id: string;
  parties: Record<PartyRole, string>;
  /**
   * The vendored documents this tenant's clause text is checked against.
   *
   * Per tenant because that is what a document IS: Lombard's FRPA is Lombard's
   * paper. A second client's set is a second map, and the day it exists every
   * clause below is checked against two real documents instead of one — which is
   * the strongest thing this change buys. A clause that only matched one
   * tenant's paper would fail the moment a second arrived.
   */
  documents: Record<string, TenantDocument>;
};

export const LOMBARD: McaTenant = {
  id: 'lombard',
  parties: {
    funder: 'Lombard Capital LLC',
    equipmentAffiliate: 'Lombard Pay LLC',
    processor: 'Payzli',
  },
  documents: {
    frpa: {
      file: 'Lombard_FRPA_v4.txt',
      digest: 'e236a2cb42fcaec9cd2d53ed41f159726e518449561fb7a4d74c56bc1625eb2c',
      bodiesVerifiedAt: '2026-09-08',
    },
    'equipment-lease': {
      file: 'Lombard_Equipment_Lease_Agreement_v1.txt',
      digest: '95d57e4d6e524430bc8891d7ee9262d68882d89f9d0ca046edc55a9da286dd9f',
      bodiesVerifiedAt: '2026-09-08',
    },
    subscription: {
      file: 'Lombard_Subscription_Agreement_v2.txt',
      digest: 'dc82632ba82667125ec689f6c7f52178f39a2250872e59a5239096a1fc56f61a',
      bodiesVerifiedAt: '2026-09-08',
    },
    'iso-pra': {
      file: 'Lombard_ISO_Partner_Referral_Agreement_v2.txt',
      digest: '46c91b72955223fdb9786082df65671a5219675cac28fb846288a275f18a5922',
      bodiesVerifiedAt: '2026-09-08',
    },
    'split-funding': {
      file: 'Lombard_Payzli_Split_Funding_Authorization_v2.txt',
      digest: '2c077ddff1656c3f6c94fa9ae1563779947fcb6900abd785cd47c672083d2d21',
      bodiesVerifiedAt: '2026-09-08',
    },
    'permission-to-release': {
      file: 'Lombard_Permission_to_Release_v1.txt',
      digest: 'b18c51387a2c0ebc01b96034b88041a5676d02b32c2df2ae5d80960e25b5ec64',
      bodiesVerifiedAt: '2026-09-08',
    },
  },
};

export const MCA_TENANTS: McaTenant[] = [LOMBARD];

/**
 * Put a tenant's names back into a clause.
 *
 * FOR CHECKING AND FOR RENDERING, unlike `applyTwinVocabulary`, which is a
 * checking aid only. The difference is that this substitution IS the document:
 * a merchant's FRPA says "Lombard Capital LLC" because that is who is buying,
 * and the placeholder is the library's way of not deciding that in advance.
 *
 * Unknown placeholders are left alone rather than blanked. A clause that still
 * reads `{{funder}}` after resolution fails to match any document and fails
 * loudly; one silently emptied would produce a contract naming nobody.
 */
export const resolveParties = (text: string, tenant: McaTenant): string =>
  text.replace(/\{\{(\w+)\}\}/g, (whole, name: string) =>
    name in tenant.parties ? tenant.parties[name as PartyRole] : whole,
  );

/**
 * A clause list with one tenant's names filled in.
 *
 * Used by the coverage checks, which ask whether anything in a tenant's document
 * is missing from the library — a question that can only be asked about resolved
 * text, since the document names parties and the library does not.
 */
export const resolveClauses = <T extends { heading: string; body: string }>(
  clauses: readonly T[],
  tenant: McaTenant,
): T[] =>
  clauses.map((clause) => ({
    ...clause,
    heading: resolveParties(clause.heading, tenant),
    body: resolveParties(clause.body, tenant),
  }));
