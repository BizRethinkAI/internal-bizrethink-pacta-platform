import { describe, expect, it } from 'vitest';

import type { ValidateAnswersInput } from '../engine/validate';
import { COHERENCE_CHECKS, numericLeafPaths, validateAnswers } from '../engine/validate';
import { US_FL } from '../rule-packs/us-fl';

/**
 * Answers that are not wrong under a statute — they are not answers at all.
 *
 * FOUND IN PRODUCTION, 2026-08-29. The one real matter carried
 * `depositReturnDays: -124`. Every statutory check was one-sided
 * (`returnDays > 15`), so −124 sailed through: the lease would have told a
 * tenant their deposit is returned within minus one hundred and twenty-four
 * days, and nothing anywhere would have objected.
 *
 * This is a different class of problem from a statutory breach and is reported
 * as one. No statute says a number of days cannot be negative; it is simply
 * not an answer to the question that was asked.
 *
 * The invariant at the bottom is the important part. Bounds written as
 * scattered `if`s are bounds that get forgotten on the next field — that is
 * exactly how this happened. Every numeric answer must appear in
 * `COHERENCE_CHECKS`, and the test fails when a new one does not.
 */

const sane: ValidateAnswersInput = {
  rent: { monthlyUsd: 6900 },
  deposit: { returnDays: 15, claimNoticeDays: 30 },
  access: { noticeHours: 24, earliestHour: 9, latestHour: 18 },
  earlyTermination: { offered: true, feeUsd: 13800, tenantNoticeDays: 60 },
  lateFee: { graceDays: 3 },
  nonRenewal: { required: true, noticeDays: 60 },
};

const check = (over: Partial<ValidateAnswersInput>) => validateAnswers({ answers: { ...sane, ...over }, pack: US_FL });

describe('the production defect', () => {
  it('catches the negative deposit-return window that shipped', () => {
    const findings = check({ deposit: { returnDays: -124, claimNoticeDays: 30 } });

    expect(findings.some((f) => f.code === 'answer-not-coherent')).toBe(true);
    expect(findings.some((f) => f.severity === 'blocks')).toBe(true);
  });

  it('names the field and the value, so it can be found and corrected', () => {
    const finding = check({ deposit: { returnDays: -124, claimNoticeDays: 30 } }).find(
      (f) => f.code === 'answer-not-coherent',
    );

    expect(finding?.message).toMatch(/-124/);
    expect(finding?.message.toLowerCase()).toMatch(/deposit/);
  });

  it('does not dress it up as a statutory breach', () => {
    // No statute says days cannot be negative. Citing one would be inventing
    // law to explain a typo.
    const finding = check({ deposit: { returnDays: -124, claimNoticeDays: 30 } }).find(
      (f) => f.code === 'answer-not-coherent',
    );

    expect(finding?.citation).not.toMatch(/Fla\. Stat\./);
  });
});

describe('every one-sided check now has a floor', () => {
  it('rejects a negative claim-notice window', () => {
    expect(check({ deposit: { returnDays: 15, claimNoticeDays: -1 } }).some((f) => f.severity === 'blocks')).toBe(true);
  });

  it('rejects a negative early-termination fee', () => {
    const findings = check({ earlyTermination: { offered: true, feeUsd: -500, tenantNoticeDays: 60 } });

    expect(findings.some((f) => f.code === 'answer-not-coherent')).toBe(true);
  });

  it('rejects negative notice days', () => {
    const findings = check({ earlyTermination: { offered: true, feeUsd: 100, tenantNoticeDays: -30 } });

    expect(findings.some((f) => f.code === 'answer-not-coherent')).toBe(true);
  });

  it('rejects negative grace days, which nothing checked at all', () => {
    expect(check({ lateFee: { graceDays: -3 } }).some((f) => f.code === 'answer-not-coherent')).toBe(true);
  });

  it('rejects a rent of zero or less, which nothing checked at all', () => {
    expect(check({ rent: { monthlyUsd: 0 } }).some((f) => f.code === 'answer-not-coherent')).toBe(true);
    expect(check({ rent: { monthlyUsd: -100 } }).some((f) => f.code === 'answer-not-coherent')).toBe(true);
  });

  it('rejects a value that is not a finite number', () => {
    expect(check({ rent: { monthlyUsd: Number.NaN } }).some((f) => f.code === 'answer-not-coherent')).toBe(true);
  });

  it('says nothing about a sane answer set', () => {
    expect(validateAnswers({ answers: sane, pack: US_FL }).filter((f) => f.code === 'answer-not-coherent')).toEqual([]);
  });

  it('still reports a genuine statutory breach as a statutory breach', () => {
    // Coherence must not swallow the real checks.
    const findings = check({ deposit: { returnDays: 45, claimNoticeDays: 30 } });

    expect(findings.some((f) => f.code === 'deposit-return-too-slow')).toBe(true);
  });
});

describe('the invariant that stops this recurring', () => {
  it('checks every numeric answer, with none forgotten', () => {
    /*
      This is the test that matters. The original bug was not a wrong bound —
      it was a bound nobody wrote, in a file where bounds are scattered `if`s.
      Enumerating the numeric leaves of a real answer set and demanding each
      one appears in COHERENCE_CHECKS means a new numeric field cannot be
      added without either a floor or a deliberate decision to exempt it.
    */
    const covered = new Set(COHERENCE_CHECKS.map((entry) => entry.path));
    const missing = numericLeafPaths(sane).filter((path) => !covered.has(path));

    expect(missing, `numeric answers with no coherence check: ${missing.join(', ')}`).toEqual([]);
  });

  it('gives every check a human label rather than a field path', () => {
    for (const entry of COHERENCE_CHECKS) {
      expect(entry.label, entry.path).not.toMatch(/\./);
      expect(entry.label.length).toBeGreaterThan(3);
    }
  });
});
