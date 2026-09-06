import { describe, expect, it } from 'vitest';

import { findingBlockers, outstandingFindings } from './findings';

/**
 * An attorney's finding holds the clause until somebody answers it.
 *
 * THE ASYMMETRY THIS FIXES. A tenant can comment on every clause of a lease and
 * have each comment tracked to a disposition. Counsel — whose review is the
 * documented critical path for the whole product, and without which no lease
 * may reach a third party — got a read-only page: 52 clauses, approved or
 * unapproved badges, and no way to say anything at all. Findings arrived by
 * email and somebody retyped them.
 *
 * A finding is not a comment. A tenant's comment is a negotiating position; an
 * attorney's is a defect report against text we are asserting is lawful. So it
 * blocks, and answering it is a deliberate act with a reason attached, not a
 * dismissal.
 */

const finding = (over: Partial<Parameters<typeof outstandingFindings>[0][number]> = {}) => ({
  id: 'f1',
  clauseSlug: 'deposit.held',
  body: 'This misstates §83.49(3)(a).',
  answeredAt: null,
  answer: null,
  ...over,
});

describe('outstandingFindings', () => {
  it('counts a finding nobody has answered', () => {
    expect(outstandingFindings([finding()])).toHaveLength(1);
  });

  it('does not count one that has been answered', () => {
    expect(
      outstandingFindings([finding({ answeredAt: new Date(), answer: 'Reworded to track the statute.' })]),
    ).toHaveLength(0);
  });

  /*
    An answer with no text is not an answer. The whole value of the mechanism
    is that somebody had to say what they did about it — a blank box would let
    a finding be cleared as fast as it could be dismissed.
  */
  it('does not accept an empty answer as answering it', () => {
    expect(outstandingFindings([finding({ answeredAt: new Date(), answer: '   ' })])).toHaveLength(1);
  });

  it('does not accept a timestamp with no answer', () => {
    expect(outstandingFindings([finding({ answeredAt: new Date(), answer: null })])).toHaveLength(1);
  });
});

describe('findingBlockers', () => {
  it('says nothing when there is nothing outstanding', () => {
    expect(findingBlockers([])).toEqual([]);
  });

  /*
    Named per clause rather than counted. "3 findings outstanding" makes
    somebody go looking; naming the clause puts them where the work is.
  */
  it('names the clause, because a count makes you go looking', () => {
    const blockers = findingBlockers([finding(), finding({ id: 'f2', clauseSlug: 'use.no-alterations' })]);

    expect(blockers).toHaveLength(2);
    expect(blockers[0]).toMatch(/deposit\.held/);
    expect(blockers[1]).toMatch(/use\.no-alterations/);
  });

  /*
    Two findings on the same clause are two problems, not one. Collapsing them
    would let answering the first clear the second.
  */
  it('keeps two findings on one clause separate', () => {
    expect(findingBlockers([finding(), finding({ id: 'f2' })])).toHaveLength(2);
  });

  it('quotes enough of the finding to be recognisable without opening it', () => {
    expect(findingBlockers([finding()])[0]).toMatch(/83\.49/);
  });
});
