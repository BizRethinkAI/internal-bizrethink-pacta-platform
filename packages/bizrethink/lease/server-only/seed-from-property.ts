import type { LeasePartyInput } from '../parties/derive-parties';
import type { UtilityRow } from '../utilities/derive-utilities';
import { splitByPayer } from '../utilities/derive-utilities';

/**
 * Opening a new lease with everything the property already knows.
 *
 * Six of the eight questions on the interview's original first step were
 * already answered by the property record, and the landlord and the §83.50
 * notice address were being re-typed for every tenancy. That made the first
 * thing a landlord saw a screen confirming facts nobody had asked them for,
 * while the question they actually came to answer — who is renting it — sat
 * behind it.
 *
 * COPIED, NEVER REFERENCED. Everything here is written onto the matter, and
 * the matter is thereafter the only source. A lease that read its party list
 * live from the property would have its signers silently rewritten whenever
 * that row was edited, and party order decides where signature fields land —
 * so the result is a lease countersigned by the wrong person, with nothing red
 * anywhere.
 */

export type SeedProperty = {
  id: string;
  label: string;
  addressLine: string;
  city: string;
  state: string;
  postalCode: string;
  county: string;
  propertyType: string;
  yearBuilt: number | null;
  hasPool: boolean;
  hasHoa: boolean;
  hoaName: string | null;
  includedAppliances: string | null;
  landlords: { name: string; email: string }[];
  noticeName: string | null;
  noticeAddress: string | null;
  utilities: UtilityRow[];
};

export type SeededMatter = {
  facts: Record<string, unknown>;
  money: {
    rent: { monthlyUsd: number | null; dueDayOfMonth: number };
    term: { startDate: string | null };
    deposit: {
      securityUsd: number | null;
      alreadyHeldUsd: number;
      advanceRentUsd: number | null;
      advanceRentHeldUsd: number;
      prepaidRentUsd: number;
    };
    prorationMethod: string;
  };
  values: Record<string, string | number | boolean | null>;
  parties: LeasePartyInput[];
  customClauses: never[];
};

export const seedMatterFromProperty = (property: SeedProperty): SeededMatter => ({
  facts: {
    propertyType: property.propertyType,
    propertyYearBuilt: property.yearBuilt,
    hasPool: property.hasPool,
    hasHoa: property.hasHoa,
    /*
      Explicit falses rather than absences. An unanswered boolean and a
      deliberate "no" reach every includeWhen predicate identically, so seeding
      them keeps the first render of the document honest.
    */
    petsPermitted: false,
    landlordProvidesLawnService: false,
    lateFeePolicy: 'flat',
    terminationOnSale: false,
    holdoverPenalty: false,
    earlyTerminationOffered: false,
  },

  /*
    No money is seeded. Every figure is null rather than a plausible default:
    a number nobody typed is a number nobody checked, and this document gets
    signed.

    The exception is money ALREADY HELD, which is zero rather than null — and
    the difference is the entire reason this feature exists. A new tenancy
    holds nothing, and "nothing is held" is a real answer that must be
    distinguishable from "nobody has said".
  */
  money: {
    rent: { monthlyUsd: null, dueDayOfMonth: 1 },
    term: { startDate: null },
    deposit: {
      securityUsd: null,
      alreadyHeldUsd: 0,
      advanceRentUsd: null,
      advanceRentHeldUsd: 0,
      prepaidRentUsd: 0,
    },
    prorationMethod: 'actual-days-in-month',
  },

  values: {
    propertyAddress: `${property.addressLine}, ${property.city}, ${property.state} ${property.postalCode}`,
    propertyTypeLabel: property.propertyType.replace('-', ' '),
    venueCounty: property.county,
    hoaName: property.hoaName,
    includedAppliances: property.includedAppliances,
    // Fla. Stat. §83.50. Left unset on a property recorded before these
    // existed, so the interview still asks rather than printing a blank.
    ...(property.noticeName ? { noticeName: property.noticeName } : {}),
    ...(property.noticeAddress ? { noticeAddress: property.noticeAddress } : {}),
    /*
      Both sides rendered from ONE list, so they cannot disagree about who
      pays for what. Seeded as text and still editable per lease: a tenancy
      where this tenant takes over the trash is an ordinary variation, and the
      property record should not be edited to describe one lease.
    */
    ...(() => {
      const { tenant, landlord } = splitByPayer(property.utilities ?? []);

      return { tenantUtilities: tenant, landlordUtilities: landlord };
    })(),
  },

  /*
    Landlords only, and copied. Tenants are what the interview now opens by
    asking, and they are appended after these — so the order a lease starts in
    is the order signatures attach in, and it stays stable as tenants are added.
  */
  parties: property.landlords.map((landlord) => ({
    name: landlord.name,
    role: 'landlord' as const,
    email: landlord.email,
  })),

  customClauses: [],
});
