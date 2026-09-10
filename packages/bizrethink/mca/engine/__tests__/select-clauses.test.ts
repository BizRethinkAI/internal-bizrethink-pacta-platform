import { describe, expect, it } from 'vitest';

import { LOMBARD_FACTS, type McaFacts } from '../../clauses/facts';
import { libraryFor } from '../../clauses/library';
import { instrumentsFor, selectClauses } from '../select-clauses';

/**
 * The engine, and the one property that makes it worth having.
 *
 * A clause library is only a library if the same clauses can produce different
 * documents. Until this file, `includeWhen` existed on 205 records and nothing
 * read any of them — the forward scaffolding `clauses/types.ts` warns about,
 * which is why the facts type and its first consumer land together.
 */

/** A second funder, differing from Lombard on exactly the axes under test. */
const ARBITRATION_FUNDER: McaFacts = {
  ...LOMBARD_FACTS,
  disputeResolution: 'arbitration',
  concurrentPositions: false,
  renewalModel: 'none',
  equipment: 'none',
};

describe('selection turns a funder profile into a document', () => {
  /**
   * The property the whole design rests on: **Lombard's answers select the
   * whole FRPA.**
   *
   * `LOMBARD_FACTS` describes the paper as shipped rather than as the
   * 2026-09-09 memo recommends, so every clause in v4 must survive its own
   * condition. If a gate is written against the recommendation instead of the
   * document — which the first draft of that profile did, in four places — this
   * is what says so.
   */
  it('selects every clause of the FRPA for the funder whose paper it is', () => {
    const all = libraryFor('frpa');
    const { selected, excluded } = selectClauses({ facts: LOMBARD_FACTS, instrument: 'frpa' });

    expect(selected).toHaveLength(all.length);
    expect(excluded).toHaveLength(0);
  });

  /**
   * And the converse, which is the point of a library: a different funder gets a
   * different document out of the same clauses.
   */
  it('drops what a second funder does not buy', () => {
    const { selected, excluded } = selectClauses({ facts: ARBITRATION_FUNDER, instrument: 'frpa' });

    expect(excluded.length).toBeGreaterThan(0);
    expect(selected.length).toBe(libraryFor('frpa').length - excluded.length);

    const dropped = excluded.map(({ clause }) => clause.slug).sort();

    // Four clauses, one decision. The memo proposes deleting each of these
    // separately; under arbitration they are a single fact's consequence.
    expect(dropped).toContain('frpa.jury-trial-waiver-7-10');
    expect(dropped).toContain('frpa.class-action-waiver-7-11');
    expect(dropped).toContain('frpa.contractual-statutes-of-limitations-7-19');
    expect(dropped).toContain('frpa.counterclaim-waiver-7-20');

    // And the cascade goes with concurrentPositions, not with anything textual.
    expect(dropped).toContain('frpa.position-and-cascade-of-collections-4-15');
  });

  /**
   * A dropped clause leaves no gap, which is the whole answer to `[Reserved]`.
   *
   * A document edited in place needs reserved sections to hold numbering still
   * for the cross-references pointing at them. A document assembled from a
   * library does not: the clause is simply absent, and nothing downstream knows
   * it could have been there.
   */
  it('leaves no reserved section behind when a clause drops out', () => {
    const { selected } = selectClauses({ facts: ARBITRATION_FUNDER, instrument: 'frpa' });

    for (const clause of selected) {
      expect(clause.heading).not.toBe('[Reserved]');
      expect(clause.body.trim()).not.toBe('[Reserved]');
    }
  });

  /**
   * Reading order survives selection. `inReviewOrder` sorts by instrument, then
   * the instrument's own section order, then `sortKey` — and a document whose
   * clauses arrive in module-concatenation order is what that function was
   * written to stop.
   */
  it('returns clauses in reading order, not library order', () => {
    const { selected } = selectClauses({ facts: LOMBARD_FACTS, instrument: 'frpa' });
    const keys = selected.map((clause) => clause.sortKey);

    // funding-terms, not preamble: the FRPA prints its Section 1 grid and the
    // funding explainers before the parties paragraph, and FRPA_SECTION_ORDER
    // follows the document rather than convention.
    expect(selected[0]?.section).toBe('funding-terms');
    expect(keys.length).toBeGreaterThan(0);
  });

  /**
   * Refused rather than filtered.
   *
   * The Equipment Lease and the Subscription number their clauses IDENTICALLY,
   * so assembling one into the other's document produces something that reads
   * correct and is wrong at every cross-reference. `clauses/library.ts` makes
   * the same argument for reaching clauses through `libraryFor`.
   */
  it('refuses a library that is not the instrument it was asked for', () => {
    expect(() =>
      selectClauses({ facts: LOMBARD_FACTS, instrument: 'frpa', library: libraryFor('subscription') }),
    ).toThrow(/is a subscription clause/);
  });
});

describe('which agreements a product involves at all', () => {
  it('gives Lombard the set its deals actually use', () => {
    const instruments = instrumentsFor(LOMBARD_FACTS);

    expect(instruments).toContain('frpa');
    // Lombard runs a broker channel and pulls consumer reports.
    expect(instruments).toContain('iso-pra');
    expect(instruments).toContain('permission-to-release');
    // v4 defers equipment into the Purchased Amount rather than leasing it, so
    // the twins are not part of this product.
    expect(instruments).not.toContain('equipment-lease');
    expect(instruments).not.toContain('subscription');
  });

  it('drops the broker agreement for a funder with no channel', () => {
    expect(instrumentsFor({ ...LOMBARD_FACTS, brokerChannel: false })).not.toContain('iso-pra');
  });

  /**
   * The ISO PRA is the document a merchant must never be handed — its §2.6
   * exists because 10 CCR §952 and 23 NYCRR §600.21 regulate what a broker may
   * put in front of a recipient. `instrumentsFor` answers which agreements the
   * PRODUCT involves; `merchantFacing()` remains the filter for anything
   * merchant-bound, and this pins that they are different questions.
   */
  it('is not a merchant-facing filter', () => {
    expect(instrumentsFor(LOMBARD_FACTS)).toContain('iso-pra');
  });
});
