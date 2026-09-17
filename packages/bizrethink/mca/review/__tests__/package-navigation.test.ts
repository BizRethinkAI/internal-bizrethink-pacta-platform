import { describe, expect, it } from 'vitest';
import { buildLibraryReviewPackage } from '../package';
import { packageReviewIndex, searchPackageReviewIndex } from '../package-navigation';

describe('navigation in the saved complete counsel package', () => {
  const snapshot = buildLibraryReviewPackage({ contact: 'Legal operations' });

  it('makes every saved clause, alternative and reusable item reachable in its own document and parent section', () => {
    const index = packageReviewIndex(snapshot);
    expect(new Set(index.map((item) => item.instrument))).toEqual(
      new Set(snapshot.documents.map((document) => document.id)),
    );
    expect(index.find((item) => item.slug === 'frpa.merchant-and-funding-information')).toMatchObject({
      instrument: 'frpa',
      section: 'funding-terms',
      sectionName: 'Section 1: Merchant and Funding Information',
      kind: 'field-group',
    });
    for (const document of snapshot.documents) {
      for (const section of document.sections) {
        for (const item of section.items) {
          expect(index.filter((entry) => entry.slug === item.slug)).toEqual([
            {
              ...item,
              instrument: document.id,
              documentTitle: document.title,
              section: section.id,
              sectionName: section.name,
            },
          ]);
        }
      }
    }
    expect(index.some((item) => !item.included && item.kind === 'clause')).toBe(true);
  });

  it('searches saved text and citation numbers across documents without substituting current library wording', () => {
    const saved = structuredClone(snapshot);
    const item = saved.documents[1].sections[0].items[0];
    item.heading = 'Archived equipment condition';
    item.text = 'A unique saved-only operating restriction.';
    item.reading.number = '92.7';
    const index = packageReviewIndex(saved);
    for (const query of ['  ARCHIVED EQUIPMENT  ', 'saved-only operating', '92.7']) {
      expect(searchPackageReviewIndex(index, query).map((entry) => entry.slug)).toEqual([item.slug]);
    }
    expect(searchPackageReviewIndex(index, 'no such saved provision')).toEqual([]);
    expect(searchPackageReviewIndex(index, '   ')).toEqual(index);
  });
});
