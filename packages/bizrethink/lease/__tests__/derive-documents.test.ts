import { describe, expect, it } from 'vitest';

import type { LeaseDocument } from '../documents/derive-documents';
import { describeDocuments, describeGoverningDocuments, hasGoverningDocuments } from '../documents/derive-documents';

/*
  The receipt page exists because binding a tenant to documents they were never
  given is the soft spot in every HOA compliance clause. What makes it work is
  that a signer can take the reference printed here to the county recorder and
  pull the same instrument. So the identifying detail is the point, and these
  tests are mostly about it surviving the trip to the page.
*/

const doc = (over: Partial<LeaseDocument> = {}): LeaseDocument => ({
  id: 'doc_1',
  kind: 'move-in-report',
  label: 'Declaration of Covenants, Conditions and Restrictions',
  reference: '',
  documentDate: '',
  pageCount: null,
  ...over,
});

describe('describeDocuments', () => {
  it('numbers the documents so the acknowledgement can refer to one', () => {
    const text = describeDocuments(
      [
        doc({ id: 'a', label: 'Declaration of Covenants' }),
        doc({ id: 'b', label: 'Ninth Amendment to the Declaration' }),
      ],
      'move-in-report',
    );

    expect(text).toBe('1. Declaration of Covenants\n2. Ninth Amendment to the Declaration');
  });

  it('prints the recording reference verbatim, because that is what makes it findable', () => {
    const text = describeDocuments(
      [doc({ label: 'Ninth Amendment', reference: 'Instr# 2021271188, OR 10509/675' })],
      'move-in-report',
    );

    expect(text).toBe('1. Ninth Amendment (Instr# 2021271188, OR 10509/675)');
  });

  it('states the date and the page count when known', () => {
    const text = describeDocuments(
      [doc({ label: 'Community Guidelines', documentDate: '2023-04-18', pageCount: 30 })],
      'move-in-report',
    );

    expect(text).toBe('1. Community Guidelines, dated April 18, 2023 (30 pages)');
  });

  it('carries reference, date and extent together without duplicating the brackets', () => {
    const text = describeDocuments(
      [
        doc({
          label: 'Ninth Amendment',
          reference: 'Instr# 2021271188',
          documentDate: '2021-09-02',
          pageCount: 12,
        }),
      ],
      'move-in-report',
    );

    expect(text).toBe('1. Ninth Amendment, dated September 2, 2021 (Instr# 2021271188, 12 pages)');
  });

  it('says "1 page" rather than "1 pages"', () => {
    expect(describeDocuments([doc({ label: 'Rule Notice', pageCount: 1 })], 'move-in-report')).toBe(
      '1. Rule Notice (1 page)',
    );
  });

  /*
    A move-in report and a declaration are both uploaded documents but they are
    never acknowledged on the same page — one is the condition of the house at a
    moment, the other is the rulebook for the community. Mixing them would put a
    418-page inspection into the lease envelope's receipt.
  */
  it('describes only the kind it was asked for', () => {
    const text = describeDocuments(
      [doc({ id: 'a', label: 'Declaration', kind: 'hoa-governing' }), doc({ id: 'b', label: 'Move-in Inspection' })],
      'move-in-report',
    );

    expect(text).toBe('1. Move-in Inspection');
  });

  it('is empty when nothing has been uploaded', () => {
    expect(describeDocuments([], 'move-in-report')).toBe('');
  });
});

describe('hasGoverningDocuments', () => {
  it('is false when the association exists but nothing has been uploaded', () => {
    expect(hasGoverningDocuments([])).toBe(false);
    expect(hasGoverningDocuments([doc()])).toBe(false);
  });

  it('is true once a governing document is attached', () => {
    expect(hasGoverningDocuments([doc({ kind: 'hoa-governing' })])).toBe(true);
  });
});

/**
 * The governing documents, as the receipt lists them.
 *
 * "Even I can't tell you which was for what" — the repository owner on sixteen
 * titles in one run. Each issuer gets a heading from the property record; each
 * document leads with what it covers; its recording reference and extent sit on
 * a quieter line beneath; an amendment is lettered under what it amends.
 */
describe('describeGoverningDocuments', () => {
  const NAMES = { association: 'Example Master Association', cdd: 'Example Community Development District' };

  const governing = (over: Partial<LeaseDocument>): LeaseDocument => ({
    ...doc(),
    kind: 'hoa-governing',
    issuer: 'association',
    amendsDocumentId: null,
    ...over,
  });

  const documents = [
    governing({
      id: 'bdoc_decl',
      label: 'Declaration',
      description: 'the community rules',
      documentDate: '2015-07-20',
      reference: 'Instr# 1, OR 1/1',
      pageCount: 155,
    }),
    governing({
      id: 'bdoc_res',
      label: 'Resolution 2026-04',
      description: 'amenity fees and deposits',
      issuer: 'cdd',
      pageCount: 4,
    }),
    governing({
      id: 'bdoc_amd',
      label: 'First Amendment',
      description: 'adds Phase 2B1 land',
      documentDate: '2015-11-03',
      reference: 'Instr# 2',
      pageCount: 5,
      amendsDocumentId: 'bdoc_decl',
    }),
  ];

  it('groups, describes, nests and links each document, then all of them', () => {
    const lines = describeGoverningDocuments(documents, { names: NAMES, matterId: 'lease_matter_abc' }).split('\n');
    const url = (id: string) =>
      expect.stringMatching(new RegExp(`\\|https?://.+/lease-attachment/lease_matter_abc/${id}\\]\\]$`));

    expect(lines).toEqual([
      '[[group Example Master Association]]',
      expect.stringMatching(
        /^\[\[doc\]\]1\. Declaration — the community rules \(July 20, 2015\) · \[\[link download\|/,
      ),
      '[[ref]]Instr# 1, OR 1/1 · 155 pages',
      expect.stringMatching(
        /^\[\[doc sub\]\]1a\. First Amendment — adds Phase 2B1 land \(November 3, 2015\) · \[\[link download\|/,
      ),
      '[[ref sub]]Instr# 2 · 5 pages',
      '[[group Example Community Development District]]',
      expect.stringMatching(/^\[\[doc\]\]2\. Resolution 2026-04 — amenity fees and deposits · \[\[link download\|/),
      '[[ref]]4 pages',
      'All 3 documents in one download:',
      expect.stringMatching(/^\[\[link (\S+)\|\1\]\]$/),
    ]);
    expect(lines[1]).toEqual(url('bdoc_decl'));
    expect(lines[3]).toEqual(url('bdoc_amd'));
    expect(lines[9]).toMatch(/\/lease-attachment\/lease_matter_abc\/all\]\]$/);
  });

  it('prints the same structure without links when there is no lease id', () => {
    const text = describeGoverningDocuments(documents, { names: NAMES });

    expect(text).not.toContain('[[link');
    expect(text).toContain('[[doc]]1. Declaration — the community rules (July 20, 2015)\n');
  });

  it('is empty when nothing has been uploaded', () => {
    expect(describeGoverningDocuments([], { names: NAMES, matterId: 'lease_matter_abc' })).toBe('');
  });
});
