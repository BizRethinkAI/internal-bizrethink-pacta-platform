import { describe, expect, it } from 'vitest';

import { PICANA_FACTS, PICANA_MONEY, PICANA_PARTIES, PICANA_VALUES } from '../lease/matters/picana-ln';
import { renderDocumentPdf } from '../lease/render/lease-document';
import { buildLeaseDocuments } from '../lease/render/render-lease';

/**
 * A long document must still render.
 *
 * THE BUG THIS GUARDS. `@react-pdf/stylesheet`'s `transformLineHeight` resolves
 * a unitless ratio by returning `lineHeight * fontSize`. It is the only
 * non-idempotent style handler in the pipeline — every other one is a unit
 * conversion that is the identity on an already-resolved number — and it cannot
 * tell `1.5` (a ratio) from `16.5` (a length it already produced).
 *
 * `@react-pdf/layout` re-runs the whole resolver on the already-resolved tree
 * once per page, because `relayoutPage` composes `resolvePageStyles` and
 * `splitPage` relayouts the carry-forward page, which becomes the input to the
 * next split. So page N has been resolved N times, and lineHeight grows as
 * `fontSize ^ pageCount` until it passes pdfkit's 1e21 ceiling and the render
 * dies with "unsupported number: -2.2127632876551446e+22".
 *
 * That number is not a sentinel. It is `Math.fround(1.5 * 11 * 7 ** 25)` — the
 * page's lineHeight 1.5, resolved once against the page fontSize 11, then
 * re-multiplied by the footer's fontSize 7 on each of 25 passes, through Yoga's
 * float32 layout.
 *
 * THE VARIABLE IS PAGES, NOT CONTENT. Measured: 13 pages rendered, 14 crashed.
 * The lease sat at 13, so adding one clause — or merely widening the body font,
 * which is very likely why six of eight typefaces were recorded as "crashing
 * react-pdf" — tipped it. Hours went into clause length and an orphan-control
 * character threshold before the page count was noticed.
 *
 * Fixed by `patches/@react-pdf+layout+5.2.0.patch`, applied by patch-package at
 * postinstall. This test exists because that patch is invisible: an upgrade of
 * @react-pdf/layout, or a checkout where postinstall did not run, silently
 * restores an exponential and the failure reappears as an unrelated-looking
 * crash in whichever document happens to be longest.
 *
 * Upstream: https://github.com/diegomura/react-pdf/issues/3277 (a different
 * document, whose -5.115033082580265e+22 factors the same way).
 */

describe('line-height does not compound across pages', () => {
  /*
    Well past the old 13-page ceiling. Rendering the clause list three times
    over is crude and deliberate — it needs length, not sense, and reusing the
    real clauses keeps the fonts, footer and section machinery in the picture.
  */
  it('renders a document far longer than the old ceiling', async () => {
    const lease = buildLeaseDocuments({
      facts: PICANA_FACTS,
      money: PICANA_MONEY,
      values: PICANA_VALUES,
      parties: PICANA_PARTIES,
      propertyAddress: '29090 Picana Lane, Wesley Chapel, Florida 33543',
    }).documents.find((document) => document.key === 'lease');

    expect(lease, 'the lease document is no longer built under the key "lease"').toBeDefined();

    const long = { ...lease!, clauses: [...lease!.clauses, ...lease!.clauses, ...lease!.clauses] };

    const pdf = await renderDocumentPdf(long as never, PICANA_PARTIES);

    expect(pdf.length).toBeGreaterThan(0);
    expect(pdf.subarray(0, 5).toString('latin1'), 'not a PDF').toBe('%PDF-');
  }, 60_000);

  /*
    The arithmetic, pinned. If a future reader wonders whether the sentinel
    really was line-height compounding rather than a magic number, this is the
    proof — and it is why the fix is "resolve once" rather than a larger limit.
  */
  it('identifies the crash value as compounded line-height', () => {
    expect(Math.fround(1.5 * 11 * 7 ** 25)).toBe(-2.2127632876551446e22 * -1);
  });
});
