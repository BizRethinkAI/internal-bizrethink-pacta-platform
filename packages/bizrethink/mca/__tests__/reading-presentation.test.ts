import { describe, expect, it } from 'vitest';

import { ALL_MCA_CONTENT } from '../catalogue';
import { LOMBARD_FACTS } from '../clauses/facts';
import { libraryFor } from '../clauses/library';
import { LOMBARD, resolveParties } from '../clauses/parties';
import { numberClauses, resolveReferences } from '../engine/number-clauses';
import { referenceSegments } from '../engine/reference-segments';
import { contentForReview } from '../reusable/review';
import { readingForReview } from '../review/reading-presentation';

describe('readable reference projection', () => {
  it('retains exact wording and resolves clause and whole-section identity after party substitution', () => {
    const context = numberClauses(
      libraryFor('frpa').filter((clause) => !clause.includeWhen || clause.includeWhen(LOMBARD_FACTS)),
    );
    const target = context[0];
    const source = {
      slug: 'fixture',
      instrument: 'frpa' as const,
      body: resolveParties(
        `{{funder}} refers to [[clause:${target.referenceId ?? target.slug}]](b), and [[section:frpa#${target.section}]].`,
        LOMBARD,
      ),
    };
    const parts = referenceSegments(source, context);
    expect(parts.map((part) => part.text).join('')).toBe(resolveReferences([source], context)[0].body);
    expect(parts.filter((part) => part.kind === 'reference')).toEqual([
      expect.objectContaining({
        text: target.number,
        targetSlug: target.slug,
        instrument: 'frpa',
        targetKind: 'clause',
      }),
      expect.objectContaining({
        text: target.sectionNumber,
        targetSlug: target.slug,
        section: target.section,
        targetKind: 'section',
      }),
    ]);
  });

  it('projects every review item without changing its legal wording or selection-dependent citations', () => {
    for (const instrument of [...new Set(ALL_MCA_CONTENT.map((item) => item.instrument))]) {
      for (const item of contentForReview(instrument)) {
        const reading = readingForReview(item.slug, (text) => resolveParties(text, LOMBARD));
        expect(reading.segments.map((segment) => segment.text).join(''), item.slug).toBe(
          resolveParties(item.body, LOMBARD),
        );
        for (const segment of reading.segments) {
          if (segment.kind === 'reference') {
            expect(ALL_MCA_CONTENT.some((candidate) => candidate.slug === segment.targetSlug)).toBe(true);
            expect(segment.context).toBe(reading.context);
          }
        }
      }
    }
  });

  it('fails closed for absent and ambiguous reference targets', () => {
    const target = numberClauses(libraryFor('frpa'))[0];
    const source = { slug: 'fixture', instrument: 'frpa' as const, body: 'See [[clause:missing]].' };
    expect(() => referenceSegments(source, [target])).toThrow(/unresolved/);
    expect(() => referenceSegments(source, [target, target])).toThrow(/More than one/);
    expect(() => referenceSegments({ ...source, body: '[[broken]]' }, [target])).toThrow(/malformed/);
  });
});
