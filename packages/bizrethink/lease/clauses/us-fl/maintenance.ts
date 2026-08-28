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
    body: 'Landlord shall comply with the requirements of applicable building, housing and health codes and shall maintain the roof, windows, doors, floors, steps, porches, exterior walls, foundations and all other structural components of the Premises in good repair and capable of resisting normal forces and loads, and shall keep the plumbing in reasonable working condition. Nothing in this Lease alters or limits these obligations, which are imposed by Fla. Stat. §83.51(1) and may not be waived.',
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
    version: 1,
    jurisdiction: 'US-FL',
    placement: 'lease-body',
    section: 'maintenance',
    sortKey: 20,
    heading: 'Allocation of Maintenance for a Single-Family Home',
    // The written modification §83.51(2) expressly permits. Its existence in
    // the document is what makes the clauses below effective.
    body: "The Premises are a {{propertyTypeLabel}}. As permitted by Fla. Stat. §83.51(2), Landlord and Tenant agree in writing that Tenant is responsible for the matters allocated to Tenant in this section, being extermination of pests, replacement of keys, removal of garbage and maintenance of outside receptacles. This allocation does not affect Landlord's obligations under Fla. Stat. §83.51(1).",
    source: drafted(),
    status: 'draft',
    includeWhen: (facts) => alterableUnder8351(facts.propertyType),
    variables: [{ name: 'propertyTypeLabel', type: 'string', label: 'Property type', required: true }],
    supersedes: [],
    asserts: ['maintenance-allocation'],
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
    body: "Tenant shall carry out and pay for minor repairs and replacements to non-structural items at the Premises where the cost of the individual repair does not exceed {{repairThresholdUsd}}, including items such as tap washers and similar plumbing hardware, water filters, air-conditioning filters, light bulbs, and smoke-alarm batteries. This obligation does not extend to any matter falling within Fla. Stat. §83.51(1), which remains Landlord's responsibility regardless of cost, and does not limit Tenant's liability for damage caused by Tenant's negligence or misuse, which is not capped by that figure.",
    source: drafted(),
    status: 'draft',
    includeWhen: (facts) => alterableUnder8351(facts.propertyType),
    variables: [{ name: 'repairThresholdUsd', type: 'usd', label: 'Tenant repair threshold', required: true }],
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
    body: "Landlord shall provide professional pool maintenance at Landlord's cost. Tenant shall maintain the water at its proper level, skim surface debris, and report any defect in the pool equipment to Landlord in writing without delay. Landlord is responsible for repair of the pool pump, filtration and other pool equipment. Tenant and Tenant's guests use the pool at their own risk.",
    source: drafted(),
    status: 'draft',
    includeWhen: (facts) => facts.hasPool,
    variables: [],
    supersedes: [],
    asserts: ['pool-maintenance'],
  },

  {
    slug: 'maintenance.lawn-split',
    version: 1,
    jurisdiction: 'US-FL',
    placement: 'lease-body',
    section: 'maintenance',
    sortKey: 45,
    heading: 'Lawn and Landscaping',
    body: "Landlord shall provide lawn mowing and trimming at Landlord's cost. Tenant shall operate the irrigation system as needed to keep the lawn and planting in good condition, trim small shrubs, palms and flower beds, and clear fallen leaves. Landlord is responsible for mechanical repair of the irrigation system, including sprinkler heads and the pump. Tenant shall report any defect to Landlord in writing without delay.",
    source: drafted(),
    status: 'draft',
    includeWhen: (facts) => facts.landlordProvidesLawnService,
    variables: [],
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
    body: "The following charges are payable by Tenant as additional rent: {{lockoutFeeUsd}} where Landlord or Landlord's agent attends to restore entry after a lockout; {{keyReplacementFeeUsd}}, or the actual replacement cost if greater, for each key, remote or access device not returned on vacating; and {{inspectionRefusalFeeUsd}} where Tenant fails to permit access for an inspection arranged on proper notice.",
    source: drafted(),
    status: 'draft',
    includeWhen: null,
    variables: [
      { name: 'lockoutFeeUsd', type: 'usd', label: 'Lockout fee', required: true },
      { name: 'keyReplacementFeeUsd', type: 'usd', label: 'Key replacement fee', required: true },
      { name: 'inspectionRefusalFeeUsd', type: 'usd', label: 'Inspection refusal fee', required: true },
    ],
    supersedes: [],
    asserts: ['administrative-charges'],
  },

  {
    slug: 'pets.addendum',
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
    body: "Tenant may keep only the following animals at the Premises: {{permittedPets}}. No other animal may be kept, even temporarily, without Landlord's prior written consent. Tenant shall pay a pet fee of {{petFeeUsd}} and pet rent of {{petRentMonthlyUsd}} per month as additional rent. Tenant is responsible for all damage caused by an animal, whether or not covered by the security deposit, and for the prompt removal of animal waste from the Premises and any common area.\n\nAn assistance animal required by a person with a disability is not a pet for the purposes of this Addendum. No pet fee, pet rent or pet deposit is payable in respect of such an animal, and no breed, size or weight restriction in this Addendum applies to it.",
    source: drafted(),
    status: 'draft',
    includeWhen: (facts) => facts.petsPermitted,
    variables: [
      { name: 'permittedPets', type: 'string', label: 'Permitted animals', required: true },
      { name: 'petFeeUsd', type: 'usd', label: 'Pet fee', required: true },
      { name: 'petRentMonthlyUsd', type: 'usd', label: 'Monthly pet rent', required: true },
    ],
    supersedes: [],
    asserts: ['pets-permitted'],
  },
];
