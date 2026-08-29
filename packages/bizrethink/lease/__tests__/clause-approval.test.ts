import { describe, expect, it } from 'vitest';
import type { ClauseApproval } from '../clauses/approval';
import { clauseFingerprint, effectiveClauseStatus, isApprovalCurrent, unapprovedSlugs } from '../clauses/approval';
import type { Clause } from '../clauses/types';

/**
 * Attorney sign-off on the clause library — the gate the whole product waits
 * behind.
 *
 * The library is TypeScript, so a reviewing attorney cannot edit `status` in
 * code; the approval lives in the database and overrides what the code says.
 * That inversion creates exactly one dangerous failure, and it is the reason
 * this module exists:
 *
 *   IF AN APPROVAL SURVIVED A TEXT CHANGE, editing a clause would silently
 *   inherit an attorney's sign-off on words they never read. There would be
 *   nothing red anywhere — the clause would simply start rendering as
 *   reviewed. That is the same shape as every other failure this repo has had.
 *
 * So an approval is pinned to a FINGERPRINT of the clause as approved, and any
 * change to the text, the heading or the version lapses it back to unreviewed.
 */

const clause = (over: Partial<Clause> = {}): Clause =>
  ({
    slug: 'deposit.statutory-notice',
    version: 1,
    jurisdiction: 'US-FL',
    placement: 'lease-body',
    section: 'deposit',
    sortKey: 120,
    heading: 'Notice — Security Deposits and Advance Rent',
    body: 'YOUR LEASE REQUIRES PAYMENT OF CERTAIN DEPOSITS.',
    source: { kind: 'attorney-drafted', author: null },
    status: 'draft',
    includeWhen: null,
    variables: [],
    supersedes: [],
    asserts: [],
    ...over,
  }) as Clause;

const approvalFor = (c: Clause, over: Partial<ClauseApproval> = {}): ClauseApproval => ({
  clauseSlug: c.slug,
  clauseVersion: c.version,
  fingerprint: clauseFingerprint(c),
  approvedByName: 'J. Reviewer',
  approvedByBarNumber: 'FL123456',
  approvedAt: new Date('2026-09-01T00:00:00Z'),
  notes: null,
  ...over,
});

describe('clauseFingerprint', () => {
  it('changes when the body changes', () => {
    expect(clauseFingerprint(clause())).not.toBe(clauseFingerprint(clause({ body: 'Different words.' })));
  });

  it('changes when the heading changes', () => {
    // A heading is read by the signer and appears in the contents. It is part
    // of what was approved.
    expect(clauseFingerprint(clause())).not.toBe(clauseFingerprint(clause({ heading: 'Something else' })));
  });

  it('changes when the version changes', () => {
    expect(clauseFingerprint(clause())).not.toBe(clauseFingerprint(clause({ version: 2 })));
  });

  it('is stable for an unchanged clause', () => {
    expect(clauseFingerprint(clause())).toBe(clauseFingerprint(clause()));
  });

  it('ignores presentation-only fields that cannot change meaning', () => {
    // sortKey moves a clause within its section. It does not change a word of
    // what anybody agreed to, and lapsing an attorney approval over it would
    // train people to re-approve without reading.
    expect(clauseFingerprint(clause())).toBe(clauseFingerprint(clause({ sortKey: 999 })));
  });

  it('does NOT ignore a change to which facts select the clause', () => {
    // includeWhen decides whether the clause appears at all. An attorney
    // approved this text FOR these circumstances.
    const always = clause({ includeWhen: null });
    const conditional = clause({ includeWhen: () => true });

    expect(clauseFingerprint(always)).not.toBe(clauseFingerprint(conditional));
  });
});

describe('isApprovalCurrent', () => {
  it('accepts an approval matching the clause exactly', () => {
    const c = clause();

    expect(isApprovalCurrent(c, approvalFor(c))).toBe(true);
  });

  it('lapses when the body is edited after approval', () => {
    const approved = approvalFor(clause());
    const edited = clause({ body: 'Reworded for clarity.' });

    expect(isApprovalCurrent(edited, approved)).toBe(false);
  });

  it('lapses when the version is bumped', () => {
    const approved = approvalFor(clause());

    expect(isApprovalCurrent(clause({ version: 2 }), approved)).toBe(false);
  });

  it('refuses an approval recorded against a different clause entirely', () => {
    const approved = approvalFor(clause(), { clauseSlug: 'some.other-clause' });

    expect(isApprovalCurrent(clause(), approved)).toBe(false);
  });

  it('refuses an approval with no reviewer named', () => {
    // "Reviewed by nobody" is the state this feature exists to leave.
    const approved = approvalFor(clause(), { approvedByName: '' });

    expect(isApprovalCurrent(clause(), approved)).toBe(false);
  });
});

describe('effectiveClauseStatus', () => {
  it('publishes a draft clause once approved', () => {
    const c = clause();

    expect(effectiveClauseStatus(c, approvalFor(c))).toBe('published');
  });

  it('leaves a draft clause as draft with no approval', () => {
    expect(effectiveClauseStatus(clause(), null)).toBe('draft');
  });

  it('drops back to draft when the approval has lapsed', () => {
    // The whole point. An edit un-publishes the clause rather than inheriting
    // sign-off on words the attorney never saw.
    const approved = approvalFor(clause());

    expect(effectiveClauseStatus(clause({ body: 'edited' }), approved)).toBe('draft');
  });

  it('never resurrects a retired clause, approval or not', () => {
    const c = clause({ status: 'retired' });

    expect(effectiveClauseStatus(c, approvalFor(c))).toBe('retired');
  });

  it('leaves a clause already published in code alone', () => {
    expect(effectiveClauseStatus(clause({ status: 'published' }), null)).toBe('published');
  });
});

describe('unapprovedSlugs', () => {
  const a = clause({ slug: 'a' });
  const b = clause({ slug: 'b' });

  it('names every clause still lacking a current approval', () => {
    expect(unapprovedSlugs([a, b], [approvalFor(a)])).toEqual(['b']);
  });

  it('returns nothing when the whole set is approved', () => {
    expect(unapprovedSlugs([a, b], [approvalFor(a), approvalFor(b)])).toEqual([]);
  });

  it('counts a lapsed approval as unapproved', () => {
    const stale = approvalFor(a, { fingerprint: 'whatever-it-used-to-be' });

    expect(unapprovedSlugs([a], [stale])).toEqual(['a']);
  });

  it('ignores an approval for a clause not in the set', () => {
    expect(unapprovedSlugs([a], [approvalFor(a), approvalFor(b)])).toEqual([]);
  });
});
