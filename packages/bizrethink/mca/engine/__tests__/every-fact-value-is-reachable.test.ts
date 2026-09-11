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
 *
 * **`concurrentPositions: false` LEFT this list, and the direction matters.**
 * It used to mean silence: no cascade clause, nothing said. The memo's design
 * does not want silence there, it wants the opposite rule stated, so
 * `frpa.single-active-position-4-15` now says it. A value can stop meaning
 * nothing.
 *
 * **`guarantyScope: 'none'` LEFT IT TOO, on 2026-09-11, for the same reason and
 * by a route worth reading.** It joined on 2026-09-10 on the argument that no
 * guaranty means no guaranty clauses — true of Section 9 and never true of the
 * document. §6.1 became an exhaustive pair on `guarantyScope` when the
 * full-recourse half was authored, and the narrow half is gated `!==
 * 'full-performance'`, so a no-guaranty template now selects a clause *because*
 * of that answer: `frpa.events-of-default-6-1`, whose denial of guarantor
 * liability is trivially true where there is no Guarantor and is the right text
 * to put in front of a merchant who was never asked for one. The row is deleted
 * rather than left standing, which is the maintenance this register is for — a
 * tolerated gap that has been closed is a line that can no longer be red.
 */
const NO_CLAUSE_OWED = ['brokerChannel:false', 'consumerReportPulled:false', 'equipment:none', 'renewalModel:none'];

/**
 * Values a funder would expect substance behind, and there is none.
 *
 * **This said "three of the eleven facts are inert" — `guarantyScope`,
 * `venueRule` and `processorSplitAccepted`. `guarantyScope` is closed**, on the
 * owner's decision of 2026-09-10 that the guaranty is an interview answer:
 * §§9.2, 9.4, 9.5 and 9.6 gate on `limited-conduct`, §§10.2 and 10.4 on
 * `!== 'none'`, and §9.1 with them. `venueRule` and `processorSplitAccepted`
 * remain, for reasons now understood rather than merely observed.
 *
 * **WHAT THIS FILE MEASURES IS DISTINGUISHABILITY, NOT COMPLETENESS**, and the
 * difference used to matter at exactly one row. `guarantyScope:
 * 'full-performance'` left this list on 2026-09-10 because it selected a
 * different set — §9.1 and §§10.2/10.4 — from the other two values, while being
 * no kind of funder-ready answer: the full-performance guaranty itself was
 * unauthored, so that profile assembled an identity grid and two service waivers
 * with no guaranty between them.
 *
 * **The owner authored it on 2026-09-11**, so that row is now distinguishable
 * AND complete, and the distinction it used to illustrate has to be carried by
 * the note rather than by an example. It is still the real one: a row can leave
 * this list while being useless, and nothing here would say so.
 *
 * | gap | what is missing |
 * |---|---|
 * | `venueRule` (both) | Nothing reads it. §7.5 is the only venue clause and the gate was refused because **the `funder-state` arm cannot be drafted at all: `McaFacts` has no field naming the funder's state.** `LOMBARD_FACTS` now says `merchant-state` and §7.5 agrees with it, which removes the contradiction without closing the gap. Needs a `funderState` field plus a variables mechanism, or the row deleted. The legal consequence is real: Va. Code **§6.2-2234(A)** requires an action under a covered contract to be brought in the Commonwealth |
 * | `collectionMethod:ach-only` | drops the Split Funding Authorization and puts no collection mechanism in its place. It gates no FRPA clause at all — §2.5 and §7.14 are the clauses that would read it if they returned |
 * | `processorSplitAccepted` (both) | nothing reads it, and the gate was refused twice on the same ground: gating §2.3 leaves a template with no collection mechanism, and gating Exhibit A deletes the specification precisely for the funder whose processor has not accepted. **The vendored authorization has no processor acceptance block at all**, so `false` is not a record-keeping gap — it is what the form makes inevitable |
 *
 * The Virginia citation in this file read **§6.2-2236(A)** until 2026-09-10,
 * copied from the 2026-09-09 memo. That section is "Validity of noncompliant
 * sales-based financing", has no subsection (A), and says nothing about forum.
 * `statutes/ct-va-obligations.ts` had the right one all along.
 *
 * Each remaining gap needs authored clauses, or a field, before the interview
 * may offer the choice.
 */
const GAPS = [
  'collectionMethod:ach-only',
  /*
    `disputeResolution:arbitration` WAS HERE AND IS DELETED, WHICH IS WHAT THIS
    LIST IS FOR. The row read: "the four waivers drop and nothing replaces them.
    All three market forms filed as SEC exhibits pair arbitration WITH a class
    waiver." The owner authored `frpa.arbitration-7-26` on 2026-09-11 — an
    agreement to arbitrate, an individual-basis limb, an in-person hearing in the
    merchant's own jurisdiction and the arbitrator's fees on Buyer, the last two
    being Va. Code §6.2-2234(B) satisfied nationally by construction. The
    docstring below this list says in terms that adding an arbitration clause
    makes this test fail and that the fix is to delete a line; this is that.
  */
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
