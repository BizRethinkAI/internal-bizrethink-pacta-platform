import { whiteoutRegions } from '@documenso/lib/server-only/pdf/auto-place-fields';
import { PDF } from '@libpdf/core';

/**
 * A signing token with a recipient — `{{SIGNATURE, r1, width=160, height=44}}`,
 * `{{DATE, r2}}` — and nothing else.
 *
 * The comma and `rN` are what separate these from clause variables, the same
 * rule `interpolate.ts` uses. An unanswered `{{repairThresholdUsd}}` must stay
 * on the page: it is how a reviewer can tell the lease is unfinished.
 */
const SIGNING_TOKEN = /\{\{\s*[A-Za-z_]+\s*,\s*r\d+\b[^}]*\}\}/g;

/**
 * Paint every signing token out of a rendered PDF.
 *
 * The tokens exist for upstream's auto-placer, which reads them to position the
 * signing fields. Once read they are litter: without this, a signer sees
 * `{{SIGNATURE, r1, width=160, height=44}}` behind their signature widget, and
 * the sealed PDF keeps it forever.
 *
 * WHY NOT UPSTREAM'S `removePlaceholdersFromPDF`. It paints the box upstream
 * reports for the field, which for a sized signature is the WIDGET — 160pt —
 * while the token's text is about 200pt. The last 40pt (`ght=44}}`) stayed on
 * the page. This paints each token's own text box instead.
 *
 * Painted, not removed: the text stays in the file, so the fields extracted
 * from the cleaned PDF are identical to those from the raw one.
 */
export const whiteOutSigningTokens = async (pdf: Uint8Array): Promise<Buffer> => {
  const document = await PDF.load(new Uint8Array(pdf));

  const regions = document
    .getPages()
    .flatMap((page) => page.findText(SIGNING_TOKEN).map((match) => ({ pageIndex: page.index, bbox: match.bbox })));

  if (regions.length === 0) {
    return Buffer.from(pdf);
  }

  whiteoutRegions(document, regions);

  return Buffer.from(await document.save());
};
