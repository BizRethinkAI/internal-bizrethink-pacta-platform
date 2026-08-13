import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

/**
 * Fork-owned guard for overlay 018 (skip-flatten-on-document-creation) + 040
 * (skip-acroform-flatten-at-seal).
 *
 * BizRethink's AcroForm-pivot contract pipeline bakes interactive AcroForm
 * widgets into template PDFs. pdf-lib's form.flatten() mis-renders multi-page,
 * multi-instance widgets — verified live: sealed contracts rendered signer name/
 * SSN/email into the WRONG fields. So the fork DELIBERATELY disables flattening
 * on document creation and distribution by passing `flattenForm: false`.
 *
 * The upstream e2e suite asserts the opposite (fields get flattened), so those
 * specs are excluded (overlay 066). This test backfills that lost coverage with
 * our own assertion of the INTENDED behavior: the flatten-skip must stay in
 * place. If a future upstream sync re-enables flattening at these call sites,
 * this fails loudly — before a corrupted contract ever ships.
 *
 * Source-level guard (reads the call sites) rather than a full PDF round-trip:
 * cheap, deterministic, and it catches the exact regression (re-flatten).
 */
describe('AcroForm flatten-skip (overlays 018/040) must stay disabled', () => {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
  const read = (rel: string) => readFileSync(resolve(root, rel), 'utf8');

  it('document-creation-from-template passes flattenForm: false', () => {
    const src = read('packages/lib/server-only/template/create-document-from-template.ts');
    expect(
      /flattenForm:\s*false/.test(src),
      'create-document-from-template.ts must pass flattenForm:false (overlay 018) — flattening AcroForms corrupts multi-instance contract fields',
    ).toBe(true);
  });

  it('document distribution (send-document) passes flattenForm: false', () => {
    const src = read('packages/lib/server-only/document/send-document.ts');
    expect(/flattenForm:\s*false/.test(src), 'send-document.ts must pass flattenForm:false (overlay 018)').toBe(true);
  });

  it('normalize-pdf still supports the flattenForm option the overlays rely on', () => {
    // If upstream removes the flattenForm option entirely, our `false` args become
    // no-ops and flattening silently returns — this guards the seam itself.
    const src = read('packages/lib/server-only/pdf/normalize-pdf.ts');
    expect(/flattenForm/.test(src), 'normalize-pdf.ts must still expose the flattenForm option').toBe(true);
  });
});
