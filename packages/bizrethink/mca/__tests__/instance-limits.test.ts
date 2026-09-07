import { describe, expect, it } from 'vitest';
import { checkDisclosureInstance, instanceCoverage } from '../instance/check';
import { IDENTITIES, UNRESOLVED_READINGS } from '../instance/identities';
import { BLOCKER_COVERAGE, NOT_CHECKED } from '../instance/limits';
import type { DisclosureEnvelope } from '../instance/types';

/*
  The coverage claims, pinned to the tree.

  `coverage()` exists on the prescribed side for the same reason: a suite that
  passes while checking half a form is a suite that reports the half it checked,
  and the danger is reading it as the whole. On the instance side the missing
  half is worse, because it is not "text we cannot compare" but "documents that
  are not in the envelope", and an envelope with one document produces a short,
  clean-looking findings list.

  Every claim below is asserted against the registry rather than restated in
  prose, so a claim that stops being true fails the suite.
*/

const offerSummaryOnly = (): DisclosureEnvelope => ({
  jurisdiction: 'CA',
  offerSummary: {
    // Both of the first two blockers, and a total that hides the pair.
    amountFinanced: 5_000_000,
    recipientFunds: null,
    estimatedApr: 1.715,
    financeCharge: 2_450_000,
    estimatedTotalPaymentAmount: 7_450_000,
    estimatedPayment: 49_667,
    estimatedMonthlyCost: 1_078_476,
    estimatedTerm: 210,
    termUnit: 'calendar-days',
    specifiedPercentage: 0.15,
    estimatedAvgMonthlyIncome: 7_190_000,
    maximumNonInterestFinanceCharge: 2_450_000,
    paymentDayConvention: 'business-days',
  },
});

describe('BLOCKER_COVERAGE is true of the registry, not just of the prose', () => {
  for (const entry of BLOCKER_COVERAGE) {
    it(`${entry.finding} is claimed by exactly the identities that declare it`, () => {
      const declaring = IDENTITIES.filter((i) => i.catches.includes(entry.finding)).map((i) => i.id);

      expect(declaring.sort()).toEqual([...entry.caughtBy].sort());
    });
  }

  it('records the two identities that are BLIND to a blocker they look like they should catch', () => {
    const blind = IDENTITIES.flatMap((i) => (i.blindTo ?? []).map((b) => `${i.id}:${b.finding}`));

    expect(blind).toContain('closure:ca-funding-provided-is-gross-purchase-price');
    expect(blind).toContain('closure:ca-finance-charge-omits-withheld-fees');
    expect(blind).toContain('finance-charge-floor:ca-finance-charge-omits-withheld-fees');
  });
});

describe('an offer summary travelling alone', () => {
  it('carries both of the first two blockers and produces no finding about either', () => {
    const findings = checkDisclosureInstance(offerSummaryOnly()).findings.map((f) => f.kind);

    expect(findings).not.toContain('amount-financed-mismatch');
    expect(findings).not.toContain('finance-charge-mismatch');
    expect(findings).not.toContain('closure-mismatch');
  });

  it('says so, in the same object as the findings', () => {
    const coverage = instanceCoverage(offerSummaryOnly());

    expect(coverage.undetectableInThisEnvelope).toEqual([
      'ca-finance-charge-omits-withheld-fees',
      'ca-funding-provided-is-gross-purchase-price',
    ]);
    expect(coverage.evaluated).toBeLessThan(coverage.total);
  });

  it('names each skipped identity with the document that would decide it', () => {
    const skipped = checkDisclosureInstance(offerSummaryOnly()).skipped;

    for (const s of skipped) {
      expect(s.reason.length).toBeGreaterThan(20);
      expect(s.statement.length).toBeGreaterThan(20);
    }

    expect(skipped.map((s) => s.identity)).toContain('amount-financed');
    expect(skipped.map((s) => s.identity)).toContain('finance-charge');
  });
});

describe('a full envelope convicts what the lone form could not', () => {
  it('catches both blockers once the agreement is present', () => {
    const env = offerSummaryOnly();
    env.contract = {
      purchasePrice: 5_000_000,
      purchasedAmount: 7_450_000,
      equipmentCostDeferred: 0,
      priorBalanceCarried: 0,
      feesWithheldAtFunding: [
        { label: 'Origination Fee', amount: 250_000 },
        { label: 'ACH Program Fee', amount: 39_500 },
      ],
    };

    const kinds = checkDisclosureInstance(env).findings.map((f) => f.kind);

    expect(kinds).toContain('amount-financed-mismatch');
    expect(kinds).toContain('finance-charge-mismatch');
    expect(instanceCoverage(env).undetectableInThisEnvelope).toEqual([]);
  });
});

describe('the limits are enumerated rather than implied', () => {
  it('lists every reading the documents leave open that a check turns on', () => {
    const ids = UNRESOLVED_READINGS.map((r) => r.id);

    expect(ids).toContain('term-unit');
    expect(ids).toContain('weekday-phase');
    expect(ids).toContain('relative-tolerance-direction');
    expect(ids).toContain('carry-renewal');
    expect(ids).toContain('itemization-line-for-a-fee-the-financer-keeps');
  });

  it('says plainly that consistency is not truth', () => {
    const structural = NOT_CHECKED.find((l) => l.id === 'consistency-is-not-truth');

    expect(structural?.kind).toBe('outside-the-documents');
  });

  it('gives every limit a reason and a remedy rather than a shrug', () => {
    expect(NOT_CHECKED.length).toBeGreaterThanOrEqual(12);

    for (const limit of NOT_CHECKED) {
      expect(limit.what.length, limit.id).toBeGreaterThan(30);
      expect(limit.why.length, limit.id).toBeGreaterThan(60);
      expect(limit.wouldNeed.length, limit.id).toBeGreaterThan(30);
    }
  });

  it('has a unique id per limit and per reading', () => {
    expect(new Set(NOT_CHECKED.map((l) => l.id)).size).toBe(NOT_CHECKED.length);
    expect(new Set(UNRESOLVED_READINGS.map((r) => r.id)).size).toBe(UNRESOLVED_READINGS.length);
  });
});
