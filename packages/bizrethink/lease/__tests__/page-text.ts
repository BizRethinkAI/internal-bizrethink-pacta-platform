import { readFileSync } from 'node:fs';

import type { RenderLeaseInput } from '../render/render-lease';

/**
 * Page-by-page text of a rendered PDF, one line per rendered line.
 *
 * pdfjs yields items in layout order with `hasEOL` marking a line end, so lines
 * are rebuilt without guessing from coordinates. Tracked styles arrive
 * letter-spaced ("1 0 D E F A U L T"), so compare those with whitespace
 * stripped.
 */
export const pageLines = async (pdf: Uint8Array): Promise<string[][]> => {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const doc = await pdfjs.getDocument({ data: new Uint8Array(pdf), useSystemFonts: false }).promise;
  const pages: string[][] = [];

  for (let n = 1; n <= doc.numPages; n += 1) {
    const content = await (await doc.getPage(n)).getTextContent();
    let line = '';
    const lines: string[] = [];

    for (const item of content.items) {
      if (!('str' in item)) {
        continue;
      }
      line += item.str;
      if (item.hasEOL) {
        lines.push(line);
        line = '';
      }
    }
    if (line !== '') {
      lines.push(line);
    }

    pages.push(lines.map((l) => l.trimEnd()).filter((l) => l.trim() !== ''));
  }

  await doc.destroy();

  return pages;
};

export const squash = (line: string): string => line.replace(/\s+/g, '');

/**
 * The pilot lease package, with every person replaced.
 *
 * Rendered from the answers of the first real lease (2026-09-14), because two of
 * the layout defects — a dropped section head and a heading stranded at a page
 * foot — only appear at that document's exact text lengths; the checked-in
 * Picana matter paginates differently and hid both. Names, email addresses,
 * postal addresses, the pet and the occupants are swapped for fictional values
 * of the SAME LENGTH, and the substitute was verified to break every page of all
 * seven documents at the same line as the original.
 */
export const PILOT_PACKAGE = JSON.parse(
  readFileSync(new URL('./pilot-package.fixture.json', import.meta.url), 'utf8'),
) as RenderLeaseInput;
