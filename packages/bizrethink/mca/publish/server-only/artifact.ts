import { extractPlaceholdersFromPDF, type PlaceholderInfo } from '@documenso/lib/server-only/pdf/auto-place-fields';

import { whiteOutSigningTokens } from '../../../lease/render/white-out-signing-tokens';
import type { McaTemplateSnapshot } from '../../templates/compile';
import { fieldPlanFor, type PlannedSigner } from '../field-plan';
import type { ProducedInstrument } from '../recipient-contract';
import { injectMcaWidgets } from './acroform';
import { renderMcaTemplatePdf } from './template-pdf';

/**
 * A template, ready to upload — and the facts about it the record must keep.
 *
 * THE ORDER IS THE WHOLE THING, and it is not obvious:
 *
 *   1. render      markers where a caller prefills, `{{SIGNATURE, rN}}` where a
 *                  party signs
 *   2. inject      an AcroForm widget over every marker
 *   3. extract     read the signer placeholders — BEFORE painting, because
 *                  reading is what tells upstream where to put the fields
 *   4. paint       cover the token text, so a signer does not see
 *                  `{{SIGNATURE, r1}}` behind their own signature
 *
 * Reverse 3 and 4 and the fields still appear, because painting leaves the text
 * in place — so the mistake is invisible until somebody reads a sealed
 * document. The lease vertical shipped a pilot with
 * `{{SIGNATURE, r1, width=160, height=44}}` behind every widget and had to
 * learn it; `white-out-signing-tokens.ts` carries that scar, and this reuses it
 * rather than writing a second one that can drift.
 *
 * PURE ON PURPOSE. No storage, no database, no envelope. This is the part with
 * the real risk in it — two PDF libraries, an annotation layer and a paint pass
 * — so it is the part that can be tested without mocking the world. The shell
 * that uploads, creates the envelope and writes the record is thin by
 * comparison, which is the same split `createEnvelopeFromMatter` uses.
 */
export type McaTemplateArtifact = {
  /** What to upload: widgets in place, signing tokens painted out. */
  pdf: Buffer;
  /** The signer fields upstream will make, read before painting. */
  placeholders: PlaceholderInfo[];
  /** The widget names as published, for the record a caller reads. */
  widgets: string[];
  /** The signing parties, in the order they sign. */
  signers: PlannedSigner[];
};

export const buildMcaTemplateArtifact = async (
  snapshot: McaTemplateSnapshot,
  instrument: ProducedInstrument,
  revision: number,
): Promise<McaTemplateArtifact> => {
  const plan = fieldPlanFor(instrument);

  // Throws when this template compiles no such document, rather than publishing
  // an empty one.
  const rendered = await renderMcaTemplatePdf(snapshot, instrument, revision);

  // Refuses on any disagreement between the page and the plan, in both
  // directions, and names every problem at once.
  const injected = await injectMcaWidgets(rendered, { expect: plan.expect });

  // BEFORE the paint. Upstream positions each field from the token's own box,
  // and a painted box is still a box — but reading first is what makes the
  // order honest rather than accidentally correct.
  const placeholders = await extractPlaceholdersFromPDF(injected);

  const pdf = await whiteOutSigningTokens(new Uint8Array(injected));

  return { pdf, placeholders, widgets: plan.expect, signers: plan.signers };
};
