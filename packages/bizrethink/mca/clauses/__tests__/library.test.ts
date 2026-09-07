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

  it('numbers each clause once within an instrument', () => {
    for (const id of MCA_INSTRUMENTS) {
      const numbers = libraryFor(id).map((clause) => clause.number);

      expect(new Set(numbers).size).toBe(numbers.length);
    }
  });

  it('returns only the named instrument’s clauses', () => {
    for (const id of MCA_INSTRUMENTS) {
      for (const clause of libraryFor(id)) {
        expect(clause.instruments).toContain(id);
      }
    }

    expect(ALL_MCA_CLAUSES.every((clause) => clause.instruments.length > 0)).toBe(true);
  });

  it('names only instruments that exist', () => {
    for (const clause of ALL_MCA_CLAUSES) {
      for (const id of clause.instruments) {
        expect(INSTRUMENTS[id]).toBeDefined();
      }
    }
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
