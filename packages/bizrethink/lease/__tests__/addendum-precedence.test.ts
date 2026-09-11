import { describe, expect, it } from 'vitest';

import { FL_LIBRARY } from '../clauses/us-fl';

const clause = (slug: string) => FL_LIBRARY.find((c) => c.slug === slug);

/*
  WHICH DOCUMENT WINS.

  The integration clause says the BODY prevails over an addendum unless the
  addendum says otherwise. Two addenda carry terms that only work if they
  survive that rule, and neither said otherwise:

    - The §83.595(4) addendum carries the landlord's half of the statutory
      bargain, waiving additional rent beyond the month possession is retaken.
      The body preserves the landlord's remedies. Body wins, and the election
      the addendum exists to record may collapse — taking the early-termination
      fee with it.

    - The pet addendum carries the assistance-animal carve-out. The body caps
      occupancy. Body wins, and a Fair Housing accommodation is overridden by a
      clause that never mentions it.

  One sentence each. The rule is easy to state and easy to get backwards, so it
  is asserted rather than trusted.
*/
describe('an addendum that must outrank the body says so', () => {
  const PREVAILS = /this addendum prevails/i;

  it.each([
    ['termination.early-election', 'the §83.595(4) election'],
    ['pets.addendum', 'the assistance-animal carve-out'],
  ])('%s says it prevails, because it carries %s', (slug) => {
    const found = clause(slug);

    expect(found).toBeDefined();
    expect(found?.body).toMatch(PREVAILS);
  });

  /*
    AND THE DEFAULT NOW AGREES WITH THEM.

    The two sentences above were written as exceptions to a body-wins rule.
    That rule was the wrong way round: an addendum is the specific, separately
    negotiated, separately signed term, and the specific governs the general.
    Reversing it made every addendum carrying real rights responsible for
    remembering to claim them back — and the two cases above are what happens
    when one forgets.

    The explicit sentences stay. They are redundant against this default and
    that is fine: they are what a reader of the addendum alone sees.
  */
  it('makes the addendum prevail by default', () => {
    const body = clause('general.entire-agreement')?.body ?? '';

    expect(body).toMatch(/the addendum prevails/i);
    expect(body).not.toMatch(/the body prevails/i);
  });
});
