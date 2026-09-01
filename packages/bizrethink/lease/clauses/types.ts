import type { ClauseStatus } from '../../server-only/feature-access';

/**
 * Where a clause's words came from.
 *
 * This is a provenance record, not a label. Two of the four variants below
 * carry legal weight — statutory text must be reproduced exactly, and
 * Supreme-Court-approved form text is the strongest available answer to the
 * unauthorized-practice-of-law question because those forms exist precisely so
 * that non-lawyers may complete them.
 *
 * Note what is NOT representable here: there is no variant for text lifted
 * from someone else's lease. The executed Zillow and First In Property
 * Management leases for this property are a REQUIREMENTS INVENTORY — they tell
 * us which terms the deal needs — but their prose is the copyrighted work
 * product of Zillow and of First In's forms vendor. Making that unrepresentable
 * in the type is cheaper than remembering not to do it.
 */
export type ClauseSource =
  | {
      kind: 'statute';
      /** e.g. 'Fla. Stat. §404.056(5)'. */
      citation: string;
      /**
       * True when the statute prescribes exact words and a paraphrase does not
       * satisfy it. Such clauses must never be edited for tone or length.
       */
      verbatimRequired: boolean;
      /**
       * ISO date on which the text was last checked against the current
       * statute. Null means unverified — see `assertPublishable`.
       */
      verbatimVerifiedAt: string | null;
    }
  | {
      kind: 'court-approved-form';
      /** e.g. 'RLHD-3x Rev 7/16'. */
      form: string;
      citation: string;
    }
  | {
      kind: 'attorney-drafted';
      /** Name and bar number. Null until the engagement happens. */
      author: string | null;
    }
  | {
      kind: 'customer-authored';
    };

export type ClauseVariable = {
  name: string;
  type: 'string' | 'number' | 'usd' | 'date' | 'boolean';
  label: string;
  required: boolean;
};

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

/**
 * Guard for the second lock. A clause may only reach `published` — i.e. become
 * renderable for an organisation that is not BizRethink-internal — once its
 * provenance actually supports that.
 *
 * Statutory text needs a verification date, because a statute that has been
 * amended silently invalidates a clause that still quotes the old wording.
 * Attorney-drafted text needs a named author. This is the mechanism that stops
 * unreviewed language reaching a third party; see `feature-access.ts`.
 */
export const assertPublishable = (clause: Clause): string[] => {
  const problems: string[] = [];

  if (clause.status !== 'published') {
    return problems;
  }

  if (clause.source.kind === 'statute' && clause.source.verbatimVerifiedAt === null) {
    problems.push(`${clause.slug}: statutory text published without a verification date`);
  }

  if (clause.source.kind === 'attorney-drafted' && clause.source.author === null) {
    problems.push(`${clause.slug}: attorney-drafted text published without a named reviewer`);
  }

  if (clause.source.kind === 'customer-authored') {
    problems.push(`${clause.slug}: customer-authored text can never be published to the shared library`);
  }

  return problems;
};
