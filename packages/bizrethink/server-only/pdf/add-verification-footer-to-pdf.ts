import { type PDF, rgb } from '@libpdf/core';

import { NEXT_PRIVATE_INTERNAL_WEBAPP_URL } from '@documenso/lib/constants/app';

/**
 * BizRethink overlay 036 (Tier 1 verification footer).
 *
 * Adds a small "Verified by sign.pacta.ink · Envelope <id> · Signed
 * <timestamp>" footer to the bottom of every page of the contract body.
 *
 * Why: Documenso already PAdES-signs the PDF cryptographically (Adobe
 * Reader shows a blue "Signed and all signatures are valid" banner) and
 * appends a Signing Certificate page. But ~95% of merchants open PDFs
 * in Chrome / Mac Preview / mobile viewers that do NOT validate PAdES
 * — they never see the legal-grade visual proof. A small visible
 * footer on every page gives provenance regardless of viewer, and
 * survives single-page screenshots of the contract.
 *
 * Why a function, not a patch: keeps the BizRethink-specific drawing
 * logic isolated in this package. The seal-document handler patches
 * (overlay 036) just imports + calls this helper.
 *
 * Position: lower 18pt of each page, above any existing content-stream
 * footer the contract author may have included. The footer is drawn at
 * a low fontSize (6.5pt) in muted gray so it doesn't visually compete
 * with the contract body.
 *
 * Call BEFORE the certificate / audit-log pages are appended so cert
 * pages don't carry their own footer (they have their own provenance
 * via the envelope ID printed on each cert page).
 */
export async function addVerificationFooterToPdf(
  pdf: PDF,
  options: {
    envelopeId: string;
    completedAt?: Date | null;
    verificationDomain?: string;
  },
): Promise<PDF> {
  const { envelopeId } = options;
  const verificationDomain = options.verificationDomain ?? 'sign.pacta.ink';
  const signedAt = options.completedAt ?? new Date();

  const yyyy = signedAt.getUTCFullYear();
  const mm = String(signedAt.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(signedAt.getUTCDate()).padStart(2, '0');
  const hh = String(signedAt.getUTCHours()).padStart(2, '0');
  const mi = String(signedAt.getUTCMinutes()).padStart(2, '0');
  const stamp = `Verified by ${verificationDomain}  ·  Envelope ${envelopeId}  ·  Signed ${yyyy}-${mm}-${dd} ${hh}:${mi} UTC`;

  const fontBytes = await fetch(`${NEXT_PRIVATE_INTERNAL_WEBAPP_URL()}/fonts/noto-sans.ttf`).then(
    async (res) => res.arrayBuffer(),
  );
  const font = pdf.embedFont(new Uint8Array(fontBytes));

  const pages = pdf.getPages();
  const fontSize = 6.5;
  const footerY = 14; // 14pt from page bottom
  const grayColor = rgb(107 / 255, 114 / 255, 128 / 255); // tailwind gray-500

  for (const page of pages) {
    const width = page.width;
    const textWidth = font.getTextWidth(stamp, fontSize);
    const textX = (width - textWidth) / 2;

    page.drawText(stamp, {
      x: textX,
      y: footerY,
      size: fontSize,
      font,
      color: grayColor,
    });
  }

  return pdf;
}
