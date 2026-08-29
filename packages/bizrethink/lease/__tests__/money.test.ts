import { describe, expect, it } from 'vitest';

import { deriveMoney } from '../money/derive';
import type { MoneyAnswers } from '../money/types';

/**
 * The money model is the fix for the root defect in the Zillow-generated lease:
 * one `securityDeposit` field being asked to carry two independent facts — how
 * much deposit is HELD under the lease, and how much is COLLECTED at signing.
 * Entering the true amount double-charged a tenant who had already paid it;
 * entering zero made the lease state no deposit existed. There was no third
 * option, so the true position ended up hand-typed into a free-text addendum
 * and the summary tables contradicted it.
 *
 * Splitting `securityUsd` from `alreadyHeldUsd` removes the choice. Everything
 * a reader sees as a total is derived from the same answers the clauses
 * interpolate, so the two can no longer disagree.
 *
 * The three fixtures below are the two real executed leases for 29090 Picana Ln
 * plus the new tenancy. They are the regression suite for this property.
 */

/** 29090 Picana Ln — new tenancy. Rent $6,900, fresh deposit, no carry-in. */
const NEW_TENANCY: MoneyAnswers = {
  rent: { monthlyUsd: 6900, dueDayOfMonth: 1 },
  term: { startDate: '2026-10-01' },
  deposit: {
    securityUsd: 6900,
    alreadyHeldUsd: 0,
    advanceRentUsd: 6900,
    advanceRentHeldUsd: 0,
    prepaidRentUsd: 0,
  },
  prorationMethod: 'actual-days-in-month',
};

/**
 * The 2026 Zillow lease as it SHOULD have been expressed. Rent rose to $6,550
 * but the $6,300 deposit and $6,300 advance rent were already held from the
 * First In tenancy, so nothing but rent and a $250 advance-rent top-up was
 * actually due. The executed document reached $6,800 too, but only by stating
 * a $0 deposit and explaining the truth in prose on page 22.
 */
const KEANE_2026: MoneyAnswers = {
  rent: { monthlyUsd: 6550, dueDayOfMonth: 1 },
  term: { startDate: '2026-01-01' },
  deposit: {
    securityUsd: 6300,
    alreadyHeldUsd: 6300,
    advanceRentUsd: 6550,
    advanceRentHeldUsd: 6300,
    prepaidRentUsd: 0,
  },
  prorationMethod: 'thirty-day-month',
};

/**
 * The 2025 First In Property Management lease. Term began 8 January on a
 * monthly cycle, so the first period was prorated, and the tenant additionally
 * paid a $25,200 prepaid-rent block that was expressly NOT escrowed.
 */
const FIRST_IN_2025: MoneyAnswers = {
  rent: { monthlyUsd: 6300, dueDayOfMonth: 1 },
  term: { startDate: '2025-01-08' },
  deposit: {
    securityUsd: 6300,
    alreadyHeldUsd: 0,
    advanceRentUsd: 6300,
    advanceRentHeldUsd: 0,
    prepaidRentUsd: 25200,
  },
  prorationMethod: 'actual-days-in-month',
};

describe('deriveMoney — a deposit that is held but not collected', () => {
  it('charges nothing at execution when the deposit is already held', () => {
    const d = deriveMoney(KEANE_2026);

    // The whole point. The lease can say "$6,300 is held" and "$0 is due"
    // at the same time, because they are different figures.
    expect(d.depositHeldUsd).toBe(6300);
    expect(d.depositDueAtExecutionUsd).toBe(0);
  });

  it('tops up advance rent to one month when rent has risen', () => {
    const d = deriveMoney(KEANE_2026);

    // $6,550 rent against $6,300 already held for the final month.
    expect(d.advanceRentTrueUpUsd).toBe(250);
  });

  it('reproduces the $6,800 the executed 2026 lease actually collected', () => {
    const d = deriveMoney(KEANE_2026);

    expect(d.totalDueAtExecutionUsd).toBe(6800);
  });

  it('charges the full deposit at execution for a new tenancy', () => {
    const d = deriveMoney(NEW_TENANCY);

    expect(d.depositDueAtExecutionUsd).toBe(6900);
    expect(d.advanceRentTrueUpUsd).toBe(6900);

    // First month + last month + deposit.
    expect(d.totalDueAtExecutionUsd).toBe(20700);
  });

  it('never returns a negative figure when more is held than is required', () => {
    const overHeld = deriveMoney({
      ...KEANE_2026,
      deposit: { ...KEANE_2026.deposit, securityUsd: 6300, alreadyHeldUsd: 9000, advanceRentHeldUsd: 9000 },
    });

    expect(overHeld.depositDueAtExecutionUsd).toBe(0);
    expect(overHeld.advanceRentTrueUpUsd).toBe(0);
  });
});

describe('deriveMoney — proration', () => {
  it('prorates the first period from the actual length of the start month', () => {
    const d = deriveMoney(FIRST_IN_2025);

    // 8–31 January inclusive is 24 days of a 31-day month at $6,300.
    expect(d.proratedDays).toBe(24);
    expect(d.proratedFirstPeriodUsd).toBe(4877.42);
  });

  it('carries the prepaid-rent block into the execution total', () => {
    const d = deriveMoney(FIRST_IN_2025);

    // Prorated January + first full month + advance rent + deposit + prepaid.
    expect(d.totalDueAtExecutionUsd).toBe(4877.42 + 6300 + 6300 + 6300 + 25200);
  });

  it('supports the thirty-day-month convention', () => {
    const d = deriveMoney({ ...FIRST_IN_2025, prorationMethod: 'thirty-day-month' });

    expect(d.proratedFirstPeriodUsd).toBe(5040);
  });

  it('supports the 365-day convention', () => {
    const d = deriveMoney({ ...FIRST_IN_2025, prorationMethod: 'actual-365' });

    // 6300 * 12 / 365 = 207.1233 per day, over 24 days.
    expect(d.proratedFirstPeriodUsd).toBe(4970.96);
  });

  it('does not prorate when the term starts on the rent due day', () => {
    const d = deriveMoney(NEW_TENANCY);

    expect(d.proratedDays).toBe(0);
    expect(d.proratedFirstPeriodUsd).toBe(0);
  });
});

describe('deriveMoney — the summary table', () => {
  it('emits only the lines that carry money', () => {
    const d = deriveMoney(KEANE_2026);

    // No deposit line, because nothing is due. No prepaid line. No proration.
    expect(d.lines).toEqual([
      { label: 'First month rent', amountUsd: 6550 },
      { label: 'Advance rent top-up', amountUsd: 250 },
    ]);
  });

  it('itemises a new tenancy in the order money is explained', () => {
    const d = deriveMoney(NEW_TENANCY);

    expect(d.lines).toEqual([
      { label: 'First month rent', amountUsd: 6900 },
      { label: 'Advance rent (final month)', amountUsd: 6900 },
      { label: 'Security deposit', amountUsd: 6900 },
    ]);
  });

  it('always sums its own lines to the execution total', () => {
    for (const answers of [NEW_TENANCY, KEANE_2026, FIRST_IN_2025]) {
      const d = deriveMoney(answers);
      const summed = d.lines.reduce((acc, l) => acc + l.amountUsd, 0);

      // The invariant that makes a §1.1-style summary table impossible to
      // contradict: the total is never written down independently of the lines.
      expect(Number(summed.toFixed(2))).toBe(d.totalDueAtExecutionUsd);
    }
  });
});
