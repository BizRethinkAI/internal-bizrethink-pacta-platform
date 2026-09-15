import { extractPlaceholdersFromPDF } from '@documenso/lib/server-only/pdf/auto-place-fields';
import { PDF } from '@libpdf/core';
import { beforeAll, describe, expect, it } from 'vitest';

import { PICANA_FACTS, PICANA_MONEY, PICANA_PARTIES, PICANA_VALUES } from '../matters/picana-ln';
import { SIG_COL } from '../render/lease-document';
import type { RenderLeaseInput, RenderLeaseResult } from '../render/render-lease';
import { renderLease, renderLeaseForReview } from '../render/render-lease';
import { whiteOutSigningTokens } from '../render/white-out-signing-tokens';
import { inkIn, tokenTextRegion } from './visible-ink';

/**
 * The 2026-09-14 pilot lease showed `{{SIGNATURE, r1, width=160, height=44}}`
 * behind every signature widget and `{{DATE, r1}}` behind every date — in the
 * envelope a signer opens, and therefore in the sealed PDF they keep.
 *
 * Upstream's own upload path paints tokens out (`extractPdfPlaceholders`); the
 * lease path only read them. Upstream's paint-out would not have been enough
 * either: it paints the WIDGET's box, and a sized signature token is wider than
 * its widget.
 */

const INPUT: RenderLeaseInput = {
  facts: PICANA_FACTS,
  money: PICANA_MONEY,
  values: {
    ...PICANA_VALUES,
    landlordKnowsOfFlooding: 'has no',
    landlordFiledFloodClaim: 'has not',
    landlordReceivedFloodAssistance: 'has not',
  },
  parties: PICANA_PARTIES,
  propertyAddress: '29090 Picana Lane, Wesley Chapel, Florida 33543',
};

let result: RenderLeaseResult;

beforeAll(async () => {
  result = await renderLease(INPUT);
}, 90_000);

describe('whiteOutSigningTokens', () => {
  it('leaves no visible trace of any signing token, in any document of the envelope', async () => {
    let checked = 0;

    for (const doc of result.rendered) {
      const placeholders = await extractPlaceholdersFromPDF(Buffer.from(doc.pdf));
      const regions = placeholders.map((placeholder) => tokenTextRegion(placeholder, SIG_COL));

      const before = await inkIn(doc.pdf, regions);
      const after = await inkIn(await whiteOutSigningTokens(doc.pdf), regions);

      // Not vacuous: every region really does hold the token before.
      expect(
        before.every((ink) => ink > 0),
        `${doc.key}: a region missed its token`,
      ).toBe(true);
      expect(after, doc.key).toEqual(after.map(() => 0));

      checked += regions.length;
    }

    expect(checked).toBeGreaterThan(0);
  }, 120_000);

  it('moves nothing — every field still lands where it did', async () => {
    // Re-saving the PDF re-serialises its numbers, which moves them in the
    // seventh decimal place. A thousandth of a point is still no visible shift.
    const rounded = (placeholders: Awaited<ReturnType<typeof extractPlaceholdersFromPDF>>) =>
      placeholders.map(({ x, y, width, height, ...rest }) => ({
        ...rest,
        box: [x, y, width, height].map((n) => Math.round(n * 1000) / 1000),
      }));

    for (const doc of result.rendered) {
      const before = await extractPlaceholdersFromPDF(Buffer.from(doc.pdf));
      const after = await extractPlaceholdersFromPDF(await whiteOutSigningTokens(doc.pdf));

      expect(rounded(after), doc.key).toEqual(rounded(before));
    }
  }, 120_000);
});

describe('the review copy', () => {
  it('shows no signing tokens, but still shows an unanswered question', async () => {
    const { landlordKnowsOfFlooding: _unanswered, ...values } = INPUT.values;

    const pdf = await renderLeaseForReview({ ...INPUT, values });

    const signing = (await extractPlaceholdersFromPDF(pdf)).map((placeholder) => tokenTextRegion(placeholder, SIG_COL));

    const unansweredMatches = (await PDF.load(new Uint8Array(pdf))).getPages().flatMap((page) =>
      page.findText('{{landlordKnowsOfFlooding}}').map((match) => ({
        page: page.index + 1,
        x: match.bbox.x,
        y: page.height - match.bbox.y - match.bbox.height,
        width: match.bbox.width,
        height: match.bbox.height,
      })),
    );

    expect(signing.length).toBeGreaterThan(0);
    expect(unansweredMatches.length).toBeGreaterThan(0);

    expect(await inkIn(pdf, signing)).toEqual(signing.map(() => 0));

    // A raw clause variable is how a reviewer knows an answer is missing.
    // Painting it out would make an unfinished lease read as a finished one.
    expect((await inkIn(pdf, unansweredMatches)).every((ink) => ink > 0)).toBe(true);
  }, 120_000);
});
