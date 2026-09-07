import { describe, expect, it } from 'vitest';
import { evaluateApr } from '../instance/apr';
import { checkDisclosureInstance } from '../instance/check';
import type { DisclosureEnvelope, Jurisdiction } from '../instance/types';

/*
  The jurisdiction axis, exercised rather than asserted.

  California's disclosure shipped to production once carrying New York's
  phrasing of a prescribed sentence, in a row 10 CCR §914 closes with "shall
  include only". The instance side has the same exposure in a subtler form: the
  computation spec says one spec serves both states, and on the tolerance it is
  wrong. 10 CCR §955(a)(1)-(2) say "below"; 23 NYCRR §600.4(a)(1)-(2) say "above
  or below".

  So there exists a disclosed rate that is accurate in New York and a defect in
  California ON THE SAME NUMBERS, and the checker has to give two answers.
*/

const envelope = (jurisdiction: Jurisdiction, estimatedApr: number): DisclosureEnvelope => ({
  jurisdiction,
  offerSummary: {
    amountFinanced: 4_710_500,
    recipientFunds: null,
    estimatedApr,
    financeCharge: 2_739_500,
    estimatedTotalPaymentAmount: 7_450_000,
    estimatedPayment: 49_667,
    estimatedMonthlyCost: 1_509_867,
    estimatedTerm: 150,
    termUnit: 'calendar-days',
    specifiedPercentage: 0.15,
    estimatedAvgMonthlyIncome: 10_066_000,
    maximumNonInterestFinanceCharge: 2_739_500,
    // Every calendar day, so there is exactly one reading and the verdicts are
    // crisp rather than phase-dependent.
    paymentDayConvention: 'every-calendar-day',
  },
});

/*
  The calculated rate on this stream is 242.0623%. A disclosed 242.10% is
  0.0377 of a percentage point ABOVE it.

    California  §955(a)(1)-(2) forgive only a rate BELOW the calculated one, and
                our reading of (a)(3) does not extend the band upward either —
                so this is outside the tolerance.
    New York    §600.4(a)(2) forgives a quarter point "above or below" on an
                irregular transaction, and 0.0377 point is well inside it.
*/
const OVERSTATED_BY_A_HAIR = 2.421;

describe('the same overstatement, two states', () => {
  it('is a defect in California', () => {
    const evaluation = evaluateApr(envelope('CA', OVERSTATED_BY_A_HAIR));

    expect(evaluation.outcome).toBe('above');
    expect(evaluation.band.min).toBe(OVERSTATED_BY_A_HAIR);
  });

  it('is accurate in New York', () => {
    const evaluation = evaluateApr(envelope('NY', OVERSTATED_BY_A_HAIR));

    expect(evaluation.outcome).toBe('accurate');
    expect(evaluation.band.min).toBeCloseTo(OVERSTATED_BY_A_HAIR - 0.0025, 12);
  });

  it('records the §955(c) inadvertence provision on the California finding rather than treating it as exposure', () => {
    const found = checkDisclosureInstance(envelope('CA', OVERSTATED_BY_A_HAIR)).findings.find(
      (f) => f.kind === 'apr-above-calculated',
    );

    expect(found?.assumptions.join(' ')).toContain('§955(c)');
  });
});

describe('no finding on one state’s instance ever carries the other state’s authority', () => {
  const defective = (jurisdiction: Jurisdiction): DisclosureEnvelope => {
    const env = envelope(jurisdiction, 0.674);
    env.offerSummary.estimatedTotalPaymentAmount = 7_160_500;
    env.offerSummary.recipientFunds = 4_400_000;

    return env;
  };

  it('California', () => {
    const findings = checkDisclosureInstance(defective('CA')).findings;

    expect(findings.length).toBeGreaterThan(2);

    for (const f of findings) {
      expect(f.authorities.length, `${f.identity} carries no authority`).toBeGreaterThan(0);

      for (const a of f.authorities) {
        expect(a.jurisdiction).toBe('CA');
        expect(a.sourceFile).toBe('CA-10CCR-900-956.txt');
        expect(/NYCRR/i.test(a.citation)).toBe(false);
      }
    }
  });

  it('New York', () => {
    const findings = checkDisclosureInstance(defective('NY')).findings;

    expect(findings.length).toBeGreaterThan(2);

    for (const f of findings) {
      expect(f.authorities.length, `${f.identity} carries no authority`).toBeGreaterThan(0);

      for (const a of f.authorities) {
        expect(a.jurisdiction).toBe('NY');
        expect(a.sourceFile).toBe('NY-23NYCRR-600.txt');
        expect(/CCR\s*§/.test(a.citation)).toBe(false);
      }
    }
  });
});
