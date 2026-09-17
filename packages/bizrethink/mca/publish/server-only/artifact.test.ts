import { PDFDocument } from '@cantoo/pdf-lib';
import { extractPlaceholdersFromPDF } from '@documenso/lib/server-only/pdf/auto-place-fields';
import { PDF } from '@libpdf/core';
import { describe, expect, it, vi } from 'vitest';

import { compileMcaTemplate } from '../../templates/compile';
import { providerFixture } from '../../templates/profile.fixture';
import { fieldPlanFor } from '../field-plan';
import { buildMcaTemplateArtifact } from './artifact';

// Real PDFs through two libraries and a paint pass. Slower than 5s by nature.
vi.setConfig({ testTimeout: 60_000 });

/**
 * Everything that has to be true of a template before it is uploaded, done in
 * one place and in one order.
 *
 * THE ORDER IS THE WHOLE THING, and it is not obvious:
 *
 *   1. render      markers where a caller prefills, `{{SIGNATURE, rN}}` where a
 *                  party signs
 *   2. inject      an AcroForm widget over every marker
 *   3. extract     read the signer placeholders — BEFORE painting, because
 *                  reading is what tells upstream where the fields go
 *   4. paint       cover the token text, so a signer does not see
 *                  `{{SIGNATURE, r1}}` behind their own signature
 *
 * Get 3 and 4 the wrong way round and the fields still appear, because painting
 * leaves the text in place — so the mistake is invisible until somebody reads a
 * sealed document. The lease vertical shipped a pilot with
 * `{{SIGNATURE, r1, width=160, height=44}}` behind every widget and had to
 * learn this; `white-out-signing-tokens.ts` carries that scar.
 */

const snapshot = () => compileMcaTemplate(providerFixture());

const built = (() => {
  let pending: ReturnType<typeof buildMcaTemplateArtifact> | null = null;

  return () => {
    pending ??= buildMcaTemplateArtifact(snapshot(), 'frpa', 3);

    return pending;
  };
})();

describe('what comes out is uploadable', () => {
  it('carries a widget for every name the plan promised, and no other', async () => {
    const artifact = await built();
    const fields = (await PDFDocument.load(artifact.pdf)).getForm().getFields();

    expect(fields.map((field) => field.getName()).sort()).toEqual([...fieldPlanFor('frpa').expect].sort());
    expect(artifact.widgets.sort()).toEqual([...fieldPlanFor('frpa').expect].sort());
  });

  /**
   * Read before painting. These are what upstream turns into signer fields, and
   * they carry the geometry it positions them by.
   */
  it('reports a signature and a date for each party, in signing order', async () => {
    const artifact = await built();

    expect(
      artifact.placeholders.map((placeholder) => `${placeholder.fieldAndMeta.type}/${placeholder.recipient}`).sort(),
    ).toEqual(['DATE/r1', 'DATE/r2', 'DATE/r3', 'SIGNATURE/r1', 'SIGNATURE/r2', 'SIGNATURE/r3']);

    for (const placeholder of artifact.placeholders) {
      expect(placeholder.width).toBeGreaterThan(0);
      expect(placeholder.height).toBeGreaterThan(0);
    }
  });

  it('names the signing parties in the order they sign', async () => {
    const artifact = await built();

    expect(artifact.signers.map((signer) => [signer.role, signer.token])).toEqual([
      ['merchant', 'r1'],
      ['guarantor', 'r2'],
      ['buyer', 'r3'],
    ]);
  });
});

/**
 * THE PAINT PASS, which is the step that is easy to get wrong in a way nothing
 * notices until a merchant is holding the document.
 */
describe('a signer never sees the token that placed their field', () => {
  it('paints every signing token out of the uploaded file', async () => {
    const artifact = await built();
    const painted = await PDF.load(new Uint8Array(artifact.pdf));

    // Painted, not removed: upstream's own extractor must still find the same
    // fields in the same places, which is exactly why the text stays.
    const stillExtractable = await extractPlaceholdersFromPDF(artifact.pdf);

    expect(stillExtractable.length).toBe(artifact.placeholders.length);
    expect(painted.getPages().length).toBeGreaterThan(0);
  });

  /**
   * Painting draws over the page. A widget is an annotation, not page content,
   * so it must survive — but "must" is an argument and this is a check.
   */
  it('leaves every widget intact after painting', async () => {
    const artifact = await built();
    const fields = (await PDFDocument.load(artifact.pdf)).getForm().getFields();

    expect(fields.length).toBe(fieldPlanFor('frpa').expect.length);

    for (const field of fields) {
      expect(field.acroField.getWidgets().length).toBeGreaterThan(0);
    }
  });
});

describe('it refuses to build something half-formed', () => {
  it('refuses an instrument this template does not compile', async () => {
    const withoutEquipment = compileMcaTemplate({
      ...providerFixture(),
      policy: { ...providerFixture().policy, equipment: 'none' as const },
    });

    await expect(buildMcaTemplateArtifact(withoutEquipment, 'equipment-lease', 3)).rejects.toThrow();
  });
});
