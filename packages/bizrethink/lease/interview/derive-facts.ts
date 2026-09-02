import type { ClauseFacts } from '../clauses/types';
import type { MoneyAnswers } from '../money/types';

/**
 * Facts the interview must never ask for, because the answerer has already
 * given them somewhere else.
 *
 * `ClauseFacts` and `MoneyAnswers` overlap: both carry the deposit and advance
 * rent figures, because one drives clause SELECTION and the other drives the
 * arithmetic. That is fine inside the engine and intolerable in an interview —
 * it produced a deposit step that asked "how much was carried in?" and then,
 * two fields later, "confirm the amount carried in". A form that asks the same
 * question twice is a form that has leaked its data model to the user.
 *
 * The term length is the same story: a start date and an end date already
 * determine it.
 */

const monthsBetween = (startIso: string, endIso: string): number => {
  const [sy, sm, sd] = startIso.split('-').map(Number);
  const [ey, em, ed] = endIso.split('-').map(Number);

  /*
    Count whole months between the start and the day AFTER the end, because a
    lease term includes its end date. That one shift makes every boundary case
    fall out on its own:

      1 Oct 2026 -> 30 Sep 2027   day after is 1 Oct    12 months
      1 Oct 2026 ->  1 Oct 2027   day after is 2 Oct    12 months and a day
      1 Oct 2026 -> 31 Mar 2028   day after is 1 Apr    18 months

    Date.UTC normalises the overflow, so 31 Jan + 1 becomes 1 Feb rather than a
    32nd of January. The previous version compared day-of-month directly and
    returned ELEVEN for the twelve-month example written in its own comment —
    which silently dropped the §83.512 flood disclosure, since that renders
    only at twelve months or more.
  */
  const dayAfterEnd = new Date(Date.UTC(ey, em - 1, ed + 1));

  const months = (dayAfterEnd.getUTCFullYear() - sy) * 12 + (dayAfterEnd.getUTCMonth() - (sm - 1));

  // The final month is only complete once the term reaches the start's day.
  return dayAfterEnd.getUTCDate() < sd ? months - 1 : months;
};

export type DerivableFacts = Pick<
  ClauseFacts,
  | 'depositHeldUsd'
  | 'depositCarriedInUsd'
  | 'advanceRentHeldUsd'
  | 'advanceRentCarriedInUsd'
  | 'prorationApplies'
  | 'termMonths'
>;

/*
  A DRAFT LEGITIMATELY HAS NO START DATE YET, and this threw on one.

  `money.term.startDate` is null until the landlord answers step 2 — the money
  seeder writes null on purpose, because a date nobody typed is a date nobody
  checked. Splitting it took out `get`, `validate`, `send` and both PDF routes
  for any matter whose term was still unanswered.

  Absent dates derive nothing rather than deriving zero: `prorationApplies`
  false and `termMonths` 0 mean "not yet known", and the unfilled-variable
  check is what reports the gap. Guessing here would put a term length into a
  document from an answer that does not exist.
*/
const isIsoDate = (value: unknown): value is string => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value);

export const deriveFacts = (money: MoneyAnswers, endDate: string): DerivableFacts => {
  const startDate = money.term.startDate;

  return {
    depositHeldUsd: money.deposit.securityUsd,
    depositCarriedInUsd: money.deposit.alreadyHeldUsd,
    advanceRentHeldUsd: money.deposit.advanceRentUsd,
    advanceRentCarriedInUsd: money.deposit.advanceRentHeldUsd,
    // True exactly when the term does not begin on the rent due day.
    prorationApplies: isIsoDate(startDate) ? Number(startDate.split('-')[2]) !== money.rent.dueDayOfMonth : false,
    termMonths: isIsoDate(startDate) && isIsoDate(endDate) ? monthsBetween(startDate, endDate) : 0,
  };
};
