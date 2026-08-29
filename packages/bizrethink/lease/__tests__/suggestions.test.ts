import { describe, expect, it } from 'vitest';

import { allFields, FL_INTERVIEW } from '../interview/steps';

/**
 * Suggested values, and the line they must not cross.
 *
 * An interview that shows nothing but a blank box on "how much notice before
 * entering?" has taught the answerer nothing about what is normal. But the
 * same affordance on a field Florida constrains is us telling someone what to
 * do about a statute, which is exactly the unauthorized-practice-of-law line
 * this project has held everywhere else.
 *
 * The rule is therefore structural rather than editorial, so it cannot be
 * eroded by a well-meaning copy edit:
 *
 *   - A field with a `statute` shows the BOUND and the citation. Never a
 *     suggested number.
 *   - A field without one may show a MARKET FACT — an observation about what
 *     is common, attributable and phrased as such.
 *   - Nothing anywhere is phrased as a recommendation.
 */

const withSuggestions = allFields(FL_INTERVIEW).filter((field) => field.suggestion !== undefined);

describe('suggested values', () => {
  it('has some, or this whole feature is inert', () => {
    expect(withSuggestions.length).toBeGreaterThan(0);
  });

  it('never appears on a field Florida constrains', () => {
    for (const field of withSuggestions) {
      expect(
        field.statute,
        `${field.name} carries both a statutory bound and a suggested value — suggesting a number on a field a statute constrains is advice about that statute.`,
      ).toBeUndefined();
    }
  });

  it('states a market fact rather than a recommendation', () => {
    // "Most Florida leases use 24-48 hours" is an observation. "We recommend
    // 48 hours" is advice. The difference is the whole point.
    const banned = [
      'you should',
      'we recommend',
      'we suggest',
      'recommended',
      'best practice',
      'advis', // advise, advisable, advised
      'you must',
      'is unenforceable',
      'is illegal',
    ];

    for (const field of withSuggestions) {
      const note = field.suggestion?.note.toLowerCase() ?? '';

      for (const phrase of banned) {
        expect(note.includes(phrase), `${field.name}: "${phrase}" in "${field.suggestion?.note}"`).toBe(false);
      }
    }
  });

  it('attributes every market fact, so it reads as observed rather than decreed', () => {
    // Something has to make it a claim about the world: "most", "commonly",
    // "typically", a range, or a named source.
    const attribution = /\b(most|many|commonly|typically|usually|often|generally)\b/;

    for (const field of withSuggestions) {
      expect(
        attribution.test(field.suggestion?.note.toLowerCase() ?? ''),
        `${field.name}: ${field.suggestion?.note}`,
      ).toBe(true);
    }
  });

  it('offers a value of the same kind as the field it sits on', () => {
    for (const field of withSuggestions) {
      const value = field.suggestion?.value;

      if (field.kind === 'number' || field.kind === 'usd') {
        expect(typeof value, `${field.name}`).toBe('number');
      } else {
        expect(typeof value, `${field.name}`).toBe('string');
      }
    }
  });

  it('offers a value the field would actually accept', () => {
    for (const field of withSuggestions) {
      if (field.kind === 'select') {
        const allowed = (field.options ?? []).map((option) => option.value);

        expect(allowed, `${field.name}`).toContain(field.suggestion?.value);
      }
    }
  });
});
