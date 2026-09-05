import { describe, expect, it } from 'vitest';

import { FL_LIBRARY } from '../clauses/us-fl';

/**
 * Clauses that said something Florida does not permit, or asserted something
 * the library cannot know.
 *
 * All four came out of two independent adversarial reviews of a real lease, and
 * each was checked against the statute text before being accepted — one review
 * finding was rejected on that check, which is why these are pinned by what the
 * statute actually says rather than by what a reviewer said about it.
 */

const clause = (slug: string) => {
  const found = FL_LIBRARY.find((c) => c.slug === slug);
  if (!found) {
    throw new Error(`${slug} is missing`);
  }
  return found;
};

describe('general.waiver and Fla. Stat. §83.56(5)', () => {
  /*
    §83.56(5): a landlord who accepts rent with actual knowledge of a
    noncompliance WAIVES the right to terminate or sue for that noncompliance.
    The clause said the opposite in terms — "acceptance of a payment with
    knowledge of a breach is not a waiver of that breach" — and §83.47(1)(a)
    voids a provision purporting to waive a right conferred by the part.

    A clause that is void is worse than no clause: it is the one a tenant's
    lawyer reads aloud to show the lease overreaches.
  */
  it('does not claim that accepting rent preserves a known breach', () => {
    const { body } = clause('general.waiver');

    expect(body).not.toMatch(/acceptance of a payment with knowledge of a breach is not a waiver/i);
  });

  it('defers to the statute, and says which one', () => {
    const { body } = clause('general.waiver');

    expect(body).toMatch(/83\.56\(5\)/);
    // The right that survives is for SUBSEQUENT or CONTINUING noncompliance,
    // which is the carve-out the statute itself makes.
    expect(body).toMatch(/subsequent or continuing/i);
  });
});

describe('access.entry and Fla. Stat. §83.53(1)', () => {
  /*
    §83.53(1)'s exhibition list is closed: "prospective or actual purchasers,
    mortgagees, tenants, workers, or contractors". An insurer is not on it, and
    a lease cannot add to a statutory list of people a tenant must admit.
  */
  it('shows the premises only to those §83.53(1) names', () => {
    const { body } = clause('access.entry');

    expect(body).not.toMatch(/insurer/i);
  });
});

describe('the §83.49 holding requirements', () => {
  /*
    §83.49(1)(a) requires a SEPARATE non-interest-bearing account and says the
    landlord "shall not commingle such moneys with any other funds". The clause
    named the bank and said the account bears no interest — two of the three.
  */
  it('states the deposit account is separate and not commingled', () => {
    const { body } = clause('deposit.held');

    expect(body).toMatch(/separate/i);
    expect(body).toMatch(/commingle/i);
  });

  /*
    §83.49(1) opens "as security for performance of the rental agreement OR AS
    ADVANCE RENT". Advance rent for other than the next immediate rental period
    is held the same way a deposit is. The clause described what the advance
    rent is for and never said where it sits.
  */
  it('says where the advance rent is held, because the statute covers it too', () => {
    const { body } = clause('deposit.advance-rent');

    expect(body).toMatch(/83\.49/);
    expect(body).toMatch(/held/i);
  });
});

describe('hoa.lease-requirements does not certify itself', () => {
  /*
    THE WORST OF THE FOUR, and self-inflicted. The clause read "require this
    Lease to include the following, and it does:" followed by whatever the
    landlord typed. On the real lease that list included "the entire Lot and the
    associated garage" and "no more than two parking spaces" — neither of which
    appeared anywhere else in the document. The lease certified compliance it
    did not deliver, on the one document an association manager checks.

    "and it does" is an assertion about the whole document that a single clause
    cannot possibly verify. The fix is to stop asserting and start binding: the
    requirements are agreed AS TERMS, so the lease contains them by
    construction rather than by claim.
  */
  it('makes the requirements terms rather than a claim about the document', () => {
    const { body } = clause('hoa.lease-requirements');

    expect(body).not.toMatch(/and it does/i);
    expect(body).toMatch(/agree/i);
  });
});
