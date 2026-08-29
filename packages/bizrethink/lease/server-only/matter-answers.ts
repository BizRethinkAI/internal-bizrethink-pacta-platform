import type { CustomClauseInput } from '../clauses/custom';
import { deriveFacts } from '../interview/derive-facts';
import type { LeasePartyInput } from '../parties/derive-parties';
import { derivePartyValues, toLeaseParties } from '../parties/derive-parties';
import type { InterpolationValue } from '../render/interpolate';
import type { RenderLeaseInput } from '../render/render-lease';
import type { LeaseParty } from '../render/signature-blocks';

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
};

export type HydratedMatter = {
  facts: RenderLeaseInput['facts'];
  money: Parameters<typeof deriveFacts>[0];
  values: Record<string, InterpolationValue>;
  parties: LeaseParty[];
  partyInputs: LeasePartyInput[];
  customClauses: CustomClauseInput[];
};

export const hydrateMatter = (matter: StoredMatter): HydratedMatter => {
  const money = matter.money as Parameters<typeof deriveFacts>[0];
  const values = (matter.values ?? {}) as Record<string, InterpolationValue>;
  const facts = (matter.facts ?? {}) as Record<string, unknown>;

  // Rows created before the parties column default to `[]`; a null is also
  // tolerated so an old matter still loads and its parties step can be filled.
  const partyInputs = (matter.parties ?? []) as LeasePartyInput[];

  const endDate = String(values.endDate ?? money.term.startDate);

  return {
    facts: { ...facts, ...deriveFacts(money, endDate) } as RenderLeaseInput['facts'],
    money,
    values: {
      ...values,
      rentDueDay: money.rent.dueDayOfMonth,
      monthlyRentUsd: money.rent.monthlyUsd,
      // Last, so a stale stored copy of either name cannot win.
      ...derivePartyValues(partyInputs),
    },
    parties: toLeaseParties(partyInputs),
    partyInputs,
    customClauses: (matter.customClauses ?? []) as CustomClauseInput[],
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
