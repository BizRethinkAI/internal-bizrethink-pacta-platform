import { describe, expect, it } from 'vitest';

import { deriveFacts } from '../interview/derive-facts';
import { US_FL } from '../rule-packs/us-fl';
import { FL_NON_WAIVABLE } from '../rule-packs/us-fl-non-waivable';

/*
  STATUTORY FIGURES THAT MOVED.

  Every number in a rule pack is a claim about a statute, and a statute can be
  amended under a comment that still reads confidently. §83.53(2) said TWELVE
  hours until the 2013 landlord-tenant act raised it to TWENTY-FOUR. The old
  figure sat in the pack, in the pack's doc comment, and in the clause file
  header — three confident assertions, all of the repealed number — while the
  blocking validator fired only BELOW twelve and so blessed twelve on every
  Florida lease the product generated.

  It survived because the checked-in fixture uses 24. The fixture was safe and
  the live matter was not, so no test ever saw the wrong value.

  These assertions pin the figures themselves, not a lease that happens to use
  them.
*/
describe('the Florida rule pack states the current statutory figures', () => {
  it('requires 24 hours notice before entry, not the pre-2013 twelve', () => {
    expect(US_FL.access.minNoticeHours).toBe(24);
  });

  it('still sets the entry window at the statutory reasonable hours', () => {
    // 7:30am is deliberately not rounded to 8 — the statute says 7:30.
    expect(US_FL.access.earliestHour).toBe(7.5);
    expect(US_FL.access.latestHour).toBe(20);
  });
});

/*
  AN EXCULPATORY CLAUSE DOES NOT ANNOUNCE ITSELF.

  §83.47(1)(b) voids a provision limiting the landlord's liability arising under
  law, and §83.47(2) lets the tenant recover damages AND fees where the landlord
  knowingly uses one. The signal list matched the formulas a drafter reaches for
  when they know what they are doing — "shall not be liable", "disclaims any
  liability" — and missed the one a drafter reaches for when they do not.

  "at their own risk" was in our own pool clause.
*/
describe('the void-provision signals catch the ordinary formulas', () => {
  const liability = FL_NON_WAIVABLE.find((rule) => rule.id === 'non-waivable.liability');

  const caught = (text: string) => (liability?.waiverSignals ?? []).some((signal) => signal.test(text));

  it('has a liability rule at all', () => {
    expect(liability).toBeDefined();
  });

  it.each([
    "Tenant and Tenant's guests use the pool at their own risk.",
    'Guests use the equipment at his own risk.',
    'The tenant assumes all risk of injury arising from the pool.',
    'Tenant assumes any risk arising from use of the premises.',
  ])('catches %j', (text) => {
    expect(caught(text)).toBe(true);
  });

  it.each([
    "Landlord shall not be liable for any loss of the tenant's property.",
    'Landlord disclaims all liability for personal injury.',
  ])('still catches the formulas it always caught: %j', (text) => {
    expect(caught(text)).toBe(true);
  });

  it('does not fire on ordinary risk language that gives nothing up', () => {
    // A clause allocating who insures against a risk is not a waiver of it.
    expect(caught("Tenant shall insure against the risk of damage to Tenant's own property.")).toBe(false);
  });
});

/*
  A TERM LENGTH DECIDES WHETHER A STATUTORY DISCLOSURE RENDERS.

  §83.512 requires the flood disclosure on a lease of a year or longer, so
  monthsBetween is not arithmetic — it is the gate on a statutory document. It
  returned eleven for the twelve-month example written in its own comment, and a
  plain one-year lease therefore shipped with no flood disclosure and nothing
  saying so.
*/
describe('term length, which gates the flood disclosure', () => {
  const months = (startDate: string, endDate: string) =>
    deriveFacts(
      {
        rent: { monthlyUsd: 6900, dueDayOfMonth: 1 },
        term: { startDate },
        deposit: {
          securityUsd: 6900,
          advanceRentUsd: 6900,
          alreadyHeldUsd: 0,
          prepaidRentUsd: 0,
          advanceRentHeldUsd: 0,
        },
        prorationMethod: 'actual-days-in-month',
      } as never,
      endDate,
    ).termMonths;

  it('counts a lease ending the day before its anniversary as a full year', () => {
    // The example in the function's own comment.
    expect(months('2026-10-01', '2027-09-30')).toBe(12);
  });

  it('counts a lease ending on its anniversary as a full year', () => {
    expect(months('2026-10-01', '2027-10-01')).toBe(12);
  });

  it('counts the Picana Lane term as eighteen months', () => {
    expect(months('2026-10-01', '2028-03-31')).toBe(18);
  });

  it('counts a six-month term as six', () => {
    expect(months('2026-10-01', '2027-03-31')).toBe(6);
  });

  it('does not round a short term up to the disclosure threshold', () => {
    // Eleven months and a day is not a year, and must not trigger §83.512.
    expect(months('2026-10-01', '2027-08-31')).toBe(11);
  });
});
