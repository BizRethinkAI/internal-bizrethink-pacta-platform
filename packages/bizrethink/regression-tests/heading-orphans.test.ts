import { describe, expect, it } from 'vitest';

import { PICANA_FACTS, PICANA_MONEY, PICANA_PARTIES, PICANA_VALUES } from '../lease/matters/picana-ln';
import { renderLease } from '../lease/render/render-lease';

/*
  Page-by-page text, via the pdfjs build already vendored for placeholder
  extraction. `pdftotext` would be simpler and is not available in CI.
*/
const pagesOf = async (pdf: Buffer): Promise<string[]> => {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const doc = await pdfjs.getDocument({ data: new Uint8Array(pdf), useSystemFonts: false }).promise;
  const pages: string[] = [];

  for (let n = 1; n <= doc.numPages; n += 1) {
    const content = await (await doc.getPage(n)).getTextContent();
    /*
      pdfjs yields items in layout order with `hasEOL` marking a line end, so
      the lines can be rebuilt without guessing from coordinates.
    */
    let line = '';
    const lines: string[] = [];

    for (const item of content.items) {
      if (!('str' in item)) continue;
      line += item.str;
      if (item.hasEOL) {
        lines.push(line);
        line = '';
      }
    }
    if (line !== '') lines.push(line);

    pages.push(lines.join('\n'));
  }

  return pages;
};

/**
 * NO HEADING MAY BE THE LAST THING ON A PAGE.
 *
 * A title at a page foot with its body overleaf gives the reader a heading, a
 * third of a page of white, and the text under the NEXT page's running head.
 * `cfffbd641` bound a heading to its body to stop it, but only where the clause
 * was under 420 characters, on the reasoning that a long body fills the page
 * under its own heading anyway.
 *
 * The rendered lease disproved that. `hoa.compliance` is 732 characters, and
 * the document printed "11 RULES AND ASSOCIATION" and "11.1 ASSOCIATION RULES"
 * one above the other at the foot of page 10 with nothing beneath them. A
 * section head could strand itself the same way — "4 RENT AND CHARGES" did —
 * because it was emitted as a sibling of the clauses it introduces.
 *
 * Both are structural, so this is pinned on the rendered PDF rather than on the
 * clause text. Nothing short of reading the pages can see it: every unit test
 * passed while the lease was doing this.
 */

const HEADING_AT_FOOT = [
  /** "11.1 ASSOCIATION RULES" — a clause heading. */
  /^\d+\.\d+\s+[A-Z][A-Z\s'’-]{3,}$/,
  /** "4 RENT AND CHARGES" — a section head. */
  /^\d+\s+[A-Z][A-Z\s'’-]{3,}$/,
];

/*
  ONE SPACE, NOT TWO. The number and the heading are separate Text nodes in a
  row, and pdfjs joins them with a single space — `pdftotext -layout` pads them
  to column position, which is what an earlier version of these patterns was
  written against. It matched nothing, including the real orphans.
*/

/** Running head, footer and blank lines are chrome, not content. */
const CHROME = /^(PACTA|RE S ID EN TI AL|RESIDENTIAL LEASE|29090)/i;

/*
  THE CONTENTS PAGE IS A LIST OF HEADINGS, so its last line is a heading by
  construction and is never an orphan.

  Matched with the spaces stripped because the section styles are TRACKED: a
  head renders through pdfjs as "7 U T I L I T I E S A N D I N S U R A N C E",
  and "Contents" comes out letter-spaced the same way. A plain /^Contents/
  matched nothing and let the contents page through as a false positive.
*/
const isContentsPage = (content: string[]): boolean =>
  (content[0] ?? '').replace(/\s+/g, '').toLowerCase().startsWith('contents');

describe('the rendered lease strands no heading at a page foot', () => {
  it('ends no page with a heading and nothing under it', async () => {
    const { rendered } = await renderLease({
      facts: PICANA_FACTS,
      money: PICANA_MONEY,
      values: PICANA_VALUES,
      parties: PICANA_PARTIES,
      propertyAddress: '29090 Picana Lane, Wesley Chapel, Florida 33543',
    });

    const offenders: string[] = [];

    for (const doc of rendered) {
      /*
        The CONTENTS page lists every section heading, so its last line is a
        heading by construction and is not an orphan. It is the only page whose
        content is a list of headings, which is how it is recognised.
      */
      const pages = await pagesOf(doc.pdf);

      for (const [at, page] of pages.entries()) {
        const content = page
          .split('\n')
          .map((line) => line.trimEnd())
          .filter((line) => line.trim() !== '' && !CHROME.test(line.trim()));

        if (isContentsPage(content)) {
          continue;
        }

        const last = content[content.length - 1];

        if (last !== undefined && HEADING_AT_FOOT.some((shape) => shape.test(last.trim()))) {
          offenders.push(`${doc.key} p${at + 1}: ${last.trim()}`);
        }
      }
    }

    expect(offenders, 'a heading printed with its body overleaf').toEqual([]);
  }, 120_000);
});
