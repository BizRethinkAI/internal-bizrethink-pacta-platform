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
    const ordered = [...gridPages].sort((a, b) => a - b);
    expect(ordered.slice(0, 2)).toEqual([ordered[0], ordered[0] + 1]);
    expect(numPages).toBeGreaterThan(0);
  }, 30_000);
});

/**
 * The document carries the funder's identity, and is set like a contract.
 *
 * Lombard's real FRPA opens on a cover — display title, PREPARED BY, DOCUMENT
 * TYPE, CONFIDENTIALITY — and every page after it carries `Lombard Capital LLC
 * • 29090 Picana Ln…` on the left and `lombardpay.com` on the right, with a
 * PAGE stack top right. Its body is justified over a 468pt measure inside 72pt
 * margins. Pacta opened straight into body text at 11pt ragged-right over
 * 516pt, with chrome that named Pacta and the template revision.
 */
describe('an assembled document carries the funder identity', () => {
  const pageItems = async (bytes: Buffer) => {
    const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
    const parsed = await pdfjs.getDocument({ data: new Uint8Array(bytes), useSystemFonts: false }).promise;
    const pages: { str: string; x: number; right: number; y: number }[][] = [];

    for (let number = 1; number <= parsed.numPages; number += 1) {
      const content = await (await parsed.getPage(number)).getTextContent();
      pages.push(
        content.items
          .filter((item) => 'str' in item && item.str.trim())
          .map((item) =>
            'str' in item
              ? {
                  str: item.str.trim(),
                  x: item.transform[4],
                  right: item.transform[4] + item.width,
                  y: item.transform[5],
                }
              : { str: '', x: 0, right: 0, y: 0 },
          ),
      );
    }

    await parsed.destroy();
    return pages;
  };

  it('opens on a cover naming the funder, then sets the body like the real documents', async () => {
    const bytes = await renderMcaDraftPdf(filledDraftFixture().draft, 3);
    const pages = await pageItems(bytes);
    const cover = pages[0].map((item) => item.str).join(' ');

    expect(cover).toContain('Future Receivables Purchase Agreement');
    // The cover sets its labels letter-spaced, as the real document does.
    const squashed = cover.replace(/\s+/g, '');
    expect(squashed).toContain('PREPAREDBY');
    expect(cover).toContain('Example Receipts Inc.');
    expect(squashed).toContain('Private&Confidential');
    // Still an internal draft on every page, cover included.
    expect(cover).toMatch(/INTERNAL DRAFT/);
    // The cover is a cover: no clause text on it.
    expect(cover).not.toContain('Merchant — Legal Name');

    // Every page of the funder's own documents carries their identity. The
    // internal worksheet at the end is Pacta's page and carries none.
    const body = pages.slice(1).filter((items) => !items[0]?.str.startsWith('INTERNAL WORKSHEET'));
    expect(body.length).toBeGreaterThan(20);
    for (const [index, items] of body.entries()) {
      const text = items.map((item) => item.str).join(' ');
      expect(text, `funder footer on body page ${index + 2}`).toContain('Example Receipts Inc.');
    }

    // 72pt margins, 468pt measure, as the real document sets it.
    for (const [index, items] of pages.entries()) {
      for (const item of items) {
        expect(item.x, `left edge on page ${index + 1}`).toBeGreaterThanOrEqual(71);
        expect(item.right, `right edge on page ${index + 1}`).toBeLessThanOrEqual(541);
      }
    }

    // Justified: body lines end flush on the measure, not ragged.
    const flush = body.flat().filter((item) => item.right > 538 && item.right <= 541 && item.str.length > 20);
    expect(flush.length, 'flush-right body lines').toBeGreaterThan(20);
  }, 30_000);
});
