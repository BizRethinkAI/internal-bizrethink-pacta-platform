import { describe, expect, it } from 'vitest';

import type { ClauseJurisdiction } from '../clauses/approval-jurisdiction';
import { libraryFor } from '../clauses/library';
import { describeDocuments } from '../documents/derive-documents';
import { FL_INTERVIEW } from '../interview/steps';
import { PICANA_FACTS, PICANA_MONEY, PICANA_PARTIES, PICANA_VALUES } from '../matters/picana-ln';
import { interpolateClause } from '../render/interpolate';
import { formatLongDate } from '../render/long-date';
import { buildLeaseDocuments } from '../render/render-lease';
import { DEFAULT_YARD_TASKS, renderYardDuties } from '../yard/derive-yard';

/**
 * A Florida lease, written in American English.
 *
 * The 2026-09-15 page-by-page review of the pilot package found "authorised",
 * "Mould", "neighbours", "rubbish", "sent by post" and "read down" in the
 * lease, and its dates in three formats — "October 1, 2026" in Key Terms,
 * "1 October 2026" in clause 3.1, "20 July 2015" in the receipt. None changed
 * what the lease means. All of it told the reader the document was not written
 * for where it is used. Several adversarial reviews had read the legal
 * substance against the statutes; none had read it as a tenant would.
 */

/*
  Whole words and phrases, so "premises" or "compromise" cannot trip it. Each
  entry is a form that has an American equivalent a US reader expects in a
  lease; the replacement is in the clause, not here.
*/
const BRITISH = [
  /\bauthoris/i,
  /\borganis(e|es|ed|ing|ation)/i,
  /\bitemis/i,
  /\bsubsidis/i,
  /\bfertilis/i,
  /\brecognis/i,
  /\bminimis/i,
  /\bmould/i,
  /\bodour/i,
  /\bneighbour/i,
  /\bcolour/i,
  /\bbehaviour/i,
  /\bfavour/i,
  /\blabour/i,
  /\brubbish\b/i,
  /\bby post\b/i,
  /\bsave that\b/i,
  /\bmaking good\b/i,
  /\bread down\b/i,
  /\btap washers?\b/i,
  /\bfortnight/i,
  /\bwhilst\b/i,
  /\bamongst\b/i,
  /\blicence\b/i,
  /\bcheque/i,
  /\bkerb\b/i,
  /\bstorey\b/i,
  /\bjudgement\b/i,
  /\binstalment/i,
  /\bshort-term letting\b/i,
];

// `{{authorisedOccupants}}` is a variable NAME — an identifier stored in every
// matter — not a word anyone reads, so tokens are removed before scanning.
const britishIn = (text: string) => {
  const readable = text.replace(/\{\{[^}]*\}\}/g, '');

  return BRITISH.filter((pattern) => pattern.test(readable)).map(String);
};

const JURISDICTIONS: ClauseJurisdiction[] = ['US-FL', 'US-NC'];

describe('clause text reads as American English', () => {
  for (const jurisdiction of JURISDICTIONS) {
    it(`${jurisdiction}: headings, bodies and variable labels`, () => {
      const found = libraryFor(jurisdiction).flatMap((clause) =>
        [clause.heading, clause.body, ...clause.variables.map((variable) => variable.label)].flatMap((text) =>
          britishIn(text).map((pattern) => `${clause.slug}: ${pattern}`),
        ),
      );

      expect(found).toEqual([]);
    });
  }

  // The yard rows are seeded from these, and print as typed.
  it('the default yard tasks', () => {
    const found = DEFAULT_YARD_TASKS.flatMap((row) => britishIn(`${row.task} ${row.frequency} ${row.example}`));

    expect(found).toEqual([]);
  });

  // What the landlord reads while answering, in the same product.
  it('the interview questions and help', () => {
    const found = FL_INTERVIEW.flatMap((step) =>
      step.fields.flatMap((field) =>
        britishIn(`${field.label} ${field.help ?? ''}`).map((pattern) => `${field.name}: ${pattern}`),
      ),
    );

    expect(found).toEqual([]);
  });
});

describe('every date in the package reads the same way', () => {
  it('formats as a US reader writes a date', () => {
    expect(formatLongDate('2026-10-01')).toBe('October 1, 2026');
    expect(formatLongDate('2015-07-20T00:00:00.000Z')).toBe('July 20, 2015');
    expect(formatLongDate('not a date')).toBe('');
  });

  it('clause dates', () => {
    const result = interpolateClause({
      body: 'begins on {{startDate}}',
      variables: [{ name: 'startDate', type: 'date', label: 'Start', required: true }],
      values: { startDate: '2026-10-01' },
    });

    expect(result.text).toBe('begins on October 1, 2026');
  });

  it('governing-document dates on the receipt', () => {
    const listed = describeDocuments([
      {
        id: 'd1',
        kind: 'hoa-governing',
        label: 'Master Declaration',
        reference: '',
        documentDate: '2015-07-20',
        pageCount: 3,
      },
    ]);

    expect(listed).toContain('dated July 20, 2015');
  });

  it('Key Terms, which already read this way — through the same formatter now', () => {
    const { documents } = buildLeaseDocuments({
      facts: PICANA_FACTS,
      money: PICANA_MONEY,
      values: PICANA_VALUES,
      parties: PICANA_PARTIES,
      propertyAddress: '29090 Picana Lane, Wesley Chapel, Florida 33543',
    });
    const term = documents[0].keyTerms?.find((row) => row.label.toLowerCase() === 'term');
    const start = formatLongDate(String(PICANA_MONEY.term.startDate));

    expect(start).not.toBe('');
    expect(term?.value.startsWith(`${start} to `)).toBe(true);
  });
});

/**
 * 8.9 on the pilot lease: "mowing and edging, as needed, irrigation and
 * watering, as needed, shrubs, hedges and beds, as needed, and leaf and debris
 * clearance, as needed". Every item carries a comma of its own, so commas could
 * not also separate the items — the reader could not tell where one ended.
 */
describe('the yard duties list', () => {
  const row = (task: string, doneBy: 'tenant' | 'landlord') => ({ task, notes: '', doneBy, frequency: 'As needed' });

  it('separates items with semicolons when the items contain commas', () => {
    const text = renderYardDuties([
      row('Mowing and edging', 'tenant'),
      row('Irrigation and watering', 'tenant'),
      row('Shrubs, hedges and beds', 'tenant'),
      row('Leaf and debris clearance', 'tenant'),
      row('Palm and tree trimming', 'landlord'),
      row('Fertilization and pest treatment', 'landlord'),
    ]);

    expect(text).toContain(
      "Tenant shall, at Tenant's cost, attend to the following: mowing and edging, as needed; irrigation and watering, as needed; shrubs, hedges and beds, as needed; and leaf and debris clearance, as needed.",
    );
    expect(text).toContain(
      "Landlord shall, at Landlord's cost, attend to the following: palm and tree trimming, as needed; and fertilization and pest treatment, as needed.",
    );
  });

  it('keeps plain commas when nothing in the list has one', () => {
    const plain = (task: string) => ({ task, notes: '', doneBy: 'tenant' as const, frequency: '' });

    expect(renderYardDuties([plain('Mowing'), plain('Watering'), plain('Weeding')])).toContain(
      'attend to the following: mowing, watering, and weeding.',
    );
  });
});
