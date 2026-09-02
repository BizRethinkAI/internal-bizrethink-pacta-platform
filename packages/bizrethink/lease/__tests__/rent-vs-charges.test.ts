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

/*
  THE HALF-DONE SPLIT.

  Separating rent from Other Charges in the statutory-notices clause was only
  half the job. Six clauses went on calling their own charge "additional rent" —
  the late fee, the returned-payment charge, the association fine pass-through,
  the association cure cost, and the pet fee and pet rent. Rendered together the
  lease said, of the same $150, both "this is additional rent" and "sums other
  than the monthly rent are Other Charges and are not rent".

  A lease that contradicts itself about whether a charge is rent is worse than
  either version alone: the contradiction is resolved against the drafter, and
  it is resolved in whichever direction hurts at the time.

  One exception, and it must stay: the §83.595(4) addendum reproduces statutory
  language including the phrase "additional rent". That text is prescribed and
  is not ours to tidy.
*/
describe('every clause agrees about what rent is', () => {
  const bodies = FL_LIBRARY.filter((c) => c.slug !== 'termination.early-election').map((c) => ({
    slug: c.slug,
    body: c.body,
  }));

  it('no clause outside the statutory addendum calls a charge additional rent', () => {
    const offenders = bodies.filter((c) => /additional rent/i.test(c.body)).map((c) => c.slug);

    expect(offenders).toEqual([]);
  });

  it('leaves the statutory election text alone', () => {
    // Prescribed wording. Tidying it would break "substantially the form".
    const election = FL_LIBRARY.find((c) => c.slug === 'termination.early-election');

    expect(election?.body).toMatch(/additional rent beyond the month/i);
  });

  it('names the charges as Other Charges where it used to say rent', () => {
    const lateFee = FL_LIBRARY.find((c) => c.slug === 'rent.late-fee-flat');

    expect(lateFee?.body).toMatch(/Other Charge/);
  });
});
