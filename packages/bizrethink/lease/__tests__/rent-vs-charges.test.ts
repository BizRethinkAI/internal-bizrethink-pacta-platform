import { describe, expect, it } from 'vitest';

import { FL_LIBRARY } from '../clauses/us-fl';

const clause = (slug: string) => FL_LIBRARY.find((c) => c.slug === slug);

/*
  WHAT COUNTS AS RENT.

  One sentence at the end of the statutory-notices clause said "All sums payable
  by Tenant under this Lease are additional rent." It converted every charge in
  the document — late fees, returned payments, association fines passed through
  without a cap — into rent recoverable by a three-day notice.

  It cuts against the landlord at least as hard. A §83.56(3) notice demanding
  rent PLUS a disputed charge materially overstates the rent, and a materially
  overstated notice is defective: the eviction is dismissed and started again.
  §83.56(2) already supplies the route for everything that is not rent.
*/
describe('rent is rent, and a charge is a charge', () => {
  const notices = () => clause('default.statutory-notices')?.body ?? '';

  it('does not sweep every sum into rent', () => {
    expect(notices()).not.toMatch(/all sums payable by tenant[^.]*are additional rent/i);
  });

  it('still states both statutory notice routes', () => {
    // The clause's real job. §83.56(3) for rent, §83.56(2) for everything else.
    expect(notices()).toMatch(/§83\.56\(3\)/);
    expect(notices()).toMatch(/§83\.56\(2\)/);
  });

  it('says which route a non-rent charge takes', () => {
    expect(notices()).toMatch(/§83\.56\(2\)/);
    expect(notices()).toMatch(/not rent|other charges/i);
  });

  it('applies a payment to rent before charges', () => {
    // Without this, a partial payment is eaten by fees and manufactures a rent
    // default out of a dispute about $45.
    expect(notices()).toMatch(/applied first to rent|first to rent/i);
  });
});
