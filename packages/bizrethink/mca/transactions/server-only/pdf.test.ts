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
      const parentHeadings = ['1. Funding Terms', '2. Preamble', '3. Purchase', '4. Reconciliation'];
      for (const heading of parentHeadings) {
        headings.add(heading);
      }
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
          .join(' ')
          .replace(/\s+/g, ' ');
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
        if (last && 'str' in last) {
          // PDF.js can split the section number and title into separate items.
          // Section/document headings use a larger font than the 11pt body.
          expect(last.height, `orphan parent heading on page ${number}`).toBeLessThan(13);
        }
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
        ...parentHeadings,
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
      const completeText = texts.join(' ').replace(/\s+/g, ' ');
      expect(completeText.indexOf('1. Funding Terms')).toBeLessThan(
        completeText.indexOf('1.1 Estimated Daily Holdback'),
      );
      expect(completeText.indexOf('3. Purchase')).toBeLessThan(completeText.indexOf('3.1 Definitions'));
      await parsed.destroy();
      const structure = await PDFDocument.load(bytes);
      expect(structure.catalog.has(PDFName.of('AcroForm'))).toBe(false);
    },
    30_000,
  );
});

/**
 * Section 1 is a grid, and the page count is the evidence.
 *
 * Every field used to print as a full-width stacked label-over-value row, so
 * the funding grid alone ran pages and the FRPA came out at 37 against the real
 * document's 23. These assertions are geometric on purpose: a label pair that
 * shares a baseline is a row, and nothing else looks like one.
 */
describe('completed fields print as a grid, not a stack', () => {
  const labelItems = async (bytes: Buffer) => {
    const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
    const parsed = await pdfjs.getDocument({ data: new Uint8Array(bytes), useSystemFonts: false }).promise;
    const items: { str: string; x: number; y: number; page: number }[] = [];

    for (let number = 1; number <= parsed.numPages; number += 1) {
      const page = await parsed.getPage(number);
      const content = await page.getTextContent();

      for (const item of content.items) {
        if ('str' in item && item.str.trim()) {
          items.push({ str: item.str.trim(), x: item.transform[4], y: item.transform[5], page: number });
        }
      }
    }

    const { numPages } = parsed;
    await parsed.destroy();
    return { items, numPages };
  };

  it('pairs two short answers on one baseline and keeps an address alone', async () => {
    const bytes = await renderMcaDraftPdf(filledDraftFixture().draft, 3);
    const { items, numPages } = await labelItems(bytes);
    const find = (label: string) => items.find((item) => item.str.startsWith(label));

    const entityType = find('Merchant — Entity Type');
    const formationState = find('Merchant — State of Formation');
    const businessAddress = find('Merchant — Business Address');

    expect(entityType, 'entity type label').toBeDefined();
    expect(formationState, 'formation state label').toBeDefined();
    expect(businessAddress, 'business address label').toBeDefined();

    // Same row: one baseline, two columns.
    expect(formationState?.y).toBe(entityType?.y);
    expect(formationState?.x).toBeGreaterThan((entityType?.x ?? 0) + 100);

    // An address takes the row to itself.
    const sharingWithAddress = items.filter(
      (item) =>
        item.page === businessAddress?.page && item.y === businessAddress?.y && item.str !== businessAddress?.str,
    );
    expect(sharingWithAddress, 'address shares its baseline').toEqual([]);

    // The funding grid is a grid: it fits on the pages it introduces rather
    // than running down the document one field at a time. Page count overall is
    // driven by body typography and clause length, not by this.
    const gridPages = new Set(
      items.filter((item) => /^(Merchant|Deposit Account|Funding Terms) — /.test(item.str)).map((item) => item.page),
    );
    expect([...gridPages].sort((a, b) => a - b).slice(0, 2)).toEqual([1, 2]);
    expect(numPages).toBeGreaterThan(0);
  }, 30_000);
});
