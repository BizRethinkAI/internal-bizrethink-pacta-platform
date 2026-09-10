import { describe, expect, it } from 'vitest';

import { LOMBARD_FACTS, type McaFacts } from '../../clauses/facts';
import { MCA_INSTRUMENTS } from '../../clauses/instruments';
import { instrumentsFor, selectClauses } from '../select-clauses';

/**
 * Which answers the library can actually give.
 *
 * A fact offers a funder a choice. The library owes that choice real clauses on
 * both sides of it — and **a fact with only one authored answer is a hardcode
 * wearing a fact's clothes.** The interview asks a question, the funder picks
 * the other value, and nothing changes, because no clause was ever written for
 * it. That is worse than not offering the choice: it reads as a control.
 *
 * [ADR 0011](../../../../../docs/adr/0011-the-mca-clause-library-is-a-library.md)
 * names this test and the reason for it.
 *
 * WHAT "AUTHORED" MEANS HERE, precisely. A value is authored when at least one
 * clause is selected under it that is NOT selected under some other value of the
 * same fact. Selecting the same clauses as every sibling value means nothing in
 * the library distinguishes it.
 *
 * WHY THE GAPS ARE PINNED RATHER THAN FAILED. Most unauthored values are honest
 * absences — `equipment: 'none'` means *no equipment clauses*, and demanding a
 * clause for it would be demanding prose that says nothing. The gaps that matter
 * are the ones where a funder would expect substance and find none. Pinning the
 * exact set is the same discipline `FRPA_LOCUS_EXCLUSIONS` uses: an exception
 * list that cannot widen without somebody editing it and saying why.
 */

const MATRIX = {
  collectionMethod: ['split-only', 'ach-only', 'split-with-ach-backstop'],
  guarantyScope: ['none', 'limited-conduct', 'full-performance'],
  equipment: ['none', 'purchased-at-funding', 'deferred', 'separate-lease'],
  renewalModel: ['none', 'payoff-only', 'carry'],
  concurrentPositions: [true, false],
  disputeResolution: ['courts', 'arbitration'],
  venueRule: ['funder-state', 'merchant-state'],
  brokerChannel: [true, false],
  consumerReportPulled: [true, false],
  processorSplitAccepted: [true, false],
} as const satisfies Partial<Record<keyof McaFacts, readonly unknown[]>>;

/**
 * What a funder gets under one answer: the clauses AND the agreements.
 *
 * BOTH, because a fact can be load-bearing at either level and the first
 * version of this test only counted clauses. It reported `brokerChannel` and
 * `collectionMethod` as unbacked when both are in fact used — by
 * `instrumentsFor`, which decides whether the ISO PRA and the Split Funding
 * Authorization are in the deal at all. A measurement that misses a whole axis
 * produces a gap list nobody can trust.
 */
const selectedUnder = (key: string, value: unknown): Set<string> => {
  const facts = { ...LOMBARD_FACTS, [key]: value } as McaFacts;

  return new Set([
    ...instrumentsFor(facts).map((instrument) => `instrument:${instrument}`),
    ...MCA_INSTRUMENTS.flatMap((instrument) =>
      selectClauses({ facts, instrument }).selected.map((clause) => clause.slug),
    ),
  ]);
};

/** `fact:value` for every value no clause distinguishes. */
const unauthored = (): string[] => {
  const out: string[] = [];

  for (const [key, values] of Object.entries(MATRIX)) {
    const sets = values.map((value) => selectedUnder(key, value));

    values.forEach((value, i) => {
      const others = sets.filter((_, j) => j !== i);
      const distinguishing = [...sets[i]].filter((slug) => others.some((other) => !other.has(slug)));

      if (distinguishing.length === 0) {
        out.push(`${key}:${String(value)}`);
      }
    });
  }

  return out.sort();
};

/**
 * Values where nothing is owed, because the value MEANS nothing.
 *
 * `equipment: 'none'` selects no equipment clauses, and that is the whole
 * content of the answer. Demanding a clause here would be demanding prose that
 * says a thing is absent, which is how documents acquire sentences nobody
 * needs.
 */
const NO_CLAUSE_OWED = [
  'brokerChannel:false',
  'concurrentPositions:false',
  'consumerReportPulled:false',
  'equipment:none',
  'renewalModel:none',
];

/**
 * Values a funder would expect substance behind, and there is none.
 *
 * **Three of the eleven facts are inert.** `guarantyScope`, `venueRule` and
 * `processorSplitAccepted` gate nothing at all: whatever a funder answers, the
 * same clauses come out. They were declared as axes the corpus branches on and
 * only four of the eleven were wired. That is exactly the "hardcode wearing a
 * fact's clothes" this file was written to detect, and it detected it in the
 * change that introduced it.
 *
 * | gap | what is missing |
 * |---|---|
 * | `guarantyScope` (all three) | §9.2 and the guaranty block are always selected. A `none` funder gets a personal guaranty they did not ask for; a `full-performance` funder gets Lombard's narrow one |
 * | `venueRule` (both) | §7.5 always mandates the funder's state. `merchant-state` is what removes the need for a Virginia variant — Va. Code §6.2-2236(A) voids a non-Virginia forum — so this one has a legal consequence, not just a preference |
 * | `disputeResolution:arbitration` | the four waivers drop and nothing replaces them. All three market forms filed as SEC exhibits pair arbitration WITH a class waiver |
 * | `collectionMethod:ach-only` | drops the Split Funding Authorization and puts no collection mechanism in its place |
 * | `processorSplitAccepted` (both) | nothing reads it. Exhibit A is issued either way, and a split nobody accepted is not a collection mechanism |
 *
 * Each needs authored clauses before the interview may offer the choice.
 * Authoring them is not transcription — no Lombard or CircularPayments document
 * contains an arbitration clause, a merchant-state venue clause or a
 * full-performance guaranty — which is why
 * `bodies-match-the-document` has to narrow before they can land.
 */
const GAPS = [
  'collectionMethod:ach-only',
  'disputeResolution:arbitration',
  'guarantyScope:full-performance',
  'guarantyScope:limited-conduct',
  'guarantyScope:none',
  'processorSplitAccepted:false',
  'processorSplitAccepted:true',
  'venueRule:funder-state',
  'venueRule:merchant-state',
];

describe('every fact value the interview offers', () => {
  /**
   * Pinned, not failed. A red build on a gap somebody already knows about is a
   * build people learn to ignore; a pinned set forces an edit and a sentence.
   *
   * Adding an arbitration clause makes this fail, and the fix is to delete a
   * line from `GAPS`. A clause losing its condition also makes it fail, and the
   * fix is to look at why a fact stopped mattering.
   */
  it('is either backed by clauses or listed here as a known gap', () => {
    expect(unauthored()).toEqual([...GAPS, ...NO_CLAUSE_OWED].sort());
  });

  /**
   * The metric has one blind spot worth stating rather than hiding.
   *
   * `split-only` and `split-with-ach-backstop` are indistinguishable from each
   * other — the ACH backstop clause does not exist, so both produce the same
   * document. Neither appears in `unauthored()` because each differs from
   * `ach-only`, which drops the Split Funding Authorization. A value can be
   * "authored" against one sibling and inert against another.
   *
   * Asserted so the blind spot is a recorded fact rather than a surprise: these
   * two answers currently give a funder the same paper.
   */
  it('knows that the two split answers are the same document today', () => {
    expect([...selectedUnder('collectionMethod', 'split-only')].sort()).toEqual(
      [...selectedUnder('collectionMethod', 'split-with-ach-backstop')].sort(),
    );
  });
});
