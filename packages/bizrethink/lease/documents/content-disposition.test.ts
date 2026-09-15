import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { attachmentContentDisposition, inlineContentDisposition } from './content-disposition';

/**
 * 2026-09-15: two of the sixteen governing documents on the pilot lease
 * returned HTTP 500 to every signer — "Resolution 2026-04 — Adopting Amenity
 * Rates, Fees and Deposits" and its sibling. The label went straight into
 * `Content-Disposition`, and a header value may only carry bytes up to 0xFF.
 * The em dash is U+2014, so `new Response` threw before a byte was sent. The
 * tenant would have acknowledged receiving two documents they could not open.
 */
describe('inlineContentDisposition', () => {
  const LABEL = 'Resolution 2026-04 — Adopting Amenity Rates, Fees and Deposits';

  it('builds a header a Response accepts, whatever the label holds', () => {
    for (const label of [LABEL, 'Café “rules” 📄', 'Plain label']) {
      expect(
        () => new Response('x', { headers: { 'Content-Disposition': inlineContentDisposition(label) } }),
      ).not.toThrow();
    }
  });

  it('keeps the real name for browsers that read RFC 6266 filename*', () => {
    const header = inlineContentDisposition(LABEL);

    expect(header).toContain(`filename*=UTF-8''${encodeURIComponent(`${LABEL}.pdf`)}`);
    expect(decodeURIComponent(header.split("filename*=UTF-8''")[1])).toBe(`${LABEL}.pdf`);
  });

  it('gives older clients a readable ASCII fallback', () => {
    const header = inlineContentDisposition(LABEL);

    expect(header).toMatch(/^inline; filename="Resolution 2026-04 - Adopting Amenity Rates, Fees and Deposits\.pdf"; /);
  });

  it('cannot be used to break out of the quoted filename', () => {
    const header = inlineContentDisposition('evil"; filename="x.exe\\');

    expect(header.split(';')[1]).toBe(' filename="evil filename=x.exe.pdf"');
  });
});

describe('attachmentContentDisposition', () => {
  it('asks the browser to save the file, under the exact name it is given', () => {
    const header = attachmentContentDisposition('Governing documents — 29090 Picana Ln.zip');

    expect(header).toMatch(/^attachment; filename="Governing documents - 29090 Picana Ln\.zip"; /);
    expect(() => new Response('x', { headers: { 'Content-Disposition': header } })).not.toThrow();
  });
});

// Both routes that serve a governing document by its label — the signer's and
// the reviewer's. A helper nobody calls fixes nothing.
describe('the routes serving a document by its label', () => {
  for (const route of [
    'lease-attachment.$matterId.$documentId.tsx',
    'lease-review.$token.attachment.$documentId.tsx',
  ]) {
    it(`${route} encodes the label`, () => {
      const source = readFileSync(
        new URL(`../../../../apps/remix/app/routes/_recipient+/${route}`, import.meta.url),
        'utf8',
      );

      expect(source).toContain('inlineContentDisposition(document.label)');
      expect(source).not.toMatch(/filename="\$\{document\.label/);
    });
  }
});
