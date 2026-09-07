import { describe, expect, it } from 'vitest';
import { buildEstimatedStream, PAYMENT_WEEKDAY_PHASES, presentValue } from '../instance/stream';
import type { OfferSummaryInstance } from '../instance/types';

/*
  The estimated payment stream, and present value at a GIVEN rate.

  No rate is solved for anywhere in this package — that is the platform
  calculator's job. What is needed here is the opposite operation: take the rate
  the document already discloses, discount the stream the document already
  describes, and see whether the present value lands on the amount financed the
  document already states. One closed sum, no iteration, nothing to drift.

  The validation that this is the RIGHT sum is that it reproduces the figures
  REVIEW-01's `ca-apr-understated` computed independently: 185.7% for the
  document's own numbers on a calendar-day stream and 242.1% once corrected.
*/

const offer = (over: Partial<OfferSummaryInstance>): OfferSummaryInstance => ({
  amountFinanced: 4_710_500,
  recipientFunds: null,
  estimatedApr: 2.420623,
  financeCharge: 2_739_500,
  estimatedTotalPaymentAmount: 7_450_000,
  estimatedMonthlyCost: null,
  estimatedPayment: 49_667,
  estimatedTerm: 150,
  termUnit: 'payment-days',
  specifiedPercentage: null,
  estimatedAvgMonthlyIncome: null,
  maximumNonInterestFinanceCharge: null,
  paymentDayConvention: 'business-days',
  ...over,
});

describe('buildEstimatedStream', () => {
  it('places calendar-day payments on consecutive days and sums exactly to the disclosed total', () => {
    const stream = buildEstimatedStream(offer({ paymentDayConvention: 'every-calendar-day' }), {
      convention: 'every-calendar-day',
      firstPaymentWeekday: 0,
    });

    expect(stream).toHaveLength(150);
    expect(stream[0].calendarDayOffset).toBe(1);
    expect(stream[149].calendarDayOffset).toBe(150);
    expect(stream.reduce((s, p) => s + p.amount, 0)).toBe(7_450_000);
  });

  it('skips weekends on a business-day product, so 150 payments span 208 calendar days', () => {
    const stream = buildEstimatedStream(offer({}), { convention: 'business-days', firstPaymentWeekday: 0 });

    expect(stream).toHaveLength(150);
    expect(stream[149].calendarDayOffset).toBe(208);
    expect(stream.reduce((s, p) => s + p.amount, 0)).toBe(7_450_000);
  });

  it('reads the term as elapsed calendar days when told to, which yields FEWER payments', () => {
    // 150 elapsed calendar days starting Monday contains 108 weekdays.
    const stream = buildEstimatedStream(offer({ termUnit: 'calendar-days' }), {
      convention: 'business-days',
      firstPaymentWeekday: 0,
    });

    expect(stream).toHaveLength(108);
    expect(stream[107].calendarDayOffset).toBeLessThanOrEqual(150);
  });
});

describe('presentValue reproduces the rates REVIEW-01 computed by hand', () => {
  /*
    `ca-apr-understated` reports, for the document's own disclosed figures
    ($50,000 advanced against $71,605 over 150 instalments): "132.6% if the 150
    instalments fall on business days, 185.7% if on calendar days. Recomputed on
    the corrected base ($47,105 financed, $74,500 paid): 172.7% and 242.1%".

    If discounting at those rates returns those advances, the discounting here
    is the same operation the finding performed.
  */
  it('returns $50,000 for the defective figures discounted at 185.71% on calendar days', () => {
    const defective = offer({
      amountFinanced: 5_000_000,
      estimatedTotalPaymentAmount: 7_160_500,
      paymentDayConvention: 'every-calendar-day',
    });
    const stream = buildEstimatedStream(defective, { convention: 'every-calendar-day', firstPaymentWeekday: 0 });

    expect(presentValue(stream, 1.857144) / 100).toBeCloseTo(50_000, 0);
  });

  it('returns $47,105 for the corrected figures discounted at 242.06% on calendar days', () => {
    const stream = buildEstimatedStream(offer({ paymentDayConvention: 'every-calendar-day' }), {
      convention: 'every-calendar-day',
      firstPaymentWeekday: 0,
    });

    expect(presentValue(stream, 2.420623) / 100).toBeCloseTo(47_105, 0);
  });

  it('reproduces the business-day figure to within the weekday phase the form does not disclose', () => {
    // The finding's 172.7% is this stream with a THURSDAY first payment.
    const stream = buildEstimatedStream(offer({}), { convention: 'business-days', firstPaymentWeekday: 3 });

    expect(presentValue(stream, 1.72745) / 100).toBeCloseTo(47_105, 0);
  });
});

describe('the weekday phase is a real, undisclosed input', () => {
  /*
    The form states WHETHER payments fall on weekdays. It does not state which
    weekday the first one lands on, and there is no funding date on the offer
    summary to derive it from. Across the five possible phases the present value
    of the same stream at the same rate moves by enough to change a §955
    verdict, so the phase cannot be quietly fixed at Monday.
  */
  it('moves the present value across the five phases', () => {
    const pvs = PAYMENT_WEEKDAY_PHASES.map((firstPaymentWeekday) =>
      presentValue(buildEstimatedStream(offer({}), { convention: 'business-days', firstPaymentWeekday }), 1.72745),
    );

    expect(PAYMENT_WEEKDAY_PHASES).toEqual([0, 1, 2, 3, 4]);
    // Monday-start discounts least (the stream finishes two days sooner).
    expect(Math.max(...pvs) - Math.min(...pvs)).toBeGreaterThan(20_000); // > $200
  });
});
