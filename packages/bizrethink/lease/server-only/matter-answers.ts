import type { CustomClauseInput } from '../clauses/custom';
import { deriveFacts } from '../interview/derive-facts';
import { propertyTypeLabelFor } from '../interview/property-type';
import type { LeasePartyInput } from '../parties/derive-parties';
import { derivePartyValues, toLeaseParties } from '../parties/derive-parties';
import type { InterpolationValue } from '../render/interpolate';
import type { RenderLeaseInput } from '../render/render-lease';
import type { LeaseParty } from '../render/signature-blocks';
import type { UtilityRow } from '../utilities/derive-utilities';
import { splitByPayer } from '../utilities/derive-utilities';
import type { YardTask } from '../yard/derive-yard';
import { renderYardDuties, splitByDoer } from '../yard/derive-yard';

/**
 * A stored matter, turned back into a full answer set.
 *
 * WHY THIS IS ONE FUNCTION. The mapping used to be written twice — once in the
 * tRPC router and once in the preview route — and the copies drifted the moment
 * the party list landed. The preview kept building its signers from
 * `values.landlordNames`, which is now DERIVED from the party list rather than
 * stored, so every preview rendered "LANDLORD — TO BE CONFIRMED" regardless of
 * who was actually signing.
 *
 * With the review loop there is now a third caller: the reviewer's copy. A
 * reviewer reading a different document from the one the landlord previewed
 * would defeat the entire point of a review, so all three read from here.
 *
 * EVERYTHING DERIVABLE IS RE-DERIVED, never read back. A stored derived value
 * is a value that can go stale, and a lease whose summary disagrees with its
 * own clauses is the precise defect this feature exists to prevent.
 */

export type StoredMatter = {
  facts: unknown;
  money: unknown;
  values: unknown;
  customClauses: unknown;
  parties: unknown;
  yardTasks?: unknown;
  /**
   * The PROPERTY's utility rows, passed in by the caller.
   *
   * Not on the matter. Which company supplies the electricity at an address
   * does not change between tenancies, so it is recorded once on the property
   * and read live from here — there is nothing order-dependent about it and
   * nothing signed positionally, so unlike the party list it has no reason to
   * be frozen at creation.
   */
  propertyUtilities?: unknown;
};

export type HydratedMatter = {
  facts: RenderLeaseInput['facts'];
  money: Parameters<typeof deriveFacts>[0];
  values: Record<string, InterpolationValue>;
  parties: LeaseParty[];
  partyInputs: LeasePartyInput[];
  customClauses: CustomClauseInput[];
  yardTasks: YardTask[];
};

export const hydrateMatter = (matter: StoredMatter): HydratedMatter => {
  /*
    Shaped rather than trusted. `ZAnswers.money` is a bare record, so
    `matter.create` accepts `money: {}` — and every read of that row then threw
    on `money.term.startDate`, taking out `get`, `validate`, `send` and both PDF
    routes. An unrenderable matter, reachable through an ordinary authenticated
    procedure, and the two lines below already guarded `facts` and `values` the
    same way.
  */
  const stored = (matter.money ?? {}) as Record<string, unknown>;
  const money = {
    ...stored,
    rent: { monthlyUsd: null, dueDayOfMonth: 1, ...((stored.rent ?? {}) as object) },
    term: { startDate: null, ...((stored.term ?? {}) as object) },
    deposit: {
      securityUsd: null,
      alreadyHeldUsd: 0,
      advanceRentUsd: null,
      advanceRentHeldUsd: 0,
      prepaidRentUsd: 0,
      ...((stored.deposit ?? {}) as object),
    },
    prorationMethod: stored.prorationMethod ?? 'actual-days-in-month',
  } as unknown as Parameters<typeof deriveFacts>[0];
  const values = (matter.values ?? {}) as Record<string, InterpolationValue>;
  const facts = (matter.facts ?? {}) as Record<string, unknown>;

  // Rows created before the parties column default to `[]`; a null is also
  // tolerated so an old matter still loads and its parties step can be filled.
  const partyInputs = (matter.parties ?? []) as LeasePartyInput[];

  // Same tolerance, for matters stored before the yard column existed.
  const yardTasks = (matter.yardTasks ?? []) as YardTask[];
  const yardDuties = renderYardDuties(yardTasks);

  const utilities = splitByPayer((matter.propertyUtilities ?? []) as UtilityRow[]);

  const endDate = String(values.endDate ?? money.term.startDate);

  return {
    facts: {
      ...facts,
      ...deriveFacts(money, endDate),
      /*
        Derived rather than asked. It is only "did they name anybody else?",
        and asking it as a separate question would be asking the answerer to
        keep two fields in step for no reason.
      */
      /*
        "Is anything allocated", not "are there rows". A row nobody has been
        given is not an allocation, and gating on the row count would render
        the clause with no duties inside it.
      */
      hasYardAllocation: Object.values(splitByDoer(yardTasks)).some((side) => side !== ''),
      // Narrower, and it gates hoa.cure: a yard the landlord or the
      // association keeps is fully allocated with nothing for a tenant to cure.
      hasTenantYardDuty: splitByDoer(yardTasks).tenant !== '',
    } as RenderLeaseInput['facts'],
    money,
    values: {
      ...values,
      rentDueDay: money.rent.dueDayOfMonth,
      monthlyRentUsd: money.rent.monthlyUsd,
      // Last, so a stale stored copy of either name cannot win.
      ...derivePartyValues(partyInputs),
      /*
        DERIVED, not the snapshot taken at matter creation.

        `propertyTypeLabel` sat in DERIVED_VALUES but was written once by
        `seedMatterFromProperty` and never recomputed, while `propertyType` is
        editable on the confirm-the-property step whose own intro invites
        changing it. Correcting condo to single-family therefore selected
        `maintenance.shift-single-family` while its body still read "The
        Premises are a condo. As permitted by Fla. Stat. §83.51(2)…" — the
        clause contradicting its own statutory basis, in a document that
        rendered clean.

        The old label was also `propertyType.replace('-', ' ')`, so the correct
        path printed "The Premises are a single family."
      */
      propertyTypeLabel: propertyTypeLabelFor(String(facts.propertyType ?? '')),
      // Likewise: the rows are the answer, the prose is only their rendering.
      yardDuties,
      /*
        Also last, and for the reason the party names are. These were SEEDED
        into `values` at creation and then editable as two free-text boxes, so
        a matter created before its property had utilities kept two empty
        required boxes forever, and the two boxes could be edited into
        disagreeing with each other.
      */
      tenantUtilities: utilities.tenant,
      landlordUtilities: utilities.landlord,
    },
    parties: toLeaseParties(partyInputs),
    partyInputs,
    customClauses: (matter.customClauses ?? []) as CustomClauseInput[],
    yardTasks,
  };
};

/** The exact input `renderLease` wants, for any caller that needs the PDF. */
export const renderInputForMatter = (matter: StoredMatter): RenderLeaseInput => {
  const hydrated = hydrateMatter(matter);

  return {
    facts: hydrated.facts,
    money: hydrated.money,
    values: hydrated.values,
    parties: hydrated.parties,
    propertyAddress: String(hydrated.values.propertyAddress ?? ''),
    customClauses: hydrated.customClauses,
  };
};
