import { describe, expect, it } from 'vitest';

import { ALL_CLAUSES, libraryFor } from '../clauses/library';
import { FL_LIBRARY } from '../clauses/us-fl';

/**
 * Selecting the clauses that apply in one jurisdiction.
 *
 * This — not a directory layout — is what a second state actually needs. A
 * lease for state X assembles `generic` + `US` + `US-X`, and nothing from any
 * other state can reach it.
 *
 * The plan called for moving the clause files into per-jurisdiction folders
 * first. That turned out to be 39 import sites and five mixed files rewritten
 * for no behaviour change, while this — the part North Carolina cannot be built
 * without — is a filter. The folders can follow whenever; they buy readability,
 * not capability.
 */

describe('libraryFor', () => {
  /*
    The safety property of the whole refactor: for Florida this must return
    exactly what the code already used, or every existing lease changes.
  */
  it('returns exactly the Florida library it replaces', () => {
    expect(
      libraryFor('US-FL')
        .map((c) => c.slug)
        .sort(),
    ).toEqual(FL_LIBRARY.map((c) => c.slug).sort());
  });

  /*
    THE SAFETY PROPERTY, RESTATED FOR THE DAY A SECOND STATE LANDED. Adding
    North Carolina's seventeen clauses to `ALL_CLAUSES` must not change a single
    clause a Florida lease is built from, or every existing Florida matter would
    render differently and every recorded approval would be measured against a
    different document.
  */
  it('was unchanged for Florida by North Carolina arriving', () => {
    expect(libraryFor('US-FL').length).toBe(64);
    expect(libraryFor('US-FL').filter((c) => c.slug.endsWith('-nc'))).toEqual([]);
  });

  it('always carries the clauses that belong to no state', () => {
    const fl = libraryFor('US-FL');
    const generic = ALL_CLAUSES.filter((c) => c.jurisdiction === 'generic');
    const federal = ALL_CLAUSES.filter((c) => c.jurisdiction === 'US');

    expect(generic.length).toBe(35);
    expect(federal.length).toBe(1);

    for (const clause of [...generic, ...federal]) {
      expect(
        fl.map((c) => c.slug),
        clause.slug,
      ).toContain(clause.slug);
    }
  });

  /*
    The guarantee that makes a second state safe. Nothing Florida-specific may
    appear in a North Carolina lease, whatever anyone imports by mistake.
  */
  it('lets no state see another state law', () => {
    const nc = libraryFor('US-NC');
    const floridaSlugs = ALL_CLAUSES.filter((c) => c.jurisdiction === 'US-FL').map((c) => c.slug);

    for (const slug of floridaSlugs) {
      expect(
        nc.map((c) => c.slug),
        slug,
      ).not.toContain(slug);
    }
  });

  /*
    North Carolina, once it had clauses: the 36 portable ones plus its own 17.
    The number this replaced asserted 36 — "the portable library and nothing
    else, for now" — and watching it fail was the first sign the second state
    had actually landed.
  */
  it('gives North Carolina the portable library plus its own', () => {
    const nc = libraryFor('US-NC');

    expect(nc.length).toBe(53);
    expect(nc.filter((c) => c.jurisdiction === 'US-NC').length).toBe(17);
    expect(nc.filter((c) => c.jurisdiction === 'US-FL')).toEqual([]);
  });

  /*
    AND EVERY PORTABLE CLAUSE IS THE SAME OBJECT IN BOTH. Not an equal one — the
    same one. Two states sharing a reference is what makes an approval of a
    portable clause a single fact rather than one per state, and it is the thing
    a well-meaning refactor into per-jurisdiction folders would break first by
    copying.
  */
  it('shares the portable clauses rather than copying them', () => {
    const fl = libraryFor('US-FL');

    for (const clause of libraryFor('US-NC').filter((c) => c.jurisdiction !== 'US-NC')) {
      expect(fl.includes(clause), clause.slug).toBe(true);
    }
  });

  it('never returns a clause twice', () => {
    for (const jurisdiction of ['US-FL', 'US-NC'] as const) {
      const slugs = libraryFor(jurisdiction).map((c) => c.slug);

      expect(new Set(slugs).size, jurisdiction).toBe(slugs.length);
    }
  });
});
