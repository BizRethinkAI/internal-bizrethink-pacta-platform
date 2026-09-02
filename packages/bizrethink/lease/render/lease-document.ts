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

/*
  PAGE GEOMETRY AS NUMBERS, because the signature layout has to be able to
  assert that a token fits in the space it is given.

  `{{SIGNATURE, r1, width=160, height=44}}` measures 200pt at 11pt Times-Roman.
  Any column narrower than that wraps it — and a wrapped token is still found
  by the extractor, still parses, and lands a real signature widget in the
  wrong place. See the set-equality assertion in render-lease.test.ts.
*/
export const PAGE_WIDTH = 612;
export const PAD_H = 90;
export const MEASURE = PAGE_WIDTH - 2 * PAD_H;

const styles = StyleSheet.create({
  page: {
    // 1.25in sides. The old 64pt gave a ~98-character measure, which is why the
    // body read as an undifferentiated slab.
    paddingTop: 74,
    paddingBottom: 84,
    paddingHorizontal: PAD_H,
    fontFamily: SERIF,
    fontSize: BASE_FONT_SIZE,
    lineHeight: 1.5,
    color: INK,
  },

  /* ---- running head and foot ---- */

  /*
    Two nodes, and the split is not cosmetic. The bordered node may never be
    the one whose `render` returns null — react-pdf still runs clipBorderBottom
    on it and emits a degenerate coordinate ("unsupported number: 2.2e+22").
    So the outer node is positioned and unbordered, and the inner bordered row
    is what appears or does not.
  */
  runningHead: {
    position: 'absolute',
    top: 40,
    left: PAD_H,
    right: PAD_H,
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
  /*
    Clamped to one line each. The addendum head used to carry the full subtitle
    sentence — "Attached to and forming part of the Residential Lease for 29090
    Picana Lane, Wesley Chapel, FL 33543" — which wrapped to two lines and
    collided with the eyebrow beneath it.

    `maxLines` and `textOverflow` are implemented by @react-pdf/stylesheet but
    are not on the exported Style type, hence the cast at the use site.
  */
  headLeft: { flexShrink: 1 },
  headRight: { flexShrink: 0, maxWidth: 220, textAlign: 'right' },
  footer: {
    position: 'absolute',
    // A rule is what anchors a foot. 7pt type floating in white at the very
    // bottom of the sheet is what reads as falling off the page.
    bottom: 48,
    left: PAD_H,
    right: PAD_H,
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 0.5,
    borderTopColor: HAIRLINE,
    paddingTop: 6,
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
  /*
    Figures set to line up. Times-Roman digits are all 500 units, so they are
    tabular — but this was also applied to the TOTAL row, where it reset the
    bold the row had just set, leaving a bold label beside a regular figure.
  */
  amount: { fontFamily: SERIF },
  amountTotal: { fontFamily: SANS_BOLD },

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
const runningHead = (spec: LeaseDocumentSpec) =>
  h(
    View,
    { style: styles.runningHead, fixed: true },
    h(Text, { style: styles.headLeft }, spec.shortTitle.toUpperCase()),
    h(Text, { style: styles.headRight }, spec.runningRef.toUpperCase()),
  );

/** Running foot. `render` gives react-pdf the page numbers it computes itself. */
const footer = (spec: LeaseDocumentSpec) =>
  h(
    View,
    { style: styles.footer, fixed: true },
    h(Text, { style: styles.headLeft }, `PACTA · ${spec.key.toUpperCase()}`),
    /*
      subPage, not page. Each spec is its own Page, and an addendum IS its own
      instrument — the whole reason renderLease keeps them separate. In the
      combined reading copy the old counter read "PAGE 12 OF 27" on a two-page
      addendum.
    */
    h(Text, {
      render: ({ subPageNumber, subPageTotalPages }: { subPageNumber: number; subPageTotalPages: number }) =>
        `PAGE ${subPageNumber} OF ${subPageTotalPages}`,
    }),
  );

/**
 * The cover block: what this is, what it is about, and between whom.
 *
 * The recital line is here because a reader opening a lease asks "whose is
 * this?" before anything else, and the answer used to be buried in clause 1.
 */
const EYEBROW: Record<LeaseDocumentSpec['kind'], string> = {
  lease: 'Agreement',
  addendum: 'Addendum',
  disclosure: 'Disclosure',
};

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
    text(EYEBROW[spec.kind], styles.eyebrow),
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
      h(Text, { style: styles.amountTotal }, money.format(totalUsd)),
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
          /*
            NEVER HYPHENATE A TOKEN. react-pdf ships Knuth-Liang hyphenation
            with en-us patterns on by default, so "height=44}}" is a split
            candidate the moment a line is tight — and a token broken across
            two lines is still FOUND by the extractor (it joins lines with a
            newline and `[^}]` matches it), still parses, and lands a real
            signature widget several points off where it belongs.

            A node prop, not a style, so the 11pt the reserved leading was
            measured against is untouched.
          */
          ...signer.placeholders.map((placeholder, i) =>
            h(
              Text,
              {
                key: `${signer.recipient}-${i}`,
                hyphenationCallback: (word: string) => [word],
                style:
                  placeholder.reservedLeadingPt > 0
                    ? { marginTop: placeholder.reservedLeadingPt, marginBottom: placeholder.reservedLeadingPt }
                    : undefined,
              },
              placeholder.token,
            ),
          ),
        ),
      ),
    ),
  ),
];

export type LeaseDocumentSpec = {
  key: string;
  /**
   * What this document IS.
   *
   * The eyebrow used to read `withInitials ? 'Addendum' : 'Agreement'`, and a
   * standalone disclosure has withInitials false — so the flood disclosure,
   * the one document Fla. Stat. §83.512 requires to be SEPARATE from the
   * agreement, announced itself as "Agreement".
   */
  kind: 'lease' | 'addendum' | 'disclosure';
  title: string;
  /** Short, for the running head. The full sentence below is for the cover. */
  shortTitle: string;
  /** Short property reference for the running head's right-hand slot. */
  runningRef: string;
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
    runningHead(spec),
    footer(spec),
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
        {
          style: styles.sectionRow,
          key: `h-${rendered.clause.slug}`,
          // Keeps a two-line heading from splitting across a page break.
          wrap: false,
          /*
            KEEP-WITH-NEXT IS STILL MISSING, and `minPresenceAhead` is not the
            answer here despite being exactly what it is documented to do.

            Setting it on this node — with or without `wrap: false` — makes
            react-pdf 4.9 emit a degenerate coordinate out of clipBorderBottom
            ("unsupported number: -2.2e+22") and no PDF renders at all. Verified
            by bisection: removing it alone turns the suite green.

            So a heading can still be orphaned at the foot of a page with its
            clause overleaf. Fixing it needs either a react-pdf upgrade or the
            heading and its first paragraph wrapped in one unbreakable View,
            and the second wants a rendered proof rather than a green suite.
          */
        },
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
