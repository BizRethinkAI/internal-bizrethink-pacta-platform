import { describe, expect, it } from 'vitest';

import type { LeaseDocument } from '../documents/derive-documents';
import { describeDocuments, hasGoverningDocuments } from '../documents/derive-documents';

/*
  The receipt page exists because binding a tenant to documents they were never
  given is the soft spot in every HOA compliance clause. What makes it work is
  that a signer can take the reference printed here to the county recorder and
  pull the same instrument. So the identifying detail is the point, and these
  tests are mostly about it surviving the trip to the page.
*/

const doc = (over: Partial<LeaseDocument> = {}): LeaseDocument => ({
  id: 'doc_1',
  kind: 'hoa-governing',
  label: 'Declaration of Covenants, Conditions and Restrictions',
  reference: '',
  documentDate: '',
  pageCount: null,
  ...over,
});

describe('describeDocuments', () => {
  it('numbers the documents so the acknowledgement can refer to one', () => {
    const text = describeDocuments([
      doc({ id: 'a', label: 'Declaration of Covenants' }),
      doc({ id: 'b', label: 'Ninth Amendment to the Declaration' }),
    ]);

    expect(text).toBe('1. Declaration of Covenants\n2. Ninth Amendment to the Declaration');
  });

  it('prints the recording reference verbatim, because that is what makes it findable', () => {
    const text = describeDocuments([doc({ label: 'Ninth Amendment', reference: 'Instr# 2021271188, OR 10509/675' })]);

    expect(text).toBe('1. Ninth Amendment (Instr# 2021271188, OR 10509/675)');
  });

  it('states the date and the page count when known', () => {
    const text = describeDocuments([doc({ label: 'Community Guidelines', documentDate: '2023-04-18', pageCount: 30 })]);

    expect(text).toBe('1. Community Guidelines, dated 18 April 2023 (30 pages)');
  });

  it('carries reference, date and extent together without duplicating the brackets', () => {
    const text = describeDocuments([
      doc({
        label: 'Ninth Amendment',
        reference: 'Instr# 2021271188',
        documentDate: '2021-09-02',
        pageCount: 12,
      }),
    ]);

    expect(text).toBe('1. Ninth Amendment, dated 2 September 2021 (Instr# 2021271188, 12 pages)');
  });

  it('says "1 page" rather than "1 pages"', () => {
    expect(describeDocuments([doc({ label: 'Rule Notice', pageCount: 1 })])).toBe('1. Rule Notice (1 page)');
  });

  /*
    A move-in report and a declaration are both uploaded documents but they are
    never acknowledged on the same page — one is the condition of the house at a
    moment, the other is the rulebook for the community. Mixing them would put a
    418-page inspection into the lease envelope's receipt.
  */
  it('describes only the kind it was asked for', () => {
    const text = describeDocuments([
      doc({ id: 'a', label: 'Declaration' }),
      doc({ id: 'b', label: 'Move-in Inspection', kind: 'move-in-report' }),
    ]);

    expect(text).toBe('1. Declaration');
  });

  it('is empty when nothing has been uploaded', () => {
    expect(describeDocuments([])).toBe('');
  });
});

describe('hasGoverningDocuments', () => {
  it('is false when the association exists but nothing has been uploaded', () => {
    expect(hasGoverningDocuments([])).toBe(false);
    expect(hasGoverningDocuments([doc({ kind: 'move-in-report' })])).toBe(false);
  });

  it('is true once a governing document is attached', () => {
    expect(hasGoverningDocuments([doc()])).toBe(true);
  });
});
