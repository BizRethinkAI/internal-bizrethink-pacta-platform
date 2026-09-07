import { evaluateApr } from './apr';
import {
  AMOUNT_FINANCED,
  APR_METHOD,
  APR_ROW_ASSUMED_INCOME,
  ESTIMATED_MONTHLY_COST,
  ESTIMATED_STREAM_INPUTS,
  FINANCE_CHARGE_DISCOUNT,
  FINANCE_CHARGE_REG_Z,
  ITEMIZATION_REQUIRED,
  PERIODIC_PAYMENT_ROW,
  PREPAID_FINANCE_CHARGE,
  PREPAYMENT_CAP,
  RECIPIENT_FUNDS,
  TOTAL_PAYMENT_ROW,
} from './authorities';
import { buildEstimatedStream } from './stream';
import type { Authority, Cents, DisclosureEnvelope, InstanceFinding, InstanceFindingKind, Jurisdiction } from './types';

/**
 * The identities.
 *
 * An identity is a relationship that must hold between numbers PRINTED on the
 * documents in one envelope, whoever computed them and however. It is not a
 * recomputation: `estimated_total_payment_amount == funding_provided +
 * finance_charge` is true of every correct sales-based disclosure and false of
 * several wrong ones, and deciding it needs no calculator.
 *
 * THREE THINGS EVERY ENTRY CARRIES, AND WHY THE SEPARATION MATTERS
 *
 * `authorities` — verbatim statutory text, per state, asserted to exist in the
 *   vendored source by the test suite.
 * `derivation` — OUR reading: the step from those quotations to the arithmetic.
 *   Never authority. REVIEW-01's central defect in the inherited documents was
 *   judgement presented as authority, and keeping these in separate fields is
 *   what stops that recurring by drift.
 * `catches` — the REVIEW-01 finding ids this identity actually detects. Where
 *   an identity is BLIND to a blocker it looks like it should catch, that is
 *   recorded in `blindTo` rather than left implied.
 */

export type IdentityRequirement = 'contract' | 'itemization' | 'prepaid-total';

export type IdentityContext = {
  /**
   * The sum of every fee withheld at or before funding, where the envelope
   * discloses it — from the agreement's fee schedule or from the Itemization's
   * prepaid finance charge line. Null when neither document is present.
   */
  prepaidTotal: Cents | null;
};

export type Identity = {
  id: string;
  /** What it is checking, in one line. */
  statement: string;
  emits: InstanceFindingKind[];
  authorities: Record<Jurisdiction, Authority[]>;
  derivation: string;
  /** REVIEW-01 finding ids this identity detects. */
  catches: string[];
  /** REVIEW-01 finding ids it might be expected to detect and does not. */
  blindTo?: { finding: string; why: string }[];
  requires: IdentityRequirement[];
  /**
   * Whether the identity has anything to decide on THIS instance.
   *
   * Separate from `evaluate` returning no findings, and the separation is the
   * point: an identity whose input is blank produces an empty array exactly as
   * an identity that checked and was satisfied does, and reporting the two the
   * same way is how a suite ends up green while checking nothing. `check.ts`
   * counts these as not-applicable rather than as passes.
   */
  applicable?: (env: DisclosureEnvelope) => { ok: true } | { ok: false; reason: string };
  evaluate: (env: DisclosureEnvelope, ctx: IdentityContext) => Omit<InstanceFinding, 'identity' | 'authorities'>[];
};

const usd = (cents: Cents): string =>
  `$${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const pct = (rate: number): string => `${(rate * 100).toFixed(2)}%`;

/** 10 CCR §900(a)(12): "a provider may divide the number of days in the estimated contract term by 30.4." */
const DAYS_PER_MONTH = 30.4;

/**
 * Readings this package has taken that the text does not settle. Each one is a
 * question for counsel, and each one is load-bearing for at least one check.
 */
export const UNRESOLVED_READINGS = [
  {
    id: 'term-unit',
    question:
      'Does the Estimated Term figure count elapsed calendar days or the number of payments? §914(a)(8)(B) and §942 do not say, and on a weekday product the two differ by a factor of about 1.4.',
    effect: 'Changes the payment count, the calculated APR, and the estimated monthly cost.',
  },
  {
    id: 'relative-tolerance-direction',
    question:
      '§955(a)(3) and §600.4(a)(3) word the 2.5% relative test one-directionally, so read literally it is satisfied by any overstatement however large — which would leave "below" in §955(a)(1)-(2) doing no work. We read (a)(3) as extending the band only in the direction the point tests permit.',
    effect: 'A California overstatement of up to 2.5% relative is reported rather than forgiven.',
  },
  {
    id: 'weekday-phase',
    question:
      'The offer summary states that payments fall on business days but not which weekday the first one lands on, and carries no funding date. The choice moves the calculated rate by about 3.1 percentage points on a 150-payment stream.',
    effect: 'The APR verdict is reported as undetermined whenever the five phases disagree.',
  },
  {
    id: 'itemization-line-for-a-fee-the-financer-keeps',
    question:
      '§956(a)(3) covers "amounts paid to other persons by the financer on the recipient’s behalf". An origination fee Lombard retains is paid to nobody else, so the regulation offers no line for it — yet §956(a)(4) and (a)(6) make the amount financed the sum of lines 1-3 minus the prepaid finance charge. Taken literally on a $50,000 deal with $2,895 retained, that gives $47,105 − $2,895 = $44,210, contradicting §900(a)(1)(A), which gives $47,105. The regulator’s own example at §956(b)(1) shows a brokerage fee on BOTH the paid-to-others line and the prepaid line, which resolves it — but only because that fee went to a third party.',
    effect:
      'This package reads the retained fee as belonging on a line under §956(a)(3) so the Itemization’s arithmetic yields the statutory amount financed. DISCLOSURE-COMPUTATION-SPEC.md’s Itemization table does not, and its three rules taken together produce $44,210 on exactly the deal shape the blockers arose on.',
  },
  {
    id: 'carry-renewal',
    question:
      'Where a renewal carries a prior balance onto the purchased amount at face, the funds provided exceed the purchase price. Neither the computation spec nor the prescribed form has a field for that; lombard-platform models it as `priorBalanceCarried` under ADR 0041.',
    effect:
      'The amount-financed and finance-charge identities accept a disclosed carried balance so a renewal is not reported as a defect, which is an extension beyond the written spec.',
  },
] as const;

const finding = (
  kind: InstanceFindingKind,
  severity: InstanceFinding['severity'],
  detail: string,
  assumptions: string[] = [],
): Omit<InstanceFinding, 'identity' | 'authorities'> => ({ kind, severity, detail, assumptions });

const both = (byState: Record<Jurisdiction, Authority>[]): Record<Jurisdiction, Authority[]> => ({
  CA: byState.map((a) => a.CA),
  NY: byState.map((a) => a.NY),
});

export const IDENTITIES: Identity[] = [
  {
    id: 'closure',
    statement: 'estimated total payment amount == amount financed + finance charge (+ any deferred equipment cost)',
    emits: ['closure-mismatch'],
    authorities: both([AMOUNT_FINANCED, FINANCE_CHARGE_DISCOUNT, FINANCE_CHARGE_REG_Z, TOTAL_PAYMENT_ROW]),
    derivation:
      'Amount financed is the purchase price net of prepaid charges; the finance charge is the discount on the receivables plus those same prepaid charges. Adding them cancels the prepaid term and leaves the purchased amount, which is what the recipient pays — the fourth row. Equipment deferred into the purchased amount is the price of goods rather than a cost of the financing and sits in neither, so it appears on the payment side only. This is the ONLY identity that needs no second document.',
    catches: [],
    blindTo: [
      {
        finding: 'ca-funding-provided-is-gross-purchase-price',
        why: 'That blocker overstates the amount financed by exactly the withheld fees and the finance-charge blocker understates the charge by exactly the same amount. Their sum is unchanged, so a form carrying both passes this identity. It fired on the real sample instance only because the total was wrong as well.',
      },
      {
        finding: 'ca-finance-charge-omits-withheld-fees',
        why: 'Same cancellation, from the other side.',
      },
    ],
    requires: [],
    evaluate: (env) => {
      const { offerSummary: o, contract } = env;
      const equipment = contract?.equipmentCostDeferred ?? 0;
      const expected = o.amountFinanced + o.financeCharge + equipment;

      if (expected === o.estimatedTotalPaymentAmount) {
        return [];
      }

      return [
        finding(
          'closure-mismatch',
          'violation',
          `the fourth row states ${usd(o.estimatedTotalPaymentAmount)}, but the amount financed ${usd(
            o.amountFinanced,
          )} plus the finance charge ${usd(o.financeCharge)}${
            equipment > 0 ? ` plus deferred equipment ${usd(equipment)}` : ''
          } is ${usd(expected)} — a gap of ${usd(Math.abs(expected - o.estimatedTotalPaymentAmount))}`,
          contract ? [] : ['no agreement in the envelope, so any deferred equipment cost was assumed to be zero'],
        ),
      ];
    },
  },

  {
    id: 'amount-financed',
    statement: 'amount financed == purchase price (+ any carried prior balance) − every fee withheld at funding',
    emits: ['amount-financed-mismatch'],
    authorities: both([AMOUNT_FINANCED, PREPAID_FINANCE_CHARGE]),
    derivation:
      'A prepaid finance charge is defined to include anything "withheld from the proceeds of the financing at any time", so every fee netted out at funding reduces the amount financed. The purchase price and the fee schedule are printed on the agreement travelling in the same envelope, which makes this a document-to-document comparison rather than a recomputation. The carried-balance term is an extension beyond the written spec — see UNRESOLVED_READINGS.',
    catches: ['ca-funding-provided-is-gross-purchase-price'],
    requires: ['contract'],
    evaluate: (env) => {
      const { offerSummary: o, contract } = env;

      if (!contract) {
        return [];
      }

      const withheld = contract.feesWithheldAtFunding.reduce((s, f) => s + f.amount, 0);
      const expected = contract.purchasePrice + contract.priorBalanceCarried - withheld;

      if (expected === o.amountFinanced) {
        return [];
      }

      return [
        finding(
          'amount-financed-mismatch',
          'violation',
          `row 1 states ${usd(o.amountFinanced)}; the agreement's purchase price ${usd(
            contract.purchasePrice,
          )} less ${contract.feesWithheldAtFunding
            .map((f) => `${f.label} ${usd(f.amount)}`)
            .join(' and ')} is ${usd(expected)}`,
        ),
      ];
    },
  },

  {
    id: 'finance-charge',
    statement:
      'finance charge == (purchased amount − purchase price − carried balance − deferred equipment) + every fee withheld at funding',
    emits: ['finance-charge-mismatch'],
    authorities: both([FINANCE_CHARGE_REG_Z, FINANCE_CHARGE_DISCOUNT, PREPAID_FINANCE_CHARGE]),
    derivation:
      'The finance charge is the sum of two limbs, not one: the discount taken on the face value of the receivables, which is the factor spread, PLUS every charge that would be a finance charge under 12 C.F.R. §1026.4 — which catches an origination fee withheld at funding. A withheld fee therefore appears in BOTH quantities, subtracted from the amount financed and added to the finance charge. That looks like double counting and is not; it is what makes a withheld fee expensive in the APR.',
    catches: ['ca-finance-charge-omits-withheld-fees'],
    requires: ['contract'],
    evaluate: (env) => {
      const { offerSummary: o, contract } = env;

      if (!contract) {
        return [];
      }

      const withheld = contract.feesWithheldAtFunding.reduce((s, f) => s + f.amount, 0);
      const spread =
        contract.purchasedAmount -
        contract.purchasePrice -
        contract.priorBalanceCarried -
        contract.equipmentCostDeferred;
      const expected = spread + withheld;

      if (expected === o.financeCharge) {
        return [];
      }

      return [
        finding(
          'finance-charge-mismatch',
          'violation',
          `row 3 states ${usd(o.financeCharge)}; the discount on the receivables ${usd(
            spread,
          )} plus the fees withheld at funding ${usd(withheld)} is ${usd(expected)}`,
        ),
      ];
    },
  },

  {
    id: 'finance-charge-floor',
    statement: 'finance charge >= every fee withheld at funding',
    emits: ['finance-charge-below-prepaid'],
    authorities: both([FINANCE_CHARGE_REG_Z, PREPAID_FINANCE_CHARGE]),
    derivation:
      'The withheld fees are inside the finance charge by §943(a)(1) and the discount limb is non-negative for a purchase at or below face, so the charge cannot be smaller than the fees alone. Weaker than the `finance-charge` identity and it survives where that one cannot run — an envelope holding the Itemization but not the agreement still discloses the prepaid total.',
    catches: [],
    blindTo: [
      {
        finding: 'ca-finance-charge-omits-withheld-fees',
        why: 'The defective charge of $24,500 is still far above the $2,895 of withheld fees, so the floor is satisfied. Omitting the fees from a large spread does not push the charge below them.',
      },
    ],
    requires: ['prepaid-total'],
    evaluate: (env, ctx) => {
      if (ctx.prepaidTotal === null || env.offerSummary.financeCharge >= ctx.prepaidTotal) {
        return [];
      }

      return [
        finding(
          'finance-charge-below-prepaid',
          'violation',
          `row 3 states ${usd(env.offerSummary.financeCharge)}, which is less than the ${usd(
            ctx.prepaidTotal,
          )} withheld at funding — §943(a)(1) puts those charges inside the finance charge`,
        ),
      ];
    },
  },

  {
    id: 'itemization-agreement',
    statement: "the offer summary's amount financed == the Itemization's amount financed",
    emits: ['itemization-disagrees'],
    authorities: both([AMOUNT_FINANCED, ITEMIZATION_REQUIRED]),
    derivation:
      'The two documents go out in the same envelope and describe the same quantity. If they disagree, one of them is wrong, and nothing downstream can tell which.',
    catches: ['ca-funding-provided-is-gross-purchase-price'],
    requires: ['itemization'],
    evaluate: (env) => {
      const { offerSummary: o, itemization: i } = env;

      if (!i || i.amountFinanced === o.amountFinanced) {
        return [];
      }

      return [
        finding(
          'itemization-disagrees',
          'violation',
          `the offer summary states ${usd(o.amountFinanced)} and the Itemization of Amount Financed states ${usd(
            i.amountFinanced,
          )}`,
        ),
      ];
    },
  },

  {
    id: 'itemization-internal',
    statement:
      'the Itemization adds up: total provided == the three components, and amount financed == total − prepaid',
    emits: ['itemization-internally-inconsistent'],
    authorities: both([AMOUNT_FINANCED, PREPAID_FINANCE_CHARGE, ITEMIZATION_REQUIRED]),
    derivation:
      'The Itemization exists because the amount financed is smaller than the funds the recipient sees, and it shows the reader that subtraction. Its own rows must therefore satisfy it.',
    catches: [],
    requires: ['itemization'],
    evaluate: (env) => {
      const i = env.itemization;

      if (!i) {
        return [];
      }

      const out: ReturnType<Identity['evaluate']> = [];
      const componentSum = i.amountGivenDirectly + i.amountPaidOnAccount + i.amountsPaidToOthers;

      if (componentSum !== i.amountProvidedTotal) {
        out.push(
          finding(
            'itemization-internally-inconsistent',
            'violation',
            `the Itemization states a total provided of ${usd(i.amountProvidedTotal)}; its three components sum to ${usd(
              componentSum,
            )}`,
          ),
        );
      }

      if (i.amountProvidedTotal - i.prepaidFinanceCharge !== i.amountFinanced) {
        out.push(
          finding(
            'itemization-internally-inconsistent',
            'violation',
            `the Itemization states an amount financed of ${usd(i.amountFinanced)}; its total provided ${usd(
              i.amountProvidedTotal,
            )} less its prepaid finance charge ${usd(i.prepaidFinanceCharge)} is ${usd(
              i.amountProvidedTotal - i.prepaidFinanceCharge,
            )}`,
          ),
        );
      }

      return out;
    },
  },

  {
    id: 'recipient-funds',
    statement: 'the offer summary’s recipient-funds figure == the Itemization’s "Amount Given Directly to You"',
    emits: ['recipient-funds-unexplained'],
    authorities: both([RECIPIENT_FUNDS, ITEMIZATION_REQUIRED, AMOUNT_FINANCED]),
    derivation:
      '§956(a)(1) makes the Itemization’s first line the recipient funds by name, and §900(a)(26) defines those as the net amount given directly to the recipient — so the two documents are stating one quantity twice. Where row 1 omits the §914(a)(2)(C)(ii) sentence it is asserting that recipient funds EQUAL the amount financed, and that assertion is compared instead. Note what this identity is NOT: an attempt to explain the gap between the amount financed and recipient funds out of the Itemization’s payment lines. That relation is amountFinanced − recipientFunds == onAccount + toOthers − prepaid, which is just `itemization-internal` restated, and stating it twice would double-report one defect.',
    catches: [],
    requires: ['itemization'],
    evaluate: (env) => {
      const { offerSummary: o, itemization: i } = env;

      if (!i) {
        return [];
      }

      // With the sentence absent the form asserts the two are the same figure.
      const stated = o.recipientFunds ?? o.amountFinanced;

      if (stated === i.amountGivenDirectly) {
        return [];
      }

      return [
        finding(
          'recipient-funds-unexplained',
          'violation',
          `${
            o.recipientFunds === null
              ? `row 1 carries no recipient-funds sentence, so it asserts recipient funds of ${usd(stated)}`
              : `row 1 states recipient funds of ${usd(stated)}`
          }; the Itemization gives directly ${usd(i.amountGivenDirectly)}`,
          o.recipientFunds === null
            ? ['the absence of the §914(a)(2)(C)(ii) sentence was read as an assertion that the two figures are equal']
            : [],
        ),
      ];
    },
  },

  {
    id: 'itemization-required',
    statement: 'if the amount financed exceeds recipient funds, the Itemization must be in the envelope',
    emits: ['itemization-required'],
    authorities: both([ITEMIZATION_REQUIRED, RECIPIENT_FUNDS]),
    derivation:
      'A trigger, not arithmetic. §914(a)(2)(C)(ii) puts the recipient-funds sentence in row 1 under the same condition, so a form carrying that sentence is itself asserting that the Itemization is required.',
    catches: [],
    requires: [],
    applicable: (env) =>
      env.offerSummary.recipientFunds === null
        ? {
            ok: false,
            reason:
              'row 1 does not carry the recipient-funds sentence, so on the form’s own account the amount financed equals recipient funds and §956(a) is not triggered',
          }
        : { ok: true },
    evaluate: (env) => {
      const { offerSummary: o } = env;

      if (o.recipientFunds === null || o.amountFinanced <= o.recipientFunds || env.itemization) {
        return [];
      }

      return [
        finding(
          'itemization-required',
          'violation',
          `row 1 states an amount financed of ${usd(o.amountFinanced)} against recipient funds of ${usd(
            o.recipientFunds,
          )}, which requires an Itemization of Amount Financed; none is in the envelope`,
        ),
      ];
    },
  },

  {
    id: 'stream-closure',
    statement: 'the average periodic payment times the number of payments == the estimated total',
    emits: ['stream-does-not-close'],
    authorities: both([TOTAL_PAYMENT_ROW, PERIODIC_PAYMENT_ROW]),
    derivation:
      'The fifth row is the AVERAGE periodic payment and the fourth is the total of all payments, so their product over the payment count is the total up to one payment of rounding. A wider gap means one of the two rows does not describe the same stream as the other — and the APR is discounted over that stream.',
    catches: [],
    requires: [],
    evaluate: (env) => {
      const { offerSummary: o } = env;
      const stream = buildEstimatedStream(o, {
        convention: o.paymentDayConvention ?? 'every-calendar-day',
        firstPaymentWeekday: 0,
      });
      const implied = o.estimatedPayment * stream.length;
      const gap = Math.abs(implied - o.estimatedTotalPaymentAmount);

      if (gap <= o.estimatedPayment) {
        return [];
      }

      return [
        finding(
          'stream-does-not-close',
          'violation',
          `${usd(o.estimatedPayment)} across ${stream.length} payments is ${usd(implied)}, against a disclosed total of ${usd(
            o.estimatedTotalPaymentAmount,
          )} — a gap of ${usd(gap)}`,
          [
            o.paymentDayConvention === null
              ? 'the payment-day convention was not captured, so every calendar day was assumed'
              : `payments fall on ${o.paymentDayConvention === 'business-days' ? 'business days' : 'every calendar day'}, per the Payment Terms row`,
            o.termUnit === 'payment-days'
              ? 'the Estimated Term figure was read as a count of payments'
              : 'the Estimated Term figure was read as elapsed calendar days',
          ],
        ),
      ];
    },
  },

  {
    id: 'payment-projection',
    statement: 'the average periodic payment reflects the split rate and the income the form itself states',
    emits: ['payment-contradicts-projection'],
    authorities: both([ESTIMATED_STREAM_INPUTS, APR_ROW_ASSUMED_INCOME, PERIODIC_PAYMENT_ROW]),
    derivation:
      'The APR row states the average monthly income the calculation assumes and the Payment Terms row states the split. The estimated payment is built from the projection and the split, so the three cohere on a correct form. §942(a) also lets minimum payments, split changes and true-ups move the figure, and none of those is a number on the offer summary — so a mismatch is reported as UNDECIDABLE rather than asserted as a violation. The size of the discrepancy is the useful output, not the verdict.',
    catches: [],
    requires: [],
    applicable: (env) => {
      const { specifiedPercentage, estimatedAvgMonthlyIncome } = env.offerSummary;

      if (specifiedPercentage === null || specifiedPercentage <= 0) {
        return { ok: false, reason: 'the Payment Terms row does not state a split rate' };
      }

      if (estimatedAvgMonthlyIncome === null) {
        return { ok: false, reason: 'the APR row does not state the assumed average monthly income' };
      }

      return { ok: true };
    },
    evaluate: (env) => {
      const { offerSummary: o } = env;

      if (o.specifiedPercentage === null || o.estimatedAvgMonthlyIncome === null || o.specifiedPercentage <= 0) {
        return [];
      }

      const paymentDaysPerMonth =
        o.paymentDayConvention === 'business-days' ? (DAYS_PER_MONTH * 5) / 7 : DAYS_PER_MONTH;
      const impliedMonthlyIncome = Math.round((o.estimatedPayment * paymentDaysPerMonth) / o.specifiedPercentage);
      const ratio = impliedMonthlyIncome / o.estimatedAvgMonthlyIncome;

      if (ratio > 0.9 && ratio < 1.1) {
        return [];
      }

      return [
        finding(
          'payment-contradicts-projection',
          'undetermined',
          `${usd(o.estimatedPayment)} per payment at the disclosed ${pct(
            o.specifiedPercentage,
          )} split implies average monthly income of about ${usd(
            impliedMonthlyIncome,
          )}, against the ${usd(o.estimatedAvgMonthlyIncome)} the APR row states`,
          [
            `${paymentDaysPerMonth.toFixed(2)} payment days per month`,
            '§942(a) permits minimum payments, split changes and true-ups to move the figure, and none of those appears on the offer summary',
          ],
        ),
      ];
    },
  },

  {
    id: 'monthly-cost',
    statement: 'estimated monthly cost == the estimated total over the number of months in the term',
    emits: ['monthly-cost-mismatch'],
    authorities: both([ESTIMATED_MONTHLY_COST, TOTAL_PAYMENT_ROW]),
    derivation:
      'A definition, applied. The regulation says a provider MAY count months by dividing the term in days by 30.4, so a different month count is permitted; a 2% band covers any reasonable one. Where the term is disclosed as a payment count rather than elapsed days, the calendar span of the stream is used and that is recorded as an assumption.',
    catches: [],
    requires: [],
    applicable: (env) =>
      env.offerSummary.estimatedMonthlyCost === null
        ? { ok: false, reason: 'the Estimated Monthly Cost row carries no figure — reported by `required-figures`' }
        : { ok: true },
    evaluate: (env) => {
      const { offerSummary: o } = env;

      if (o.estimatedMonthlyCost === null) {
        return [];
      }

      const stream = buildEstimatedStream(o, {
        convention: o.paymentDayConvention ?? 'every-calendar-day',
        firstPaymentWeekday: 0,
      });
      const termDays = o.termUnit === 'calendar-days' ? o.estimatedTerm : stream[stream.length - 1].calendarDayOffset;
      const expected = Math.round(o.estimatedTotalPaymentAmount / (termDays / DAYS_PER_MONTH));

      if (Math.abs(expected - o.estimatedMonthlyCost) <= 0.02 * expected) {
        return [];
      }

      return [
        finding(
          'monthly-cost-mismatch',
          'violation',
          `the inserted row states ${usd(o.estimatedMonthlyCost)}; ${usd(
            o.estimatedTotalPaymentAmount,
          )} over ${termDays} days is ${usd(expected)} a month`,
          o.termUnit === 'payment-days'
            ? ['the Estimated Term figure was read as a count of payments, so the calendar span of the stream was used']
            : [],
        ),
      ];
    },
  },

  {
    id: 'prepayment-cap',
    statement: 'the prepayment cap does not exceed the finance charge it is a portion of',
    emits: ['prepayment-cap-exceeds-finance-charge'],
    authorities: both([PREPAYMENT_CAP, FINANCE_CHARGE_DISCOUNT]),
    derivation:
      'The prescribed sentence says the recipient "must pay all or a portion of the finance charge, up to $[maximum non-interest finance charge]". A cap above the finance charge is not a portion of it.',
    catches: [],
    requires: [],
    applicable: (env) =>
      env.offerSummary.maximumNonInterestFinanceCharge === null
        ? { ok: false, reason: 'the prepayment row carries no cap figure — reported by `required-figures`' }
        : { ok: true },
    evaluate: (env) => {
      const { offerSummary: o } = env;

      if (o.maximumNonInterestFinanceCharge === null || o.maximumNonInterestFinanceCharge <= o.financeCharge) {
        return [];
      }

      return [
        finding(
          'prepayment-cap-exceeds-finance-charge',
          'violation',
          `the prepayment row caps the charge at ${usd(
            o.maximumNonInterestFinanceCharge,
          )}, above the finance charge of ${usd(o.financeCharge)}`,
        ),
      ];
    },
  },

  {
    id: 'required-figures',
    statement: 'every second-column figure the regulation requires is populated',
    emits: ['missing-required-figure'],
    authorities: both([ESTIMATED_MONTHLY_COST, APR_ROW_ASSUMED_INCOME, PREPAYMENT_CAP]),
    derivation:
      'A blank where the regulation prescribes a figure is not the prescribed form. The monthly-cost row is required whenever payments are not monthly, and the APR row’s prescribed sentence has a slot for the assumed income, so both blanks are defects. Which prepayment branch applies is a fact about the contract rather than about any number on the form, so a missing cap is reported as undecidable.',
    catches: [],
    requires: [],
    evaluate: (env) => {
      const { offerSummary: o } = env;
      const out: ReturnType<Identity['evaluate']> = [];

      if (o.estimatedMonthlyCost === null && o.paymentDayConvention !== null) {
        out.push(
          finding(
            'missing-required-figure',
            'violation',
            'payments are not monthly, so the Estimated Monthly Cost row is required and its figure is blank',
          ),
        );
      }

      if (o.estimatedAvgMonthlyIncome === null) {
        out.push(
          finding(
            'missing-required-figure',
            'violation',
            'the APR row’s prescribed sentence states the assumed average monthly income and the figure is blank',
          ),
        );
      }

      if (o.maximumNonInterestFinanceCharge === null) {
        out.push(
          finding(
            'missing-required-figure',
            'undetermined',
            'the maximum non-interest finance charge is blank; whether the row requires it depends on which prepayment branch the contract falls under, which is not a figure on this form',
          ),
        );
      }

      return out;
    },
  },

  {
    id: 'apr-round-trip',
    statement:
      'discounting the estimated stream at the disclosed rate returns the disclosed amount financed, within the state’s tolerance',
    emits: ['apr-below-calculated', 'apr-above-calculated', 'apr-undetermined'],
    authorities: both([APR_METHOD, AMOUNT_FINANCED, ESTIMATED_STREAM_INPUTS]),
    derivation:
      'Present value is strictly decreasing in the rate, so the tolerance band on the calculated rate inverts into a band on the present value at two rates we already know. That turns the whole question into two closed sums and two comparisons, with no rate solved for anywhere — which is why this package does not contain a second copy of the platform’s calculator. Where the document leaves a reading open and the readings disagree, the verdict is undetermined rather than picked.',
    catches: ['ca-apr-understated'],
    requires: [],
    evaluate: (env) => {
      const evaluation = evaluateApr(env);

      if (evaluation.outcome === 'accurate') {
        return [];
      }

      const scope =
        evaluation.readings.length === 1
          ? 'on the disclosed payment-day convention'
          : 'under every weekday phase and payment-day convention evaluated';

      if (evaluation.outcome === 'undetermined') {
        const worst = evaluation.readings.filter((r) => r.outcome !== 'accurate');

        return [
          finding(
            'apr-undetermined',
            'undetermined',
            `the disclosed ${pct(evaluation.disclosed)} is accurate under ${
              evaluation.readings.length - worst.length
            } of ${evaluation.readings.length} readings the document leaves open, and ${
              worst[0].outcome === 'below' ? 'understated' : 'overstated'
            } under the rest`,
            evaluation.assumptions,
          ),
        ];
      }

      if (evaluation.outcome === 'below') {
        // Quote the reading MOST favourable to the document — the smallest
        // present value at the top of the band — so the stated margin is the
        // narrowest one, not the most damning one.
        const kindest = evaluation.readings.reduce((a, b) =>
          a.presentValueAtBandMax <= b.presentValueAtBandMax ? a : b,
        );

        return [
          finding(
            'apr-below-calculated',
            'violation',
            `the disclosed ${pct(evaluation.disclosed)} is further below the calculated rate than the tolerance allows ${scope}: at the highest rate it could stand for, the stream discounts to ${usd(
              Math.round(kindest.presentValueAtBandMax),
            )}, against a disclosed amount financed of ${usd(kindest.amountFinanced)}`,
            evaluation.assumptions,
          ),
        ];
      }

      const kindest = evaluation.readings.reduce((a, b) =>
        a.presentValueAtBandMin >= b.presentValueAtBandMin ? a : b,
      );

      return [
        finding(
          'apr-above-calculated',
          'violation',
          `the disclosed ${pct(evaluation.disclosed)} sits above the calculated rate ${scope}: at the lowest rate it could stand for, the stream discounts to ${usd(
            Math.round(kindest.presentValueAtBandMin),
          )}, against a disclosed amount financed of ${usd(kindest.amountFinanced)}`,
          [
            ...evaluation.assumptions,
            env.jurisdiction === 'CA'
              ? '§955(a) does not forgive an overstatement in any amount, but §955(c) gives no liability for INADVERTENTLY disclosing a rate above the required one — so this is a defect to correct rather than an exposure on its own'
              : '§600.4(a)(1)-(2) forgive an overstatement within the point band; this one is outside it',
          ],
        ),
      ];
    },
  },
];
