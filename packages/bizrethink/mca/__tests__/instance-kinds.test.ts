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
    kind: 'missing-required-figure',
    label: 'the APR row’s prescribed sentence has no assumed-income figure in it',
    env: mutate((e) => {
      e.offerSummary.estimatedAvgMonthlyIncome = null;
    }),
  },
  {
    kind: 'missing-required-figure',
    label: 'the prepayment cap cell is blank, which is undecidable rather than a defect',
    env: mutate((e) => {
      e.offerSummary.maximumNonInterestFinanceCharge = null;
    }),
  },
  {
    kind: 'amount-financed-mismatch',
    label: 'a renewal carries a prior balance and the amount financed ignores it',
    env: mutate((e) => {
      // biome-ignore lint/style/noNonNullAssertion: the clean fixture always carries one
      e.contract!.priorBalanceCarried = 1_000_000;
      // biome-ignore lint/style/noNonNullAssertion: the clean fixture always carries one
      e.contract!.purchasedAmount = 8_450_000;
      e.offerSummary.estimatedTotalPaymentAmount = 8_450_000;
      e.offerSummary.financeCharge = 2_739_500;
      // Correct would be 4_710_500 + 1_000_000.
    }),
  },
  {
    kind: 'finance-charge-mismatch',
    label: 'deferred equipment is treated as a cost of the financing',
    env: mutate((e) => {
      // biome-ignore lint/style/noNonNullAssertion: the clean fixture always carries one
      e.contract!.equipmentCostDeferred = 500_000;
      // biome-ignore lint/style/noNonNullAssertion: the clean fixture always carries one
      e.contract!.purchasedAmount = 7_950_000;
      e.offerSummary.estimatedTotalPaymentAmount = 7_950_000;
      // The charge still reads as if the whole spread were a finance charge:
      // correct is 2_739_500, since §943 excludes the price of goods.
      e.offerSummary.financeCharge = 3_239_500;
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

/*
  EXHAUSTIVE BY THE TYPE, not by hand.

  A plain `InstanceFindingKind[]` literal is a SUBSET: add a member to the union
  in `types.ts`, forget it here, and both the typecheck and the suite stay green
  — which is exactly the vacuous pass this file exists to prevent, reintroduced
  by the file itself. `Record<InstanceFindingKind, true>` is not a subset. Omit
  a key and `tsc -p tsconfig.typecheck.json` fails.
*/
const KIND_MUST_BE_REACHABLE: Record<InstanceFindingKind, true> = {
  'closure-mismatch': true,
  'itemization-disagrees': true,
  'itemization-internally-inconsistent': true,
  'recipient-funds-unexplained': true,
  'itemization-required': true,
  'finance-charge-mismatch': true,
  'finance-charge-below-prepaid': true,
  'amount-financed-mismatch': true,
  'stream-does-not-close': true,
  'payment-contradicts-projection': true,
  'monthly-cost-mismatch': true,
  'prepayment-cap-exceeds-finance-charge': true,
  'apr-below-calculated': true,
  'apr-above-calculated': true,
  'apr-undetermined': true,
  'missing-required-figure': true,
};

const ALL_KINDS = Object.keys(KIND_MUST_BE_REACHABLE) as InstanceFindingKind[];

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

describe('no identity resolves an undisclosed reading against the document', () => {
  /*
    The weekday the first payment lands on is not disclosed. On a term stated in
    CALENDAR days it changes the payment count — 108, 108, 108, 107, 106 across
    Monday through Friday on a 150-day term — which is a wider spread than
    `stream-closure`'s one-payment tolerance.

    `apr.ts` already refused to pick a phase. `stream-closure` and `monthly-cost`
    used to pin it at Monday, so a correctly disclosed Friday-phase stream was
    reported as a violation of an identity it satisfies.
  */
  const fridayPhase = (): DisclosureEnvelope => {
    const env = clean();
    env.offerSummary.estimatedTerm = 150;
    env.offerSummary.termUnit = 'calendar-days';
    // 106 payments is the Friday-phase count inside 150 calendar days.
    env.offerSummary.estimatedPayment = 70_283; // $74,500.00 ÷ 106
    env.offerSummary.estimatedMonthlyCost = 1_509_867; // $74,500 ÷ (150 ÷ 30.4)
    env.offerSummary.estimatedAvgMonthlyIncome = 10_170_000;
    env.offerSummary.estimatedApr = 1.7; // inside the band under every phase

    return env;
  };

  it('does not report a correctly disclosed Friday-phase stream as a violation', () => {
    const kinds = checkDisclosureInstance(fridayPhase()).findings.map((f) => f.kind);

    expect(kinds).not.toContain('stream-does-not-close');
    expect(kinds).not.toContain('monthly-cost-mismatch');
  });

  it('says which phases it evaluated when it does report one', () => {
    const env = fridayPhase();
    env.offerSummary.estimatedPayment = 40_000; // closes under no phase

    const found = checkDisclosureInstance(env).findings.find((f) => f.kind === 'stream-does-not-close');

    expect(found?.assumptions.join(' ')).toContain('every weekday phase was evaluated');
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
