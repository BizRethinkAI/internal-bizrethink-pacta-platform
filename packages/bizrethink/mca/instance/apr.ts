import { buildEstimatedStream, PAYMENT_WEEKDAY_PHASES, presentValue } from './stream';
import { permittedCalculatedBand, TOLERANCE_RULES } from './tolerance';
import type { DisclosureEnvelope, PaymentDayConvention, Rate } from './types';

/**
 * Does the disclosed APR describe the disclosed deal?
 *
 * NO RATE IS SOLVED FOR HERE, and that is the whole design.
 *
 * The naive approach is to recompute the APR and compare. That gives two
 * calculators — this one and `lombard-platform`'s — which drift, and when they
 * disagree there is no principled way to say which is right.
 *
 * The tolerance can be inverted instead. Present value is strictly decreasing
 * in the rate, so for the calculated rate `c` (defined by PV(c) = amount
 * financed) and a permitted band [min, max] on `c`:
 *
 *     c ≥ min   ⟺   amountFinanced ≤ PV(min)
 *     c ≤ max   ⟺   amountFinanced ≥ PV(max)
 *
 * So the entire §955 / §600.4 question is two present-value evaluations at
 * rates we already know, and a pair of comparisons. Nothing iterates, nothing
 * can drift, and the failure directions stay distinguishable: falling off the
 * PV(max) end means the disclosed rate is too far BELOW the truth, falling off
 * the PV(min) end means it sits ABOVE it.
 *
 * California and New York differ on whether that second case is forgivable at
 * all — see `tolerance.ts`.
 */

export type AprOutcome =
  /** Within the state's tolerance under every reading the document leaves open. */
  | 'accurate'
  /** Further below the calculated rate than the tolerance allows. */
  | 'below'
  /** Above the calculated rate by more than the state forgives. */
  | 'above'
  /** Lawful under one reading of the document and not under another. */
  | 'undetermined';

export type AprReading = {
  convention: PaymentDayConvention;
  firstPaymentWeekday: number;
  /** Present value at the lowest calculated rate the disclosure would be accurate for. */
  presentValueAtBandMin: number;
  /** Present value at the highest such rate. */
  presentValueAtBandMax: number;
  amountFinanced: number;
  outcome: Exclude<AprOutcome, 'undetermined'>;
};

export type AprEvaluation = {
  outcome: AprOutcome;
  disclosed: Rate;
  band: { min: Rate; max: Rate };
  readings: AprReading[];
  /** Every reading the document did not fix, spelled out. */
  assumptions: string[];
};

/**
 * The readings the offer summary leaves open.
 *
 * The Payment Terms row states WHETHER payments fall on weekdays
 * (§914(a)(7)(B)(i): "a short explanation of when daily payments will be
 * required. For example, on weekdays or every calendar day"), so the convention
 * is read off the document where the row was captured. It does not state which
 * weekday the first payment lands on and carries no funding date, so the phase
 * is genuinely unknown — and on a 150-payment stream it moves the calculated
 * rate by about 3.1 percentage points, which is more than §955(a)(2)'s quarter
 * point. Every phase is therefore evaluated and the verdict is only reported
 * when they agree.
 */
const readingsFor = (
  convention: PaymentDayConvention | null,
): { convention: PaymentDayConvention; phase: number }[] => {
  const conventions: PaymentDayConvention[] =
    convention === null ? ['every-calendar-day', 'business-days'] : [convention];

  return conventions.flatMap<{ convention: PaymentDayConvention; phase: number }>((c) =>
    c === 'business-days'
      ? PAYMENT_WEEKDAY_PHASES.map((phase) => ({ convention: c, phase: phase as number }))
      : [{ convention: c, phase: 0 }],
  );
};

export const evaluateApr = (env: DisclosureEnvelope): AprEvaluation => {
  const { offerSummary: offer } = env;
  const rule = TOLERANCE_RULES[env.jurisdiction];
  const band = permittedCalculatedBand(rule, offer.estimatedApr, env.regularity ?? 'irregular');

  const readings: AprReading[] = readingsFor(offer.paymentDayConvention).map(({ convention, phase }) => {
    const stream = buildEstimatedStream(offer, { convention, firstPaymentWeekday: phase });
    const pvMin = presentValue(stream, band.min);
    const pvMax = presentValue(stream, band.max);
    const financed = offer.amountFinanced;

    // Sub-cent slack: present value is a float sum over hundreds of terms and
    // the comparison is against an exact cents figure.
    const epsilon = 0.5;

    return {
      convention,
      firstPaymentWeekday: phase,
      presentValueAtBandMin: pvMin,
      presentValueAtBandMax: pvMax,
      amountFinanced: financed,
      outcome: financed > pvMin + epsilon ? 'above' : financed < pvMax - epsilon ? 'below' : 'accurate',
    };
  });

  const distinct = new Set(readings.map((r) => r.outcome));

  const assumptions: string[] = [];

  if (offer.paymentDayConvention === null) {
    assumptions.push(
      'the Payment Terms row was not captured, so both the weekday and the every-calendar-day reading were evaluated',
    );
  }

  if (offer.paymentDayConvention === 'business-days' || offer.paymentDayConvention === null) {
    assumptions.push(
      'the weekday the first payment lands on is not disclosed and no funding date appears on the offer summary, so all five phases were evaluated',
    );
  }

  if (offer.termUnit === 'payment-days') {
    assumptions.push(
      'the Estimated Term figure was read as a count of payments rather than elapsed calendar days; §942 does not say which it is',
    );
  }

  assumptions.push(
    'the stream is level at the disclosed total divided by the number of payments, with the remainder on the final payment; the form discloses only an average',
  );

  return {
    outcome: distinct.size === 1 ? [...distinct][0] : 'undetermined',
    disclosed: offer.estimatedApr,
    band,
    readings,
    assumptions,
  };
};
