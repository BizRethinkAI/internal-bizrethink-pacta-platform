import { describe, expect, it } from 'vitest';

import { assertDocumentPlacement, MAX_DOCUMENT_MB } from '../documents/placement';

/*
  Where a document hangs decides which leases it appears on, and the two kinds
  pull in opposite directions.

  A recorded declaration belongs to the property: it outlives every tenancy, and
  the point of holding it there is that next year's lease receipts it without
  anyone re-uploading a few hundred pages.

  A condition report is the opposite. It records ONE tenancy at ONE moment. Hung
  on the property it would be receipted into every future lease as though the
  next tenant had agreed the last tenant's scuffs — and it is the document a
  deposit deduction rests on.
*/

describe('assertDocumentPlacement', () => {
  it('puts governing documents on the property, where they outlive the tenancy', () => {
    expect(() => assertDocumentPlacement('hoa-governing', { propertyId: 'p1' })).not.toThrow();
  });

  it('refuses a governing document hung on a single lease', () => {
    expect(() => assertDocumentPlacement('hoa-governing', { matterId: 'm1' })).toThrow(/property/i);
  });

  it('puts condition reports on the matter, because they record one tenancy', () => {
    expect(() => assertDocumentPlacement('move-in-report', { matterId: 'm1' })).not.toThrow();
    expect(() => assertDocumentPlacement('move-out-report', { matterId: 'm1' })).not.toThrow();
  });

  it('refuses a condition report hung on the property', () => {
    expect(() => assertDocumentPlacement('move-in-report', { propertyId: 'p1' })).toThrow(/lease|matter/i);
  });

  it('refuses a document owned by both, or by neither', () => {
    expect(() => assertDocumentPlacement('hoa-governing', { propertyId: 'p1', matterId: 'm1' })).toThrow(/one/i);
    expect(() => assertDocumentPlacement('hoa-governing', {})).toThrow(/one/i);
  });

  it('rejects a kind it does not know rather than storing it', () => {
    // @ts-expect-error deliberately outside the union
    expect(() => assertDocumentPlacement('bank-statement', { propertyId: 'p1' })).toThrow();
  });
});

describe('MAX_DOCUMENT_MB', () => {
  /*
    The move-in inspection for one house was 418 pages and 54.7 MB of
    photographs — over upstream's 50 MB envelope limit, which exists because
    those files are pushed through the signing UI. These are not: they are
    stored and read, never placed or scrolled in the editor, so the ceiling
    that matters is what the storage backend will take.
  */
  it('admits a real photographic inspection report', () => {
    expect(MAX_DOCUMENT_MB).toBeGreaterThan(55);
  });
});
