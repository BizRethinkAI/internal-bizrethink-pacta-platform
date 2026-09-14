import { describe, expect, it } from 'vitest';
import { LOMBARD_FACTS } from '../../clauses/facts';
import { MCA_INSTRUMENTS } from '../../clauses/instruments';
import { contentForReview } from '../../reusable/review';
import { compileMcaTemplate } from '../../templates/compile';
import { providerFixture } from '../../templates/profile.fixture';
import { allOptionsDraftFixture } from '../../transactions/draft.fixture';
import { groupMcaSections, mcaSectionHeading } from '../section-headings';
import { selectClauses } from '../select-clauses';

describe('MCA parent headings use the displayed selection without changing its content', () => {
  it.each(MCA_INSTRUMENTS)('%s preserves every review row and its existing citation', (instrument) => {
    const rows = contentForReview(instrument);
    const before = structuredClone(rows.map(({ slug, body, number, fields }) => ({ slug, body, number, fields })));
    const groups = groupMcaSections(rows);
    expect(groups.flatMap((group) => group.items)).toEqual(rows);
    expect(rows.map(({ slug, body, number, fields }) => ({ slug, body, number, fields }))).toEqual(before);
    for (const group of groups) {
      const prefixes = [...new Set(group.items.flatMap((item) => (item.number ? [item.number.split('.')[0]] : [])))];
      expect(prefixes).toHaveLength(1);
      expect(group.heading).toMatch(new RegExp(`^${prefixes[0]}\\. [A-Z]`));
    }
  });

  it('retains a section number after filtering and follows a different selected programme', () => {
    const selected = selectClauses({ instrument: 'frpa', facts: { ...LOMBARD_FACTS, guarantyScope: 'none' } }).selected;
    const purchase = selected.filter((item) => item.section === 'purchase');
    expect(groupMcaSections(purchase)[0].heading).toBe('3. Purchase');
    const service = selected.filter((item) => item.section === 'service');
    expect(groupMcaSections(service)[0].heading).toBe(`${service[0].number.split('.')[0]}. Service`);
  });

  it('never gives reusable-only or conflicting review contexts an invented parent citation', () => {
    expect(mcaSectionHeading('execution', [{ number: null }])).toBe('Execution');
    expect(mcaSectionHeading('guaranty', [{ number: '9.1' }, { number: '10.1' }])).toBe('Guaranty');
    expect(groupMcaSections([])).toEqual([]);
  });

  it('does not move a helper or repeated item when a section resumes', () => {
    const items = [
      { section: 'guaranty', number: null, id: 'first-fields' },
      { section: 'guaranty', number: '2.1', id: 'first-terms' },
      { section: 'execution', number: null, id: 'first-signature' },
      { section: 'guaranty', number: '2.1', id: 'second-terms' },
    ];
    expect(groupMcaSections(items).flatMap((group) => group.items)).toEqual(items);
    expect(groupMcaSections(items).map((group) => group.heading)).toEqual(['2. Guaranty', 'Execution', '2. Guaranty']);
  });

  it('keeps saved recipes unchanged and restarts headings for every actual document instance', () => {
    const profile = providerFixture();
    const snapshot = compileMcaTemplate(profile);
    const before = structuredClone(snapshot);
    for (const document of snapshot.documents) {
      groupMcaSections(document.items);
    }
    expect(snapshot).toEqual(before);
    expect(compileMcaTemplate(profile).fingerprint).toBe(before.fingerprint);
    const documents = allOptionsDraftFixture().draft.documents;
    for (const document of documents) {
      expect(groupMcaSections(document.items)[0].heading).toMatch(/^1\. /);
    }
    expect(documents.filter((document) => document.instrument === 'permission-to-release')).toHaveLength(2);
  });
});
