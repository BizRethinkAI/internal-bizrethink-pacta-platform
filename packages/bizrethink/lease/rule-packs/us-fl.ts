/**
 * The Florida rule pack: the numeric limits the statute imposes, expressed as
 * data so that adding another state is a sibling file rather than an engine
 * change.
 *
 * Versioned, and stamped onto every generated matter, so that when a statute
 * moves it is possible to say exactly which rules produced a document that was
 * already executed.
 */

export type RuleSeverity = 'blocks' | 'warns';

export type RulePack = {
  jurisdiction: string;
  version: number;

  deposit: {
    /** Fla. Stat. §83.49(3)(a) — return within 15 days where no claim is made. */
    maxReturnDays: number;
    /** §83.49(3)(a) — written notice of a claim within 30 days. */
    maxClaimNoticeDays: number;
    /**
     * Florida sets no statutory ceiling on the deposit itself. Recorded
     * explicitly so the absence reads as a checked fact rather than an
     * oversight — and so the UI can say so instead of implying a limit.
     */
    maxDepositMonths: number | null;
  };

  access: {
    /** Fla. Stat. §83.53(2) — at least 12 hours' notice. */
    minNoticeHours: number;
    /** §83.53(2) — "reasonable time" is 7:30am to 8:00pm. */
    earliestHour: number;
    latestHour: number;
  };

  earlyTermination: {
    /** Fla. Stat. §83.595(4) — liquidated damages may not exceed 2 months' rent. */
    maxFeeMonths: number;
    /** §83.595(4) — the tenant may be required to give no more than 60 days. */
    maxTenantNoticeDays: number;
  };
};

export const US_FL: RulePack = {
  jurisdiction: 'US-FL',
  version: 1,

  deposit: {
    maxReturnDays: 15,
    maxClaimNoticeDays: 30,
    maxDepositMonths: null,
  },

  access: {
    minNoticeHours: 12,
    // 7:30am. Expressed in hours with a half, not rounded to 8, because the
    // statute says 7:30 and rounding would reject a lawful answer.
    earliestHour: 7.5,
    latestHour: 20,
  },

  earlyTermination: {
    maxFeeMonths: 2,
    maxTenantNoticeDays: 60,
  },
};
