import type { CustomClauseInput } from '../clauses/custom';
import { deriveFacts } from '../interview/derive-facts';
import type { LeasePartyInput } from '../parties/derive-parties';
import { derivePartyValues, toLeaseParties } from '../parties/derive-parties';
import type { InterpolationValue } from '../render/interpolate';
import type { RenderLeaseInput } from '../render/render-lease';
import type { LeaseParty } from '../render/signature-blocks';
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
  const money = matter.money as Parameters<typeof deriveFacts>[0];
  const values = (matter.values ?? {}) as Record<string, InterpolationValue>;
  const facts = (matter.facts ?? {}) as Record<string, unknown>;

  // Rows created before the parties column default to `[]`; a null is also
  // tolerated so an old matter still loads and its parties step can be filled.
  const partyInputs = (matter.parties ?? []) as LeasePartyInput[];

  // Same tolerance, for matters stored before the yard column existed.
  const yardTasks = (matter.yardTasks ?? []) as YardTask[];
  const yardDuties = renderYardDuties(yardTasks);

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
      hasNamedOccupants: String((values as Record<string, unknown>).authorisedOccupants ?? '').trim() !== '',
      /*
        "Is anything allocated", not "are there rows". A row nobody has been
        given is not an allocation, and gating on the row count would render
        the clause with no duties inside it.
      */
      hasYardAllocation: Object.values(splitByDoer(yardTasks)).some((side) => side !== ''),
    } as RenderLeaseInput['facts'],
    money,
    values: {
      ...values,
      rentDueDay: money.rent.dueDayOfMonth,
      monthlyRentUsd: money.rent.monthlyUsd,
      // Last, so a stale stored copy of either name cannot win.
      ...derivePartyValues(partyInputs),
      // Likewise: the rows are the answer, the prose is only their rendering.
      yardDuties,
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
