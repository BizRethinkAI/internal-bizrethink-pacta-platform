import { PDFDocument, PDFName } from '@cantoo/pdf-lib';
import { describe, expect, it } from 'vitest';
import { allOptionsDraftFixture, filledDraftFixture } from '../draft.fixture';
import { renderMcaDraftPdf } from './pdf';

describe('the real MCA PDF is an identifiable unsigned review copy', () => {
  it.each([
    ['receivables', filledDraftFixture],
    ['equipment, channel and two report subjects', allOptionsDraftFixture],
  ] as const)(
    '%s preserves text and separate capacities, marks every page and contains no active signing fields',
    async (_label, fixture) => {
      const draft = fixture().draft;
      const headings = new Set(
        draft.documents.flatMap((document) =>
          document.items.map((item) =>
            `${item.number ? `${item.number}  ` : ''}${item.heading}`.replace(/\s+/g, ' ').trim(),
          ),
        ),
      );
      const bytes = await renderMcaDraftPdf(draft, 3);
      const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
      const parsed = await pdfjs.getDocument({ data: new Uint8Array(bytes), useSystemFonts: false }).promise;
      const texts: string[] = [];
      expect(parsed.numPages).toBeGreaterThan(2);
      for (let number = 1; number <= parsed.numPages; number += 1) {
        const page = await parsed.getPage(number);
        const content = await page.getTextContent();
        const text = content.items
          .filter((item) => 'str' in item)
          .map((item) => ('str' in item ? item.str : ''))
          .join(' ');
        texts.push(text);
        const last = content.items
          .filter(
            (item) =>
              'str' in item && item.str.trim() && !/^(PACTA MCA|INTERNAL DRAFT|INTERNAL WORKSHEET)/.test(item.str),
          )
          .at(-1);
        expect(
          last && 'str' in last && headings.has(last.str.replace(/\s+/g, ' ').trim()),
          `orphan heading on page ${number}`,
        ).toBe(false);
        expect(text, `page ${number}`).toMatch(/INTERNAL (DRAFT|WORKSHEET)/);
        expect(text, `page ${number}`).not.toMatch(/\{\{|\[\[|«\d/);
        for (const item of content.items) {
          if ('str' in item && item.str.trim()) {
            expect(item.transform[4], `left edge on page ${number}`).toBeGreaterThanOrEqual(46);
            expect(item.transform[4] + item.width, `right edge on page ${number}`).toBeLessThanOrEqual(566);
            expect(item.transform[5], `baseline on page ${number}`).toBeGreaterThan(20);
            expect(item.transform[5], `baseline on page ${number}`).toBeLessThan(772);
          }
        }
      }
      for (const phrase of [
        'Example Merchant Inc.',
        'First Test Guarantor',
        'Merchant Signer',
        'Buyer Signer',
        'Outstanding package requirements',
      ]) {
        expect(
          texts.some((text) => text.includes(phrase)),
          phrase,
        ).toBe(true);
      }
      await parsed.destroy();
      const structure = await PDFDocument.load(bytes);
      expect(structure.catalog.has(PDFName.of('AcroForm'))).toBe(false);
    },
    30_000,
  );
});
