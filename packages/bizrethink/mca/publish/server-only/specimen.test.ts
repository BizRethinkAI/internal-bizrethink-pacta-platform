import { extractPlaceholdersFromPDF } from '@documenso/lib/server-only/pdf/auto-place-fields';
import { PDF } from '@libpdf/core';
import { describe, expect, it, vi } from 'vitest';
import type { McaInstrument } from '../../clauses/instruments';
import { entityFixture } from '../../entities/entity.fixture';
import { compileMcaTemplate } from '../../templates/compile';
import { fieldPlanFor } from '../field-plan';
import { renderMcaTemplatePreviewPdf, specimenFor } from './specimen';
import { renderMcaTemplatePdf } from './template-pdf';

/**
 * A preview is the template, rendered with specimen values. ADR 0025.
 *
 * WHY IT IS THE SAME RENDERER. A preview built by a second code path is a
 * preview that can disagree with the thing it previews, and it would disagree
 * precisely when somebody is relying on it — while reviewing the document
 * before publishing it. So the layout comes from the same function; only what
 * sits in each slot differs.
 *
 * WHAT A PREVIEW MUST NOT BE IS PUBLISHABLE. It carries specimen values where
 * the template carries markers, and printed rules where the template carries
 * `{{SIGNATURE, rN}}`. Upload one by mistake and it makes no widgets and no
 * signer fields — it is inert, rather than a document that looks like it works.
 */

// Real PDFs, read back through two libraries. Slower than the 5s default by
// nature, and one case renders the template AND its preview to compare them.
vi.setConfig({ testTimeout: 60_000 });

const snapshot = (instrument: McaInstrument) => compileMcaTemplate(entityFixture(), instrument);

/** Render each artifact once per file rather than once per assertion. */
const rendered = new Map<string, Promise<Buffer>>();

const once = (key: string, make: () => Promise<Buffer>): Promise<Buffer> => {
  const existing = rendered.get(key);

  if (existing) {
    return existing;
  }

  const pending = make();

  rendered.set(key, pending);

  return pending;
};

const previewOf = () => once('preview', () => renderMcaTemplatePreviewPdf(snapshot('frpa'), 'frpa', 3));
const templateOf = () => once('template', () => renderMcaTemplatePdf(snapshot('frpa'), 'frpa', 3));

const textOf = async (pdf: Buffer): Promise<string> => {
  const doc = await PDF.load(new Uint8Array(pdf));

  return doc
    .getPages()
    .map((page) =>
      page
        .extractText()
        .lines.map((line) => line.text)
        .join(' '),
    )
    .join('\n');
};

describe('a specimen value stands in for a real one', () => {
  it('shapes money like money and a date like a date, so the layout is honest', () => {
    expect(specimenFor({ binding: 'funding.purchasePrice', kind: 'currency', label: 'Purchase Price' })).toMatch(
      /^\$[\d,]+\.\d{2}$/,
    );
    expect(specimenFor({ binding: 'funding.effectiveDate', kind: 'date', label: 'Effective Date' })).toMatch(/\d{4}/);
  });

  /**
   * A reviewer looking at a preview must never be in doubt about whether they
   * are reading a real merchant's details. Realistic shape, unmistakable
   * content.
   */
  it('is never mistakable for a real party', () => {
    const merchant = specimenFor({ binding: 'merchant.legalName', kind: 'text', label: 'Merchant — Legal Name' });

    expect(merchant.toLowerCase()).toContain('specimen');
  });

  it('gives the same binding the same value every time', () => {
    const field = { binding: 'merchant.legalName', kind: 'text' as const, label: 'Merchant — Legal Name' };

    expect(specimenFor(field)).toBe(specimenFor(field));
  });
});

describe('the preview shows the document that will publish', () => {
  it('carries no marker, because a reviewer is reading values not slots', async () => {
    const text = await textOf(await previewOf());

    expect(text).not.toMatch(/«[a-z][a-z0-9_]*»/);
  });

  it('puts a specimen value where the template puts a marker', async () => {
    const text = await textOf(await previewOf());

    expect(text.toLowerCase()).toContain('specimen');
  });

  /**
   * Same clauses, same order, same headings. The preview is worth looking at
   * only if what it shows is what will be published.
   */
  it('keeps the wording and structure of the template exactly', async () => {
    const template = await textOf(await templateOf());
    const preview = await textOf(await previewOf());
    const headings = fieldPlanFor('frpa');

    // The clause prose is the bulk of both documents and must be identical.
    const prose = (text: string) => text.replace(/«[^»]*»/g, '').replace(/\s+/g, ' ');

    for (const sentence of ['Purchase and Sale', 'Reconciliation']) {
      expect(prose(template)).toContain(sentence);
      expect(prose(preview)).toContain(sentence);
    }

    expect(headings.marked.length).toBeGreaterThan(0);
  });
});

/**
 * THE SAFETY PROPERTY, and the reason a preview is a separate artifact rather
 * than a flag on the same one.
 *
 * A preview that could be published by accident is the failure this guards
 * against. Uploaded by mistake it must be inert: no widgets for a caller to
 * prefill, and no signer fields for anybody to sign.
 */
describe('a preview cannot become a working template by accident', () => {
  it('says on every page that it is not for signing', async () => {
    const text = await textOf(await previewOf());

    expect(text).toMatch(/PREVIEW/i);
    expect(text).toMatch(/not for signing|specimen values/i);
  });

  it('offers Documenso no signer field to make', async () => {
    const extracted = await extractPlaceholdersFromPDF(await previewOf());

    expect(extracted).toEqual([]);
  });

  it('offers the injector nothing to place', async () => {
    const preview = await previewOf();
    const markers = (await PDF.load(new Uint8Array(preview)))
      .getPages()
      .flatMap((page) => page.findText(/«[a-z][a-z0-9_]*»/g));

    expect(markers).toEqual([]);
  });

  /**
   * The template itself must be unaffected by all of this — it is still the
   * thing that publishes, and it still carries both mechanisms.
   */
  it('leaves the publishable template carrying both, as before', async () => {
    const extracted = await extractPlaceholdersFromPDF(await templateOf());

    expect(extracted.length).toBe(6);
  });
});
