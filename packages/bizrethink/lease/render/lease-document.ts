import { Document, Page, renderToStream, StyleSheet, Text, View } from '@react-pdf/renderer';
import type { Style } from '@react-pdf/types';
import { createElement as h } from 'react';

import type { Clause } from '../clauses/types';
import type { SelectedClause } from '../engine/select-clauses';
import type { MoneyLine } from '../money/types';
import type { InterpolationValue } from './interpolate';
import { interpolateClause } from './interpolate';
import type { LeaseParty, PartyRole } from './signature-blocks';
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

/*
  THE TYPEFACE PALETTE IS FIXED BY THE COMPLIANCE CONSTRAINT ABOVE, and it is
  wider than it looks. All seven of these are standard-14 and none is embedded,
  so `page.findText()` still finds every placeholder — which is the whole reason
  a custom face is not an option.

  Times for the instrument itself, because a contract that reads as a contract
  is set in a book face. Helvetica for the apparatus around it — running head,
  section labels, table columns, footer — so the reader can tell at a glance
  what is the agreement and what is the furniture.
*/
const SERIF = 'Times-Roman';
const SERIF_ITALIC = 'Times-Italic';
const SANS = 'Helvetica';
const SANS_BOLD = 'Helvetica-Bold';

const INK = '#15191d';
const MUTED = '#5c6772';
const HAIRLINE = '#c9ced4';
/** Prints legibly in greyscale, which a signed lease frequently is. */
const ACCENT = '#1c3d5a';

/**
 * MUST STAY 11, and must match `LINE_TEXT_HEIGHT` in signature-blocks.ts.
 *
 * The page default is what a signature placeholder renders at, and the sized
 * widget's reserved leading is computed from it. Changing it moves every
 * signature widget off the line it was measured for. Body text carries its own
 * size instead.
 */
const BASE_FONT_SIZE = 11;

const styles = StyleSheet.create({
  page: {
    // 1.25in sides. The old 64pt gave a ~98-character measure, which is why the
    // body read as an undifferentiated slab.
    paddingTop: 74,
    paddingBottom: 76,
    paddingHorizontal: 90,
    fontFamily: SERIF,
    fontSize: BASE_FONT_SIZE,
    lineHeight: 1.5,
    color: INK,
  },

  /* ---- running head and foot ---- */

  runningHead: {
    position: 'absolute',
    top: 40,
    left: 90,
    right: 90,
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderBottomWidth: 0.5,
    borderBottomColor: HAIRLINE,
    paddingBottom: 5,
    fontFamily: SANS,
    fontSize: 7,
    letterSpacing: 0.7,
    color: MUTED,
  },
  footer: {
    position: 'absolute',
    bottom: 42,
    left: 90,
    right: 90,
    flexDirection: 'row',
    justifyContent: 'space-between',
    fontFamily: SANS,
    fontSize: 7,
    letterSpacing: 0.7,
    color: MUTED,
  },

  /* ---- the cover block ---- */

  eyebrow: {
    fontFamily: SANS_BOLD,
    fontSize: 7.5,
    letterSpacing: 1.6,
    color: ACCENT,
    marginBottom: 10,
  },
  docTitle: {
    fontFamily: SANS_BOLD,
    fontSize: 23,
    letterSpacing: -0.2,
    lineHeight: 1.15,
    color: INK,
  },
  titleRule: { borderBottomWidth: 2, borderBottomColor: ACCENT, marginTop: 12, marginBottom: 12 },
  docSubtitle: { fontFamily: SERIF_ITALIC, fontSize: 11.5, color: MUTED, marginBottom: 4 },
  recital: { fontSize: 10.5, lineHeight: 1.5, marginTop: 10, marginBottom: 26 },

  /* ---- contents ---- */

  blockLabel: {
    fontFamily: SANS_BOLD,
    fontSize: 8,
    letterSpacing: 1.4,
    color: ACCENT,
    marginTop: 4,
    marginBottom: 9,
  },
  tocRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 4.5,
  },
  tocNumber: { width: 34, fontFamily: SANS, fontSize: 8.5, color: MUTED },
  // The leader. A dotted rule under a flexed cell is how a contents table has
  // carried the eye across a gap since long before any of this was digital.
  tocLeader: {
    flexGrow: 1,
    borderBottomWidth: 0.5,
    borderBottomColor: HAIRLINE,
    borderBottomStyle: 'dotted',
    marginBottom: 2.5,
  },
  tocHeading: { fontSize: 9.5, paddingRight: 6 },

  /* ---- clauses ---- */

  sectionRow: { flexDirection: 'row', marginTop: 17, marginBottom: 5 },
  sectionNumber: { width: 34, fontFamily: SANS_BOLD, fontSize: 9, color: ACCENT },
  sectionHeadingText: {
    flex: 1,
    fontFamily: SANS_BOLD,
    fontSize: 9,
    letterSpacing: 0.85,
    color: INK,
  },
  bodyText: { textAlign: 'justify', fontSize: 10.5, lineHeight: 1.55, marginBottom: 2 },

  /* ---- amounts ---- */

  moneyTableTop: { borderTopWidth: 1, borderTopColor: INK, marginTop: 2 },
  moneyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderBottomWidth: 0.5,
    borderBottomColor: HAIRLINE,
    paddingVertical: 5,
    fontSize: 10,
  },
  moneyTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: INK,
    paddingTop: 6,
    marginTop: 1,
    fontFamily: SANS_BOLD,
    fontSize: 10,
  },
  // Figures line up in a column, so they are set to line up.
  amount: { fontFamily: SERIF },

  /* ---- signatures ---- */

  sigSection: { marginTop: 26, borderTopWidth: 1, borderTopColor: ACCENT, paddingTop: 12 },
  sigGroupHeading: {
    fontFamily: SANS_BOLD,
    fontSize: 8,
    letterSpacing: 1.4,
    color: ACCENT,
    marginTop: 14,
    marginBottom: 8,
  },
  sigName: { fontFamily: SANS_BOLD, fontSize: 9.5, color: INK },
  sigRole: { fontFamily: SANS, fontSize: 7.5, letterSpacing: 0.8, color: MUTED, marginBottom: 2 },
  sigBlock: { marginBottom: 14 },
});

export type RenderedClause = {
  clause: Clause;
  number?: string;
  text: string;
};

const text = (content: string, style?: Style | Style[], key?: string) => h(Text, { style, key }, content);

/**
 * Running head. Names the instrument and the property on every page.
 *
 * A signed lease gets printed, photocopied and pulled apart; a loose page with
 * nothing on it but body text belongs to no document. Both halves are `fixed`
 * so react-pdf repeats them.
 */
const runningHead = (documentTitle: string, subtitle: string) =>
  h(
    View,
    { style: styles.runningHead, fixed: true },
    h(Text, {}, documentTitle.toUpperCase()),
    h(Text, {}, subtitle.toUpperCase()),
  );

/** Running foot. `render` gives react-pdf the page numbers it computes itself. */
const footer = () =>
  h(
    View,
    { style: styles.footer, fixed: true },
    h(Text, {}, 'PACTA'),
    h(Text, {
      render: ({ pageNumber, totalPages }: { pageNumber: number; totalPages: number }) =>
        `PAGE ${pageNumber} OF ${totalPages}`,
    }),
  );

/**
 * The cover block: what this is, what it is about, and between whom.
 *
 * The recital line is here because a reader opening a lease asks "whose is
 * this?" before anything else, and the answer used to be buried in clause 1.
 */
const coverBlock = (spec: LeaseDocumentSpec, parties: LeaseParty[]) => {
  const named = (role: PartyRole) =>
    parties
      .filter((party) => party.role === role)
      .map((party) => party.name)
      .join(' and ');

  const landlords = named('landlord');
  const tenants = named('tenant');

  return h(
    View,
    { key: 'cover' },
    text(spec.withInitials ? 'Addendum' : 'Agreement', styles.eyebrow),
    text(spec.title, styles.docTitle),
    h(View, { style: styles.titleRule, key: 'title-rule' }),
    text(spec.subtitle, styles.docSubtitle),
    ...(landlords !== '' && tenants !== ''
      ? [text(`Between ${landlords}, as Landlord, and ${tenants}, as Tenant.`, styles.recital, 'recital')]
      : []),
  );
};

/** Reads the same rendered clauses the body does, so the two cannot drift. */
const tableOfContents = (clauses: RenderedClause[]) =>
  h(
    View,
    { key: 'toc' },
    text('Contents', styles.blockLabel),
    ...clauses.map((rendered) =>
      h(
        View,
        { style: styles.tocRow, key: `toc-${rendered.clause.slug}` },
        h(Text, { style: styles.tocNumber }, rendered.number ?? ''),
        h(Text, { style: styles.tocHeading }, rendered.clause.heading),
        h(View, { style: styles.tocLeader }),
      ),
    ),
  );

const amountsDueTable = (lines: MoneyLine[], totalUsd: number) => {
  const money = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

  return h(
    View,
    { key: 'amounts', wrap: false },
    text('Amounts Due on Execution', styles.blockLabel),
    h(View, { style: styles.moneyTableTop, key: 'money-top' }),
    ...lines.map((line, i) =>
      h(
        View,
        { style: styles.moneyRow, key: `money-${i}` },
        h(Text, {}, line.label),
        h(Text, { style: styles.amount }, money.format(line.amountUsd)),
      ),
    ),
    h(
      View,
      { style: styles.moneyTotal, key: 'money-total' },
      h(Text, {}, 'Total due at execution'),
      h(Text, { style: styles.amount }, money.format(totalUsd)),
    ),
  );
};

/**
 * A signature block. The sized signature token carries `reservedLeadingPt`,
 * which becomes real vertical margin — without it overlay 034 centres the
 * widget on its own text line and it overprints the name above and the date
 * below. See the no-overlap invariant in placeholder-roundtrip.test.ts.
 */
const signatureBlocks = (parties: LeaseParty[], documentKey: string, withInitials: boolean) => [
  h(View, { key: `${documentKey}-sig-rule`, style: styles.sigSection }, text('Signatures', styles.blockLabel)),
  ...buildSignatureBlocks({ parties, documentKey, withInitials }).map((block) =>
    h(
      View,
      { key: `${documentKey}-${block.heading}`, wrap: false },
      text(block.heading, styles.sigGroupHeading),
      ...block.signers.map((signer) =>
        h(
          View,
          { style: styles.sigBlock, key: signer.recipient },
          text(signer.name, styles.sigName),
          /*
            The placeholder Text carries NO style, deliberately. It inherits the
            page's 11pt, which is what `LINE_TEXT_HEIGHT` was measured against
            and what the sized widget's reserved leading is computed from.
            Styling it moves the widget off the line it was measured for.
          */
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
  ),
];

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
    runningHead(spec.title, spec.subtitle),
    footer(),
    coverBlock(spec, parties),
    ...(spec.showToc ? [tableOfContents(spec.clauses)] : []),
    ...(spec.amountsDue ? [amountsDueTable(spec.amountsDue.lines, spec.amountsDue.totalUsd)] : []),
    ...spec.clauses.flatMap((rendered) => [
      /*
        The number HANGS in its own column rather than running into the heading
        as "8.2. Allocation of…". It is how a numbered instrument is set, and it
        lets the eye find a clause by number without reading any of the words.

        `wrap: false` keeps a heading from being orphaned at the foot of a page
        with its clause overleaf.
      */
      h(
        View,
        { style: styles.sectionRow, key: `h-${rendered.clause.slug}`, wrap: false },
        h(Text, { style: styles.sectionNumber }, rendered.number ?? ''),
        h(Text, { style: styles.sectionHeadingText }, rendered.clause.heading.toUpperCase()),
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
