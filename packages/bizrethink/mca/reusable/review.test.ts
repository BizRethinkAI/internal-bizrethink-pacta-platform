import { describe, expect, it } from 'vitest';

import { ALL_MCA_CONTENT, contentFindingSlugs, contentFor } from '../catalogue';
import { mcaClauseFingerprint, mcaLibraryFingerprint } from '../clauses/approval';
import { MCA_INSTRUMENTS } from '../clauses/instruments';
import { libraryFor } from '../clauses/library';
import { mcaLibrarySurface, mcaReusableSurface } from '../clauses/surface/view';
import { ALL_MCA_REUSABLE } from './library';

describe('separate catalogues share review protection', () => {
  it('accounts for every item once across the two staff views', () => {
    const clauses = mcaLibrarySurface();
    const reusable = mcaReusableSurface();
    const slugs = [...clauses.clauses, ...reusable.items].map((entry) => entry.slug);
    expect(slugs.sort()).toEqual(ALL_MCA_CONTENT.map((entry) => entry.slug).sort());
    expect(new Set(slugs).size).toBe(slugs.length);
    expect(clauses.clauses.every((entry) => entry.kind === 'clause' && /^\d+\.\d+$/.test(entry.number))).toBe(true);
    expect(
      reusable.items.every(
        (entry) => ['field-group', 'document-block', 'guidance'].includes(entry.kind) && entry.number === null,
      ),
    ).toBe(true);
    expect(clauses.totals.clauses).toBe(212);
    expect(reusable.totals.items).toBe(25);
  });

  it('includes original finding scopes when a record has been split', () => {
    for (const entry of ALL_MCA_CONTENT.filter((candidate) => candidate.derivedFrom?.length)) {
      const scopes = contentFindingSlugs(entry);
      expect(scopes).toContain(entry.slug);
      for (const parent of entry.derivedFrom ?? []) {
        expect(scopes).toContain(parent);
      }
      expect(new Set(scopes).size).toBe(scopes.length);
    }
    const guarantor = ALL_MCA_REUSABLE.find((entry) => entry.slug === 'frpa.guarantor-fields')!;
    expect(contentFindingSlugs(guarantor)).toEqual(['frpa.guarantor-fields', 'frpa.guarantor-information-9-1']);
  });

  it('identifies new field bindings as pending review without claiming old reviews read them', () => {
    const fields = mcaReusableSurface().items.find((entry) => entry.slug === 'frpa.execution-fields')!;
    expect(fields.examinedBy).toEqual([]);
    expect(fields.sourceExaminations).toContainEqual(
      expect.objectContaining({ slug: 'frpa.execution', review: 'REVIEW-02' }),
    );
    expect(fields.status).toBe('draft');
    expect(fields.publishProblems.length).toBeGreaterThan(0);
    expect(fields.body).toBe('');
  });

  it('changes approval fingerprints when a reusable item gains a different use or placement', () => {
    const original = ALL_MCA_REUSABLE.find((entry) => entry.slug === 'frpa.execution-legend')!;
    for (const changed of [
      { ...original, uses: ['interview'] as typeof original.uses },
      { ...original, placement: { before: 'frpa.granting-clause' } },
      { ...original, derivedFrom: [] },
      { ...original, version: original.version + 1 },
    ]) {
      expect(mcaClauseFingerprint(changed)).not.toBe(mcaClauseFingerprint(original));
    }
  });

  it.each(MCA_INSTRUMENTS)('%s cannot pin a whole-content review while silently omitting its helpers', (instrument) => {
    const all = contentFor(instrument);
    if (all.some((entry) => entry.kind !== 'clause')) {
      expect(mcaLibraryFingerprint(all)).not.toBe(mcaLibraryFingerprint(libraryFor(instrument)));
    } else {
      expect(mcaLibraryFingerprint(all)).toBe(mcaLibraryFingerprint(libraryFor(instrument)));
    }
  });
});
