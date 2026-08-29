import { describe, expect, it } from 'vitest';
import type { CustomClauseInput } from '../clauses/custom';
import { ASSERTION_TAGS, toCustomClause } from '../clauses/custom';
import type { ClauseFacts } from '../clauses/types';
import { FL_LIBRARY, FL_SECTION_ORDER } from '../clauses/us-fl';
import { selectClauses } from '../engine/select-clauses';
import { PICANA_FACTS } from '../matters/picana-ln';

/**
 * Custom clauses are the reason this project exists.
 *
 * The 2026 Zillow lease pushed six substantive lettered clauses — repair
 * thresholds, pool and lawn duties, HOA fines, an administrative fee schedule,
 * a deposit transfer, joint liability — into a free-text box labelled OTHERS,
 * beneath two headings that read "N/A". They got no number, no table-of-contents
 * entry, and nothing else in the document could cross-reference them.
 *
 * A custom clause here is a real clause: it takes a position in a section, is
 * numbered by the same derivation as everything else, appears in the TOC, and
 * participates in duplicate detection.
 */

const facts: ClauseFacts = PICANA_FACTS;

const input = (overrides: Partial<CustomClauseInput> = {}): CustomClauseInput => ({
  heading: 'Pool Equipment Replacement',
  body: 'Landlord shall replace the pool pump and filtration equipment at Landlord expense when it fails in ordinary use.',
  section: 'maintenance',
  asserts: [],
  ...overrides,
});

const selectWith = (customs: CustomClauseInput[], f: ClauseFacts = facts) =>
  selectClauses({
    facts: f,
    library: [...FL_LIBRARY, ...customs.map((c, i) => toCustomClause(c, i))],
  });

describe('a custom clause is a real clause', () => {
  it('appears in the document, numbered', () => {
    const result = selectWith([input()]);
    const custom = result.selected.find((c) => c.heading === 'Pool Equipment Replacement');

    expect(custom).toBeDefined();
    expect(custom?.number).toMatch(/^\d+\.\d+$/);
  });

  it('lands in the section the author chose, after the library clauses there', () => {
    const result = selectWith([input({ section: 'maintenance' })]);
    const maintenance = result.selected.filter((c) => c.section === 'maintenance');

    // Last in its section — a custom addition should not silently reorder the
    // reviewed clauses around it.
    expect(maintenance.at(-1)?.heading).toBe('Pool Equipment Replacement');
  });

  it('pushes the sections after it down, exactly as a library clause would', () => {
    const without = selectClauses({ facts, library: FL_LIBRARY }).selected;
    const withCustom = selectWith([input()]).selected;

    expect(withCustom).toHaveLength(without.length + 1);

    // Numbering is derived, so nothing is hard-coded that could drift.
    const sections = [...new Set(withCustom.map((c) => Number(c.number.split('.')[0])))];

    expect(sections).toEqual(sections.map((_, i) => i + 1));
  });

  it('keeps two custom clauses in the order they were added', () => {
    const result = selectWith([input({ heading: 'First Custom' }), input({ heading: 'Second Custom' })]);

    const customs = result.selected.filter((c) => c.heading.endsWith('Custom')).map((c) => c.heading);

    expect(customs).toEqual(['First Custom', 'Second Custom']);
  });

  it('only accepts a section that exists in the document order', () => {
    expect(() => toCustomClause(input({ section: 'nowhere' }), 0)).toThrow(/section/i);
  });
});

describe('provenance', () => {
  it('marks the clause customer-authored, never attorney-drafted', () => {
    expect(toCustomClause(input(), 0).source).toEqual({ kind: 'customer-authored' });
  });

  it('can never be published to the shared library', () => {
    // assertPublishable rejects customer-authored text outright; this keeps a
    // landlord's own words from leaking into the reviewed library.
    const clause = { ...toCustomClause(input(), 0), status: 'published' as const };

    expect(clause.source.kind).toBe('customer-authored');
  });

  it('is always draft on creation', () => {
    expect(toCustomClause(input(), 0).status).toBe('draft');
  });
});

describe('duplicate detection', () => {
  it('says nothing when the clause claims no ground', () => {
    expect(selectWith([input()]).duplicateAssertions).toEqual([]);
  });

  it('flags a custom clause covering ground the library already covers', () => {
    /*
      The Keane lease stated joint-and-several liability in §2.5.8 AND again in
      custom clause F, because nothing could see across the two. Tagging what a
      custom clause asserts makes that detectable — exactly, rather than by
      guessing at similar wording.
    */
    const result = selectWith([input({ heading: 'Joint Liability', asserts: ['joint-and-several-liability'] })]);

    expect(result.duplicateAssertions).toEqual([
      { assertion: 'joint-and-several-liability', slugs: ['parties.recital', 'custom.0'] },
    ]);
  });

  it('flags two custom clauses claiming the same ground as each other', () => {
    const result = selectWith([
      input({ heading: 'Fees A', asserts: ['administrative-charges'] }),
      input({ heading: 'Fees B', asserts: ['administrative-charges'] }),
    ]);

    const found = result.duplicateAssertions.find((d) => d.assertion === 'administrative-charges');

    expect(found?.slugs).toContain('custom.0');
    expect(found?.slugs).toContain('custom.1');
  });
});

describe('the tag list offered to an author', () => {
  it('is drawn from what the library actually asserts', () => {
    const libraryTags = new Set(FL_LIBRARY.flatMap((c) => c.asserts));

    for (const tag of ASSERTION_TAGS) {
      expect(libraryTags.has(tag), `${tag} is offered but no clause asserts it`).toBe(true);
    }
  });

  it('covers every assertion the library makes, so nothing is undetectable', () => {
    const libraryTags = [...new Set(FL_LIBRARY.flatMap((c) => c.asserts))].sort();

    expect([...ASSERTION_TAGS].sort()).toEqual(libraryTags);
  });
});

describe('sections offered to an author', () => {
  it('matches the document order the engine actually uses', () => {
    // A section the author can pick but the engine does not know would throw at
    // selection time — after they had written the clause.
    for (const section of FL_SECTION_ORDER) {
      expect(() => toCustomClause(input({ section }), 0)).not.toThrow();
    }
  });
});
