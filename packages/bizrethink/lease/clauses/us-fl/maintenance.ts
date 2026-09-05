import type { Clause } from '../types';

/**
 * Maintenance, pets and administrative charges.
 *
 * The statutory frame, because it dictates the shape of everything here:
 *
 *   Fla. Stat. §83.51(1) — structural soundness, roof, windows, doors, floors,
 *   steps, porches, exterior walls, foundations, plumbing in reasonable working
 *   condition, and compliance with applicable building and housing codes. These
 *   are NOT waivable on any property type.
 *
 *   Fla. Stat. §83.51(2) — extermination, locks and keys, garbage removal and
 *   outside receptacles, and functioning facilities for heat and running water.
 *   These MAY be "altered or modified in writing" for a single-family home or
 *   duplex, and only for those.
 *
 * So the repair threshold and the pool/lawn split are lawful here precisely
 * because 29090 Picana Ln is a single-family home and the agreement is written.
 * On a condo or in a multi-family building the engine does not offer them at
 * all — the clause is absent rather than present and unenforceable.
 *
 * As with the rest of tier 3, this text is `attorney-drafted, author: null`,
 * meaning drafted here and not yet reviewed. It cannot render outside a
 * BizRethink-internal organisation.
 */

const drafted = () => ({ kind: 'attorney-drafted' as const, author: null });

const alterableUnder8351 = (propertyType: string): boolean =>
  propertyType === 'single-family' || propertyType === 'duplex';

export const FL_MAINTENANCE: Clause[] = [
  /*
    This clause used to say the §83.51(1) obligations "may not be waived".
    §83.51(1) ends: "The landlord's obligations under this subsection may be
    altered or modified in writing with respect to a single-family home or
    duplex." Read on 2026-09-04:
    https://www.flsenate.gov/Laws/Statutes/2025/0083.51

    The error favoured the tenant, so it was not dangerous. But a lease that
    misdescribes the statute it cites invites an argument about what else it got
    wrong — and this library is about to be read by a lawyer.

    Not using the carve-out is a CHOICE, and the clause now says so. Saying the
    duties cannot be altered was a mistake about the law.
  */
  {
    slug: 'maintenance.landlord-statutory',
    version: 1,
    jurisdiction: 'US-FL',
    placement: 'lease-body',
    section: 'maintenance',
    sortKey: 10,
    heading: "Landlord's Maintenance Obligations",
    /*
      Deliberately first in the section, and deliberately not supersedable by
      anything. A lease that lets a later clause displace this one could be
      drafted to look as though the non-waivable half of §83.51 had been shifted
      to the tenant. There is a test asserting nothing in the library supersedes
      it.
    */
    body: 'Landlord shall comply with the requirements of applicable building, housing and health codes and shall maintain the roof, windows, doors, floors, steps, porches, exterior walls, foundations and all other structural components of the Premises in good repair and capable of resisting normal forces and loads, and shall keep the plumbing in reasonable working condition. These obligations are imposed by Fla. Stat. §83.51(1). That subsection permits them to be altered or modified in writing for a single-family home or duplex; Landlord does not alter them, and nothing in this Lease limits them.',
    source: drafted(),
    status: 'draft',
    requiredBy: 'Fla. Stat. §83.51(1)',
    includeWhen: null,
    variables: [],
    supersedes: [],
    asserts: ['landlord-structural-maintenance'],
  },

  {
    slug: 'maintenance.shift-single-family',
    /*
      v2: "extermination of pests" became the statute's own list.

      §83.51(2)(a)4 names rats, mice, roaches, ants, wood-destroying organisms
      and bedbugs. Written as "pests" it also read on lawn treatment, which the
      yard rows allocate separately — so a lease could give the tenant "pests"
      here and the landlord "pest treatment" two sections later. They are
      different jobs; the statute's words say which one this is.
    */
    version: 2,
    jurisdiction: 'US-FL',
    placement: 'lease-body',
    section: 'maintenance',
    sortKey: 20,
    heading: 'Allocation of Maintenance for a Single-Family Home',
    // The written modification §83.51(2) expressly permits. Its existence in
    // the document is what makes the clauses below effective.
    body: "The Premises are a {{propertyTypeLabel}}. As permitted by Fla. Stat. §83.51(2), Landlord and Tenant agree in writing that Tenant is responsible for the matters allocated to Tenant in this section, being extermination of rats, mice, roaches, ants and bedbugs, replacement of keys, removal of garbage and maintenance of outside receptacles. Extermination of wood-destroying organisms remains Landlord's responsibility and is not allocated to Tenant. This allocation does not affect Landlord's obligations under Fla. Stat. §83.51(1).",
    source: drafted(),
    status: 'draft',
    includeWhen: (facts) => alterableUnder8351(facts.propertyType),
    variables: [{ name: 'propertyTypeLabel', type: 'string', label: 'Property type', required: true }],
    supersedes: [],
    asserts: ['maintenance-allocation'],
  },

  /*
    §83.51(2)(b) puts the duty to install working smoke detection at the
    commencement of a single-family or duplex tenancy on the LANDLORD.

    The library had no clause for it. The only occurrence of "smoke" anywhere
    was smoke-alarm batteries, sitting in the tenant's list of minor repairs —
    so the document delegated the chore without ever stating the duty it sits
    under, and after a fire that was the only sentence about alarms in the
    lease and it pointed at the tenant.

    Carbon monoxide travels with it: a fossil-fuel appliance or an attached
    garage puts CO alarms in the same conversation, and this property burns
    natural gas.
  */
  /*
    §83.63 already gives the tenant termination and rent abatement when the
    premises are damaged, and it is complete on that question — read on
    2026-09-04, so a casualty clause would add nothing:
    https://www.flsenate.gov/Laws/Statutes/2025/0083.63

    What the statute says NOTHING about is who acts before and after. Verified:
    it contains no provision on securing the property, clearing debris, or
    preparing for a storm.

    On a Florida property with a pool and a tenant-maintained yard that silence
    had an owner by default — the association clause, which gives the tenant
    fourteen days and a bill for fronds a hurricane brought down. Suspending the
    yard and association duties during a declared emergency is the point of this
    clause; the rest is housekeeping.
  */
  {
    slug: 'maintenance.storm',
    version: 1,
    jurisdiction: 'US-FL',
    placement: 'lease-body',
    section: 'maintenance',
    sortKey: 45,
    heading: 'Storms and Severe Weather',
    body: "On a hurricane or tropical storm warning for the area, Tenant shall secure or bring indoors outdoor furniture, garden equipment and other loose items at the Premises, and shall close and secure windows and doors. Landlord is responsible for the cost of storm damage and for the removal of storm debris beyond routine upkeep, including fallen trees and limbs. Tenant's obligations for outdoor upkeep are suspended for the duration of a declared state of emergency affecting the Premises and for a reasonable period afterwards. Nothing in this clause limits Tenant's rights under Fla. Stat. \u00a783.63 where the Premises are damaged.",
    source: drafted(),
    status: 'draft',
    includeWhen: (facts) => alterableUnder8351(facts.propertyType),
    variables: [],
    supersedes: [],
    asserts: ['storm-allocation'],
  },

  {
    slug: 'maintenance.detectors',
    version: 1,
    jurisdiction: 'US-FL',
    placement: 'lease-body',
    section: 'maintenance',
    sortKey: 25,
    heading: 'Smoke and Carbon Monoxide Alarms',
    body: 'Landlord shall install working smoke detection devices at the Premises at the commencement of the tenancy, as required by Fla. Stat. §83.51(2)(b), together with carbon monoxide alarms where required for the Premises. Landlord shall ensure they are in working order on the start date. Tenant shall test each device monthly, replace its batteries as needed, and report any device that fails to Landlord in writing without delay. Tenant shall not disable, remove or obstruct any smoke or carbon monoxide alarm. Nothing in this section makes Tenant responsible for repairing or replacing a device itself.',
    source: drafted(),
    status: 'draft',
    requiredBy: 'Fla. Stat. §83.51(2)(b)',
    includeWhen: (facts) => alterableUnder8351(facts.propertyType),
    variables: [],
    supersedes: [],
    asserts: ['detector-duty'],
  },

  {
    slug: 'maintenance.tenant-repair-threshold',
    version: 1,
    jurisdiction: 'US-FL',
    placement: 'lease-body',
    section: 'maintenance',
    sortKey: 30,
    heading: 'Minor Repairs',
    /*
      The replacement for the 2026 lease's clause A, which made Tenant
      responsible for "any item, system, or component within the Premises"
      under $150 — wide enough on its face to reach the roof and the plumbing,
      neither of which can be shifted. Two changes: the scope is enumerated
      rather than open-ended, and the non-waivable carve-out is stated in the
      clause instead of being left to inference.
    */
    body: "Tenant shall carry out and pay for minor repairs and replacements to non-structural items at the Premises where the cost of the individual repair does not exceed {{repairThresholdUsd}}, including items such as tap washers and similar plumbing hardware, water filters, air-conditioning filters, and light bulbs. Smoke and carbon monoxide alarms are dealt with separately, and the devices themselves remain Landlord's responsibility. Tenant's total liability under this clause may not exceed {{repairAnnualCapUsd}} in any 12-month period, and a single defect is a single repair however many parts or visits it takes to put right. This obligation does not extend to any matter falling within Fla. Stat. §83.51(1), which remains Landlord's responsibility regardless of cost, and does not limit Tenant's liability for damage caused by Tenant's negligence or misuse, which is not capped by that figure.",
    source: drafted(),
    status: 'draft',
    includeWhen: (facts) => alterableUnder8351(facts.propertyType),
    variables: [
      { name: 'repairThresholdUsd', type: 'usd', label: 'Tenant repair threshold', required: true },
      { name: 'repairAnnualCapUsd', type: 'usd', label: 'Annual cap on tenant repairs', required: true },
    ],
    supersedes: [],
    asserts: ['tenant-repair-threshold'],
  },

  {
    slug: 'maintenance.hvac-filters',
    version: 1,
    jurisdiction: 'US-FL',
    placement: 'lease-body',
    section: 'maintenance',
    sortKey: 35,
    heading: 'Air Conditioning',
    body: "Tenant shall replace the air-conditioning filters at least once each month and shall keep the condensate drain line clear. Mechanical failure of the air-conditioning system is Landlord's responsibility, save that Tenant is liable for the cost of any repair shown to have been caused by failure to carry out these obligations. Tenant shall report any unusual noise, odour or performance to Landlord in writing without delay.",
    source: drafted(),
    status: 'draft',
    includeWhen: (facts) => alterableUnder8351(facts.propertyType),
    variables: [],
    supersedes: [],
    asserts: ['hvac-maintenance'],
  },

  {
    slug: 'maintenance.pool-split',
    version: 1,
    jurisdiction: 'US-FL',
    placement: 'lease-body',
    section: 'maintenance',
    sortKey: 40,
    heading: 'Swimming Pool',
    body: 'Pool maintenance is provided and paid for by {{poolServicePaidBy}}. Tenant shall maintain the water at its proper level, skim surface debris, and report any defect in the pool equipment to Landlord in writing without delay. Landlord is responsible for repair of the pool pump, filtration and other pool equipment.',
    source: drafted(),
    status: 'draft',
    includeWhen: (facts) => facts.hasPool,
    variables: [
      { name: 'poolServicePaidBy', type: 'string', label: 'Who provides and pays for pool service', required: true },
    ],
    supersedes: [],
    asserts: ['pool-maintenance'],
  },
  /*
    Chapter 515 — the Residential Swimming Pool Safety Act. A pool completed
    after 1 October 2000 must carry at least one approved safety feature, and
    this house was built in 2018.

    The library had nothing on it: a grep for 515, barrier and drowning across
    the whole lease package returned no hits. The only pool sentence we shipped
    disclaimed liability instead — which is void under §83.47(1)(b) AND left the
    actual control undescribed, so a landlord reading it would believe he was
    covered and skip the thing that stops a drowning.

    The feature varies by property, so it is a variable rather than prose. A
    lease that names the wrong feature is worse than one that names none.
  */
  {
    slug: 'maintenance.pool-safety',
    version: 1,
    jurisdiction: 'US-FL',
    placement: 'lease-body',
    section: 'maintenance',
    sortKey: 41,
    heading: 'Pool Safety Equipment',
    body: "The Premises are equipped with the following pool safety feature: {{poolSafetyFeature}}. Landlord shall keep it in working order at Landlord's cost. Tenant shall not remove, disable, prop open, obstruct or otherwise defeat it, and shall not permit any occupant or guest to do so. Tenant shall report any failure of the safety feature to Landlord in writing without delay, and shall not use the pool while it is out of order.",
    source: drafted(),
    status: 'draft',
    requiredBy: 'Ch. 515, Fla. Stat.',
    includeWhen: (facts) => facts.hasPool,
    variables: [
      {
        name: 'poolSafetyFeature',
        type: 'string',
        label: 'Pool safety feature installed (Ch. 515)',
        required: true,
      },
    ],
    supersedes: [],
    asserts: ['pool-safety-feature'],
  },

  {
    slug: 'maintenance.lawn-split',
    // v2: the allocation came out of the body and became an answer.
    version: 2,
    jurisdiction: 'US-FL',
    placement: 'lease-body',
    section: 'maintenance',
    sortKey: 45,
    heading: 'Lawn and Landscaping',
    /*
      v1 hard-coded the split — landlord mows, tenant waters and trims. A
      landlord whose arrangement ran the other way could not say so, and
      turning the clause off left the yard unallocated rather than allocating
      it differently.

      {{yardDuties}} is one variable, not three, because the sentences have to
      vanish along with their lists: three variables would put "attend to the
      following: ." one missing guard away. See lease/yard/derive-yard.ts.

      Irrigation REPAIR stays with the landlord in the fixed text. Operating
      the system is a chore and allocable; the pump and the sprinkler heads are
      equipment, and a tenant made liable for replacing them is being handed a
      capital cost dressed as yard work.
    */
    body: '{{yardDuties}} Landlord is responsible for mechanical repair of the irrigation system, including sprinkler heads and the pump. Tenant shall report any defect to Landlord in writing without delay.',
    source: drafted(),
    status: 'draft',
    includeWhen: (facts) => facts.hasYardAllocation,
    variables: [{ name: 'yardDuties', type: 'string', label: 'Yard duties, by party', required: true }],
    supersedes: [],
    asserts: ['lawn-maintenance'],
  },

  {
    slug: 'fees.administrative',
    version: 1,
    jurisdiction: 'US-FL',
    placement: 'lease-body',
    section: 'maintenance',
    sortKey: 60,
    heading: 'Administrative Charges',
    // One clause with named variables rather than a paragraph of hard-coded
    // figures, so a change of fee is an answer rather than an edit to text
    // nobody has reviewed.
    /*
      Three charges became one.

      The lockout fee was payable "where Landlord or Landlord's agent attends".
      Nobody attends from another state, and no agent is named. The inspection-
      refusal fee charged a flat sum for DECLINING entry — it contemplated no
      loss at all, which is the definition of a penalty rather than liquidated
      damages, and §83.56(2) already supplies the remedy for a tenant who
      unreasonably withholds access.

      The key charge was "$N, or the actual replacement cost if greater". A
      floor plus actual-cost recovery is a one-way election, and a one-way
      election is what makes a liquidated sum unenforceable. Charge the cost.
    */
    body: 'Tenant shall pay the actual documented cost of replacing each key, remote or access device not returned on vacating, including the cost of re-keying where a key is not returned.',
    source: drafted(),
    status: 'draft',
    includeWhen: null,
    variables: [],
    supersedes: [],
    asserts: ['administrative-charges'],
  },

  {
    slug: 'pets.addendum-fees',
    version: 1,
    jurisdiction: 'US-FL',
    placement: 'addendum',
    section: 'pets',
    sortKey: 10,
    heading: 'Pet Addendum',
    /*
      The assistance-animal carve-out is not optional politeness. A pet clause
      that treats an assistance animal as a pet — charging pet rent or a pet
      deposit for it, or refusing it under a breed or weight limit — is a fair
      housing problem rather than merely an incomplete clause, so the carve-out
      is part of the clause body and there is a test asserting it is there.
    */
    body: "Tenant may keep only the following animals at the Premises: {{permittedPets}}. No other animal may be kept, even temporarily, without Landlord's prior written consent. Tenant shall pay a pet fee of {{petFeeUsd}} and pet rent of {{petRentMonthlyUsd}} per month as an Other Charge. Tenant is responsible for all damage caused by an animal, whether or not covered by the security deposit, and for the prompt removal of animal waste from the Premises and any common area.\n\nAn assistance animal required by a person with a disability is not a pet for the purposes of this Addendum. No pet fee, pet rent or pet deposit is payable in respect of such an animal, and no breed, size or weight restriction in this Addendum applies to it. This Addendum prevails over any conflicting provision in the body of this Lease.",
    source: drafted(),
    status: 'draft',
    /*
      Two variants, because with no fee and no pet rent the single clause
      printed "a pet fee of $0.00 and pet rent of $0.00 per month" — two
      obligations to pay nothing, set out as operative terms. It reads as a
      schedule someone forgot to fill in.
    */
    includeWhen: (facts) => facts.petsPermitted && facts.hasPetFees,
    variables: [
      { name: 'permittedPets', type: 'string', label: 'Permitted animals', required: true },
      { name: 'petFeeUsd', type: 'usd', label: 'Pet fee', required: true },
      { name: 'petRentMonthlyUsd', type: 'usd', label: 'Monthly pet rent', required: true },
    ],
    supersedes: [],
    asserts: ['pets-permitted'],
  },

  {
    slug: 'pets.addendum',
    version: 2,
    jurisdiction: 'US-FL',
    placement: 'addendum',
    section: 'pets',
    sortKey: 10,
    heading: 'Pet Addendum',
    body: "Tenant may keep only the following animals at the Premises: {{permittedPets}}. No other animal may be kept, even temporarily, without Landlord's prior written consent. Tenant is responsible for all damage caused by an animal, whether or not covered by the security deposit, and for the prompt removal of animal waste from the Premises and any common area.\n\nAn assistance animal required by a person with a disability is not a pet for the purposes of this Addendum. No pet fee, pet rent or pet deposit is payable in respect of such an animal, and no breed, size or weight restriction in this Addendum applies to it. This Addendum prevails over any conflicting provision in the body of this Lease.",
    source: drafted(),
    status: 'draft',
    includeWhen: (facts) => facts.petsPermitted && !facts.hasPetFees,
    variables: [{ name: 'permittedPets', type: 'string', label: 'Permitted animals', required: true }],
    supersedes: [],
    asserts: ['pets-permitted'],
  },
];
