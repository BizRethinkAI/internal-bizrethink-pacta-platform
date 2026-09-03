import { describe, expect, it } from 'vitest';

import { FL_LIBRARY } from '../clauses/us-fl';

const body = (slug: string) => FL_LIBRARY.find((c) => c.slug === slug)?.body ?? '';

/*
  §83.595(4) PRESCRIBES AN ELECTION, AND AN ELECTION NEEDS TWO OPTIONS.

  Read off the statute on 2 September 2026:
  https://www.flsenate.gov/Laws/Statutes/2025/0083.595

  The statute requires a separate addendum "containing a provision in
  substantially the following form", and that form has TWO checkboxes:

    ☐ I agree ... to pay $___ as liquidated damages or an early termination fee
    ☐ I do not agree to liquidated damages or an early termination fee

  We shipped only the first. A document offering one option is not a choice —
  it is a term. If the election fails, the landlord loses the liquidated-damages
  remedy entirely and drops back to §83.595(1)-(3) actual damages with a duty to
  mitigate. On this tenancy that is $13,800.

  "Substantially" is a safe harbour, so the wording need not be character-exact.
  The STRUCTURE is not the wording: two options and a way to pick between them
  is what makes it an election at all.
*/
describe('the early-termination addendum offers a real election', () => {
  const addendum = () => body('termination.early-election');

  it('carries both statutory options', () => {
    expect(addendum()).toMatch(/I agree, as provided in the rental agreement, to pay/);
    expect(addendum()).toMatch(/I do not agree to liquidated damages or an early termination fee/i);
  });

  it('gives the tenant something to mark', () => {
    // Two selectable boxes, not prose describing a choice.
    expect((addendum().match(/\[ \]/g) ?? []).length).toBe(2);
  });

  it('states the consequence of declining, as the statute does', () => {
    expect(addendum()).toMatch(/damages as provided by law|seek damages/i);
  });

  it('keeps the landlord waiver that pairs with agreeing', () => {
    expect(addendum()).toMatch(/additional rent beyond the month in which Landlord retakes possession/);
  });

  it('still says the fee is payable and separate from the money already held', () => {
    expect(addendum()).toMatch(/payable on the termination date/i);
    expect(addendum()).toMatch(/is not the security deposit/i);
  });

  it('still prevails over the body', () => {
    expect(addendum()).toMatch(/This Addendum prevails/);
  });
});
