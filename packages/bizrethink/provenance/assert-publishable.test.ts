import { describe, expect, it } from 'vitest';
import { assertPublishable } from './types';
import type { ClauseSource, HasProvenance } from './types';

const thing = (source: ClauseSource, status: HasProvenance['status'] = 'published'): HasProvenance => ({
  slug: 'ca-offer-summary',
  source,
  status,
});

const PRESCRIBED = (over: Partial<Extract<ClauseSource, { kind: 'regulator-prescribed-form' }>> = {}) =>
  ({
    kind: 'regulator-prescribed-form',
    citation: '10 CCR §914',
    sourceFile: 'CA-10CCR-900-956.txt',
    verbatimVerifiedAt: '2026-09-06',
    structureVerifiedAt: '2026-09-06',
    ...over,
  }) satisfies ClauseSource;

describe('regulator-prescribed forms need TWO verification dates', () => {
  /*
    They fail independently and for different reasons. A regulator can amend the
    prescribed wording while leaving the table alone, or reorder the table while
    leaving the wording alone, and either silently invalidates a form that still
    matches the other. One date would let half a stale form through.
  */
  it('publishes when both are set', () => {
    expect(assertPublishable(thing(PRESCRIBED()))).toEqual([]);
  });

  it('refuses unverified words', () => {
    expect(assertPublishable(thing(PRESCRIBED({ verbatimVerifiedAt: null })))).toEqual([
      'ca-offer-summary: regulator-prescribed text published without a verification date',
    ]);
  });

  it('refuses unverified structure even when the words are verified', () => {
    expect(assertPublishable(thing(PRESCRIBED({ structureVerifiedAt: null })))).toEqual([
      'ca-offer-summary: regulator-prescribed form published without a structure verification date',
    ]);
  });

  it('reports both when neither is set', () => {
    const problems = assertPublishable(
      thing(PRESCRIBED({ verbatimVerifiedAt: null, structureVerifiedAt: null })),
    );

    expect(problems).toHaveLength(2);
  });

  it('says nothing while the form is still a draft', () => {
    const draft = thing(PRESCRIBED({ verbatimVerifiedAt: null, structureVerifiedAt: null }), 'draft');

    expect(assertPublishable(draft)).toEqual([]);
  });
});

/*
  The move out of `lease/clauses/types.ts` must not have changed what the
  existing variants do. Nothing in this function ever read a lease field — that
  is why it could move — but "nothing reads it" is a claim worth a test.
*/
describe('the variants that existed before the move behave as they did', () => {
  it('refuses statutory text with no verification date', () => {
    const s: ClauseSource = { kind: 'statute', citation: 'Fla. Stat. §83.51', verbatimRequired: true, verbatimVerifiedAt: null };

    expect(assertPublishable(thing(s))).toEqual([
      'ca-offer-summary: statutory text published without a verification date',
    ]);
  });

  it('accepts a court-approved form unconditionally', () => {
    const s: ClauseSource = { kind: 'court-approved-form', form: 'RLHD-3x Rev 7/16', citation: 'Fla. Sup. Ct.' };

    expect(assertPublishable(thing(s))).toEqual([]);
  });

  it('refuses attorney-drafted text with no named reviewer', () => {
    expect(assertPublishable(thing({ kind: 'attorney-drafted', author: null }))).toEqual([
      'ca-offer-summary: attorney-drafted text published without a named reviewer',
    ]);
  });

  it('refuses customer-authored text outright', () => {
    expect(assertPublishable(thing({ kind: 'customer-authored' }))).toEqual([
      'ca-offer-summary: customer-authored text can never be published to the shared library',
    ]);
  });
});
