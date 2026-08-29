import type { ClauseFacts } from '../clauses/types';
import type { MoneyAnswers } from '../money/types';
import type { InterpolationValue } from '../render/interpolate';
import type { LeaseParty } from '../render/signature-blocks';

/**
 * 29090 Picana Ln, Wesley Chapel, FL 33543 — the new tenancy.
 *
 * A matter is data, not code: nothing here is compiled into a clause. The rent
 * changes by editing this file, and the document follows. It is checked in
 * because the interview UI is deliberately deferred until after attorney
 * review — this is the whole of the "generate path" for now.
 *
 * Facts select clauses; values fill them; money is derived from the answers
 * rather than restated here, so a summary table cannot disagree with the clause
 * that produced it.
 */

export const PICANA_PARTIES: LeaseParty[] = [
  { name: 'Shwet Prabhat', role: 'landlord' },
  { name: 'Ambika Prabhat', role: 'landlord' },
  // Replace with the incoming tenants before generating for signature.
  { name: 'TENANT ONE — TO BE CONFIRMED', role: 'tenant' },
  { name: 'TENANT TWO — TO BE CONFIRMED', role: 'tenant' },
];

export const PICANA_FACTS: ClauseFacts = {
  termMonths: 12,
  depositHeldUsd: 6900,
  advanceRentHeldUsd: 6900,
  depositCarriedInUsd: 0,
  advanceRentCarriedInUsd: 0,
  // Estancia at Wiregrass Ranch, built well after 1978, so no lead disclosure.
  propertyYearBuilt: 2005,
  petsPermitted: true,
  hasHoa: true,
  prorationApplies: false,
  propertyType: 'single-family',
  hasPool: true,
  landlordProvidesLawnService: true,
  lateFeePolicy: 'tiered',
  terminationOnSale: true,
  holdoverPenalty: true,
  earlyTerminationOffered: true,
  nonRenewalNoticeRequired: true,
  electronicNoticesElected: false,
};

export const PICANA_MONEY: MoneyAnswers = {
  rent: { monthlyUsd: 6900, dueDayOfMonth: 1 },
  term: { startDate: '2026-10-01' },
  deposit: {
    securityUsd: 6900,
    // A new tenancy: nothing carried in, so the deposit falls due at execution.
    alreadyHeldUsd: 0,
    advanceRentUsd: 6900,
    advanceRentHeldUsd: 0,
    prepaidRentUsd: 0,
  },
  prorationMethod: 'actual-days-in-month',
};

/**
 * Values for the clause variables. Money figures are NOT here — the renderer
 * merges them in from `deriveMoney`, so there is one source for every amount.
 */
export const PICANA_VALUES: Record<string, InterpolationValue> = {
  effectiveDate: '2026-10-01',
  landlordNames: 'Shwet Prabhat and Ambika Prabhat',
  tenantNames: 'TENANT ONE and TENANT TWO',

  propertyAddress: '29090 Picana Lane, Wesley Chapel, Florida 33543',
  propertyTypeLabel: 'single-family home',
  includedAppliances: 'refrigerator, oven and range, microwave, dishwasher, clothes washer and clothes dryer',

  startDate: '2026-10-01',
  endDate: '2027-09-30',
  holdoverRatePercent: 200,
  saleNoticeDays: 60,

  rentDueDay: 1,
  graceDays: 3,
  lateFeeUsd: 100,
  secondTierDay: 15,
  secondTierFeeUsd: 50,
  returnedPaymentFeeUsd: 45,

  depositInstitution: 'TO BE CONFIRMED — name of the Florida institution holding the deposit',
  depositInstitutionAddress: 'TO BE CONFIRMED — branch address',
  depositInterestLabel: 'does not bear interest',
  // Fla. Stat. §83.49(3)(a) maxima. The rule pack rejects anything longer.
  depositReturnDays: 15,
  depositClaimNoticeDays: 30,

  occupantLimit: 5,
  authorisedOccupants: 'TENANT ONE, TENANT TWO and their immediate family',
  guestNightsLimit: 14,

  tenantUtilities: 'electricity, natural gas, water and sewer, telephone, cable television and internet',
  landlordUtilities: 'refuse collection, lawn service, pool service and association assessments',
  rentersInsuranceMinUsd: 300000,

  // Fla. Stat. §83.53(2): at least 12 hours, 7:30am to 8:00pm.
  entryNoticeHours: 24,
  entryEarliestLabel: '9:00am',
  entryLatestLabel: '6:00pm',
  inspectionsPerYear: 2,

  repairThresholdUsd: 150,
  lockoutFeeUsd: 50,
  keyReplacementFeeUsd: 50,
  inspectionRefusalFeeUsd: 75,

  hoaName: 'the Estancia at Wiregrass Ranch homeowners association',
  hoaNoticeHours: 24,

  noticeName: 'Shwet Prabhat',
  noticeAddress: '537 Lochaven Road, Waxhaw, NC 28173',
  tenantPreTermAddress: 'TO BE CONFIRMED — tenant address before the term begins',
  venueCounty: 'Pasco',

  /*
    Fla. Stat. §83.512 requires the landlord to state their OWN knowledge of
    flooding. Deliberately absent rather than defaulted: answering "has no
    knowledge" on the landlord's behalf would put an unverified statement of
    fact into a statutory disclosure. Fill these three in before generating for
    signature — `renderLease` reports them and sets `readyToSend: false` until
    they are answered.

    landlordKnowsOfFlooding:        'has' | 'has no'
    landlordFiledFloodClaim:        'has' | 'has not'
    landlordReceivedFloodAssistance:'has' | 'has not'
  */

  permittedPets: 'TO BE CONFIRMED — breed, weight and number of dogs',
  petFeeUsd: 500,
  petRentMonthlyUsd: 50,

  // Fla. Stat. §83.595(4): max 2 months rent, max 60 days notice.
  earlyTerminationFeeUsd: 13800,
  earlyTerminationNoticeDays: 60,

  // Fla. Stat. §83.575(1): not less than 30, not more than 60.
  nonRenewalNoticeDays: 60,
};
