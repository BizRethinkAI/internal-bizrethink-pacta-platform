import { describe, expect, it } from 'vitest';

import { countPagesFromBytes, pageLabel } from '../documents/count-pages';

/*
  Counting pages by scanning the raw bytes for page objects is cheap and works
  on most PDFs — it read the 418-page move-in inspection exactly, in one pass
  over 54 MB.

  It cannot work on all of them. A linearised or "optimized" PDF moves its page
  objects into COMPRESSED OBJECT STREAMS, where nothing matching /Type /Page
  survives in the plain bytes. The Estancia master declaration is exactly that:
  155 pages, and this scan sees none of them.

  So the contract is: an exact count, or null. Never a guess. Null means the
  caller should ask a real parser, and until one answers the receipt simply
  omits the extent.
*/

const asBytes = (pdf: string) => new TextEncoder().encode(pdf);

const withPageObjects = (n: number) =>
  '%PDF-1.4\n' +
  Array.from({ length: n }, (_, i) => `${i + 4} 0 obj\n<< /Type /Page /Parent 2 0 R >>\nendobj\n`).join('');

describe('countPagesFromBytes', () => {
  it('counts page objects in an uncompressed PDF', () => {
    expect(countPagesFromBytes(asBytes(withPageObjects(3)))).toBe(3);
    expect(countPagesFromBytes(asBytes(withPageObjects(1)))).toBe(1);
  });

  /*
    /Type /Pages is the page TREE, one node per document. Counting it as a page
    is how a 155-page document comes to report 156.
  */
  it('does not mistake the page tree node for a page', () => {
    const pdf = '%PDF-1.4\n1 0 obj\n<< /Type /Pages /Count 2 >>\nendobj\n' + withPageObjects(2);
    expect(countPagesFromBytes(asBytes(pdf))).toBe(2);
  });

  it('returns null rather than zero when the page objects are compressed away', () => {
    const linearised = '%PDF-1.5\n1 0 obj\n<< /Type /ObjStm /N 40 /First 300 >>\nstream\n\nendstream\n';
    expect(countPagesFromBytes(asBytes(linearised))).toBeNull();
  });

  it('returns null for something that is not a PDF at all', () => {
    expect(countPagesFromBytes(asBytes('hello'))).toBeNull();
  });
});

describe('pageLabel', () => {
  /*
    The MPOA facility guidelines are one page, and the editor rendered
    "1 pages". describeDocuments got this right and the editor did not, which is
    what happens when the same sentence is written twice.
  */
  it('says "1 page", not "1 pages"', () => {
    expect(pageLabel(1)).toBe('1 page');
  });

  it('pluralises everything else', () => {
    expect(pageLabel(0)).toBe('0 pages');
    expect(pageLabel(155)).toBe('155 pages');
  });

  it('says the extent is unknown when it was never established', () => {
    expect(pageLabel(null)).toBe('Extent unknown');
  });
});
