import type { ClauseStatus } from '../../server-only/feature-access';
import type { ClauseSource, ClauseVariable } from '../../provenance/types';

/*
  Provenance moved to `packages/bizrethink/provenance/` when the MCA vertical
  needed the same guard. It was never a lease concept — `assertPublishable`
  never looked at a lease — and a merchant-cash-advance package importing from a
  rental-lease package would have been worse than moving it.

  Re-exported here so every existing `lease/clauses/types` import keeps working.
  New code should import from `provenance/` directly.
*/
export type { ClauseSource, ClauseVariable } from '../../provenance/types';
export { assertPublishable } from '../../provenance/types';

/**
 * The narrow set of facts a clause may branch on. Deliberately small: a clause
 * that needs to know something not on this list is a signal that the answer
 * schema is missing a field, not a licence to reach into arbitrary state.
 */
export type ClauseFacts = {
  termMonths: number;
  /** Includes deposits carried in from a prior tenancy, not just newly collected. */
  depositHeldUsd: number;
  /** Advance rent held for the final month, from any tenancy. */
  advanceRentHeldUsd: number;
  /**
   * How much of the deposit and advance rent came from a PRIOR tenancy.
   * Selects the carried-forward clause variants — a new tenancy should not
   * carry a sentence explaining that $0.00 was carried over.
   */
  depositCarriedInUsd: number;
  advanceRentCarriedInUsd: number;
  propertyYearBuilt: number | null;
  petsPermitted: boolean;
  /**
   * Whether anyone beyond the signing tenants was named as an occupant.
   *
   * Derived, never asked: it is simply whether `authorisedOccupants` has
   * anything in it. It picks between the two occupancy clauses, so a lease
   * with nobody extra does not print "together with ." at the end of a
   * sentence.
   */
  hasNamedOccupants: boolean;
  hasHoa: boolean;
  /**
   * The property sits in a community development district (Ch. 190 Fla. Stat.).
   *
   * SEPARATE FROM `hasHoa` ON PURPOSE. A CDD is a unit of local government, not
   * the association: its assessments are usually non-ad valorem charges on the
   * tax bill, and a property can be in one, the other, both or neither. Folding
   * it into the association clause would print CDD language for every Florida
   * property with an HOA.
   */
  hasCdd: boolean;
  /**
   * Whether the landlord rents five or more individual dwelling units.
   *
   * §83.49(2) — the duty to notify the tenant in writing, within 30 days, of
   * where the deposit is held — closes with "This subsection does not apply to
   * any landlord who rents fewer than five individual dwelling units."
   *
   * Without this the library printed that duty for every landlord, which for
   * the single-property owner it is aimed at means volunteering an obligation
   * they do not owe and can then breach.
   */
  landlordRentsFiveOrMoreUnits: boolean;
  /** True when the term does not begin on the rent due day. */
  prorationApplies: boolean;

  /**
   * Load-bearing for maintenance. Fla. Stat. §83.51(2) permits the landlord's
   * obligations under that subsection to be altered in writing ONLY for a
   * single-family home or duplex. On any other property type the shifting
   * clauses are simply not available for selection.
   */
  propertyType: 'single-family' | 'duplex' | 'multi-family' | 'condo';
  hasPool: boolean;
  /**
   * Has any yard task been allocated to anybody?
   *
   * Replaced `landlordProvidesLawnService`, which decided the ALLOCATION as
   * well as the presence of the clause — off meant no clause at all, and a
   * yard nobody had been made responsible for. Derived in `hydrateMatter` from
   * `yardTasks`, never stored.
   */
  hasYardAllocation: boolean;

  /**
   * Has the TENANT been given anything outdoors?
   *
   * Separate from `hasYardAllocation` because it answers a different question.
   * A yard entirely maintained by the landlord or the association is fully
   * allocated, and there is nothing for the tenant to cure — so `hoa.cure`
   * would be an obligation with no subject.
   */
  hasTenantYardDuty: boolean;

  /**
   * Whether any pet money is actually charged.
   *
   * Derived from the fee values, not asked. With both at zero the pet
   * addendum printed "a pet fee of $0.00 and pet rent of $0.00 per month" —
   * two obligations to pay nothing, set out as operative terms.
   */
  hasPetFees: boolean;

  /**
   * Whether the landlord has stated anything their association's governing
   * documents require the lease itself to contain.
   *
   * Derived from the answer, not asked twice. `hasHoa` means the property has
   * AN association; it says nothing about what THAT association demands, and
   * gating on it alone is how one community's parking cap came to render on
   * every Florida lease.
   */
  hasHoaLeaseRequirements: boolean;

  /**
   * Whether the association's governing documents are actually attached.
   *
   * Separate from `hasHoaLeaseRequirements` and from `hasHoa` for the reason
   * that keeps recurring here: each is a different question. The receipt
   * addendum is a signed statement that the tenant RECEIVED these documents,
   * and a receipt for nothing is worse than no receipt at all.
   */
  hasHoaGoverningDocuments: boolean;

  /**
   * Whether a move-in condition report is attached to THIS tenancy.
   *
   * On the matter, never the property. A condition record describes one
   * tenancy at one moment; hung on the property it would be receipted into
   * every later lease as though the incoming tenant had agreed the outgoing
   * tenant's scuffs — and a deposit deduction rests on that record.
   */
  hasConditionReport: boolean;

  /*
    Elected terms. These are answers, not derived state — the landlord chooses
    them and the choice selects a clause. Kept on the facts object because
    `includeWhen` branching on an election is exactly what it is for.
  */
  lateFeePolicy: 'flat' | 'tiered';
  terminationOnSale: boolean;
  holdoverPenalty: boolean;
  /**
   * Fla. Stat. §83.595(4) makes an early termination fee available only where
   * the tenant elected it by signing a separate addendum. Electing it here is
   * what puts that addendum in the document.
   */
  earlyTerminationOffered: boolean;
  /**
   * Fla. Stat. §83.575 — a lease may require notice before vacating at term
   * end, but only if it reciprocally obliges the landlord, and only within
   * 30–60 days. Electing it selects that clause.
   */
  nonRenewalNoticeRequired: boolean;
  /**
   * Fla. Stat. §83.505 — email delivery of notices is lawful only under a
   * separate signed addendum. Electing it produces that addendum.
   */
  electronicNoticesElected: boolean;
};

export type Clause = {
  slug: string;
  version: number;
  /** 'US-FL' for Florida-specific, 'US' for federal. */
  jurisdiction: string;
  /**
   * Where the clause physically lands. `standalone-disclosure` matters legally:
   * Fla. Stat. §83.512 requires the flood disclosure to be its own document and
   * says it may not be folded into the lease body.
   */
  placement: 'lease-body' | 'addendum' | 'standalone-disclosure';
  /** Logical home in the document. Final numbering is derived from order. */
  section: string;
  sortKey: number;

  heading: string;
  body: string;

  source: ClauseSource;
  status: ClauseStatus;

  /** Statute that compels this clause, if any. Drives the citation chip. */
  requiredBy?: string;
  /** Null means always include. */
  includeWhen: ((facts: ClauseFacts) => boolean) | null;
  variables: ClauseVariable[];
  /** Slugs this clause replaces when both are selected. */
  supersedes: string[];
  /** Semantic tags, for duplicate-assertion detection. */
  asserts: string[];
};
