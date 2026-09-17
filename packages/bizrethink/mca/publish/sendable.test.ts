import { describe, expect, it } from 'vitest';
import { libraryFor } from '../clauses/library';
import type { McaClauseApproval } from '../clauses/approval';
import { mcaClauseFingerprint } from '../clauses/approval';
import { mcaPackageRefusals, assertMcaPackageSendable } from './sendable';

/**
 * The gate that has to exist before anything can reach a merchant.
 *
 * ADR 0020 §3.2: `assertPublishable` reports and refuses nothing, and the first
 * merchant-bound output must fail closed on it, test written first. This is that
 * gate, and it is deliberately built while NOTHING is approved — so it ships
 * shut, and the day approvals exist it is already the thing standing in the way.
 *
 * It inverts the default. `assertPublishable` returns early on anything not
 * `published`, which is the right shape for a report and the wrong one for a
 * gate: an unapproved clause would sail through a check that asks only whether
 * published text is sound. Here, anything not provably publishable is a refusal.
 */
const clauses = () => libraryFor('split-funding');

const approvalFor = (slug: string): McaClauseApproval => {
  const clause = clauses().find((entry) => entry.slug === slug)!;

  return {
    clauseSlug: slug,
    clauseVersion: clause.version,
    instrument: clause.instrument,
    fingerprint: mcaClauseFingerprint(clause),
    approvedByName: 'A. Counsel',
    approvedByBarNumber: '12345',
    recordedByUserId: 1,
    barJurisdiction: 'US-FL',
    approvedAt: new Date('2026-09-17T00:00:00.000Z'),
    notes: null,
  };
};

const packageFor = (overrides: Partial<Parameters<typeof mcaPackageRefusals>[0]> = {}) => ({
  items: clauses().map((clause) => ({ slug: clause.slug, content: clause })),
  approvals: new Map<string, McaClauseApproval>(),
  blockers: [],
  missing: [],
  outstandingFindings: [],
  evidenceAvailable: true,
  unansweredCounselFindings: 0,
  ...overrides,
});

describe('nothing reaches a merchant today, and the gate says why', () => {
  it('refuses every clause, because none is approved', () => {
    const refusals = mcaPackageRefusals(packageFor());

    expect(refusals.length).toBe(clauses().length);
    expect(refusals.every((refusal) => /approval/i.test(refusal.reason))).toBe(true);
  });

  it('throws rather than returning a list nobody checks', () => {
    expect(() => assertMcaPackageSendable(packageFor())).toThrow(/approval|not ready|cannot be sent/i);
  });

  it('names the clause in every refusal, so the list is actionable', () => {
    for (const refusal of mcaPackageRefusals(packageFor())) {
      expect(refusal.slug).toMatch(/^split-funding\./);
    }
  });
});

describe('an approval is not a bypass', () => {
  const approvedAll = () => new Map(clauses().map((clause) => [clause.slug, approvalFor(clause.slug)] as const));

  it('accepts a package whose every clause carries a current approval', () => {
    expect(mcaPackageRefusals(packageFor({ approvals: approvedAll() }))).toEqual([]);
  });

  it('refuses when an approval is stale, not merely absent', () => {
    const approvals = approvedAll();
    const [slug] = [...approvals.keys()];
    approvals.set(slug, { ...approvals.get(slug)!, fingerprint: 'moved-since-approval' });

    const refusals = mcaPackageRefusals(packageFor({ approvals }));

    expect(refusals.map((refusal) => refusal.slug)).toEqual([slug]);
  });

  it('refuses while any blocker stands, however well approved the text is', () => {
    const refusals = mcaPackageRefusals(
      packageFor({ approvals: approvedAll(), blockers: [{ kind: 'processor-acceptance', detail: 'x' }] }),
    );

    expect(refusals.some((refusal) => /processor-acceptance/.test(refusal.reason))).toBe(true);
  });

  it('refuses while a required input is missing', () => {
    const refusals = mcaPackageRefusals(
      packageFor({ approvals: approvedAll(), missing: [{ binding: 'merchant.legalName' }] }),
    );

    expect(refusals.some((refusal) => /merchant\.legalName/.test(refusal.reason))).toBe(true);
  });

  it('refuses when counsel has an unanswered finding', () => {
    const refusals = mcaPackageRefusals(packageFor({ approvals: approvedAll(), unansweredCounselFindings: 1 }));

    expect(refusals.length).toBeGreaterThan(0);
  });

  it('refuses when the review register could not be read, rather than assuming it is clean', () => {
    const refusals = mcaPackageRefusals(packageFor({ approvals: approvedAll(), evidenceAvailable: false }));

    expect(refusals.length).toBeGreaterThan(0);
  });
});

describe('the gate cannot be fooled by the shape of its inputs', () => {
  it('reads approvals from a Map, so a prototype key answers for nothing', () => {
    // A plain object answers for Object.prototype; `usStateCode` shipped that
    // bug in #283 and it took a review to find. A Map has no prototype keys.
    const approvals = new Map<string, McaClauseApproval>();

    expect(
      mcaPackageRefusals(packageFor({ approvals, items: [{ slug: 'constructor', content: clauses()[0] }] })).length,
    ).toBe(1);
  });

  it('refuses an empty package rather than passing it as nothing-to-check', () => {
    expect(() => assertMcaPackageSendable(packageFor({ items: [] }))).toThrow(/empty|no content/i);
  });
});
