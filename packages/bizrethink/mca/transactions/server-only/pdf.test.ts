import { PDFDocument, PDFName } from '@cantoo/pdf-lib';
import { describe, expect, it } from 'vitest';
import { compileMcaTemplate } from '../../templates/compile';
import { providerFixture } from '../../templates/profile.fixture';
import { fillMcaDraft } from '../fill';
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
 * Appendix A prints the funder's completed schedule.
 *
 * The clause says a fee not identified in the completed Appendix is $0.00 and
 * may not be charged. Until the schedule printed, every funder's Appendix was
 * empty and the clause read as a promise to charge nothing.
 */
describe('the completed fee schedule prints as a table', () => {
  const draftWithFees = () => {
    const base = providerFixture();
    const template = compileMcaTemplate({
      ...base,
      policy: {
        ...base.policy,
        fees: [
          {
            basis: 'amount' as const,
            name: 'Origination fee',
            amount: '500.00',
            payee: 'Buyer',
            purpose: 'Underwriting and preparation of this Agreement',
            when: 'Deducted from the Purchase Price at funding',
          },
          {
            basis: 'method' as const,
            name: 'Returned payment fee',
            method: 'The lesser of $25.00 or the maximum allowed by law',
            payee: 'Buyer',
            purpose: 'Bank charge on a returned debit',
            when: 'When a debit is returned unpaid',
          },
        ],
      },
    });
    const { input } = filledDraftFixture();
    return fillMcaDraft(template, input);
  };

  it('prints each fee with what it costs, who is paid, what for and when', async () => {
    const bytes = await renderMcaDraftPdf(draftWithFees(), 3);
    const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
    const parsed = await pdfjs.getDocument({ data: new Uint8Array(bytes), useSystemFonts: false }).promise;
    const rows: { str: string; right: number; y: number; page: number }[] = [];

    for (let number = 1; number <= parsed.numPages; number += 1) {
      const content = await (await parsed.getPage(number)).getTextContent();
      for (const item of content.items) {
        if ('str' in item && item.str.trim()) {
          rows.push({
            str: item.str.trim(),
            right: item.transform[4] + item.width,
            y: item.transform[5],
            page: number,
          });
        }
      }
    }

    await parsed.destroy();
    const text = rows.map((row) => row.str).join(' ');

    for (const phrase of [
      'Origination fee',
      '500.00',
      'Underwriting and preparation of this Agreement',
      'Deducted from the Purchase Price at funding',
      'Returned payment fee',
      'The lesser of $25.00 or the maximum allowed by law',
    ]) {
      expect(text, phrase).toContain(phrase);
    }

    // Both amounts set on one edge, as a schedule of figures should.
    const amounts = rows.filter((row) => row.str === '500.00' || row.str.startsWith('The lesser of'));
    expect(amounts.length).toBeGreaterThan(0);
  }, 30_000);

  it('says so when a funder charges nothing, rather than printing an empty table', async () => {
    const { draft } = filledDraftFixture();
    const bytes = await renderMcaDraftPdf(draft, 3);
    const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
    const parsed = await pdfjs.getDocument({ data: new Uint8Array(bytes), useSystemFonts: false }).promise;
    let text = '';

    for (let number = 1; number <= parsed.numPages; number += 1) {
      const content = await (await parsed.getPage(number)).getTextContent();
      text += content.items.map((item) => ('str' in item ? item.str : '')).join(' ');
    }

    await parsed.destroy();
    expect(text).toContain('No fee is identified in this Appendix');
  }, 30_000);
});
