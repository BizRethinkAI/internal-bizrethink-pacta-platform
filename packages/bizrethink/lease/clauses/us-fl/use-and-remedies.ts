import type { Clause } from '../types';

/**
 * Occupancy and use, utilities, entry, default, move-out, and the early
 * termination election.
 *
 * Three statutes shape this file, and in each case the statute rather than the
 * prior leases is what the clause follows:
 *
 *   §83.53(2) — entry needs at least 12 hours' notice, at a reasonable time,
 *   which the statute puts at 7:30am to 8:00pm. No notice in an emergency.
 *
 *   §83.56 — 3 days (excluding Saturdays, Sundays and legal holidays) to pay
 *   rent or deliver possession; 7 days to cure other noncompliance. These are
 *   the statutory eviction notices and a lease cannot shorten them, so the
 *   clause states them rather than inventing its own.
 *
 *   §83.595(4) — an early termination fee is only available if the tenant
 *   elected it by signing a SEPARATE addendum, capped at 2 months' rent, with
 *   no more than 60 days' notice required of the tenant.
 *
 * Tier 3, `attorney-drafted, author: null` — drafted here, not yet reviewed,
 * cannot render outside a BizRethink-internal organisation.
 */

const drafted = () => ({ kind: 'attorney-drafted' as const, author: null });

export const FL_USE_AND_REMEDIES: Clause[] = [
  {
    slug: 'use.residential-only',
    version: 1,
    jurisdiction: 'US-FL',
    placement: 'lease-body',
    section: 'use',
    sortKey: 10,
    heading: 'Use of the Premises',
    body: 'Tenant shall use the Premises as a private residence only. Tenant shall not use the Premises for any business or commercial purpose, nor for any unlawful purpose, and shall not offer the Premises or any part of it for short-term letting through any platform or otherwise.',
    source: drafted(),
    status: 'draft',
    includeWhen: null,
    variables: [],
    supersedes: [],
    asserts: ['residential-use-only'],
  },

  /*
    TWO VARIANTS, because a lease with no additional occupants is ordinary and
    a single clause with an optional variable would print "together with ."

    THE TENANTS ARE NAMED IN BOTH. The original clause listed only the free-text
    answer, so answering "daughters and father" produced a lease stating those
    were the people authorised to occupy the Premises — leaving the signing
    tenant, the person actually renting it, off the list of people allowed to
    live there.
  */
  {
    slug: 'use.occupancy-limit',
    version: 2,
    jurisdiction: 'US-FL',
    placement: 'lease-body',
    section: 'use',
    sortKey: 20,
    heading: 'Occupants',
    body: "The Premises may be occupied by no more than {{occupantLimit}} people. The people authorised to occupy the Premises are {{tenantNames}}. Any other person staying at the Premises for more than {{guestNightsLimit}} nights in any calendar month requires Landlord's prior written consent.",
    source: drafted(),
    status: 'draft',
    includeWhen: (facts) => !facts.hasNamedOccupants,
    variables: [
      { name: 'occupantLimit', type: 'number', label: 'Maximum occupants', required: true },
      { name: 'tenantNames', type: 'string', label: 'Tenant name(s)', required: true },
      { name: 'guestNightsLimit', type: 'number', label: 'Guest nights before consent needed', required: true },
    ],
    supersedes: [],
    asserts: ['occupancy-limit'],
  },

  {
    slug: 'use.occupancy-limit-with-others',
    version: 1,
    jurisdiction: 'US-FL',
    placement: 'lease-body',
    section: 'use',
    sortKey: 20,
    heading: 'Occupants',
    body: "The Premises may be occupied by no more than {{occupantLimit}} people. The people authorised to occupy the Premises are {{tenantNames}}, together with {{authorisedOccupants}}. Any other person staying at the Premises for more than {{guestNightsLimit}} nights in any calendar month requires Landlord's prior written consent.",
    source: drafted(),
    status: 'draft',
    includeWhen: (facts) => facts.hasNamedOccupants,
    variables: [
      { name: 'occupantLimit', type: 'number', label: 'Maximum occupants', required: true },
      { name: 'tenantNames', type: 'string', label: 'Tenant name(s)', required: true },
      { name: 'authorisedOccupants', type: 'string', label: 'Other authorised occupants', required: true },
      { name: 'guestNightsLimit', type: 'number', label: 'Guest nights before consent needed', required: true },
    ],
    supersedes: [],
    asserts: ['occupancy-limit'],
  },

  {
    slug: 'use.no-alterations',
    version: 1,
    jurisdiction: 'US-FL',
    placement: 'lease-body',
    section: 'use',
    sortKey: 30,
    heading: 'Alterations',
    body: "Tenant shall not alter the Premises without Landlord's prior written consent. Alterations include changing or removing appliances, fixtures or shelving, painting, wallpapering, changing locks, and installing wiring, cabling or fixed equipment. Where Landlord consents, any alteration becomes part of the Premises at the end of the term unless Landlord requires its removal.",
    source: drafted(),
    status: 'draft',
    includeWhen: null,
    variables: [],
    supersedes: [],
    asserts: ['no-alterations'],
  },

  {
    slug: 'use.no-assignment',
    version: 1,
    jurisdiction: 'US-FL',
    placement: 'lease-body',
    section: 'use',
    sortKey: 40,
    heading: 'Assignment and Subletting',
    body: "Tenant shall not assign this Lease or sublet the Premises or any part of them without Landlord's prior written consent. An assignment or sublet made without that consent is void and is a breach of this Lease. No sublet releases Tenant from any obligation under this Lease.",
    source: drafted(),
    status: 'draft',
    includeWhen: null,
    variables: [],
    supersedes: [],
    asserts: ['no-assignment'],
  },

  {
    slug: 'utilities.allocation',
    version: 1,
    jurisdiction: 'US-FL',
    placement: 'lease-body',
    section: 'utilities',
    sortKey: 10,
    heading: 'Utilities',
    // One clause listing only what applies, rather than a fixed table with
    // "N/A" against snow removal and heating oil.
    body: 'Tenant shall arrange and pay for the following directly with the supplier, from the start date: {{tenantUtilities}}. Landlord shall provide and pay for: {{landlordUtilities}}. Tenant shall not allow any utility serving the Premises to be disconnected during the term.',
    source: drafted(),
    status: 'draft',
    includeWhen: null,
    variables: [
      { name: 'tenantUtilities', type: 'string', label: "Utilities in tenant's name", required: true },
      { name: 'landlordUtilities', type: 'string', label: 'Utilities landlord provides', required: true },
    ],
    supersedes: [],
    asserts: ['utilities-allocated'],
  },

  {
    slug: 'insurance.renters',
    version: 1,
    jurisdiction: 'US-FL',
    placement: 'lease-body',
    section: 'utilities',
    sortKey: 20,
    heading: "Tenant's Insurance",
    body: "Tenant shall obtain and maintain renter's insurance covering Tenant's personal property and Tenant's liability, with liability cover of not less than {{rentersInsuranceMinUsd}}, and shall name Landlord as an interested party. Tenant shall provide evidence of that cover before taking possession and on request during the term. Landlord's insurance does not cover Tenant's possessions.",
    source: drafted(),
    status: 'draft',
    includeWhen: null,
    variables: [{ name: 'rentersInsuranceMinUsd', type: 'usd', label: 'Minimum liability cover', required: true }],
    supersedes: [],
    asserts: ['renters-insurance-required'],
  },

  {
    slug: 'access.entry',
    version: 1,
    jurisdiction: 'US-FL',
    placement: 'lease-body',
    section: 'access',
    sortKey: 10,
    heading: "Landlord's Access",
    /*
      §83.53(2) sets the floor: at least 12 hours' notice, and 7:30am to 8:00pm
      as the reasonable hours. The rule pack rejects an answer below the floor
      before this renders, so the figures interpolated here are always lawful.
      An answer ABOVE the floor is fine — a landlord may give more notice than
      the statute demands.
    */
    body: "Landlord may enter the Premises at reasonable times between {{entryEarliestLabel}} and {{entryLatestLabel}}, having given Tenant at least {{entryNoticeHours}} hours' notice, in order to inspect the Premises, make or arrange repairs or improvements, supply agreed services, or show the Premises to a prospective purchaser, tenant, lender, contractor or insurer. Notice is not required in an emergency, or where Tenant has consented to the entry.",
    source: drafted(),
    status: 'draft',
    requiredBy: 'Fla. Stat. §83.53(2)',
    includeWhen: null,
    variables: [
      { name: 'entryNoticeHours', type: 'number', label: 'Notice hours before entry', required: true },
      { name: 'entryEarliestLabel', type: 'string', label: 'Earliest entry time', required: true },
      { name: 'entryLatestLabel', type: 'string', label: 'Latest entry time', required: true },
    ],
    supersedes: [],
    asserts: ['landlord-entry'],
  },

  {
    slug: 'access.annual-inspection',
    version: 1,
    jurisdiction: 'US-FL',
    placement: 'lease-body',
    section: 'access',
    sortKey: 20,
    heading: 'Periodic Inspection',
    body: 'Landlord may inspect the Premises {{inspectionsPerYear}} times in each year of the term, on the notice set out above. Tenant shall permit access at the arranged time. Where Tenant does not, the charge set out in the administrative charges section applies.',
    source: drafted(),
    status: 'draft',
    includeWhen: null,
    variables: [{ name: 'inspectionsPerYear', type: 'number', label: 'Inspections per year', required: true }],
    supersedes: [],
    asserts: ['periodic-inspection'],
  },

  {
    slug: 'default.statutory-notices',
    version: 1,
    jurisdiction: 'US-FL',
    placement: 'lease-body',
    section: 'default',
    sortKey: 10,
    heading: 'Default',
    /*
      The prior leases each set their own cure periods — 5 days financial and 10
      days otherwise in one of them. Those are the statutory notices under
      §83.56 and a lease cannot shorten them, so the clause states the statute
      rather than substituting a number that would not survive.
    */
    body: "If Tenant fails to pay rent when due, Landlord may serve written notice under Fla. Stat. §83.56(3) requiring payment of the rent or delivery of possession within 3 days, excluding Saturdays, Sundays and legal holidays. If Tenant breaches any other obligation under this Lease, Landlord may serve written notice under Fla. Stat. §83.56(2) requiring the breach to be cured within 7 days, or terminating the tenancy on 7 days' notice where the statute permits termination without an opportunity to cure. All sums payable by Tenant under this Lease are additional rent.",
    source: drafted(),
    status: 'draft',
    requiredBy: 'Fla. Stat. §83.56',
    includeWhen: null,
    variables: [],
    supersedes: [],
    asserts: ['default-notices'],
  },

  {
    slug: 'moveout.condition',
    version: 1,
    jurisdiction: 'US-FL',
    placement: 'lease-body',
    section: 'default',
    sortKey: 20,
    heading: 'Vacating the Premises',
    body: 'On the end of the term Tenant shall remove all belongings and rubbish, return every key, remote and access device, and leave the Premises clean and in the condition in which they were received, fair wear and tear excepted. Tenant shall give Landlord a forwarding address. Landlord may recover from the deposit the cost of cleaning or repair beyond fair wear and tear, and shall account for any such deduction under the deposit sections of this Lease.',
    source: drafted(),
    status: 'draft',
    includeWhen: null,
    variables: [],
    supersedes: [],
    asserts: ['move-out-condition'],
  },

  {
    slug: 'mould.control',
    version: 1,
    jurisdiction: 'US-FL',
    placement: 'lease-body',
    section: 'default',
    sortKey: 30,
    heading: 'Moisture and Mould',
    body: 'Tenant shall maintain reasonable climate control in the Premises, keep them clean and dry, use extractor fans when bathing or cooking, and avoid conditions that promote mould growth. Tenant shall report to Landlord in writing, without delay, any water leak, excessive moisture, or visible mould, and any failure or malfunction of the heating, ventilation or air-conditioning system. Landlord shall address any reported condition promptly.',
    source: drafted(),
    status: 'draft',
    includeWhen: null,
    variables: [],
    supersedes: [],
    asserts: ['mould-control'],
  },

  {
    slug: 'termination.early-election',
    /*
      v2: one dollar sign, not two.

      The body read "pay ${{earlyTerminationFeeUsd}}" and the `usd` formatter
      already emits a currency symbol, so this rendered "pay $$4,600.00" — in
      the one paragraph of the whole library whose wording Fla. Stat. §83.595(4)
      prescribes.
    */
    version: 2,
    jurisdiction: 'US-FL',
    // A SEPARATE addendum, because §83.595(4) makes the remedy available only
    // where the tenant signed one containing the election. Folding it into the
    // body would leave the fee unavailable.
    placement: 'addendum',
    section: 'termination',
    sortKey: 10,
    heading: 'Early Termination Addendum',
    body: "Fla. Stat. §83.595 gives Landlord a choice of remedies where Tenant breaches the Lease and vacates before the end of the term. This Addendum records the parties' election under §83.595(4).\n\nI agree, as provided in the rental agreement, to pay {{earlyTerminationFeeUsd}} as liquidated damages or an early termination fee if I elect to terminate the rental agreement, and Landlord waives the right to seek additional rent beyond the month in which Landlord retakes possession.\n\nTenant shall give Landlord at least {{earlyTerminationNoticeDays}} days' written notice of a termination under this Addendum. This Addendum does not release Tenant from liability for unpaid rent accrued before the termination date, or for damage to the Premises beyond fair wear and tear.",
    source: drafted(),
    status: 'draft',
    requiredBy: 'Fla. Stat. §83.595(4)',
    includeWhen: (facts) => facts.earlyTerminationOffered,
    variables: [
      {
        name: 'earlyTerminationFeeUsd',
        type: 'usd',
        label: 'Early termination fee (max 2 months rent)',
        required: true,
      },
      {
        name: 'earlyTerminationNoticeDays',
        type: 'number',
        label: 'Tenant notice days (max 60)',
        required: true,
      },
    ],
    supersedes: [],
    asserts: ['early-termination-election'],
  },

  {
    slug: 'rules.house-rules',
    version: 1,
    jurisdiction: 'US-FL',
    placement: 'addendum',
    section: 'rules',
    sortKey: 20,
    heading: 'House Rules',
    // Real rules with real content, replacing three headings that read "N/A"
    // and one labelled "Others" holding six substantive clauses.
    body: "Tenant shall observe the following rules, which form part of this Lease:\n\n1. No garage, yard or estate sale may be held at the Premises without Landlord's prior written consent.\n2. Locks may not be changed, added or removed without Landlord's prior written consent; where consent is given, Tenant shall provide Landlord with a key.\n3. Nothing may be fixed to walls, woodwork or floors other than small nails or hooks for hanging pictures. Tenant is responsible for making good.\n4. No water-filled furniture may be kept at the Premises.\n5. Windows may not be covered with foil, paper or other reflective material.\n6. Water hoses must be fitted with an automatic shut-off nozzle. Leaks must be reported without delay.\n7. Patios, balconies, entrances and walkways may not be used for storage.\n8. No antenna or satellite dish may be installed without Landlord's prior written consent.\n9. The landscaping may not be altered without Landlord's prior written consent.\n10. No window air-conditioning unit, window fan or exhaust fan may be installed.\n11. Tenant, occupants and guests shall not cause a nuisance or unreasonably disturb neighbours.\n12. Waste must be placed in the receptacles provided and put out for collection at the times set by the collection service.",
    source: drafted(),
    status: 'draft',
    includeWhen: null,
    variables: [],
    supersedes: [],
    asserts: ['house-rules'],
  },
];
