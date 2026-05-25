import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

/**
 * Regression guards for the two overlay patches in seal-document.handler.ts:
 *
 *   - Overlay 036 (per-page verification footer): imports
 *     addVerificationFooterToPdf from @bizrethink/customizations and
 *     calls it inside decorateAndSignPdf BEFORE the certificate page
 *     is appended.
 *
 *   - Overlay 040 (skip AcroForm flatten at seal): replaces upstream's
 *     pdfDoc.flattenAll() with pdfDoc.flattenLayers() (+ explicit
 *     flattenAnnotations after V2 insertion). Prevents AcroForm widget
 *     /V → /Rect mis-mapping when fields share the same field name.
 *
 * Both are CRYPTOGRAPHIC-CRITICAL per MERGE-MANIFEST §3. A silent revert
 * of overlay 040 would corrupt AcroForm widget values in sealed PDFs.
 * A silent revert of overlay 036 would remove the per-page brand
 * provenance from every signed contract.
 *
 * Full job-runtime integration test deferred (job framework needs
 * substantial mocking). The unit test V11 covers the underlying
 * addVerificationFooterToPdf helper; the E4 skeleton (Playwright)
 * documents the planned thick-PKCS#7 integration test.
 */
const SOURCE = readFileSync(
  join(__dirname, 'seal-document.handler.ts'),
  'utf-8',
);

describe('seal-document.handler — overlay 036 + 040 regression guards', () => {
  describe('overlay 036 — per-page verification footer', () => {
    it('imports addVerificationFooterToPdf from bizrethink', () => {
      expect(SOURCE).toMatch(
        /@bizrethink\/customizations\/server-only\/pdf\/add-verification-footer-to-pdf/,
      );
    });

    it('contains the overlay 036 marker comment', () => {
      expect(SOURCE).toMatch(/overlay 036/);
    });

    it('still calls addVerificationFooterToPdf (the integration point)', () => {
      expect(SOURCE).toMatch(/addVerificationFooterToPdf\s*\(/);
    });
  });

  describe('overlay 040 — skip AcroForm flatten at seal', () => {
    it('contains the overlay 040 marker comment', () => {
      expect(SOURCE).toMatch(/overlay 040/);
    });

    it('does NOT call pdfDoc.flattenAll() (regression: would corrupt AcroForm /V→/Rect)', () => {
      // Strip comments to ignore the rationale text that mentions flattenAll
      // historically.
      const stripped = SOURCE.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');
      expect(stripped).not.toMatch(/pdfDoc\.flattenAll\s*\(/);
    });

    it('uses pdfDoc.flattenLayers() instead (overlay 040 substitution)', () => {
      expect(SOURCE).toMatch(/pdfDoc\.flattenLayers\s*\(/);
    });
  });
});
