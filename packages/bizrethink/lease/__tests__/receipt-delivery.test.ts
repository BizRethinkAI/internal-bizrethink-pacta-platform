import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { libraryFor } from '../clauses/library';
import { describeGoverningDocuments } from '../documents/derive-documents';
import { PICANA_FACTS, PICANA_MONEY, PICANA_PARTIES, PICANA_VALUES } from '../matters/picana-ln';
import { renderLease } from '../render/render-lease';
import { whiteOutSigningTokens } from '../render/white-out-signing-tokens';

/**
 * "How does the tenant know the association documents are in the attachment
 * link and need to download it?" — the repository owner, 2026-09-15.
 *
 * They did not. The receipt had the tenant acknowledge receiving sixteen
 * documents; the only way to them was an unlabelled "Attachments" item under
 * Actions in the signing sidebar, and nothing in the signed PDF led back.
 */

const receipt = () => libraryFor('US-FL').find((clause) => clause.slug === 'hoa.governing-documents-receipt');

describe('the receipt says where the documents are', () => {
  it('names the links, the signing screen, and a paper copy on request', () => {
    const body = receipt()?.body ?? '';

    expect(body).toMatch(/download/i);
    expect(body).toMatch(/Attachments/);
    expect(body).toMatch(/paper copy/i);
  });

  // A description is a summary a landlord wrote. It must not be read as the document.
  it('says the documents control over their descriptions', () => {
    expect(receipt()?.body ?? '').toMatch(/descriptions? .*for convenience/i);
    expect(receipt()?.body ?? '').toMatch(/documents themselves control/i);
  });

  // Two of the pilot's documents are the CDD's; "governing documents of {{hoaName}}" said otherwise.
  it('no longer attributes every document to the association', () => {
    expect(receipt()?.body ?? '').not.toContain('{{hoaName}}');
  });
});

describe('the rendered receipt', () => {
  const render = async () => {
    const documents = [
      {
        id: 'bdoc_a',
        kind: 'hoa-governing' as const,
        label: 'Declaration',
        reference: 'Instr# 1111',
        documentDate: '',
        pageCount: 3,
        issuer: 'association' as const,
        description: 'community rules',
      },
      {
        id: 'bdoc_b',
        kind: 'hoa-governing' as const,
        label: 'Ninth Amendment',
        reference: '',
        documentDate: '',
        pageCount: 5,
        issuer: 'association' as const,
        description: 'leasing rules',
        amendsDocumentId: 'bdoc_a',
      },
      {
        id: 'bdoc_c',
        kind: 'hoa-governing' as const,
        label: 'Resolution 2026-04',
        reference: '',
        documentDate: '',
        pageCount: 4,
        issuer: 'cdd' as const,
        description: 'amenity fees and deposits',
      },
    ];

    const { rendered } = await renderLease({
      facts: { ...PICANA_FACTS, hasHoa: true, hasHoaGoverningDocuments: true },
      money: PICANA_MONEY,
      values: {
        ...PICANA_VALUES,
        hoaName: 'Example Master Association',
        governingDocuments: describeGoverningDocuments(documents, {
          names: { association: 'Example Master Association', cdd: 'Example Community Development District' },
          matterId: 'lease_matter_abc',
        }),
      },
      parties: PICANA_PARTIES,
      propertyAddress: '29090 Picana Lane, Wesley Chapel, Florida 33543',
    });

    const doc = rendered.find((each) => each.key.includes('governing-documents-receipt'));

    if (!doc) {
      throw new Error('the receipt addendum did not render');
    }

    return doc;
  };

  const linksAndText = async (pdf: Uint8Array) => {
    const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
    const parsed = await pdfjs.getDocument({ data: new Uint8Array(pdf) }).promise;
    const urls: string[] = [];
    let text = '';

    for (let n = 1; n <= parsed.numPages; n += 1) {
      const page = await parsed.getPage(n);

      for (const annotation of await page.getAnnotations()) {
        if (annotation.url) {
          urls.push(annotation.url);
        }
      }

      for (const item of (await page.getTextContent()).items) {
        if ('str' in item) {
          text += item.str;
        }
      }
    }

    return { urls, text };
  };

  it('makes every link clickable, and prints no marker', async () => {
    const { urls, text } = await linksAndText((await render()).pdf);

    expect(urls.some((url) => url.endsWith('/lease-attachment/lease_matter_abc/bdoc_a'))).toBe(true);
    expect(urls.some((url) => url.endsWith('/lease-attachment/lease_matter_abc/bdoc_b'))).toBe(true);
    expect(urls.some((url) => url.endsWith('/lease-attachment/lease_matter_abc/all'))).toBe(true);
    expect(text).not.toContain('[[');
  }, 120_000);

  it('prints each group heading, each description, and each reference line', async () => {
    const { text } = await linksAndText((await render()).pdf);
    const squashed = text.replace(/\s+/g, '').toLowerCase();

    for (const expected of [
      'Example Master Association',
      'Example Community Development District',
      '1. Declaration — community rules',
      '1a. Ninth Amendment — leasing rules',
      '2. Resolution 2026-04 — amenity fees and deposits',
      'Instr# 1111 · 3 pages',
    ]) {
      expect(squashed, expected).toContain(expected.replace(/\s+/g, '').toLowerCase());
    }
  }, 120_000);

  // The envelope gets the painted copy; a link that did not survive that is no link.
  it('keeps the links through painting out the signing tokens', async () => {
    const { urls } = await linksAndText(await whiteOutSigningTokens((await render()).pdf));

    expect(urls.filter((url) => url.includes('/lease-attachment/lease_matter_abc/'))).toHaveLength(4);
  }, 120_000);
});

describe('the lease id reaches the receipt', () => {
  const source = readFileSync(new URL('../server-only/matter-answers.ts', import.meta.url), 'utf8');

  it('builds the grouped list, with links whenever the matter has an id', () => {
    expect(source).toMatch(/describeGoverningDocuments\(documents,[\s\S]{0,500}matterId/);
    expect(source).toMatch(/describeGoverningDocuments\(documents,[\s\S]{0,500}cddName/);
  });
});
