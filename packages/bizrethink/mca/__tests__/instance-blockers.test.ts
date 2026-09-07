import { describe, expect, it } from 'vitest';
import { checkDisclosureInstance } from '../instance/check';
import type { DisclosureEnvelope } from '../instance/types';

/*
  THE ACCEPTANCE EVIDENCE.

  Three REVIEW-01 blockers were not document defects. The widgets were correct
  and correctly placed; the numbers written into them were wrong:

    ca-funding-provided-is-gross-purchase-price  Row 1 carried $50,000, the
        gross Purchase Price, where §900(a)(1)(A) wants the purchase price net
        of every prepaid finance charge — $47,105.
    ca-finance-charge-omits-withheld-fees        Row 3 carried $24,500, the
        factor spread alone, where §943(a) wants the spread PLUS every Reg Z
        charge — $27,395.
    ca-apr-understated                           Row 2 carried 67.4% against a
        true rate near 150%.

  The instances below are the real ones. `asReviewed` is
  lombard-contracts/sample-data/ca-disclosure.json plus the matching
  sample-data/frpa.json figures, unaltered — the exact document REVIEW-01
  examined. `corrected` applies the three fixes and nothing else.

  A check is evidence only if it could have been red, so both directions are
  asserted: the defective instance is rejected, and the corrected one is not.
*/

/** sample-data/ca-disclosure.json + sample-data/frpa.json, verbatim. */
const asReviewed = (): DisclosureEnvelope => ({
  jurisdiction: 'CA',
  offerSummary: {
    amountFinanced: 5_000_000, //          "$50,000.00" — the defect
    recipientFunds: 4_710_500, //          "$47,105.00"
    estimatedApr: 0.674, //                "67.4"       — the defect
    financeCharge: 2_450_000, //           "$24,500.00" — the defect
    estimatedTotalPaymentAmount: 7_160_500, // "$71,605.00"
    estimatedPayment: 49_666, //           "$496.66"
    estimatedMonthlyCost: null, //         not populated in the sample
    estimatedTerm: 150, //                 "150"
    termUnit: 'payment-days', //           150 × $496.66 ≈ the purchased amount
    specifiedPercentage: 0.15, //          "15"
    estimatedAvgMonthlyIncome: 1_500_000, // "$15,000.00"
    maximumNonInterestFinanceCharge: null, // not populated in the sample
    paymentDayConvention: 'business-days', // "each business day (Monday–Friday)"
  },
  contract: {
    purchasePrice: 5_000_000, //           frpa "purchase_price"
    purchasedAmount: 7_450_000, //         frpa "purchased_amount"
    equipmentCostDeferred: 0, //           frpa "equipment_defer_amount"
    priorBalanceCarried: 0, //             frpa "prior_balances"
    feesWithheldAtFunding: [
      { label: 'Origination Fee', amount: 250_000 },
      { label: 'ACH Program Fee', amount: 39_500 },
    ],
  },
});

/** The three fixes, and nothing else. */
const corrected = (): DisclosureEnvelope => {
  const env = asReviewed();

  env.offerSummary.amountFinanced = 4_710_500; // purchase price net of $2,895 withheld
  env.offerSummary.financeCharge = 2_739_500; // $24,500 spread + $2,895 withheld
  env.offerSummary.estimatedTotalPaymentAmount = 7_450_000; // the purchased amount
  // Amount financed now EQUALS recipient funds, so §914(a)(2)(C)(ii)'s sentence
  // is no longer triggered and comes out of a row closed by "shall include only".
  env.offerSummary.recipientFunds = null;
  // The largest rate accurate under EVERY weekday phase (see instance-apr.test.ts).
  env.offerSummary.estimatedApr = 1.715;
  // The term stated as elapsed calendar days, which is what "how long it will
  // take to collect" means; 210 calendar days is 150 weekdays from any weekday.
  env.offerSummary.estimatedTerm = 210;
  env.offerSummary.termUnit = 'calendar-days';
  env.offerSummary.estimatedPayment = 49_667; // $74,500 ÷ 150
  env.offerSummary.estimatedMonthlyCost = 1_078_476; // $74,500 ÷ (210 ÷ 30.4)
  env.offerSummary.maximumNonInterestFinanceCharge = 2_739_500; // FRPA §8.3

  return env;
};

const kinds = (env: DisclosureEnvelope) => checkDisclosureInstance(env).findings.map((f) => f.kind);

const violations = (env: DisclosureEnvelope) =>
  checkDisclosureInstance(env)
    .findings.filter((f) => f.severity === 'violation')
    .map((f) => f.kind);

describe('ca-funding-provided-is-gross-purchase-price', () => {
  it('is rejected: the amount financed is the gross purchase price', () => {
    const found = checkDisclosureInstance(asReviewed()).findings.filter((f) => f.kind === 'amount-financed-mismatch');

    expect(found).toHaveLength(1);
    expect(found[0].severity).toBe('violation');
    expect(found[0].detail).toContain('47,105');
    expect(found[0].detail).toContain('50,000');
  });

  it('is accepted once corrected', () => {
    expect(kinds(corrected())).not.toContain('amount-financed-mismatch');
  });
});

describe('ca-finance-charge-omits-withheld-fees', () => {
  it('is rejected: the finance charge is the factor spread alone', () => {
    const found = checkDisclosureInstance(asReviewed()).findings.filter((f) => f.kind === 'finance-charge-mismatch');

    expect(found).toHaveLength(1);
    expect(found[0].severity).toBe('violation');
    expect(found[0].detail).toContain('27,395');
    expect(found[0].detail).toContain('24,500');
  });

  it('is accepted once corrected', () => {
    expect(kinds(corrected())).not.toContain('finance-charge-mismatch');
  });
});

describe('ca-apr-understated', () => {
  it('is rejected: 67.4% is far below the calculated rate under every convention', () => {
    const found = checkDisclosureInstance(asReviewed()).findings.filter((f) => f.kind === 'apr-below-calculated');

    expect(found).toHaveLength(1);
    expect(found[0].severity).toBe('violation');
    // The verdict does not depend on the payment-day convention here: the gap
    // is far too large for either reading to rescue it.
    expect(found[0].detail).toMatch(/every weekday phase/);
  });

  it('is accepted once corrected', () => {
    expect(kinds(corrected())).not.toContain('apr-below-calculated');
    expect(kinds(corrected())).not.toContain('apr-above-calculated');
    expect(kinds(corrected())).not.toContain('apr-undetermined');
  });
});

describe('the corrected instance clears every violation', () => {
  it('leaves nothing at violation severity', () => {
    expect(violations(corrected())).toEqual([]);
  });

  it('still reports what it cannot decide, rather than reporting nothing', () => {
    // $496.67 per business day is about $10,785 a month, which at the
    // disclosed 15% split implies roughly $71,900 of monthly card income —
    // not the $15,000 the APR row states. Neither blocker touched this and
    // §942(a) permits minimum payments and true-ups to move the figure, so it
    // is surfaced as undecidable rather than asserted as a violation.
    const undecided = checkDisclosureInstance(corrected()).findings.filter((f) => f.severity === 'undetermined');

    expect(undecided.map((f) => f.kind)).toContain('payment-contradicts-projection');
  });
});

describe('the blind spot, stated rather than hidden', () => {
  /*
    `closure` — total == amount financed + finance charge — is the identity that
    needs no second document, and it is the one that CANNOT separate the first
    two blockers. They move the same $2,895 in opposite directions: the amount
    financed is over by exactly the withheld fees and the finance charge is
    under by exactly the withheld fees, so their SUM is unchanged.

    On the real sample instance `closure` does fire, but only because the total
    was wrong as well. Set the total to its correct $74,500 and leave both
    blockers in place and the identity goes quiet. This test exists so that fact
    is recorded in the tree rather than in a report.
  */
  it('closure alone passes on an instance carrying both of the first two blockers', () => {
    const offsetting = asReviewed();
    offsetting.offerSummary.estimatedTotalPaymentAmount = 7_450_000; // the correct total
    delete offsetting.contract; // the offer summary, alone in the envelope

    const found = checkDisclosureInstance(offsetting).findings;

    expect(found.map((f) => f.kind)).not.toContain('closure-mismatch');
    expect(found.map((f) => f.kind)).not.toContain('amount-financed-mismatch');
    expect(found.map((f) => f.kind)).not.toContain('finance-charge-mismatch');
  });

  it('names the second document as the thing that would have caught it', () => {
    const offsetting = asReviewed();
    offsetting.offerSummary.estimatedTotalPaymentAmount = 7_450_000;
    delete offsetting.contract;

    const report = checkDisclosureInstance(offsetting);

    expect(report.skipped.map((s) => s.identity)).toContain('amount-financed');
    expect(report.skipped.map((s) => s.identity)).toContain('finance-charge');
  });
});
