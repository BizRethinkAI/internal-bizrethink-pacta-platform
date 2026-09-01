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

  const months = (ey - sy) * 12 + (em - sm);

  // A term ending the day before the anniversary is still a full 12 months —
  // 1 Oct 2026 to 30 Sep 2027 is a year, and the flood disclosure threshold
  // turns on exactly that.
  return ed >= sd - 1 ? months : months - 1;
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
