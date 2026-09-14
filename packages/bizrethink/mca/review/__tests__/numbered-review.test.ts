import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { contentFor } from '../../catalogue';
import { mcaLibraryFingerprint } from '../../clauses/approval';
import { LOMBARD_FACTS } from '../../clauses/facts';
import { MCA_INSTRUMENTS } from '../../clauses/instruments';
import { LOMBARD } from '../../clauses/parties';
import { mcaLibrarySurface } from '../../clauses/surface/view';
import { selectClauses } from '../../engine/select-clauses';
import { contentForReview } from '../../reusable/review';
import { counselReviewView } from '../counsel-view';
import { toReadableAgreement } from '../readable-agreement';

describe('counsel reads the numbered selection and its identified alternatives', () => {
  it('names the parent sections using the existing clause numbers, including fields before the first clause', () => {
    const sections = toReadableAgreement(contentForReview('frpa'));
    expect(sections.slice(0, 4).map((section) => section.name)).toEqual([
      '1. Funding Terms',
      '2. Preamble',
      '3. Purchase',
      '4. Reconciliation',
    ]);
    expect(sections.find((section) => section.id === 'appendix')?.name).toBe('12. Fee Schedule');
    expect(sections[0].clauses[0].number).toBeNull();
    expect(sections[0].clauses.find((clause) => clause.number)?.number).toBe('1.1');
  });

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
        libraryFingerprint: mcaLibraryFingerprint(contentFor(instrument)),
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
      contentFor(instrument)
        .map((clause) => clause.slug)
        .sort(),
    );
    const _selected = selectClauses({ instrument, facts: LOMBARD_FACTS }).selected;
    for (const row of rows) {
      expect(row.heading.trim().length).toBeGreaterThan(0);
      expect(row.text).not.toContain('[[');
      const current = contentForReview(instrument).find((entry) => entry.slug === row.slug && entry.included);
      expect(Reflect.get(row, 'included'), row.slug).toBe(Boolean(current));
      if (current) {
        expect(row.number).toBe(current.number);
      } else {
        expect(Reflect.get(row, 'selectionNote'), row.slug).toMatch(/Alternative/);
      }
      const original = contentFor(instrument).find((clause) => clause.slug === row.slug);
      if (original?.kind === 'field-group') {
        expect(Reflect.get(row, 'fields')).toEqual(original.fields);
      }
    }
  });

  it('uses the same compiled selections on the staff surface', () => {
    const surface = mcaLibrarySurface();
    for (const instrument of MCA_INSTRUMENTS) {
      const _selected = selectClauses({ instrument, facts: LOMBARD_FACTS }).selected;
      for (const row of surface.clauses.filter((clause) => clause.instrument === instrument)) {
        expect(Reflect.get(row, 'body')).not.toContain('[[');
        const current = contentForReview(instrument).find((entry) => entry.slug === row.slug && entry.included);
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
    const reader = readFileSync(new URL('../../components/counsel-reader.tsx', import.meta.url), 'utf8');
    expect(reader).toContain('view.agreementMoved');
    expect(reader).toContain('This review content has changed since the link was sent');
  });
});
