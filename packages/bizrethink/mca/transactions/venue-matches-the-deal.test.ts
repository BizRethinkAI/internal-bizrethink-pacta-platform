import { describe, expect, it } from 'vitest';
import { compileMcaTemplate } from '../templates/compile';
import { providerFixture } from '../templates/profile.fixture';
import { filledDraftFixture } from './draft.fixture';
import { fillMcaDraft } from './fill';

/**
 * A forum the merchant's own state fixes is not the funder's to choose.
 *
 * The profile refuses a funder forum for a programme that lists Virginia, but
 * `recipientStates` is the states a funder OFFERS into — the transaction layer
 * says in terms that it is "never a determination of merchant nexus". So a
 * funder serving Florida only, with its own forum, could still sign a Virginia
 * merchant. Va. Code §6.2-2234(A) makes that forum unenforceable, and until now
 * the only thing in the way was a sentence inside the clause body.
 *
 * The merchant's principal-place state also had no field of its own: both venue
 * clauses name it, and it lived inside a free-text address where nothing could
 * read it.
 */
const funderVenueTemplate = () => {
  const base = providerFixture();
  return compileMcaTemplate({
    ...base,
    buyer: { ...base.buyer, venueState: 'Florida', venueCounty: 'Pasco County' },
    policy: { ...base.policy, venueRule: 'funder-state', recipientStates: ['US-FL'] },
  });
};

const draftIn = (template: ReturnType<typeof compileMcaTemplate>, principalState: string) => {
  const { input } = filledDraftFixture();
  return fillMcaDraft(template, {
    ...input,
    values: { ...input.values, 'merchant.principalState': principalState },
  });
};

describe('a deal cannot take a funder forum into a state that fixes its own', () => {
  it('blocks a Virginia merchant under a funder-forum template', () => {
    const draft = draftIn(funderVenueTemplate(), 'Virginia');

    expect(draft.blockers.map((blocker) => blocker.kind)).toContain('venue-conflict');
  });

  it('leaves a Florida merchant under the same template alone', () => {
    const draft = draftIn(funderVenueTemplate(), 'Florida');

    expect(draft.blockers.map((blocker) => blocker.kind)).not.toContain('venue-conflict');
  });

  it('never raises the conflict under a merchant-state template', () => {
    const draft = draftIn(compileMcaTemplate(providerFixture()), 'Virginia');

    expect(draft.blockers.map((blocker) => blocker.kind)).not.toContain('venue-conflict');
  });

  it('collects the principal-place state both venue clauses name', () => {
    const draft = draftIn(compileMcaTemplate(providerFixture()), 'Florida');
    const fields = draft.documents.flatMap((document) => document.items).flatMap((item) => item.fields);

    expect(fields.map((field) => field.binding)).toContain('merchant.principalState');
  });
});
