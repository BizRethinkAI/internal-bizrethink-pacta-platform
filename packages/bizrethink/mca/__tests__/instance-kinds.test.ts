import { describe, expect, it } from 'vitest';
import { checkDisclosureInstance } from '../instance/check';
import { IDENTITIES } from '../instance/identities';
import type { DisclosureEnvelope, InstanceFindingKind } from '../instance/types';

/*
  A GREEN ASSERTION IS EVIDENCE ONLY IF IT COULD HAVE BEEN RED.

  Two assertions elsewhere in this package filtered on `Divergence` kinds that
  did not exist and passed vacuously for a day. The way that cannot happen here
  is a corpus: one deliberately defective instance per declared finding kind,
  and a test that every kind in the union is produced by at least one of them.

  It also runs the other direction. Each identity declares the kinds it `emits`;
  the corpus proves it emits every one of them and never a kind it did not
  declare. A kind nothing can produce, or an identity nothing exercises, fails
  the suite.
*/

/** The clean instance every mutation below starts from. Produces nothing. */
const clean = (): DisclosureEnvelope => ({
  jurisdiction: 'CA',
  regularity: 'irregular',
  offerSummary: {
    amountFinanced: 4_710_500,
    recipientFunds: null,
    estimatedApr: 1.715,
    financeCharge: 2_739_500,
    estimatedTotalPaymentAmount: 7_450_000,
    estimatedPayment: 49_667,
    estimatedMonthlyCost: 1_078_476,
    estimatedTerm: 210,
    termUnit: 'calendar-days',
    specifiedPercentage: 0.15,
    estimatedAvgMonthlyIncome: 7_190_000,
    maximumNonInterestFinanceCharge: 2_739_500,
    paymentDayConvention: 'business-days',
  },
  itemization: {
    // §956(b)(1)'s shape: the withheld fees appear on a paid-on-your-behalf
    // line AND on the prepaid line, which is what makes lines 1-3 minus the
    // prepaid charge come out at the statutory amount financed.
    amountGivenDirectly: 4_710_500,
    amountPaidOnAccount: 0,
    amountsPaidToOthers: 289_500,
    amountProvidedTotal: 5_000_000,
    prepaidFinanceCharge: 289_500,
    amountFinanced: 4_710_500,
  },
  contract: {
    purchasePrice: 5_000_000,
    purchasedAmount: 7_450_000,
    equipmentCostDeferred: 0,
    priorBalanceCarried: 0,
    feesWithheldAtFunding: [
      { label: 'Origination Fee', amount: 250_000 },
      { label: 'ACH Program Fee', amount: 39_500 },
    ],
  },
});

const mutate = (f: (env: DisclosureEnvelope) => void): DisclosureEnvelope => {
  const env = clean();
  f(env);

  return env;
};

/** One defective instance per kind, each a single change to `clean`. */
const CORPUS: { kind: InstanceFindingKind; label: string; env: DisclosureEnvelope }[] = [
  {
    kind: 'closure-mismatch',
    label: 'the total does not equal the amount financed plus the finance charge',
    env: mutate((e) => {
      e.offerSummary.estimatedTotalPaymentAmount = 7_160_500;
    }),
  },
  {
    kind: 'amount-financed-mismatch',
    label: 'row 1 carries the gross purchase price',
    env: mutate((e) => {
      e.offerSummary.amountFinanced = 5_000_000;
    }),
  },
  {
    kind: 'finance-charge-mismatch',
    label: 'row 3 omits the withheld fees',
    env: mutate((e) => {
      e.offerSummary.financeCharge = 2_450_000;
    }),
  },
  {
    kind: 'finance-charge-below-prepaid',
    label: 'the finance charge is smaller than the fees withheld at funding',
    env: mutate((e) => {
      e.offerSummary.financeCharge = 100_000;
    }),
  },
  {
    kind: 'itemization-disagrees',
    label: 'the two documents state different amounts financed',
    env: mutate((e) => {
      // biome-ignore lint/style/noNonNullAssertion: the clean fixture always carries one
      e.itemization!.amountFinanced = 4_700_000;
    }),
  },
  {
    kind: 'itemization-internally-inconsistent',
    label: 'the Itemization does not add up on its own rows',
    env: mutate((e) => {
      // biome-ignore lint/style/noNonNullAssertion: the clean fixture always carries one
      e.itemization!.amountProvidedTotal = 4_900_000;
    }),
  },
  {
    kind: 'recipient-funds-unexplained',
    label: 'row 1 and the Itemization disagree on what went directly to the merchant',
    env: mutate((e) => {
      e.offerSummary.recipientFunds = 4_500_000;
    }),
  },
  {
    kind: 'itemization-required',
    label: 'row 1 triggers §956(a) and no Itemization is in the envelope',
    env: mutate((e) => {
      e.offerSummary.recipientFunds = 4_400_000;
      e.itemization = undefined;
    }),
  },
  {
    kind: 'stream-does-not-close',
    label: 'the average payment and the total describe different streams',
    env: mutate((e) => {
      e.offerSummary.estimatedPayment = 40_000;
    }),
  },
  {
    kind: 'payment-contradicts-projection',
    label: 'the payment cannot be the disclosed split of the disclosed income',
    env: mutate((e) => {
      e.offerSummary.estimatedAvgMonthlyIncome = 1_500_000;
    }),
  },
  {
    kind: 'monthly-cost-mismatch',
    label: 'the inserted row is not the total over the months in the term',
    env: mutate((e) => {
      e.offerSummary.estimatedMonthlyCost = 1_509_867;
    }),
  },
  {
    kind: 'prepayment-cap-exceeds-finance-charge',
    label: 'the prepayment cap is above the finance charge it caps',
    env: mutate((e) => {
      e.offerSummary.maximumNonInterestFinanceCharge = 3_000_000;
    }),
  },
  {
    kind: 'missing-required-figure',
    label: 'the Estimated Monthly Cost cell is blank on a non-monthly product',
    env: mutate((e) => {
      e.offerSummary.estimatedMonthlyCost = null;
    }),
  },
  {
    kind: 'apr-below-calculated',
    label: '67.4% against a true rate near 175%',
    env: mutate((e) => {
      e.offerSummary.estimatedApr = 0.674;
    }),
  },
  {
    kind: 'apr-above-calculated',
    label: '180% against a true rate near 175%',
    env: mutate((e) => {
      e.offerSummary.estimatedApr = 1.8;
    }),
  },
  {
    kind: 'apr-undetermined',
    label: 'a rate lawful under two of the five weekday phases and not the other three',
    env: mutate((e) => {
      e.offerSummary.estimatedApr = 1.73;
    }),
  },
];

const ALL_KINDS: InstanceFindingKind[] = [
  'closure-mismatch',
  'itemization-disagrees',
  'itemization-internally-inconsistent',
  'recipient-funds-unexplained',
  'itemization-required',
  'finance-charge-mismatch',
  'finance-charge-below-prepaid',
  'amount-financed-mismatch',
  'stream-does-not-close',
  'payment-contradicts-projection',
  'monthly-cost-mismatch',
  'prepayment-cap-exceeds-finance-charge',
  'apr-below-calculated',
  'apr-above-calculated',
  'apr-undetermined',
  'missing-required-figure',
];

describe('the clean instance', () => {
  it('produces nothing, so every finding below is caused by its own mutation', () => {
    const report = checkDisclosureInstance(clean());

    expect(report.findings).toEqual([]);
    expect(report.skipped).toEqual([]);
  });

  it('evaluates every identity except the ones with nothing to decide', () => {
    const report = checkDisclosureInstance(clean());

    expect(report.passed.length + report.notApplicable.length).toBe(IDENTITIES.length);
    // §956(a) is not triggered on a deal with no payments on the merchant's
    // behalf, and that is the only identity the clean instance cannot exercise.
    expect(report.notApplicable.map((n) => n.identity)).toEqual(['itemization-required']);
  });
});

describe('every declared finding kind can actually be produced', () => {
  for (const entry of CORPUS) {
    it(`${entry.kind} — ${entry.label}`, () => {
      const kinds = checkDisclosureInstance(entry.env).findings.map((f) => f.kind);

      expect(kinds).toContain(entry.kind);
    });
  }

  it('leaves no kind in the union unreachable', () => {
    const produced = new Set(CORPUS.flatMap((c) => checkDisclosureInstance(c.env).findings.map((f) => f.kind)));

    expect([...ALL_KINDS].filter((k) => !produced.has(k))).toEqual([]);
  });
});

describe('every identity is exercised, and emits exactly what it declares', () => {
  const produced = new Map<string, Set<InstanceFindingKind>>();

  for (const entry of CORPUS) {
    for (const f of checkDisclosureInstance(entry.env).findings) {
      const set = produced.get(f.identity) ?? new Set<InstanceFindingKind>();
      set.add(f.kind);
      produced.set(f.identity, set);
    }
  }

  for (const identity of IDENTITIES) {
    it(`${identity.id} fires, and only with the kinds it declares`, () => {
      const seen = produced.get(identity.id);

      expect(seen, `${identity.id} was never produced by any instance in the corpus`).toBeDefined();
      expect([...(seen ?? [])].filter((k) => !identity.emits.includes(k))).toEqual([]);
      expect(identity.emits.filter((k) => !(seen ?? new Set()).has(k))).toEqual([]);
    });
  }
});
