import { describe, expect, it } from 'vitest';
import { filterCatalogue } from './catalogue';
import { readingParagraphs } from './reading';

describe('legal catalogue navigation', () => {
  const items = [
    {
      slug: 'one',
      heading: 'Receipts',
      body: 'Entire wording with retained subparagraphs.',
      section: 'purchase',
      instrument: 'frpa',
      approved: false,
      outstanding: 1,
      kind: 'clause',
    },
    {
      slug: 'two',
      heading: 'Alternative',
      body: 'Different business choice.',
      section: 'purchase',
      instrument: 'frpa',
      approved: true,
      outstanding: 0,
      kind: 'clause',
    },
    {
      slug: 'three',
      heading: 'Fields',
      body: '',
      section: 'execution',
      instrument: 'subscription',
      approved: false,
      outstanding: 0,
      kind: 'field-group',
    },
  ];
  it('searches full wording and combines subject, instrument, kind and actual review state', () => {
    expect(
      filterCatalogue(items, new URLSearchParams('q=retained&instrument=frpa&subject=purchase&status=findings')),
    ).toEqual([items[0]]);
    expect(filterCatalogue(items, new URLSearchParams('status=approved'))).toEqual([items[1]]);
    expect(filterCatalogue(items, new URLSearchParams('kind=field-group'))).toEqual([items[2]]);
    expect(filterCatalogue(items, new URLSearchParams('instrument=missing&status=unknown'))).toEqual(items);
  });
  it('retains every character and reference when laying out existing paragraphs', () => {
    const parts = [{ kind: 'text' as const, text: 'A\n\n(b) B\n\nC\n  D' }];
    expect(
      readingParagraphs(parts)
        .flat()
        .map((part) => part.text)
        .join(''),
    ).toBe(parts[0].text);
    expect(readingParagraphs(parts)).toHaveLength(3);
  });
});
