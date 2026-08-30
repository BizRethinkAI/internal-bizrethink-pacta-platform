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
  nonRenewal: { required: boolean; noticeDays: number };
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

/**
 * A floor beneath every numeric answer.
 *
 * FOUND IN PRODUCTION 2026-08-29: the one real matter carried
 * `depositReturnDays: -124`. Every statutory check here was one-sided
 * (`returnDays > 15`), so a negative number sailed through and the lease would
 * have told a tenant their deposit is returned within minus one hundred and
 * twenty-four days, with nothing anywhere objecting.
 *
 * The bug was not a wrong bound — it was a bound nobody wrote, in a function
 * where bounds are scattered `if`s. So the floors are a table rather than more
 * `if`s, and a test enumerates the numeric leaves of a real answer set and
 * fails when one of them is missing from here. Adding a numeric question now
 * forces a decision about its floor.
 *
 * This is a different class of problem from a statutory breach and is reported
 * as one: no statute says a number of days cannot be negative. It is simply
 * not an answer to the question that was asked.
 */
export type CoherenceCheck = {
  /** Dotted path into ValidateAnswersInput. */
  path: string;
  /** How the question reads to a person, for the message. */
  label: string;
  /** Smallest value that is an answer at all. */
  min: number;
};

export const COHERENCE_CHECKS: CoherenceCheck[] = [
  { path: 'rent.monthlyUsd', label: 'the monthly rent', min: 1 },
  { path: 'deposit.returnDays', label: 'the deposit return window', min: 0 },
  { path: 'deposit.claimNoticeDays', label: 'the deposit claim notice window', min: 0 },
  { path: 'access.noticeHours', label: 'the notice before entry', min: 0 },
  { path: 'access.earliestHour', label: 'the earliest hour for entry', min: 0 },
  { path: 'access.latestHour', label: 'the latest hour for entry', min: 0 },
  { path: 'earlyTermination.feeUsd', label: 'the early termination fee', min: 0 },
  { path: 'earlyTermination.tenantNoticeDays', label: 'the early termination notice', min: 0 },
  { path: 'lateFee.graceDays', label: 'the late-fee grace period', min: 0 },
  { path: 'nonRenewal.noticeDays', label: 'the non-renewal notice', min: 0 },
];

/** Every numeric leaf in an answer set, as dotted paths. Used by the invariant test. */
export const numericLeafPaths = (value: unknown, prefix = ''): string[] => {
  if (typeof value !== 'object' || value === null) {
    return [];
  }

  return Object.entries(value as Record<string, unknown>).flatMap(([key, child]) => {
    const path = prefix === '' ? key : `${prefix}.${key}`;

    if (typeof child === 'number') {
      return [path];
    }

    return numericLeafPaths(child, path);
  });
};

const readPath = (answers: ValidateAnswersInput, path: string): unknown =>
  path.split('.').reduce<unknown>((node, key) => (node as Record<string, unknown>)?.[key], answers);

const checkCoherence = (answers: ValidateAnswersInput): Finding[] => {
  const findings: Finding[] = [];

  for (const entry of COHERENCE_CHECKS) {
    const value = readPath(answers, entry.path);

    if (typeof value !== 'number' || !Number.isFinite(value) || value < entry.min) {
      findings.push({
        code: 'answer-not-coherent',
        severity: 'blocks',
        // Deliberately not a statute. Citing one would be inventing law to
        // explain a typo.
        citation: 'Your answers',
        message: `${String(value)} is not an answer to ${entry.label}. It would be printed into the lease exactly as written.`,
      });
    }
  }

  return findings;
};

export const validateAnswers = ({ answers, pack }: ValidateAnswersOptions): Finding[] => {
  /*
    Coherence first: a value that is not an answer at all makes every
    statutory comparison below meaningless, and reporting both would bury the
    one the reader can act on.
  */
  const findings: Finding[] = checkCoherence(answers);

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

  /*
    §83.575(1) fixes the window in both directions — a lease may not require
    less than 30 days nor more than 60, from either party. Both ends matter:
    too short is as unenforceable as too long.
  */
  if (answers.nonRenewal.required) {
    if (answers.nonRenewal.noticeDays < pack.nonRenewal.minNoticeDays) {
      findings.push({
        code: 'non-renewal-notice-too-short',
        severity: 'blocks',
        citation: 'Fla. Stat. §83.575(1)',
        message: `Fla. Stat. §83.575(1) does not permit a rental agreement to require less than ${pack.nonRenewal.minNoticeDays} days' notice before vacating at the end of the term. This lease states ${answers.nonRenewal.noticeDays} days.`,
      });
    }

    if (answers.nonRenewal.noticeDays > pack.nonRenewal.maxNoticeDays) {
      findings.push({
        code: 'non-renewal-notice-too-long',
        severity: 'blocks',
        citation: 'Fla. Stat. §83.575(1)',
        message: `Fla. Stat. §83.575(1) does not permit a rental agreement to require more than ${pack.nonRenewal.maxNoticeDays} days' notice from either party. This lease states ${answers.nonRenewal.noticeDays} days.`,
      });
    }
  }

  return findings;
};
