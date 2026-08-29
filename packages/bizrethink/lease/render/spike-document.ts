import { Document, Page, renderToStream, StyleSheet, Text, View } from '@react-pdf/renderer';
import type { Style } from '@react-pdf/types';
import { createElement as h } from 'react';

/**
 * PHASE 0 SPIKE — throwaway fixture, not production code.
 *
 * Renders a three-page PDF carrying one of every placeholder shape the lease
 * builder will need to emit, so that `placeholder-roundtrip.test.ts` can prove
 * upstream's `extractPlaceholdersFromPDF` finds them.
 *
 * Deliberately built with `React.createElement` rather than JSX: the PDF bytes
 * are identical, and this keeps any JSX/transform configuration out of the
 * result. The real renderer (Phase 3) uses `.tsx`.
 *
 * Deliberately uses the default Helvetica standard font. Embedded/subset fonts
 * are a separate extraction risk and get their own spike before Phase 3 picks
 * a typeface.
 */

const styles = StyleSheet.create({
  page: { paddingTop: 64, paddingBottom: 64, paddingHorizontal: 64, fontSize: 11, lineHeight: 1.5 },
  heading: { fontSize: 16, marginBottom: 16 },
  para: { marginBottom: 12 },
  label: { fontSize: 8, marginBottom: 2 },
  block: { marginTop: 24 },
});

const text = (content: string, style?: Style) => h(Text, { style }, content);

/** Point size of a rendered placeholder line, i.e. `styles.page.fontSize`. */
const LINE_TEXT_HEIGHT = 11;

/**
 * Emit a signature placeholder that has been given explicit widget dimensions.
 *
 * Overlay 034 sizes the widget from the `width`/`height` meta and centres it
 * vertically on the placeholder's own text bbox, so a widget taller than the
 * line grows `(height - lineHeight) / 2` in *each* direction and will overlap
 * whatever is set above and below it. The renderer is the only layer that can
 * reserve that room, so it does — see the no-overlap test in
 * `placeholder-roundtrip.test.ts`.
 */
const sizedSignature = (recipient: string, width: number, height: number) => {
  const leading = Math.max(0, (height - LINE_TEXT_HEIGHT) / 2);

  return text(`{{SIGNATURE, ${recipient}, width=${width}, height=${height}}}`, {
    marginTop: leading,
    marginBottom: leading,
  });
};

const page1 = () =>
  h(
    Page,
    { size: 'LETTER', style: styles.page, key: 'p1' },
    text('Residential Lease Agreement', styles.heading),
    text(
      'This Residential Lease is entered into on the date of the last signature below between the parties identified in the Basic Terms, for the Property described therein.',
      styles.para,
    ),
    h(
      View,
      { style: styles.block },
      text('LANDLORD', styles.label),
      // Drawn in this order so the test can assert extraction order:
      // NAME, then SIGNATURE, then DATE.
      text('{{NAME, r1}}'),
      sizedSignature('r1', 160, 44),
      text('{{DATE, r1}}'),
    ),
  );

const page2 = () =>
  h(
    Page,
    { size: 'LETTER', style: styles.page, key: 'p2' },
    text('2.15 Contact Information', styles.heading),
    h(
      View,
      { style: styles.block },
      text('ADDRESS FOR NOTICE', styles.label),
      text('{{TEXT, r2}}'),
      text('{{INITIALS, r2}}'),
    ),
    // The hard case: a placeholder inline in flowing prose, which is how an
    // amount actually appears in a clause. Most likely shape to fragment
    // across text-show operators.
    text(
      'Tenant shall be responsible for any repair whose total cost does not exceed {{NUMBER, r2}} dollars, except where the condition arises from Tenant negligence.',
      styles.para,
    ),
  );

const page3 = () =>
  h(
    Page,
    { size: 'LETTER', style: styles.page, key: 'p3' },
    text('Radon Hazard Disclosure', styles.heading),
    text(
      'RADON GAS: Radon is a naturally occurring radioactive gas that, when it has accumulated in a building in sufficient quantities, may present health risks to persons who are exposed to it over time.',
      styles.para,
    ),
    h(
      View,
      { style: styles.block },
      text('TENANT', styles.label),
      // No width/height meta here: this one must fall back to its text bbox.
      text('{{SIGNATURE, r2}}'),
      text('{{EMAIL, r2}}'),
      // Decoy. `parseFieldTypeFromPlaceholder` throws on this and the
      // extractor must skip it rather than fail the whole document.
      text('{{NOT_A_TYPE, r1}}'),
    ),
  );

export const renderSpikeDocument = async (): Promise<Buffer> => {
  const doc = h(Document, null, page1(), page2(), page3());

  const stream = await renderToStream(doc);

  const chunks: Buffer[] = [];

  return await new Promise<Buffer>((resolve, reject) => {
    stream.on('data', (chunk: Buffer | string) => {
      chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
    });
    stream.on('end', () => resolve(Buffer.concat(chunks)));
    stream.on('error', reject);
  });
};
