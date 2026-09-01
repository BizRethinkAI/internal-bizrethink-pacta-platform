import { Document, Page, renderToStream, StyleSheet, Text, View } from '@react-pdf/renderer';
import type { Style } from '@react-pdf/types';
import { createElement as h } from 'react';

import type { Clause } from '../clauses/types';
import type { SelectedClause } from '../engine/select-clauses';
import type { MoneyLine } from '../money/types';
import type { InterpolationValue } from './interpolate';
import { interpolateClause } from './interpolate';
import type { LeaseParty } from './signature-blocks';
import { buildSignatureBlocks } from './signature-blocks';

/**
 * Renders the lease and its attachments to PDF.
 *
 * FONT CHOICE IS A COMPLIANCE DECISION HERE, not a design one. The Phase 0
 * spike proved placeholder extraction works with a PDF standard-14 font, and
 * flagged embedded/subset fonts as an unretired risk because they encode text
 * differently and can defeat `page.findText()`. So this uses Times-Roman and
 * Helvetica-Bold — both standard-14, neither embedded — and there is an
 * integration test that round-trips the real rendered lease back through
 * upstream's extractor. Swapping in a custom typeface means re-running that
 * test before anything is sent.
 *
 * Built with `createElement` rather than JSX, consistent with the spike, so no
 * JSX transform configuration sits between this source and the PDF bytes.
 * Converting to `.tsx` is a readability cleanup, not a functional change.
 */

const FONT_BODY = 'Times-Roman';
const FONT_BOLD = 'Helvetica-Bold';

/** Must match `LINE_TEXT_HEIGHT` in signature-blocks.ts. */
const BASE_FONT_SIZE = 11;

const styles = StyleSheet.create({
  page: {
    paddingTop: 64,
    paddingBottom: 72,
    paddingHorizontal: 64,
    fontFamily: FONT_BODY,
    fontSize: BASE_FONT_SIZE,
    lineHeight: 1.5,
  },
  docTitle: { fontFamily: FONT_BOLD, fontSize: 18, marginBottom: 4 },
  docSubtitle: { fontSize: 11, marginBottom: 24 },
  sectionHeading: { fontFamily: FONT_BOLD, fontSize: 11, marginTop: 14, marginBottom: 4 },
  bodyText: { textAlign: 'justify', marginBottom: 8 },
  footer: {
    position: 'absolute',
    bottom: 36,
    left: 64,
    right: 64,
    fontSize: 8,
    color: '#555555',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  tocRow: { flexDirection: 'row', marginBottom: 2 },
  tocNumber: { width: 40 },
  moneyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderBottomWidth: 0.5,
    borderBottomColor: '#cccccc',
    paddingVertical: 3,
  },
  moneyTotal: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4, fontFamily: FONT_BOLD },
  sigGroupHeading: { fontFamily: FONT_BOLD, fontSize: 9, marginTop: 18, marginBottom: 6 },
  sigName: { fontSize: 9, color: '#555555' },
  sigBlock: { marginBottom: 10 },
});

export type RenderedClause = {
  clause: Clause;
  number?: string;
  text: string;
};

const text = (content: string, style?: Style | Style[], key?: string) => h(Text, { style, key }, content);

/** Running footer. `render` gives react-pdf the page numbers it computes itself. */
const footer = (documentTitle: string) =>
  h(
    View,
    { style: styles.footer, fixed: true },
    h(Text, {}, documentTitle),
    h(Text, {
      render: ({ pageNumber, totalPages }: { pageNumber: number; totalPages: number }) =>
        `Page ${pageNumber} of ${totalPages}`,
    }),
  );

/** Reads the same rendered clauses the body does, so the two cannot drift. */
const tableOfContents = (clauses: RenderedClause[]) =>
  h(
    View,
    { key: 'toc' },
    text('Contents', styles.sectionHeading),
    ...clauses.map((rendered) =>
      h(
        View,
        { style: styles.tocRow, key: `toc-${rendered.clause.slug}` },
        h(Text, { style: styles.tocNumber }, rendered.number ?? ''),
        h(Text, {}, rendered.clause.heading),
      ),
    ),
  );

const amountsDueTable = (lines: MoneyLine[], totalUsd: number) => {
  const money = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

  return h(
    View,
    { key: 'amounts', wrap: false },
    text('Amounts Due on Execution', styles.sectionHeading),
    ...lines.map((line, i) =>
      h(
        View,
        { style: styles.moneyRow, key: `money-${i}` },
        h(Text, {}, line.label),
        h(Text, {}, money.format(line.amountUsd)),
      ),
    ),
    h(
      View,
      { style: styles.moneyTotal, key: 'money-total' },
      h(Text, {}, 'Total'),
      h(Text, {}, money.format(totalUsd)),
    ),
  );
};

/**
 * A signature block. The sized signature token carries `reservedLeadingPt`,
 * which becomes real vertical margin — without it overlay 034 centres the
 * widget on its own text line and it overprints the name above and the date
 * below. See the no-overlap invariant in placeholder-roundtrip.test.ts.
 */
const signatureBlocks = (parties: LeaseParty[], documentKey: string, withInitials: boolean) =>
  buildSignatureBlocks({ parties, documentKey, withInitials }).map((block) =>
    h(
      View,
      { key: `${documentKey}-${block.heading}`, wrap: false },
      text(block.heading, styles.sigGroupHeading),
      ...block.signers.map((signer) =>
        h(
          View,
          { style: styles.sigBlock, key: signer.recipient },
          text(signer.name, styles.sigName),
          ...signer.placeholders.map((placeholder, i) =>
            text(
              placeholder.token,
              placeholder.reservedLeadingPt > 0
                ? { marginTop: placeholder.reservedLeadingPt, marginBottom: placeholder.reservedLeadingPt }
                : undefined,
              `${signer.recipient}-${i}`,
            ),
          ),
        ),
      ),
    ),
  );

export type LeaseDocumentSpec = {
  key: string;
  title: string;
  subtitle: string;
  clauses: RenderedClause[];
  withInitials: boolean;
  showToc: boolean;
  amountsDue?: { lines: MoneyLine[]; totalUsd: number };
};

const renderDocument = (spec: LeaseDocumentSpec, parties: LeaseParty[]) =>
  h(
    Page,
    { size: 'LETTER', style: styles.page, key: spec.key },
    footer(spec.title),
    text(spec.title, styles.docTitle),
    text(spec.subtitle, styles.docSubtitle),
    ...(spec.showToc ? [tableOfContents(spec.clauses)] : []),
    ...(spec.amountsDue ? [amountsDueTable(spec.amountsDue.lines, spec.amountsDue.totalUsd)] : []),
    ...spec.clauses.flatMap((rendered) => [
      text(
        rendered.number ? `${rendered.number}. ${rendered.clause.heading}` : rendered.clause.heading,
        styles.sectionHeading,
        `h-${rendered.clause.slug}`,
      ),
      text(rendered.text, styles.bodyText, `b-${rendered.clause.slug}`),
    ]),
    ...signatureBlocks(parties, spec.key, spec.withInitials),
  );

/**
 * One spec, one PDF.
 *
 * Rendered separately rather than merged into a single file, because the
 * separateness is legally load-bearing: Fla. Stat. §83.512 requires the flood
 * disclosure to be a separate written disclosure, and an addendum is its own
 * instrument with its own signature block. Each becomes its own envelope item,
 * so a signer receives them as distinct documents rather than as later pages of
 * the lease.
 */
export const renderDocumentPdf = async (spec: LeaseDocumentSpec, parties: LeaseParty[]): Promise<Buffer> =>
  await toBuffer(h(Document, null, renderDocument(spec, parties)));

/**
 * Every spec, one PDF — for READING only.
 *
 * The separateness above is legally load-bearing at SIGNING time and stays
 * exactly as it is: §83.512 requires the flood disclosure to be a separate
 * written disclosure, an addendum is its own instrument with its own signature
 * block, and each becomes its own envelope item.
 *
 * But the landlord's preview and the reviewer's copy both did
 * `rendered.find((doc) => doc.key === 'lease')` and returned that alone, so an
 * attorney read one document while the signers received up to seven. A review
 * of a document that is not the document being signed produces a record of
 * approval that was never given.
 *
 * Reading them is not signing them, so for reading they are concatenated. The
 * envelope is untouched.
 */
export const renderCombinedPdf = async (specs: LeaseDocumentSpec[], parties: LeaseParty[]): Promise<Buffer> =>
  await toBuffer(h(Document, null, ...specs.map((spec) => renderDocument(spec, parties))));

const toBuffer = async (doc: ReturnType<typeof h>): Promise<Buffer> => {
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

export type BuildClauseTextOptions = {
  clauses: SelectedClause[] | Clause[];
  values: Record<string, InterpolationValue>;
};

/** Interpolate a set of clauses, collecting every unfilled variable. */
export const buildClauseText = ({
  clauses,
  values,
}: BuildClauseTextOptions): { rendered: RenderedClause[]; missing: string[] } => {
  const missing: string[] = [];

  const rendered = clauses.map((clause) => {
    const result = interpolateClause({ body: clause.body, variables: clause.variables, values });

    missing.push(...result.missing.map((name) => `${clause.slug}: ${name}`));

    return {
      clause,
      number: 'number' in clause ? (clause as SelectedClause).number : undefined,
      text: result.text,
    };
  });

  return { rendered, missing };
};
