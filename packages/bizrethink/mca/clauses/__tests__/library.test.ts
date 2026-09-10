import { describe, expect, it } from 'vitest';
import { assertPublishable } from '../../../provenance/types';
import { MCA_JURISDICTIONS } from '../../jurisdictions';
import { INSTRUMENTS, MCA_INSTRUMENTS } from '../instruments';
import { ALL_MCA_CLAUSES, inReviewOrder, libraryFor } from '../library';

describe('the MCA clause library', () => {
  it('holds clauses', () => {
    expect(ALL_MCA_CLAUSES.length).toBeGreaterThan(0);
  });

  /**
   * SLUGS ARE GLOBALLY UNIQUE, ACROSS INSTRUMENTS AS WELL AS WITHIN THEM.
   *
   * The lease library learned this the expensive way and wrote it down in
   * `us-nc/index.ts`: `loadClauseApprovals` keys an attorney's approval by slug
   * alone and keeps only the newest row per slug, so two clauses sharing a name
   * let one approval hide the other — the second clause reads as unapproved
   * forever with nothing red anywhere. Here the collision is likelier than it
   * was there, because the Equipment Lease and the Subscription are the same
   * document with its vocabulary swapped and would naturally be given the same
   * clause names.
   */
  it('gives every clause a unique slug', () => {
    const seen = new Set<string>();

    for (const clause of ALL_MCA_CLAUSES) {
      expect(seen.has(clause.slug), `duplicate slug: ${clause.slug}`).toBe(false);
      seen.add(clause.slug);
    }
  });

  /**
   * Uniqueness applies to the document's own CLAUSE numbering — `N.M` — and to
   * nothing else, because nothing else is a number.
   *
   * The FRPA made the distinction necessary. Fourteen of its clauses carry no
   * number at all: the granting clause, the definitions, Section 5's lead-in.
   * Three more carry "Appendix A", which is the document's designation for a
   * section holding three separate paragraphs, not an identifier for one of
   * them. Requiring those to be unique would force an invented number onto text
   * the document deliberately leaves unnumbered, and an invented number is
   * exactly the kind of thing a later reader would try to "fix" against the
   * document. `slug` is the identity; this is what a reader sees on the page.
   */
  it('numbers each numbered clause once within an instrument', () => {
    for (const id of MCA_INSTRUMENTS) {
      const numbers = libraryFor(id)
        .map((clause) => clause.number)
        .filter((number) => /^\d+\.\d+$/.test(number));

      expect(new Set(numbers).size).toBe(numbers.length);
    }
  });

  it('returns only the named instrument’s clauses', () => {
    for (const id of MCA_INSTRUMENTS) {
      for (const clause of libraryFor(id)) {
        expect(clause.instrument).toBe(id);
      }
    }
  });

  it('names only instruments that exist', () => {
    for (const clause of ALL_MCA_CLAUSES) {
      expect(INSTRUMENTS[clause.instrument]).toBeDefined();
    }
  });

  /**
   * The evidence that `instrument` is singular rather than a list.
   *
   * The plural existed for the Equipment Lease and the Subscription, on the
   * theory that one clause could be published in both and so could not diverge.
   * The documents refused it — see `twins.ts` — and across all six instruments
   * not one clause names a second. Asserted rather than described,
   * because the moment a genuinely shared clause appears this is the test that
   * should be reconsidered, and a count in prose would not be.
   */
  it('gives every clause exactly one instrument, across all 200', () => {
    // 204 until the four `[Reserved]` records were removed — section numbers the
    // document holds open after a clause was taken out, now declared non-clause.
    expect(ALL_MCA_CLAUSES).toHaveLength(200);

    const perInstrument = MCA_INSTRUMENTS.map((id) => libraryFor(id).length);

    expect(perInstrument.reduce((a, b) => a + b, 0)).toBe(ALL_MCA_CLAUSES.length);
  });

  it('scopes a clause only to states the disclosure library knows', () => {
    for (const clause of ALL_MCA_CLAUSES) {
      for (const state of clause.appliesInStates) {
        expect(MCA_JURISDICTIONS).toContain(state);
      }
    }
  });

  /**
   * ADR 0009's invariant, as a test rather than a paragraph.
   *
   * Counsel is a parallel track: nothing stops these clauses being written,
   * rendered internally or sent to an attorney through a review link. What is
   * stopped is one of them reaching a merchant. Every clause here is
   * `attorney-drafted` with a null author, so flipping any of them to
   * `published` today must be refused — and this asserts the refusal rather
   * than trusting that someone remembers the rule.
   */
  it('refuses to publish, one clause at a time', () => {
    for (const clause of ALL_MCA_CLAUSES) {
      expect(clause.status).toBe('draft');
      expect(assertPublishable(clause)).toEqual([]);
      expect(assertPublishable({ ...clause, status: 'published' })).toEqual([
        `${clause.slug}: attorney-drafted text published without a named reviewer`,
      ]);
    }
  });

  it('reads back in a stable order that covers everything', () => {
    const ordered = inReviewOrder(ALL_MCA_CLAUSES);

    expect(ordered.map((clause) => clause.slug).sort()).toEqual(ALL_MCA_CLAUSES.map((clause) => clause.slug).sort());
    expect(inReviewOrder(ordered).map((clause) => clause.slug)).toEqual(ordered.map((clause) => clause.slug));
    expect(inReviewOrder([...ALL_MCA_CLAUSES].reverse()).map((clause) => clause.slug)).toEqual(
      ordered.map((clause) => clause.slug),
    );
  });
});
