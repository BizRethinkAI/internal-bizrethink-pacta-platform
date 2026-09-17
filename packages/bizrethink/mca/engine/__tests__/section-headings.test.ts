import { describe, expect, it } from 'vitest';
import { LOMBARD_FACTS } from '../../clauses/facts';
import { MCA_INSTRUMENTS } from '../../clauses/instruments';
import { contentForReview } from '../../reusable/review';
import { compileMcaTemplate } from '../../templates/compile';
import { providerFixture } from '../../templates/profile.fixture';
import { allOptionsDraftFixture } from '../../transactions/draft.fixture';
import { groupMcaSections, hasMcaSectionName, mcaSectionHeading, mcaSectionName } from '../section-headings';
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
      expect(group.heading).toMatch(new RegExp(`^Section ${prefixes[0]}: [A-Z]`));
    }
  });

  it('retains a section number after filtering and follows a different selected programme', () => {
    const selected = selectClauses({ instrument: 'frpa', facts: { ...LOMBARD_FACTS, guarantyScope: 'none' } }).selected;
    const purchase = selected.filter((item) => item.section === 'purchase');
    expect(groupMcaSections(purchase)[0].heading).toBe('Section 3: Purchase and Sale of Future Receivables');
    const service = selected.filter((item) => item.section === 'service');
    expect(groupMcaSections(service)[0].heading).toBe(
      `Section ${service[0].number.split('.')[0]}: Waiver of Personal Service`,
    );
  });

  it('never gives reusable-only or conflicting review contexts an invented parent citation', () => {
    expect(mcaSectionHeading('execution', [{ number: null }], 'frpa')).toBe('Execution');
    expect(mcaSectionHeading('guaranty', [{ number: '9.1' }, { number: '10.1' }], 'frpa')).toBe(
      'Personal Guaranty of Performance',
    );
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
    // No instrument on these synthetic rows, so the name falls back to the slug.
    expect(groupMcaSections(items).map((group) => group.heading)).toEqual([
      'Section 2: Guaranty',
      'Execution',
      'Section 2: Guaranty',
    ]);
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
      expect(groupMcaSections(document.items)[0].heading).toMatch(/^Section 1: /);
    }
    expect(documents.filter((document) => document.instrument === 'permission-to-release')).toHaveLength(2);
  });
});

/**
 * A section is named, not slug-cased.
 *
 * The heading read "3. Purchase" where the document it came from reads
 * "Section 2: Purchase and Sale of Future Receivables". Title-casing an
 * identifier is not a name: `service` became "Service" for a section about
 * waiving personal service of process, and `default` became "Default".
 *
 * Titles are per instrument, because the same identifier means different things
 * in different documents: `guaranty` is "Personal Guaranty of Performance" in
 * the FRPA and "Personal Guaranty" in the equipment lease, and `agreement` is
 * the lease's terms in one and the subscription's in another.
 */
describe('sections carry the name the document gives them', () => {
  it('names every section every instrument actually uses', () => {
    const missing: string[] = [];

    for (const instrument of MCA_INSTRUMENTS) {
      for (const section of new Set(contentForReview(instrument).map((row) => row.section))) {
        // Named explicitly, not merely title-cased into something readable:
        // "Preamble" happens to match its slug and is still a real name.
        if (!hasMcaSectionName(section, instrument)) {
          missing.push(`${instrument}/${section}`);
        }
      }
    }

    expect(missing, 'sections with no name of their own').toEqual([]);
  });

  it('reads as the document reads', () => {
    expect(mcaSectionName('purchase', 'frpa')).toBe('Purchase and Sale of Future Receivables');
    expect(mcaSectionName('service', 'frpa')).toBe('Waiver of Personal Service');
    expect(mcaSectionName('funding-terms', 'frpa')).toBe('Merchant and Funding Information');
  });

  it('gives the same identifier a different name in a different document', () => {
    expect(mcaSectionName('guaranty', 'frpa')).toBe('Personal Guaranty of Performance');
    expect(mcaSectionName('guaranty', 'equipment-lease')).toBe('Personal Guaranty');
    expect(mcaSectionName('agreement', 'equipment-lease')).not.toBe(mcaSectionName('agreement', 'subscription'));
  });

  it('prints a numbered section the way the documents print it', () => {
    expect(mcaSectionHeading('purchase', [{ number: '2.1' }], 'frpa')).toBe(
      'Section 2: Purchase and Sale of Future Receivables',
    );
    // An unnumbered or mixed selection still refuses to invent a citation.
    expect(mcaSectionHeading('execution', [{ number: null }], 'frpa')).toBe('Execution');
  });
});
