import type { Clause } from '../types';

/**
 * Tier 1 of the Florida clause library: text the legislature prescribes.
 *
 * Public domain, so there is no sourcing question — and in several cases
 * required *verbatim*, so there is no drafting question either. This tranche
 * therefore needs no attorney to author, only one to verify. Every clause here
 * stays at `status: 'draft'` until a human has checked the words against the
 * current statute and stamped `verbatimVerifiedAt`.
 *
 * None of this text comes from the executed Zillow or First In leases. Those
 * documents told us which terms the deal needs; the words come from the statute
 * books.
 */

/**
 * Fla. Stat. §404.056(5). Required in every residential lease for more than 45
 * days. The statute prescribes the wording and a paraphrase does not satisfy
 * it, so this string is asserted character-for-character in the test suite and
 * must never be reflowed, retitled, or "improved".
 */
export const RADON_STATUTORY_TEXT =
  'RADON GAS: Radon is a naturally occurring radioactive gas that, when it has accumulated in a building in sufficient quantities, may present health risks to persons who are exposed to it over time. Levels of radon that exceed federal and state guidelines have been found in buildings in Florida. Additional information regarding radon and radon testing may be obtained from your county health department.';

/**
 * Fla. Stat. §83.512, created by ch. 2025-166 (SB 948), effective 1 Oct 2025.
 *
 * The statute prescribes a form in "substantially the following" terms and
 * requires it to be a SEPARATE written disclosure given at or before execution
 * of any lease of one year or longer. It may not be folded into the lease body,
 * which is why this clause is `placement: 'standalone-disclosure'`.
 *
 * Worth noting how new this is: it took effect nine months before Zillow
 * retired Lease Builder. A template nobody is actively maintaining goes stale
 * silently, and the landlord carries the consequence — the legislative-drift
 * risk, made concrete.
 */
const FLOOD_DISCLOSURE_BODY = `Renters' insurance policies do not include coverage for damage resulting from floods. Tenant is encouraged to discuss the need to purchase separate flood insurance coverage with Tenant's insurance agent.

Landlord {{landlordKnowsOfFlooding}} knowledge of any flooding that has damaged the dwelling unit during Landlord's ownership.

Landlord {{landlordFiledFloodClaim}} filed a claim with an insurance provider relating to flood damage in the dwelling unit.

Landlord {{landlordReceivedFloodAssistance}} received assistance for flood damage to the dwelling unit, including assistance from the Federal Emergency Management Agency.

For purposes of this disclosure, "flooding" means a general or temporary condition of partial or complete inundation of the dwelling unit caused by any of the following: the overflow of inland or tidal waters; the unusual and rapid accumulation of runoff or surface waters from any established water source, such as a river, stream, or drainage ditch; or sustained periods of standing water resulting from rainfall.`;

export const FL_STATUTORY_DISCLOSURES: Clause[] = [
  {
    slug: 'disclosure.radon',
    version: 1,
    jurisdiction: 'US-FL',
    placement: 'lease-body',
    section: 'disclosures',
    sortKey: 100,
    heading: 'Radon Gas Disclosure',
    body: RADON_STATUTORY_TEXT,
    source: {
      kind: 'statute',
      citation: 'Fla. Stat. §404.056(5)',
      verbatimRequired: true,
      verbatimVerifiedAt: null,
    },
    status: 'draft',
    requiredBy: 'Fla. Stat. §404.056(5)',
    includeWhen: null,
    variables: [],
    supersedes: [],
    asserts: ['radon-disclosed'],
  },

  {
    slug: 'disclosure.flood',
    version: 1,
    jurisdiction: 'US-FL',
    placement: 'standalone-disclosure',
    section: 'disclosures',
    sortKey: 110,
    heading: 'Flood Disclosure',
    body: FLOOD_DISCLOSURE_BODY,
    source: {
      kind: 'statute',
      citation: 'Fla. Stat. §83.512',
      verbatimRequired: true,
      verbatimVerifiedAt: null,
    },
    status: 'draft',
    requiredBy: 'Fla. Stat. §83.512',
    // "a rental agreement for a term of 1 year or longer"
    includeWhen: (facts) => facts.termMonths >= 12,
    variables: [
      {
        name: 'landlordKnowsOfFlooding',
        type: 'string',
        label: 'Knowledge of flooding that damaged the unit during your ownership',
        required: true,
      },
      {
        name: 'landlordFiledFloodClaim',
        type: 'string',
        label: 'Insurance claim filed relating to flood damage in the unit',
        required: true,
      },
      {
        name: 'landlordReceivedFloodAssistance',
        type: 'string',
        label: 'Flood-damage assistance received, including from FEMA',
        required: true,
      },
    ],
    supersedes: [],
    asserts: ['flood-disclosed'],
  },

  {
    slug: 'deposit.statutory-notice',
    version: 1,
    jurisdiction: 'US-FL',
    placement: 'lease-body',
    section: 'deposit',
    sortKey: 120,
    heading: 'Notice — Security Deposits and Advance Rent',
    // The statute requires a copy of §83.49(3) in the agreement itself. Text
    // intentionally left to be transcribed from the current statute during
    // verification rather than reproduced from memory; `verbatimVerifiedAt`
    // stays null and the publish guard blocks it until then.
    body: '{{STATUTORY_TEXT_PENDING_VERIFICATION: Fla. Stat. §83.49(3)}}',
    source: {
      kind: 'statute',
      citation: 'Fla. Stat. §83.49(3)',
      verbatimRequired: true,
      verbatimVerifiedAt: null,
    },
    status: 'draft',
    requiredBy: 'Fla. Stat. §83.49(3)',
    // A deposit carried over from a prior tenancy is still held. The obligation
    // does not lapse because nothing is collected at signing — the trap the
    // 2026 lease fell into.
    includeWhen: (facts) => facts.depositHeldUsd > 0,
    variables: [],
    supersedes: [],
    asserts: ['deposit-notice-given'],
  },

  {
    slug: 'disclosure.landlord-identity',
    version: 1,
    jurisdiction: 'US-FL',
    placement: 'lease-body',
    section: 'notices',
    sortKey: 130,
    heading: 'Landlord and Authorised Agent',
    body: "The name and address of the Landlord, or of the person authorised to receive notices and demands on the Landlord's behalf, is: {{noticeName}}, {{noticeAddress}}.",
    source: {
      kind: 'statute',
      citation: 'Fla. Stat. §83.50',
      verbatimRequired: false,
      verbatimVerifiedAt: null,
    },
    status: 'draft',
    requiredBy: 'Fla. Stat. §83.50',
    includeWhen: null,
    variables: [
      { name: 'noticeName', type: 'string', label: 'Name for notices', required: true },
      { name: 'noticeAddress', type: 'string', label: 'Address for notices', required: true },
    ],
    supersedes: [],
    asserts: ['landlord-identity-disclosed'],
  },

  {
    slug: 'disclosure.lead-paint',
    version: 1,
    jurisdiction: 'US',
    placement: 'standalone-disclosure',
    section: 'disclosures',
    sortKey: 140,
    heading: 'Disclosure of Information on Lead-Based Paint and Lead-Based Paint Hazards',
    body: `LEAD WARNING STATEMENT

Housing built before 1978 may contain lead-based paint. Lead from paint, paint chips, and dust can pose health hazards if not managed properly. Lead exposure is especially harmful to young children and pregnant women. Before renting pre-1978 housing, lessors must disclose the presence of known lead-based paint and/or lead-based paint hazards in the dwelling. Lessees must also receive a federally approved pamphlet on lead poisoning prevention.`,
    source: {
      kind: 'statute',
      citation: '42 U.S.C. §4852d; 24 C.F.R. pt. 35',
      verbatimRequired: true,
      verbatimVerifiedAt: null,
    },
    status: 'draft',
    requiredBy: '42 U.S.C. §4852d',
    // Unknown build year is not evidence of post-1978 construction — fail safe
    // and include the disclosure.
    includeWhen: (facts) => facts.propertyYearBuilt === null || facts.propertyYearBuilt < 1978,
    variables: [],
    supersedes: [],
    asserts: ['lead-paint-disclosed'],
  },
];
