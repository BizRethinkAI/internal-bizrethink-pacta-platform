/**
 * INSTANCE conformity — the numbers on a FILLED disclosure, not the blank form.
 *
 * `prescribed/` checks two things: that our spec matches the statute, and that
 * the blank form matches our spec. Both live entirely in fixed prose. Every
 * defect either has ever found lived in fixed prose.
 *
 * Three REVIEW-01 blockers did not. `ca-funding-provided-is-gross-purchase-price`,
 * `ca-finance-charge-omits-withheld-fees` and `ca-apr-understated` all have the
 * widget in the right row with the right label and the right prescribed
 * sentence beside it. What was wrong was the number written into it. Nothing in
 * `prescribed/` can see that, because nothing in `prescribed/` has ever seen a
 * filled form.
 *
 * WHAT THIS PACKAGE DELIBERATELY DOES NOT DO
 *
 * It does not compute the disclosure. `lombard-platform/src/lib/disclosure-math.ts`
 * computes it, and reimplementing that arithmetic here would produce two
 * calculators that drift, with no way to say which is right when they disagree.
 *
 * Instead this checks IDENTITIES: relationships that must hold between the
 * numbers actually printed on the documents, whoever computed them and however.
 * `estimated_total_payment_amount == funding_provided + finance_charge` is true
 * of any correct sales-based disclosure and false of several wrong ones, and
 * evaluating it requires no calculator at all.
 *
 * The one place arithmetic is unavoidable is the APR, and even there no rate is
 * SOLVED for. See `stream.ts`: the disclosed rate is used to discount the
 * disclosed payment stream, and the resulting present value is compared against
 * the disclosed amount financed. Present value at a GIVEN rate is one closed
 * sum. Finding the rate is the calculator's job and stays there.
 */

/**
 * The jurisdiction axis, and only the jurisdiction axis.
 *
 * California's disclosure once shipped carrying New York's phrasing of a
 * prescribed sentence, in a row 10 CCR §914 closes with "shall include only".
 * Every authority quoted in this package is tagged with the state it came from
 * and filtered on the instance's own jurisdiction, so that cannot recur by
 * accident here.
 */
export type Jurisdiction = 'CA' | 'NY';

/** A dollar amount, in whole cents. Never a float dollar: $0.005 rounding is
 *  exactly the class of error these checks exist to catch. */
export type Cents = number;

/** An annual rate as a fraction: 0.674 is 67.4%. */
export type Rate = number;

/**
 * 10 CCR §955(a)(2) / 23 NYCRR §600.4(a)(2): "an irregular transaction is one
 * that includes one or more of the following features: multiple advances,
 * irregular payment periods, or irregular payment amounts (other than an
 * irregular first period or an irregular first or final payment)".
 */
export type TransactionRegularity = 'regular' | 'irregular';

/**
 * Which calendar days carry a payment.
 *
 * NOT a detail. On the REVIEW-01 sample deal the two conventions give 172.7%
 * and 242.1% for the same corrected figures — a 70-point spread — because
 * Appendix J's unit period is the calendar day while payments land on Workdays.
 *
 * The form itself states the convention: California §914(a)(7)(B)(i) requires
 * the Payment Terms row to carry "a short explanation of when daily payments
 * will be required. For example, on weekdays or every calendar day." So this is
 * read off the document, not assumed — see `conventionFromPaymentTerms`.
 */
export type PaymentDayConvention = 'every-calendar-day' | 'business-days';

/**
 * What the "Estimated Term" figure counts.
 *
 * §914(a)(8)(B) says only "the estimated term of the transaction, calculated in
 * accordance with section 942", and §942 does not say whether the unit is
 * elapsed calendar days or the number of payments. On a business-day product
 * the two differ by a factor of about 1.4, and the disclosed figure is bare
 * ("150 days"), so the reading has to be supplied and recorded rather than
 * guessed. See `UNRESOLVED_READINGS` in `identities.ts`.
 */
export type TermUnit = 'calendar-days' | 'payment-days';

/** A verbatim quotation from a vendored primary source, and where it came from. */
export type Authority = {
  /** e.g. '10 CCR §900(a)(1)(A)'. */
  citation: string;
  /** Reproduced exactly. Asserted to appear in `sourceFile` by the test suite. */
  text: string;
  /** The vendored file in `mca/sources/`. */
  sourceFile: string;
  jurisdiction: Jurisdiction;
};

/**
 * The figures on a filled California or New York sales-based financing offer
 * summary, named as the regulation names them rather than as our PDF does.
 *
 * Every field is what the DOCUMENT says. None of it is an input to a
 * calculation we perform; all of it is output someone else already produced.
 * Nullable fields are nullable because the form may legitimately leave the cell
 * empty, or because we could not read it — those are different, and
 * `missing-required-figure` distinguishes them.
 */
export type OfferSummaryInstance = {
  /** Row 1, second column: "the amount financed" (§914(a)(2)(B)). */
  amountFinanced: Cents;
  /**
   * The `[recipient funds]` figure inside the §914(a)(2)(C)(ii) sentence, which
   * appears only "if the amount financed is greater than the recipient funds".
   * Null means the sentence is absent from the rendered row — which is itself
   * an assertion that amount financed equals recipient funds.
   */
  recipientFunds: Cents | null;
  /** Row 2, second column: "the annual percentage rate calculated in accordance with section 940". */
  estimatedApr: Rate;
  /** Row 3, second column: "the finance charge calculated in accordance with section 943". */
  financeCharge: Cents;
  /** Row 4, second column: "the total dollar amount of estimated payments the recipient will make". */
  estimatedTotalPaymentAmount: Cents;
  /** The inserted row (§914(a)(12)(B)); null where the form omits it. */
  estimatedMonthlyCost: Cents | null;
  /** Row 5: "the average amount of estimated periodic payments calculated in accordance with section 942". */
  estimatedPayment: Cents;
  /** Row 7, second column. Unit per `termUnit`. */
  estimatedTerm: number;
  termUnit: TermUnit;
  /** The split rate stated in the Payment Terms row, as a fraction. */
  specifiedPercentage: number | null;
  /** The income figure the APR row states the calculation assumes (§914(a)(3)(C)). */
  estimatedAvgMonthlyIncome: Cents | null;
  /** The `$[maximum non-interest finance charge]` in the eighth row (§914(a)(10)(A)). */
  maximumNonInterestFinanceCharge: Cents | null;
  /** Read from the Payment Terms row, not assumed. Null when it cannot be read. */
  paymentDayConvention: PaymentDayConvention | null;
};

/**
 * The Itemization of Amount Financed travelling in the same envelope
 * (10 CCR §956; 23 NYCRR §600.17).
 *
 * This document is what makes two of the three blockers detectable at all. The
 * offer summary alone carries the amount financed and the finance charge but
 * nothing that decomposes either, and the two blockers move the same sum in
 * opposite directions — see `closure` in `identities.ts`.
 */
export type ItemizationInstance = {
  /** "Amount Given Directly to You" — §956(a)(1). */
  amountGivenDirectly: Cents;
  /** "Amount Paid on your Account with Us" — §956(a)(2). */
  amountPaidOnAccount: Cents;
  /**
   * Amounts paid to other persons on the recipient's behalf — §956(a)(3).
   *
   * Includes a fee the FINANCER retains, on its own line. The regulation's
   * words cover only amounts "paid to other persons", but §956(a)(4) and (a)(6)
   * make the amount financed lines 1-3 minus the prepaid finance charge, and on
   * a deal whose only deduction is a retained fee the literal reading yields a
   * figure §900(a)(1)(A) contradicts. See `itemization-line-for-a-fee-the-financer-keeps`
   * in `UNRESOLVED_READINGS`. The regulator's own §956(b)(1) example shows a fee
   * on both this line and the prepaid line, which is the shape assumed here.
   */
  amountsPaidToOthers: Cents;
  /** "Amount Provided to You or on Your Behalf" — the stated total of the three above, §956(a)(4). */
  amountProvidedTotal: Cents;
  /** Origination fee and every other fee withheld at or before funding. */
  prepaidFinanceCharge: Cents;
  /** The itemization's own bottom line. */
  amountFinanced: Cents;
};

/**
 * Deal figures printed on the agreement in the same envelope — the FRPA's §1
 * grid and Appendix A fee schedule.
 *
 * These are not calculator internals. They are numbers a recipient can read off
 * a second document that is executed at the same moment, which is why checking
 * the disclosure against them is a document-to-document identity rather than a
 * reimplementation.
 */
export type ContractTerms = {
  purchasePrice: Cents;
  purchasedAmount: Cents;
  /** FRPA §1.3, deferred into the purchased amount: the price of goods, not a cost of the financing. */
  equipmentCostDeferred: Cents;
  /**
   * A prior balance carried onto the purchased amount at face on a renewal —
   * funds provided on the recipient's behalf, financed without a factor.
   *
   * NOT IN THE COMPUTATION SPEC. The spec's assertion 1 reads
   * `funding_provided == purchase_price - prepaid_finance_charges`, which
   * assumes the funds provided are the purchase price and nothing else; its own
   * Itemization section contradicts that by making the amount financed the sum
   * of cash to the merchant, amounts credited on account and payoffs to others,
   * net of prepaid charges. `lombard-platform` follows the second reading
   * (`priorBalanceCarried`, ADR 0041). Carried here so a renewal is not
   * reported as a defect, and recorded as a finding against the spec rather
   * than resolved silently.
   */
  priorBalanceCarried: Cents;
  /** Each fee withheld at or before funding, named. Their sum is the prepaid finance charge. */
  feesWithheldAtFunding: { label: string; amount: Cents }[];
};

export type DisclosureEnvelope = {
  jurisdiction: Jurisdiction;
  offerSummary: OfferSummaryInstance;
  itemization?: ItemizationInstance;
  contract?: ContractTerms;
  /**
   * Defaults to 'irregular'. Sales-based financing is irregular on its face:
   * the payment amount varies with every Workday's settlement, which is
   * §955(a)(2)'s "irregular payment amounts". Overridable so the assumption is
   * visible rather than welded in.
   */
  regularity?: TransactionRegularity;
};

/**
 * Severity, and why there are three rather than two.
 *
 * 'undetermined' is the important one. Several checks depend on a reading the
 * document does not fix — most sharply the payment-day convention, where the
 * same figures are lawful under one reading and unlawful under the other. A
 * checker that resolved that silently would be asserting a legal reading it has
 * no authority for; a checker that dropped the row would report a clean form.
 * Neither is honest, so it says so instead, and phase 2 surfaces it to a human.
 */
export type InstanceSeverity = 'violation' | 'undetermined';

export type InstanceFindingKind =
  /** total ≠ amount financed + finance charge. */
  | 'closure-mismatch'
  /** The offer summary and the itemization disagree on the amount financed. */
  | 'itemization-disagrees'
  /** The itemization does not add up on its own terms. */
  | 'itemization-internally-inconsistent'
  /** Amount financed exceeds recipient funds by more than the itemization pays out on the recipient's behalf. */
  | 'recipient-funds-unexplained'
  /** §956(a) requires the Itemization and it is not in the envelope. */
  | 'itemization-required'
  /** The finance charge does not equal the discount plus the withheld fees. */
  | 'finance-charge-mismatch'
  /** The finance charge is smaller than the fees withheld at funding, which §943(a)(1) puts inside it. */
  | 'finance-charge-below-prepaid'
  /** The amount financed does not equal the purchase price net of withheld fees. */
  | 'amount-financed-mismatch'
  /** Estimated payment × the number of payments ≠ the estimated total. */
  | 'stream-does-not-close'
  /** The estimated payment contradicts the split rate and income the form itself states. */
  | 'payment-contradicts-projection'
  /** §900(a)(12): total ÷ (term days ÷ 30.4). */
  | 'monthly-cost-mismatch'
  /** The prepayment cap exceeds the finance charge it is a portion of. */
  | 'prepayment-cap-exceeds-finance-charge'
  /** The disclosed rate is further below the calculated one than the tolerance allows. */
  | 'apr-below-calculated'
  /** The disclosed rate sits above the calculated one. */
  | 'apr-above-calculated'
  /** The APR verdict depends on a reading the document does not fix. */
  | 'apr-undetermined'
  /** A second-column figure the regulation requires is not populated. */
  | 'missing-required-figure';

export type InstanceFinding = {
  kind: InstanceFindingKind;
  severity: InstanceSeverity;
  /** The identity in `IDENTITIES` that produced this. */
  identity: string;
  /** Statutory hooks for THIS jurisdiction only. */
  authorities: Authority[];
  detail: string;
  /** Every assumption the verdict rests on, stated so it can be disputed. */
  assumptions: string[];
};
