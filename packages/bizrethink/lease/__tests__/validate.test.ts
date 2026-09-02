import { describe, expect, it } from 'vitest';
import { validateAnswers } from '../engine/validate';
import { US_FL } from '../rule-packs/us-fl';

/**
 * The rule pack: numeric limits Florida actually imposes, checked before a
 * document is produced rather than discovered afterwards.
 *
 * Every finding states a statutory requirement and the state of the form. None
 * of them says "you should" — that line is the difference between a compliance
 * tool and giving legal advice, and it is held here in the wording of the
 * findings themselves.
 */

const ANSWERS = {
  rent: { monthlyUsd: 6900 },
  deposit: { returnDays: 15, claimNoticeDays: 30 },
  access: { noticeHours: 24, earliestHour: 9, latestHour: 18 },
  earlyTermination: { offered: true, feeUsd: 13800, tenantNoticeDays: 60 },
  lateFee: { graceDays: 5 },
  nonRenewal: { required: true, noticeDays: 60 },
};

const findings = (overrides: Partial<typeof ANSWERS> = {}) =>
  validateAnswers({ answers: { ...ANSWERS, ...overrides }, pack: US_FL });

const codes = (overrides: Partial<typeof ANSWERS> = {}) => findings(overrides).map((f) => f.code);

describe('early termination — Fla. Stat. §83.595(4)', () => {
  it('accepts a fee at exactly two months rent', () => {
    // The statute caps liquidated damages at 2 months' rent. 2 x 6900 = 13800.
    expect(codes()).not.toContain('early-termination-fee-exceeds-cap');
  });

  it('blocks a fee above two months rent', () => {
    const f = findings({ earlyTermination: { offered: true, feeUsd: 14000, tenantNoticeDays: 60 } });
    const finding = f.find((x) => x.code === 'early-termination-fee-exceeds-cap');

    expect(finding?.severity).toBe('blocks');
    expect(finding?.citation).toBe('Fla. Stat. §83.595(4)');
  });

  it('blocks a notice period longer than sixty days', () => {
    // The statute permits the landlord to require "no more than 60 days".
    const f = findings({ earlyTermination: { offered: true, feeUsd: 13800, tenantNoticeDays: 90 } });

    expect(f.map((x) => x.code)).toContain('early-termination-notice-too-long');
  });

  it('checks nothing when the option is not offered', () => {
    const f = findings({ earlyTermination: { offered: false, feeUsd: 99999, tenantNoticeDays: 365 } });

    expect(f.map((x) => x.code)).not.toContain('early-termination-fee-exceeds-cap');
    expect(f.map((x) => x.code)).not.toContain('early-termination-notice-too-long');
  });
});

describe('landlord entry — Fla. Stat. §83.53', () => {
  it('accepts twenty-four hours notice', () => {
    expect(codes({ access: { noticeHours: 24, earliestHour: 9, latestHour: 18 } })).not.toContain(
      'entry-notice-too-short',
    );
  });

  /*
    This test used to assert that TWELVE hours passed, and that is how the
    repealed figure survived: the pack, its comment, the clause header and this
    test all agreed with each other and none of them agreed with the statute.
    §83.53(2) has required 24 hours since the 2013 landlord-tenant act.
  */
  it('blocks the pre-2013 twelve hours', () => {
    const f = findings({ access: { noticeHours: 12, earliestHour: 9, latestHour: 18 } });

    expect(f.find((x) => x.code === 'entry-notice-too-short')?.severity).toBe('blocks');
  });

  it('blocks less than twelve hours', () => {
    const f = findings({ access: { noticeHours: 6, earliestHour: 9, latestHour: 18 } });

    expect(f.find((x) => x.code === 'entry-notice-too-short')?.severity).toBe('blocks');
  });

  it('blocks an entry window starting before 7:30am', () => {
    expect(codes({ access: { noticeHours: 12, earliestHour: 7, latestHour: 18 } })).toContain(
      'entry-window-outside-statute',
    );
  });

  it('blocks an entry window ending after 8pm', () => {
    expect(codes({ access: { noticeHours: 12, earliestHour: 9, latestHour: 21 } })).toContain(
      'entry-window-outside-statute',
    );
  });
});

describe('deposit timings — Fla. Stat. §83.49(3)(a)', () => {
  it('blocks a return period longer than fifteen days', () => {
    expect(codes({ deposit: { returnDays: 30, claimNoticeDays: 30 } })).toContain('deposit-return-too-slow');
  });

  it('blocks a claim notice period longer than thirty days', () => {
    expect(codes({ deposit: { returnDays: 15, claimNoticeDays: 45 } })).toContain('deposit-claim-notice-too-slow');
  });
});

describe('how findings are worded', () => {
  it('states the requirement and the answer, never a recommendation', () => {
    const f = findings({ earlyTermination: { offered: true, feeUsd: 20000, tenantNoticeDays: 60 } });
    const finding = f.find((x) => x.code === 'early-termination-fee-exceeds-cap');

    expect(finding?.message).toContain('$20000');
    expect(finding?.message).toContain('13800');

    // The UPL line, asserted rather than remembered.
    for (const phrase of ['you should', 'we recommend', 'we suggest', 'is unenforceable', 'is illegal']) {
      expect(finding?.message.toLowerCase()).not.toContain(phrase);
    }
  });

  it('cites a statute on every finding', () => {
    const all = findings({
      earlyTermination: { offered: true, feeUsd: 99999, tenantNoticeDays: 90 },
      access: { noticeHours: 1, earliestHour: 5, latestHour: 23 },
      deposit: { returnDays: 60, claimNoticeDays: 90 },
    });

    expect(all.length).toBeGreaterThan(4);

    for (const finding of all) {
      expect(finding.citation).toMatch(/Fla\. Stat\./);
    }
  });

  it('is silent when every answer is within the statutory limits', () => {
    expect(findings({ access: { noticeHours: 24, earliestHour: 8, latestHour: 19 } })).toEqual([]);
  });
});
