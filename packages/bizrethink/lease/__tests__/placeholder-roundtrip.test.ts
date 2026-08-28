import { extractPlaceholdersFromPDF } from '@documenso/lib/server-only/pdf/auto-place-fields';
import { FieldType } from '@prisma/client';
import { describe, expect, it } from 'vitest';

import { renderSpikeDocument } from '../render/spike-document';

/**
 * PHASE 0 SPIKE — the go/no-go gate for the lease builder architecture.
 *
 * The entire lease-builder plan rests on one unverified assumption: that
 * `@libpdf/core`'s `page.findText()` — which upstream's
 * `extractPlaceholdersFromPDF` uses to auto-place signing fields — can
 * reliably locate `{{...}}` tokens inside a PDF produced by
 * `@react-pdf/renderer`, with usable bounding boxes.
 *
 * Text extraction depends on how the *producing* library writes its content
 * streams and encodes fonts. A producer that emits one text-show operator per
 * glyph, or that subsets fonts without a usable /ToUnicode map, will yield
 * fragmented or unreadable matches and the token is never found. react-pdf's
 * output has never been through this path.
 *
 * If this test passes, the renderer choice is settled and Phase 1 can start.
 * If it fails, we fall back to coordinate-first field placement (react-pdf can
 * report its own layout) and the architecture changes shape.
 *
 * NOTE: this spike deliberately uses `React.createElement` rather than JSX so
 * that no JSX/transform configuration can confound the result. The PDF bytes
 * are identical either way. Setting up `.tsx` is a Phase 3 task.
 */
describe('Phase 0 spike: react-pdf output -> upstream placeholder extraction', () => {
  it('finds every placeholder, with the right type, recipient and page', async () => {
    const pdf = await renderSpikeDocument();

    const placeholders = await extractPlaceholdersFromPDF(pdf);

    const found = placeholders.map((p) => ({
      type: p.fieldAndMeta.type,
      recipient: p.recipient.toLowerCase(),
      page: p.page,
    }));

    // Eight valid placeholders. The ninth token in the document,
    // `{{NOT_A_TYPE, r1}}`, must be skipped rather than throw.
    expect(found).toEqual([
      { type: FieldType.NAME, recipient: 'r1', page: 1 },
      { type: FieldType.SIGNATURE, recipient: 'r1', page: 1 },
      { type: FieldType.DATE, recipient: 'r1', page: 1 },
      { type: FieldType.TEXT, recipient: 'r2', page: 2 },
      { type: FieldType.INITIALS, recipient: 'r2', page: 2 },
      { type: FieldType.NUMBER, recipient: 'r2', page: 2 },
      { type: FieldType.SIGNATURE, recipient: 'r2', page: 3 },
      { type: FieldType.EMAIL, recipient: 'r2', page: 3 },
    ]);
  });

  it('finds a placeholder embedded mid-paragraph, not just on its own line', async () => {
    const pdf = await renderSpikeDocument();

    const placeholders = await extractPlaceholdersFromPDF(pdf);

    // `{{NUMBER, r2}}` sits inside a flowing sentence on page 2. This is the
    // case most likely to fragment across text-show operators, and it is also
    // the realistic case for a lease — an amount inline in a clause.
    const inline = placeholders.find((p) => p.fieldAndMeta.type === FieldType.NUMBER);

    expect(inline).toBeDefined();
    expect(inline?.page).toBe(2);
  });

  it('returns bounding boxes that sit inside the page', async () => {
    const pdf = await renderSpikeDocument();

    const placeholders = await extractPlaceholdersFromPDF(pdf);

    expect(placeholders.length).toBeGreaterThan(0);

    for (const p of placeholders) {
      expect(p.width).toBeGreaterThan(0);
      expect(p.height).toBeGreaterThan(0);
      expect(p.x).toBeGreaterThanOrEqual(0);
      expect(p.y).toBeGreaterThanOrEqual(0);
      expect(p.x + p.width).toBeLessThanOrEqual(p.pageWidth + 1);
      expect(p.y + p.height).toBeLessThanOrEqual(p.pageHeight + 1);
    }
  });

  it('honours the overlay-034 width/height override on a signature placeholder', async () => {
    const pdf = await renderSpikeDocument();

    const placeholders = await extractPlaceholdersFromPDF(pdf);

    // Page 1 carries `{{SIGNATURE, r1, width=160, height=44}}`. Overlay 034
    // exists so that the widget is sized from the meta rather than from the
    // (much smaller) placeholder text bbox.
    const sized = placeholders.find((p) => p.fieldAndMeta.type === FieldType.SIGNATURE && p.page === 1);

    expect(sized).toBeDefined();
    expect(sized?.width).toBe(160);
    expect(sized?.height).toBe(44);

    // The unsized signature on page 3 falls back to its text bbox, so it must
    // NOT come back at the override dimensions.
    const unsized = placeholders.find((p) => p.fieldAndMeta.type === FieldType.SIGNATURE && p.page === 3);

    expect(unsized).toBeDefined();
    expect(unsized?.width).not.toBe(160);
  });

  it('produces a page count matching the rendered document', async () => {
    const pdf = await renderSpikeDocument();

    const placeholders = await extractPlaceholdersFromPDF(pdf);
    const pages = new Set(placeholders.map((p) => p.page));

    expect([...pages].sort()).toEqual([1, 2, 3]);
  });

  /**
   * Found by the spike, not anticipated by the plan.
   *
   * Overlay 034 sizes a signature widget from its `width`/`height` meta and
   * centres it vertically on the placeholder's text line, so a 44pt widget on
   * an 11pt line grows ~16.5pt in each direction and silently swallows the
   * lines above and below it. In the first spike render, `{{NAME, r1}}` and
   * the sized `{{SIGNATURE, r1}}` both resolved to y=185.1 — the signature
   * widget would have been drawn straight over the landlord's printed name.
   *
   * The renderer therefore has to reserve leading around any sized signature
   * placeholder. This test is the invariant that keeps it reserved.
   */
  it('leaves every field a clear box — no two placeholders overlap on a page', async () => {
    const pdf = await renderSpikeDocument();

    const placeholders = await extractPlaceholdersFromPDF(pdf);

    const overlaps: string[] = [];

    for (const page of new Set(placeholders.map((p) => p.page))) {
      const onPage = placeholders.filter((p) => p.page === page);

      for (let i = 0; i < onPage.length; i++) {
        for (let j = i + 1; j < onPage.length; j++) {
          const a = onPage[i];
          const b = onPage[j];

          const separated =
            a.x + a.width <= b.x || b.x + b.width <= a.x || a.y + a.height <= b.y || b.y + b.height <= a.y;

          if (!separated) {
            overlaps.push(`p${page}: ${a.placeholder} overlaps ${b.placeholder}`);
          }
        }
      }
    }

    expect(overlaps).toEqual([]);
  });
});
