import { describe, expect, it } from 'vitest';

import { FL_LIBRARY } from '../clauses/us-fl';

const clause = (slug: string) => FL_LIBRARY.find((c) => c.slug === slug);
const body = (slug: string) => clause(slug)?.body ?? '';

/*
  THE $6,900 WITH NO WAY HOME.

  Advance rent is defined as covering "the final month of the term" and may not
  be applied to any other month. Termination on sale says prepaid rent is "dealt
  with under the sections of this Lease governing them" — and the only such
  section, deposit.return, governs THE DEPOSIT and never mentions advance rent.

  So on any early end — the landlord selling, or the tenant paying the
  §83.595(4) fee — there is no final month for the money to cover and no clause
  returning it. Read literally the landlord keeps $6,900 earmarked for a month
  that will never exist.
*/
describe('advance rent lands on a month that exists', () => {
  /*
    It used to cover "the final month of the TERM" — March 2028 specifically.
    Leave in month 8 and that month never arrives, so the money was stranded:
    barred from any other month, and returned by no clause.

    "The last month of Tenant's occupancy" removes the problem at its source
    rather than patching it with a refund. However the tenancy ends, there is
    always a last month for the money to land on. It also matches what tenants
    already assume they are paying for.
  */
  it('covers the last month lived in, not a date on the calendar', () => {
    for (const slug of ['deposit.advance-rent', 'deposit.advance-rent-carried']) {
      expect(body(slug)).toMatch(/last month of Tenant's occupancy/i);
      expect(body(slug)).not.toMatch(/final month of the term/i);
    }
  });

  it('still refunds it if the tenancy ends before any final month is occupied', () => {
    // The narrow case that remains: money paid, tenant never takes a last month.
    for (const slug of ['deposit.advance-rent', 'deposit.advance-rent-carried']) {
      expect(body(slug)).toMatch(/in full/i);
      expect(body(slug)).toMatch(/15 days/);
    }
  });

  it('keeps it out of the deposit-claim machinery', () => {
    // Advance rent is not a security deposit — the clause says so itself.
    expect(body('deposit.advance-rent')).toMatch(/not subject to any claim/i);
  });
});

/*
  THE THREE POTS.

  Advance rent, the security deposit and the §83.595(4) fee are three different
  obligations under two different statutes, and a lease that lets them blur
  invites the argument that the deposit was pre-converted into a fee — which
  would waive the tenant's §83.49(3) notice and objection rights, and §83.47(2)
  makes knowingly using a void provision fee-shifting.

  The fee is PAYABLE. The deposit goes back under §83.49. Saying so is cheap.
*/
describe('the early-termination fee is money paid, not money already held', () => {
  const addendum = () => body('termination.early-election');

  it('says when the fee is payable', () => {
    expect(addendum()).toMatch(/payable|shall pay/i);
  });

  it('says the deposit is not the fee', () => {
    expect(addendum()).toMatch(/not the security deposit|is not satisfied by the security deposit/i);
  });

  it('sends the deposit back through the statute', () => {
    expect(addendum()).toMatch(/§83\.49/);
  });

  it('says the advance rent still covers the last month lived in', () => {
    expect(addendum()).toMatch(/last month of Tenant's occupancy/i);
  });

  it('keeps the prescribed election wording intact', () => {
    // "Substantially the form" is not ours to improve.
    expect(addendum()).toMatch(/I agree, as provided in the rental agreement, to pay/);
    expect(addendum()).toMatch(/additional rent beyond the month in which Landlord retakes possession/);
  });
});

describe('one obligation, stated once', () => {
  /*
    "Tenant shall give Landlord a forwarding address on vacating" appeared in
    three clauses in near-identical words. The duplicate detector keys on
    `asserts` tags rather than content, so three different tags made it blind to
    the repetition. In a document with an integration clause, saying the same
    thing three times invites an argument about which one governs.
  */
  it('states the forwarding address once, where the deposit is returned', () => {
    const saying = FL_LIBRARY.filter((c) => /forwarding address/i.test(c.body)).map((c) => c.slug);

    expect(saying).toEqual(['deposit.return']);
  });
});

describe('house rules do not fight the lease body', () => {
  /*
    Rule 10 banned installing any "exhaust fan" while clause 10.3 REQUIRES the
    tenant to use extractor fans when bathing or cooking. An extractor fan is an
    exhaust fan. The rule is about window units, so say window units.

    It also left a tenant with no lawful stopgap during a central-AC failure in
    a Tampa August, which turns a broken air conditioner into a §83.51 dispute.
  */
  it('bans window units, not the fans the lease requires', () => {
    const rules = body('rules.house-rules');

    expect(rules).not.toMatch(/window fan or exhaust fan/i);
    expect(rules).toMatch(/window-mounted/i);
  });

  it('allows a temporary unit while the central system is down', () => {
    expect(body('rules.house-rules')).toMatch(/except temporarily|while the central/i);
  });
});

describe('the insurance clause asks for something a carrier will issue', () => {
  /*
    "Interested party" is not a standard designation. Carriers write "additional
    insured" or "additional interested party", and many will not add a landlord
    as additional insured on a renter's LIABILITY policy at all. Because evidence
    of cover is a condition of taking possession, a carrier's refusal blocks the
    move-in.
  */
  it('uses a designation carriers recognise, and does not require the impossible', () => {
    const text = body('insurance.renters');

    expect(text).toMatch(/additional interested party/i);
    expect(text).toMatch(/where Tenant's insurer offers/i);
  });
});

describe('the pet addendum does not print a fee of nothing', () => {
  /*
    With no pet fee and no pet rent the addendum rendered "a pet fee of $0.00
    and pet rent of $0.00 per month" — two obligations to pay nothing, printed
    as operative terms, which reads as a schedule waiting to be filled in.
  */
  const withFees = clause('pets.addendum-fees');
  const noFees = clause('pets.addendum');

  it('has a variant for each case', () => {
    expect(withFees).toBeDefined();
    expect(noFees).toBeDefined();
  });

  it('only the fee variant mentions a fee', () => {
    expect(withFees?.body).toMatch(/pet fee of/i);
    expect(noFees?.body).not.toMatch(/pet fee of/i);
  });

  it('they are mutually exclusive', () => {
    expect(withFees?.includeWhen?.({ petsPermitted: true, hasPetFees: true } as never)).toBe(true);
    expect(noFees?.includeWhen?.({ petsPermitted: true, hasPetFees: true } as never)).toBe(false);
    expect(withFees?.includeWhen?.({ petsPermitted: true, hasPetFees: false } as never)).toBe(false);
    expect(noFees?.includeWhen?.({ petsPermitted: true, hasPetFees: false } as never)).toBe(true);
  });

  it('both keep the assistance-animal carve-out and the precedence sentence', () => {
    for (const variant of [withFees, noFees]) {
      expect(variant?.body).toMatch(/assistance animal/i);
      expect(variant?.body).toMatch(/This Addendum prevails/);
    }
  });

  it('does not run two sentences together', () => {
    // Shipped as "...applies to it.This Addendum prevails..." — no space.
    for (const variant of [withFees, noFees]) {
      expect(variant?.body).not.toMatch(/[a-z]\.[A-Z]/);
    }
  });
});
