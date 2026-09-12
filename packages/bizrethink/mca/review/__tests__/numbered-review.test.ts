import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { mcaLibraryFingerprint } from '../../clauses/approval';
import { LOMBARD_FACTS } from '../../clauses/facts';
import { MCA_INSTRUMENTS } from '../../clauses/instruments';
import { libraryFor } from '../../clauses/library';
import { LOMBARD } from '../../clauses/parties';
import { mcaLibrarySurface } from '../../clauses/surface/view';
import { selectClauses } from '../../engine/select-clauses';
import { counselReviewView } from '../counsel-view';

describe('counsel reads the numbered selection and its identified alternatives', () => {
  it.each(
    MCA_INSTRUMENTS,
  )('%s shows every record once, with resolved references and visible field content', (instrument) => {
    const view = counselReviewView({
      review: {
        id: 'review',
        token: 'test',
        status: 'open',
        reviewerName: 'Reviewer',
        reviewerEmail: 'reviewer@example.com',
        instrument,
        libraryFingerprint: mcaLibraryFingerprint(libraryFor(instrument)),
        expiresAt: null,
      },
      tenant: LOMBARD,
      approvals: new Map(),
      sender: null,
      now: new Date('2026-09-12'),
    });
    const briefing = view.briefing.flatMap((section) => section.body).join(' ');
    expect(briefing).not.toContain('in the order the document prints them');
    expect(briefing).toContain('review items');
    const rows = view.sections.flatMap((section) => section.clauses);
    expect(rows.map((row) => row.slug).sort()).toEqual(
      libraryFor(instrument)
        .map((clause) => clause.slug)
        .sort(),
    );
    const selected = selectClauses({ instrument, facts: LOMBARD_FACTS }).selected;
    for (const row of rows) {
      expect(row.heading.trim().length).toBeGreaterThan(0);
      expect(row.text).not.toContain('[[');
      const current = selected.find((clause) => clause.slug === row.slug);
      expect(Reflect.get(row, 'included'), row.slug).toBe(Boolean(current));
      if (current) {
        expect(row.number).toBe(current.number);
      } else {
        expect(Reflect.get(row, 'selectionNote'), row.slug).toMatch(/Alternative/);
      }
      const original = libraryFor(instrument).find((clause) => clause.slug === row.slug);
      if (original?.kind === 'field-group') {
        expect(Reflect.get(row, 'fields')).toEqual(original.fields);
      }
    }
  });

  it('uses the same compiled selections on the staff surface', () => {
    const surface = mcaLibrarySurface();
    for (const instrument of MCA_INSTRUMENTS) {
      const selected = selectClauses({ instrument, facts: LOMBARD_FACTS }).selected;
      for (const row of surface.clauses.filter((clause) => clause.instrument === instrument)) {
        expect(Reflect.get(row, 'body')).not.toContain('[[');
        const current = selected.find((clause) => clause.slug === row.slug);
        expect(Reflect.get(row, 'included')).toBe(Boolean(current));
        if (current) {
          expect(row.number).toBe(current.number);
          expect(Reflect.get(row, 'body')).toBe(current.body);
        }
      }
    }
  });

  it('removes visible slugs without removing the identity used to record findings', () => {
    const route = readFileSync(
      new URL('../../../../../apps/remix/app/routes/_recipient+/mca-clause-review.$token.tsx', import.meta.url),
      'utf8',
    );
    const visibleSlug = />\s*\{clause\.slug\}\s*</;
    expect(visibleSlug.test('<span>{clause.slug}</span>')).toBe(true);
    expect(route).not.toMatch(visibleSlug);
    expect(route).toContain('clauseSlug={clause.slug}');
    expect(route).toContain('citation context has changed');
  });
});
