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
  /** ISO date the figures were last read off the statute book. */
  verifiedAt: string;
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
    /**
     * Fla. Stat. §83.53(2) — at least 24 hours' notice.
     *
     * This was 12 until the 2013 landlord-tenant act raised it. The old figure
     * sat here under a confident comment while the validator, which only fires
     * BELOW this number, blessed 12 on every lease the product generated.
     */
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

  nonRenewal: {
    /** Fla. Stat. §83.575(1) — a lease may not require less than 30 days. */
    minNoticeDays: number;
    /** §83.575(1) — nor more than 60, from either party. */
    maxNoticeDays: number;
  };
};

export const US_FL: RulePack = {
  jurisdiction: 'US-FL',
  version: 1,
  /*
    ISO date on which every figure below was compared against the statute it
    cites, on flsenate.gov. Not decoration: the entry-notice figure was the
    PRE-2013 twelve hours, sitting under a doc comment that stated it
    confidently, agreed with by two passing tests. Nothing in the repository
    could have caught it, because nothing in the repository had ever looked
    outside itself.

    Checked 2026-09-02 against:
      §83.49(3)(a)  https://www.flsenate.gov/Laws/Statutes/2025/0083.49
      §83.53(2)     https://www.flsenate.gov/Laws/Statutes/2025/0083.53
      §83.575(1)    https://www.flsenate.gov/Laws/Statutes/2025/0083.575
      §83.595(4)    https://www.flsenate.gov/Laws/Statutes/2025/0083.595

    When re-checking, the Legislature's own table of what each session changed
    is the place to start:
      https://www.leg.state.fl.us/Statutes/SecChangesTab{YY}.pdf
    Effective dates are NOT on the statute pages — they live in the session law
    at laws.flrules.org.
  */
  verifiedAt: '2026-09-02',

  deposit: {
    maxReturnDays: 15,
    maxClaimNoticeDays: 30,
    maxDepositMonths: null,
  },

  access: {
    minNoticeHours: 24,
    // 7:30am. Expressed in hours with a half, not rounded to 8, because the
    // statute says 7:30 and rounding would reject a lawful answer.
    earliestHour: 7.5,
    latestHour: 20,
  },

  earlyTermination: {
    maxFeeMonths: 2,
    maxTenantNoticeDays: 60,
  },

  nonRenewal: {
    minNoticeDays: 30,
    maxNoticeDays: 60,
  },
};
