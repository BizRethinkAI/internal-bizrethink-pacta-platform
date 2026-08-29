import type { RulePack, RuleSeverity } from '../rule-packs/us-fl';

/**
 * Check the answers against the jurisdiction's rule pack before anything is
 * rendered.
 *
 * WORDING IS PART OF THE CONTRACT HERE. Every finding states two things: what
 * the statute requires, and what the form currently says. None of them draws a
 * conclusion, recommends a course of action, or characterises a term as
 * unenforceable — that would be legal advice, and this is not a lawyer.
 *
 * "Fla. Stat. §83.595(4) caps an early termination fee at 2 months' rent
 * ($13800). This lease sets $20000." — a statutory fact and a form state. The
 * reader draws the conclusion. There is a test asserting the findings contain
 * none of the giveaway phrases.
 */

export type Finding = {
  code: string;
  severity: RuleSeverity;
  citation: string;
  message: string;
};

export type ValidateAnswersInput = {
  rent: { monthlyUsd: number };
  deposit: { returnDays: number; claimNoticeDays: number };
  access: { noticeHours: number; earliestHour: number; latestHour: number };
  earlyTermination: { offered: boolean; feeUsd: number; tenantNoticeDays: number };
  lateFee: { graceDays: number };
};

export type ValidateAnswersOptions = {
  answers: ValidateAnswersInput;
  pack: RulePack;
};

const formatHour = (hour: number): string => {
  const h = Math.floor(hour);
  const m = Math.round((hour - h) * 60);

  return `${h}:${String(m).padStart(2, '0')}`;
};

export const validateAnswers = ({ answers, pack }: ValidateAnswersOptions): Finding[] => {
  const findings: Finding[] = [];

  const { deposit, access, earlyTermination, rent } = answers;

  if (deposit.returnDays > pack.deposit.maxReturnDays) {
    findings.push({
      code: 'deposit-return-too-slow',
      severity: 'blocks',
      citation: 'Fla. Stat. §83.49(3)(a)',
      message: `Fla. Stat. §83.49(3)(a) requires a deposit to be returned within ${pack.deposit.maxReturnDays} days where no claim is made against it. This lease states ${deposit.returnDays} days.`,
    });
  }

  if (deposit.claimNoticeDays > pack.deposit.maxClaimNoticeDays) {
    findings.push({
      code: 'deposit-claim-notice-too-slow',
      severity: 'blocks',
      citation: 'Fla. Stat. §83.49(3)(a)',
      message: `Fla. Stat. §83.49(3)(a) requires written notice of a claim against the deposit within ${pack.deposit.maxClaimNoticeDays} days of the tenant vacating. This lease states ${deposit.claimNoticeDays} days.`,
    });
  }

  if (access.noticeHours < pack.access.minNoticeHours) {
    findings.push({
      code: 'entry-notice-too-short',
      severity: 'blocks',
      citation: 'Fla. Stat. §83.53(2)',
      message: `Fla. Stat. §83.53(2) requires at least ${pack.access.minNoticeHours} hours' notice before entry for repairs. This lease states ${access.noticeHours} hours.`,
    });
  }

  if (access.earliestHour < pack.access.earliestHour || access.latestHour > pack.access.latestHour) {
    findings.push({
      code: 'entry-window-outside-statute',
      severity: 'blocks',
      citation: 'Fla. Stat. §83.53(2)',
      message: `Fla. Stat. §83.53(2) treats ${formatHour(pack.access.earliestHour)} to ${formatHour(pack.access.latestHour)} as the reasonable hours for entry. This lease states ${formatHour(access.earliestHour)} to ${formatHour(access.latestHour)}.`,
    });
  }

  /*
    §83.595(4) is only engaged where the parties actually elected the remedy.
    Where the option is not offered there is no fee and no notice period to
    measure, so checking them would produce findings about a term that does not
    exist in the document.
  */
  if (earlyTermination.offered) {
    const capUsd = rent.monthlyUsd * pack.earlyTermination.maxFeeMonths;

    if (earlyTermination.feeUsd > capUsd) {
      findings.push({
        code: 'early-termination-fee-exceeds-cap',
        severity: 'blocks',
        citation: 'Fla. Stat. §83.595(4)',
        message: `Fla. Stat. §83.595(4) caps liquidated damages or an early termination fee at ${pack.earlyTermination.maxFeeMonths} months' rent (${capUsd}). This lease sets $${earlyTermination.feeUsd}.`,
      });
    }

    if (earlyTermination.tenantNoticeDays > pack.earlyTermination.maxTenantNoticeDays) {
      findings.push({
        code: 'early-termination-notice-too-long',
        severity: 'blocks',
        citation: 'Fla. Stat. §83.595(4)',
        message: `Fla. Stat. §83.595(4) permits the tenant to be required to give no more than ${pack.earlyTermination.maxTenantNoticeDays} days' notice of early termination. This lease requires ${earlyTermination.tenantNoticeDays} days.`,
      });
    }
  }

  return findings;
};
