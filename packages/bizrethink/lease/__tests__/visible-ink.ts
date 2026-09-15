import type { PlaceholderInfo } from '@documenso/lib/server-only/pdf/auto-place-fields';

import { LINE_TEXT_HEIGHT } from '../render/signature-blocks';

/**
 * What a reader SEES in a region of a PDF page.
 *
 * Painting white over a token leaves the token in the file — it still extracts,
 * still searches, still round-trips through upstream's placeholder parser — so
 * no text-level assertion can tell a cleaned PDF from a raw one. Only rendering
 * the page can. Not a support file for its own sake: the defect this guards was
 * invisible to every test that read text.
 */

/** Points, top-left origin — the same frame as `PlaceholderInfo`. */
export type Region = { page: number; x: number; y: number; width: number; height: number };

const SCALE = 2;

/** pdfjs types its Node canvas factory as `Object`. This is the one method used. */
type CanvasFactory = {
  create: (width: number, height: number) => { canvas: HTMLCanvasElement; context: CanvasRenderingContext2D };
};

/** Mean channel value below which a pixel counts as ink. Anti-aliased edges of 11pt type sit well under it. */
const INK_THRESHOLD = 160;

/** Count of ink pixels in each region, in the order given. Each page is rendered once. */
export const inkIn = async (pdf: Uint8Array, regions: Region[]): Promise<number[]> => {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const doc = await pdfjs.getDocument({ data: new Uint8Array(pdf) }).promise;

  const contexts = new Map<number, CanvasRenderingContext2D>();

  const contextFor = async (pageNumber: number) => {
    const existing = contexts.get(pageNumber);

    if (existing) {
      return existing;
    }

    const page = await doc.getPage(pageNumber);
    const viewport = page.getViewport({ scale: SCALE });
    const { canvas, context } = (doc.canvasFactory as CanvasFactory).create(viewport.width, viewport.height);

    await page.render({ canvasContext: context, viewport, canvas }).promise;
    contexts.set(pageNumber, context);

    return context;
  };

  const counts: number[] = [];

  for (const region of regions) {
    const context = await contextFor(region.page);
    const { data } = context.getImageData(
      Math.round(region.x * SCALE),
      Math.round(region.y * SCALE),
      Math.max(1, Math.round(region.width * SCALE)),
      Math.max(1, Math.round(region.height * SCALE)),
    );

    let ink = 0;

    for (let i = 0; i < data.length; i += 4) {
      if ((data[i] + data[i + 1] + data[i + 2]) / 3 < INK_THRESHOLD) {
        ink++;
      }
    }

    counts.push(ink);
  }

  await doc.destroy();

  return counts;
};

/**
 * Where a token's TEXT sits, which is not where its widget sits.
 *
 * A sized signature placeholder reports the widget — 160 × 44, centred on the
 * line — while `{{SIGNATURE, r1, width=160, height=44}}` is about 200pt of
 * 11pt type. Checking only the widget's box is exactly how the last 40pt of the
 * token (`ght=44}}`) stayed on the page. So a sized token is checked along its
 * whole line out to `lineWidth`, and inset vertically to the glyphs so the
 * signature rule beneath is not mistaken for a leftover.
 */
export const tokenTextRegion = (placeholder: PlaceholderInfo, lineWidth: number): Region => {
  const sized = placeholder.fieldAndMeta.type === 'SIGNATURE' && placeholder.placeholder.includes('width=');

  if (!sized) {
    return {
      page: placeholder.page,
      x: placeholder.x,
      y: placeholder.y,
      width: placeholder.width,
      height: placeholder.height,
    };
  }

  const lineTop = placeholder.y + (placeholder.height - LINE_TEXT_HEIGHT) / 2;

  return { page: placeholder.page, x: placeholder.x, y: lineTop + 1, width: lineWidth, height: LINE_TEXT_HEIGHT - 2 };
};
