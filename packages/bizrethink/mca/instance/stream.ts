import type { Cents, OfferSummaryInstance, PaymentDayConvention, Rate } from './types';

/**
 * The estimated payment stream, and present value at a GIVEN rate.
 *
 * Appendix J, 12 C.F.R. Part 1026 is incorporated unmodified by 10 CCR §940(a)
 * and 23 NYCRR §600.3, so the annual percentage rate is NOMINAL: the unit
 * period rate times the number of unit periods in a year. There is no
 * compounding step to an effective annual rate.
 *
 * For an advance followed by a payment on each Workday until the purchased
 * amount is collected, the common interval is one day, so the unit period is
 * one CALENDAR day and the rate is 365 × the daily periodic rate. Payments land
 * on Workdays but are placed at their true calendar-day offsets; collapsing the
 * stream to ~252 payment-days and multiplying by 252 overstates the rate.
 *
 * NOTHING HERE SOLVES FOR A RATE. `lombard-platform`'s `solveActuarialApr`
 * does that and should keep doing it; a second solver in this package would
 * drift from the first with no way to say which was right. What this file
 * provides is the inverse question, which needs no solver: given the rate the
 * document discloses, what present value does the document's own stream have?
 */

/** Appendix J's unit periods per year for a daily-interval transaction. */
export const APPENDIX_J_PERIODS_PER_YEAR = 365;

/** Monday through Friday, as an index. */
export const PAYMENT_WEEKDAY_PHASES = [0, 1, 2, 3, 4] as const;

export type PaymentWeekdayPhase = (typeof PAYMENT_WEEKDAY_PHASES)[number];

export type ScheduledPayment = {
  /** Days after funding. Appendix J's unit period is this day, not the payment index. */
  calendarDayOffset: number;
  amount: Cents;
};

export type StreamOptions = {
  convention: PaymentDayConvention;
  /**
   * Which weekday the first payment lands on, 0 = Monday.
   *
   * The offer summary does not disclose this and carries no funding date to
   * derive it from, so it is a parameter rather than a constant. On a
   * 150-payment business-day stream the choice moves the calculated rate by
   * about 3.1 percentage points, which is inside §955(a)(3)'s relative band at
   * these rates and outside §955(a)(2)'s quarter point. `apr.ts` therefore
   * evaluates every phase rather than picking one.
   */
  firstPaymentWeekday: PaymentWeekdayPhase | number;
};

/** Calendar-day offsets of the first `count` payment days under a convention. */
const paymentDayOffsets = (count: number, opts: StreamOptions): number[] => {
  if (opts.convention === 'every-calendar-day') {
    return Array.from({ length: count }, (_, k) => k + 1);
  }

  const out: number[] = [];
  let weekday = ((opts.firstPaymentWeekday % 7) + 7) % 7;

  for (let day = 1; out.length < count; day += 1) {
    if (weekday < 5) {
      out.push(day);
    }

    weekday = (weekday + 1) % 7;
  }

  return out;
};

/** How many payment days fall within `calendarDays` elapsed days. */
const paymentDaysWithin = (calendarDays: number, opts: StreamOptions): number => {
  if (opts.convention === 'every-calendar-day') {
    return Math.max(1, Math.round(calendarDays));
  }

  let count = 0;
  let weekday = ((opts.firstPaymentWeekday % 7) + 7) % 7;

  for (let day = 1; day <= Math.round(calendarDays); day += 1) {
    if (weekday < 5) {
      count += 1;
    }

    weekday = (weekday + 1) % 7;
  }

  return Math.max(1, count);
};

/**
 * Build the stream the FORM describes.
 *
 * The amounts come from the disclosed total, not from the disclosed periodic
 * payment. §914(a)(5)(B) makes the fourth row "the total dollar amount of
 * estimated payments the recipient will make during the term of the contract",
 * which is the quantity the stream must sum to; the fifth row's figure is "the
 * average amount" (§914(a)(6)(B)(i)) and is by its own words not exact. Where
 * the two disagree by more than one payment that is a defect in its own right
 * and `identities.ts` reports it — this function does not paper over it, it
 * just does not let an average silently redefine the total.
 */
export const buildEstimatedStream = (offer: OfferSummaryInstance, opts: StreamOptions): ScheduledPayment[] => {
  const count =
    offer.termUnit === 'payment-days'
      ? Math.max(1, Math.round(offer.estimatedTerm))
      : paymentDaysWithin(offer.estimatedTerm, opts);

  const offsets = paymentDayOffsets(count, opts);
  const level = Math.round(offer.estimatedTotalPaymentAmount / count);

  return offsets.map((calendarDayOffset, k) => ({
    calendarDayOffset,
    // The last payment carries the remainder so the stream sums EXACTLY to the
    // disclosed total. Appendix J calls that final irregular payment out
    // explicitly, and §955(a)(2) excludes "an irregular first or final payment"
    // from what makes a transaction irregular.
    amount: k === count - 1 ? offer.estimatedTotalPaymentAmount - level * (count - 1) : level,
  }));
};

/**
 * Present value of the stream at a nominal annual rate.
 *
 * Appendix J: the periodic rate is the annual rate divided by the number of
 * unit periods in a year, and each payment is discounted by its own count of
 * unit periods.
 */
export const presentValue = (stream: ScheduledPayment[], nominalAnnualRate: Rate): number => {
  const periodic = nominalAnnualRate / APPENDIX_J_PERIODS_PER_YEAR;

  return stream.reduce((pv, p) => pv + p.amount / (1 + periodic) ** p.calendarDayOffset, 0);
};
