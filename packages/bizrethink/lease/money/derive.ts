import type { MoneyAnswers, MoneyDerivation, MoneyLine, ProrationMethod } from './types';

/**
 * Every figure a reader sees as a total is derived here, from the same answers
 * the clause text interpolates. Nothing that appears in a summary table is ever
 * entered by hand, which is what makes the §1.1-versus-page-22 contradiction in
 * the 2026 Zillow lease structurally impossible to reproduce.
 *
 * Arithmetic only — never judgment. What deposit to charge is an answer;
 * what is due at signing given that deposit is a derivation.
 */

/** Work in integer cents so repeated division cannot drift. */
const toCents = (usd: number): number => Math.round(usd * 100);
const toUsd = (cents: number): number => Number((cents / 100).toFixed(2));

const daysInMonth = (year: number, month1: number): number => new Date(Date.UTC(year, month1, 0)).getUTCDate();

const parseIsoDate = (iso: string): { year: number; month1: number; day: number } => {
  const [year, month1, day] = iso.split('-').map(Number);

  return { year, month1, day };
};

/**
 * Days of the start month the tenant is in possession, counting the start day
 * itself. Returns 0 when the term begins on the rent due day, i.e. no partial
 * period exists.
 */
const prorationDays = (startDate: string, dueDayOfMonth: number): number => {
  const { year, month1, day } = parseIsoDate(startDate);

  if (day === dueDayOfMonth) {
    return 0;
  }

  return daysInMonth(year, month1) - day + 1;
};

const prorate = (monthlyCents: number, days: number, method: ProrationMethod, startDate: string): number => {
  if (days === 0) {
    return 0;
  }

  const { year, month1 } = parseIsoDate(startDate);

  switch (method) {
    case 'actual-days-in-month':
      return Math.round((monthlyCents / daysInMonth(year, month1)) * days);
    case 'thirty-day-month':
      return Math.round((monthlyCents / 30) * days);
    case 'actual-365':
      return Math.round(((monthlyCents * 12) / 365) * days);
  }
};

/** Never bill for something already held. */
const outstanding = (requiredCents: number, heldCents: number): number => Math.max(0, requiredCents - heldCents);

export const deriveMoney = (answers: MoneyAnswers): MoneyDerivation => {
  const { rent, term, deposit, prorationMethod } = answers;

  const monthlyCents = toCents(rent.monthlyUsd);

  const proratedDays = prorationDays(term.startDate, rent.dueDayOfMonth);
  const proratedCents = prorate(monthlyCents, proratedDays, prorationMethod, term.startDate);

  const depositDueCents = outstanding(toCents(deposit.securityUsd), toCents(deposit.alreadyHeldUsd));
  const advanceRentDueCents = outstanding(toCents(deposit.advanceRentUsd), toCents(deposit.advanceRentHeldUsd));
  const prepaidRentCents = toCents(deposit.prepaidRentUsd);

  /*
    Only lines that carry money are emitted. A zero line would reintroduce
    exactly the confusion the 2026 lease had — a "$0.00 Security Deposit" row
    that a reader takes as a statement that no deposit exists. Whether a
    deposit is HELD is a clause, not a payment line.
  */
  const lines: MoneyLine[] = [];

  if (proratedCents > 0) {
    lines.push({ label: 'Prorated rent for partial first month', amountUsd: toUsd(proratedCents) });
  }

  lines.push({ label: 'First month rent', amountUsd: toUsd(monthlyCents) });

  if (advanceRentDueCents > 0) {
    // A full month reads as the ordinary last-month's-rent collection; a
    // shortfall reads as what it is, a top-up against rent that has risen.
    const isTopUp = advanceRentDueCents < toCents(deposit.advanceRentUsd);

    lines.push({
      label: isTopUp ? 'Advance rent top-up' : 'Advance rent (final month)',
      amountUsd: toUsd(advanceRentDueCents),
    });
  }

  if (depositDueCents > 0) {
    lines.push({ label: 'Security deposit', amountUsd: toUsd(depositDueCents) });
  }

  if (prepaidRentCents > 0) {
    lines.push({ label: 'Prepaid rent', amountUsd: toUsd(prepaidRentCents) });
  }

  const totalCents = lines.reduce((acc, line) => acc + toCents(line.amountUsd), 0);

  return {
    depositHeldUsd: deposit.securityUsd,
    depositDueAtExecutionUsd: toUsd(depositDueCents),
    advanceRentTrueUpUsd: toUsd(advanceRentDueCents),
    prepaidRentDueUsd: toUsd(prepaidRentCents),
    proratedDays,
    proratedFirstPeriodUsd: toUsd(proratedCents),
    firstMonthRentUsd: toUsd(monthlyCents),
    totalDueAtExecutionUsd: toUsd(totalCents),
    lines,
  };
};
