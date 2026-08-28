/**
 * How a partial first (or final) month of rent is apportioned.
 *
 * Worth making explicit rather than assuming, because the two executed leases
 * for this property state two different conventions — and the First In lease
 * states a third in prose ("per diem based on 365-day year") while its own
 * arithmetic uses the actual length of the start month.
 */
export type ProrationMethod =
  /** Monthly rent ÷ days in the actual start month × days occupied. */
  | 'actual-days-in-month'
  /** Monthly rent ÷ 30 × days occupied. The Zillow lease's stated convention. */
  | 'thirty-day-month'
  /** Annual rent ÷ 365 × days occupied. */
  | 'actual-365';

export type DepositAnswers = {
  /** Security deposit held under THIS lease. */
  securityUsd: number;
  /**
   * How much of that deposit was already collected under a prior tenancy and
   * carried forward. The field Zillow does not have, and the absence of which
   * forced a false choice between double-charging the tenant and misstating
   * the deposit.
   */
  alreadyHeldUsd: number;
  /** Advance rent required for the final month — semantically one month's rent. */
  advanceRentUsd: number;
  /** How much advance rent is already held from a prior tenancy. */
  advanceRentHeldUsd: number;
  /**
   * A block of rent prepaid at execution beyond the first and final months.
   * The First In lease collected $25,200 this way, expressly not escrowed, so
   * it is its own concept rather than a variant of either figure above.
   */
  prepaidRentUsd: number;
};

export type MoneyAnswers = {
  rent: {
    monthlyUsd: number;
    /** Day of month rent falls due. Proration applies when the term starts elsewhere. */
    dueDayOfMonth: number;
  };
  term: {
    /** ISO `yyyy-mm-dd`. */
    startDate: string;
  };
  deposit: DepositAnswers;
  prorationMethod: ProrationMethod;
};

export type MoneyLine = {
  label: string;
  amountUsd: number;
};

export type MoneyDerivation = {
  /** Stated in the lease as held. Not necessarily collected now. */
  depositHeldUsd: number;
  /** Collected at execution. Zero when the deposit was carried in. */
  depositDueAtExecutionUsd: number;
  /** Advance rent still to collect, after crediting anything carried in. */
  advanceRentTrueUpUsd: number;
  prepaidRentDueUsd: number;
  proratedDays: number;
  proratedFirstPeriodUsd: number;
  firstMonthRentUsd: number;
  totalDueAtExecutionUsd: number;
  /**
   * The execution total, itemised. Rendered directly as the lease's own
   * "amounts due upfront" table so that the table cannot state a figure the
   * derivation disagrees with.
   */
  lines: MoneyLine[];
};
