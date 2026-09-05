import { Document, Page, renderToStream, StyleSheet, Text, View } from '@react-pdf/renderer';
import type { Style } from '@react-pdf/types';
import { createElement as h } from 'react';

import type { Clause } from '../clauses/types';
import { FL_SECTION_NAMES } from '../clauses/us-fl';
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
export const SIG_GUTTER = 24;
export const SIG_COL = (MEASURE - SIG_GUTTER) / 2;

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
  recital: { fontSize: 10.5, lineHeight: 1.5, marginTop: 10, marginBottom: 22 },
  termRow: { flexDirection: 'row', paddingVertical: 4.5 },
  termLabel: { width: 130, fontFamily: SANS, fontSize: 8, letterSpacing: 0.9, color: MUTED, paddingTop: 1.5 },
  termValue: { flex: 1, fontSize: 10.5 },

  /* ---- contents ---- */

  blockLabel: {
    fontFamily: SANS_BOLD,
    fontSize: 8,
    letterSpacing: 1.4,
    color: ACCENT,
    marginTop: 4,
    marginBottom: 9,
  },
  /*
    SECTION LEVEL, not clause level. Listing all 43 clauses ran to two pages
    and gave a reader of a residential lease more detail than they can use;
    fourteen sections fit on part of one, with the clause headings beneath each
    as a muted run so nothing is actually lost.
  */
  tocRow: { flexDirection: 'row', marginBottom: 2 },
  /*
    Tied to the head ABOVE it, not floating between two — almost no space above,
    a clear gap below. Otherwise a reader scanning the list reads each run as
    belonging to the section that follows it.
  */
  tocClauses: { marginLeft: 30, fontSize: 7.5, color: MUTED, marginBottom: 9, lineHeight: 1.35 },
  tocNumber: { width: 30, fontFamily: SANS_BOLD, fontSize: 9.5, color: ACCENT },
  tocSection: { flex: 1, fontFamily: SANS_BOLD, fontSize: 9.5, letterSpacing: 0.7 },

  /*
    The printed section head. Its absence is why the numbering read as half a
    scheme — `4.2` and `4.3` with no `4.` anywhere.
  */
  /*
    RULES ARE PAINTED, NOT BORDERED, anywhere they sit in the flowing body.

    react-pdf 4.9 emits a degenerate coordinate out of clipBorderTop/Bottom
    ("unsupported number: -2.2e+22") when a bordered node meets a page break,
    and then no PDF renders at all. A 1pt View with a background colour draws
    the identical line and never goes near the border clipper. The same bug is
    what makes `minPresenceAhead` unusable.
  */
  sectionHead: { flexDirection: 'row', marginTop: 30, marginBottom: 4 },
  /*
    NO RULE UNDER THE SECTION HEAD, and it is not a design preference.

    Any rule in the FLOWING body — drawn as a border, as a painted 1pt View,
    stretched, or pinned to an explicit width — makes react-pdf 4.9 emit its
    undefined sentinel (-2.2e+22) when it lands on a page boundary, and then no
    PDF renders at all. Four mechanisms, one failure. It is the same family of
    bug that makes `minPresenceAhead` and `break` unusable here.

    The rules that survive are the ones in ABSOLUTE chrome (running head,
    footer) and inside `wrap: false` blocks that never split (the money table,
    the signature cells), because neither is ever asked to resolve across a
    break.

    So the section head is marked by weight and space instead — larger, tracked,
    with room above it. That is a legitimate setting in its own right; it is
    simply not the one I would have chosen freely.
  */
  sectionHeadNumber: { width: 30, fontFamily: SANS_BOLD, fontSize: 12, color: ACCENT },
  sectionHeadName: { flex: 1, fontFamily: SANS_BOLD, fontSize: 12, letterSpacing: 1.6, color: ACCENT },
  tocNumberOld: { width: 34, fontFamily: SANS, fontSize: 8.5, color: MUTED },
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

  moneyTableTop: { width: MEASURE, height: 1, backgroundColor: INK, marginTop: 2 },
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
  footerRule: { width: MEASURE, height: 0.5, backgroundColor: HAIRLINE, marginBottom: 6 },
  footerRow: { flexDirection: 'row', justifyContent: 'space-between' },
  amount: { fontFamily: SERIF },
  amountTotal: { fontFamily: SANS_BOLD },

  /* ---- signatures ---- */

  sigSection: { marginTop: 26 },
  sigSectionRule: { width: MEASURE, height: 1, backgroundColor: ACCENT, marginBottom: 12 },
  sigGroupHeading: {
    fontFamily: SANS_BOLD,
    fontSize: 8,
    letterSpacing: 1.4,
    color: ACCENT,
    marginTop: 14,
    marginBottom: 8,
  },
  testimonium: { fontSize: 10.5, lineHeight: 1.55, marginTop: 4, marginBottom: 16 },
  /*
    Two across, and it is safer than the stack it replaced rather than riskier.
    The left widget spans x 90-250 and the right cell starts at 318, so the
    no-overlap invariant holds HORIZONTALLY by construction — whatever the
    ±16.5pt reserved leading does vertically, it now only has to be defended
    within a column.
  */
  sigRow: { flexDirection: 'row', marginBottom: 16 },
  sigCell: { width: SIG_COL },
  sigGutter: { width: SIG_GUTTER },
  // A signature sits ON a rule. Emitted as a sibling View rather than a border
  // on the token's own Text, which would move the char boxes the extractor
  // merges into the widget's bbox.
  sigRule: { width: SIG_COL, height: 0.75, backgroundColor: INK, marginTop: 4 },
  sigName: { fontFamily: SANS_BOLD, fontSize: 9, color: INK, marginTop: 4 },
  sigDate: { fontSize: 10, marginTop: 6 },
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
    h(View, { style: styles.footerRule, key: 'rule' }),
    h(
      View,
      { style: styles.footerRow, key: 'row' },
      h(Text, { style: styles.headLeft }, `PACTA · ${spec.key.toUpperCase()}`),
      /*
        subPage, not page. Each spec is its own Page, and an addendum IS its own
        instrument — the whole reason renderLease keeps them separate. In the
        combined reading copy the old counter read "PAGE 12 OF 27" on a two-page
        addendum.
      */
      h(Text, {
        // Document-wide: the three parts are separate Page components now, so a
        // subPage counter would restart on each of them.
        render: ({ pageNumber, totalPages }: { pageNumber: number; totalPages: number }) =>
          `PAGE ${pageNumber} OF ${totalPages}`,
      }),
    ),
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
    ...(spec.keyTerms && spec.keyTerms.length > 0
      ? [
          text('Key Terms', styles.blockLabel, 'kt-label'),
          ...spec.keyTerms.map((term) =>
            h(
              View,
              { style: styles.termRow, key: `kt-${term.label}` },
              h(Text, { style: styles.termLabel }, term.label.toUpperCase()),
              h(Text, { style: styles.termValue }, term.value),
            ),
          ),
        ]
      : []),
  );
};

/**
 * The clauses grouped under the section they belong to, in document order.
 *
 * Grouped on the leading component of the derived number rather than on the
 * section slug, so the grouping and the printed numbering can never disagree
 * about where a section begins.
 */
type Section = { number: string; name: string; clauses: RenderedClause[] };

const groupIntoSections = (clauses: RenderedClause[]): Section[] =>
  clauses.reduce<Section[]>((sections, rendered) => {
    const number = (rendered.number ?? '').split('.')[0];
    const last = sections[sections.length - 1];

    if (last !== undefined && last.number === number) {
      last.clauses.push(rendered);

      return sections;
    }

    const slug = rendered.clause.section as keyof typeof FL_SECTION_NAMES;

    return [...sections, { number, name: FL_SECTION_NAMES[slug] ?? rendered.clause.section, clauses: [rendered] }];
  }, []);

/** Reads the same rendered clauses the body does, so the two cannot drift. */
const tableOfContents = (clauses: RenderedClause[]) =>
  h(
    View,
    { key: 'toc' },
    text('Contents', styles.blockLabel),
    /*
      THE CLAUSE HEADINGS ARE BACK, because the contents now has a page.

      Listing all 43 clauses as numbered rows ran to two pages and gave a reader
      of a residential lease more detail than they can use. Section names alone
      fitted but said too little. Sections with their clause headings beneath as
      a muted run is the middle, and it fits now that the cover carries the key
      terms and ends before this begins.

      No dot leaders. They used to run the eye across to NOTHING — react-pdf
      cannot resolve a forward page reference in one pass — and a leader
      pointing at empty space is worse than no leader. They come back when the
      folios do, via a two-pass render.
    */
    ...groupIntoSections(clauses).flatMap((section) => [
      h(
        View,
        { style: styles.tocRow, key: `toc-${section.number}` },
        h(Text, { style: styles.tocNumber }, section.number),
        h(Text, { style: styles.tocSection }, section.name.toUpperCase()),
      ),
      ...(section.clauses.length > 1
        ? [
            h(
              Text,
              { style: styles.tocClauses, key: `toc-sub-${section.number}` },
              section.clauses.map((rendered) => rendered.clause.heading).join(' · '),
            ),
          ]
        : []),
    ]),
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
    h(View, { style: styles.moneyTableTop, key: 'total-rule' }),
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
/** Left to right, then down — recipient order is what a reader maps to a party. */
const inPairs = <T>(items: T[]): T[][] =>
  items.reduce<T[][]>((rows, item, i) => (i % 2 ? (rows[rows.length - 1].push(item), rows) : [...rows, [item]]), []);

/**
 * The execution page.
 *
 * WHAT THIS REPLACED: a five-item vertical stack per signer — printed name,
 * NAME token, SIGNATURE token with its reserved leading, DATE, INITIALS —
 * roughly 100pt each, so four signers took most of a page. It was also not the
 * shape of an execution block: no rule for the signature to sit on, the printed
 * name ABOVE the signature rather than beneath it, and a NAME field that
 * autofills from the recipient printing the party's name a second time.
 *
 * The model is Ontario form 2229E: group by role, then a repeating
 * name/signature/date row. It maps onto a signature-field array with a variable
 * party count, which is exactly the situation here.
 *
 * `wrap: false` is on the PAIR ROW, not the role block. The invariant that
 * matters is "a signer's cell never splits across a page"; "a role never
 * splits" is both stricter than needed and unbounded in the number of signers.
 */
const signatureBlocks = (parties: LeaseParty[], documentKey: string, withInitials: boolean) => {
  const blocks = buildSignatureBlocks({ parties, documentKey, withInitials });

  return [
    /*
      THE WHOLE EXECUTION AREA IS ONE UNBREAKABLE BLOCK, and that is what gives
      it a page of its own.

      Without it the testimonium and the role heading printed at a page foot,
      the first signature row did not fit in what was left, and the reader got a
      heading, two-thirds of a page of white, and cells under the NEXT
      document's running head.

      `break: true` is the obvious fix and it does not work here: on the styled
      node OR as a bare sibling, react-pdf 4.9 resolves a child box to its
      undefined sentinel (-2.2e+22) and no PDF renders at all — the same family
      of pagination bug that makes `minPresenceAhead` unusable. `wrap: false`
      achieves the same thing by a different route: when the block does not fit
      in what remains, react-pdf moves the whole of it to a fresh page, which is
      the dedicated execution page an engrossed instrument wants anyway.

      Four signers come to roughly 500pt against 642pt of usable height. A party
      list long enough to exceed a page would overflow rather than break; that
      is a real limit and it is far outside anything this product will meet.
    */
    h(
      View,
      { key: `${documentKey}-execution`, style: styles.sigSection, wrap: false },
      h(View, { style: styles.sigSectionRule, key: 'exec-rule' }),
      text('Execution', styles.blockLabel),
      text(
        'IN WITNESS WHEREOF, the parties have executed this Lease as of the date first written above.',
        styles.testimonium,
      ),
      ...blocks.flatMap((block) => [
        text(block.heading, styles.sigGroupHeading, `${documentKey}-${block.heading}`),
        ...inPairs(block.signers).map((pair, row) =>
          h(
            View,
            { key: `${documentKey}-${block.heading}-${row}`, style: styles.sigRow },
            ...pair.flatMap((signer, column) => {
              const signature = signer.placeholders.find((p) => p.token.includes('SIGNATURE'));
              const date = signer.placeholders.find((p) => p.token.includes('DATE'));
              const initials = signer.placeholders.filter((p) => p.token.includes('INITIALS'));

              const cell = h(
                View,
                { key: signer.recipient, style: styles.sigCell },
                /*
                  No style on the token, and no hyphenation. It inherits the
                  page's 11pt, which is what LINE_TEXT_HEIGHT was measured
                  against and what the reserved leading is computed from.
                */
                h(
                  Text,
                  {
                    hyphenationCallback: (word: string) => [word],
                    style:
                      signature && signature.reservedLeadingPt > 0
                        ? { marginTop: signature.reservedLeadingPt, marginBottom: signature.reservedLeadingPt }
                        : undefined,
                  },
                  signature?.token ?? '',
                ),
                h(View, { style: styles.sigRule, key: 'rule' }),
                // The party's name, pre-printed. This identifies them whether
                // or not anybody ever signs, which is why it is not a field.
                text(signer.name, styles.sigName, 'name'),
                h(
                  Text,
                  { style: styles.sigDate, hyphenationCallback: (word: string) => [word], key: 'date' },
                  `Date: ${date?.token ?? ''}`,
                ),
                /*
                  Initials, on addenda only, and still in the cell. They belong
                  in the page margin — the Florida Supreme Court lease
                  (SC09-250, Appendix B) sets them as a footer doing
                  initialling, receipt and pagination in one line, which makes a
                  swapped page detectable. Not done here because
                  {{INITIALS, rN}} is 82pt at 11pt Times and four plus labels
                  exceed the 432pt measure; moving them needs shorter tokens and
                  its own proof. Left in the cell rather than dropped — the
                  set-equality test caught exactly that when this layout landed.
                */
                ...initials.map((placeholder, i) =>
                  h(
                    Text,
                    { key: `initials-${i}`, style: styles.sigDate, hyphenationCallback: (word: string) => [word] },
                    placeholder.token,
                  ),
                ),
              );

              // A lone signer keeps the column width; the rules line up down
              // the page rather than stretching to fill.
              return column === 0 && pair.length > 1
                ? [cell, h(View, { key: `gutter-${row}`, style: styles.sigGutter })]
                : [cell];
            }),
          ),
        ),
      ]),
    ),
  ];
};

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
  /**
   * The deal, on the face of the instrument.
   *
   * A particulars block — what the UK Model Commercial Lease does with its
   * prescribed clauses and what a US commercial lease calls Basic Lease
   * Information. It RESTATES; it does not replace. The term and the rent remain
   * operative clauses, because a fact that lives only in a table is a fact that
   * is only described.
   *
   * Derived from the same figures the clauses interpolate, never typed
   * separately — a summary that can disagree with the document beneath it is
   * the precise defect this product exists to prevent, and there is a test
   * asserting the two cannot part company.
   */
  keyTerms?: { label: string; value: string }[];
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

/**
 * THREE PAGES BY CONSTRUCTION, not by asking for a break.
 *
 * The front matter is the deal — key terms and the money due at execution — and
 * it earns a page of its own: it is the first thing a reader wants and the last
 * thing they should have to hunt for. The contents follows on its own page. The
 * agreement starts after both.
 *
 * They are separate `Page` components rather than one Page with breaks in it,
 * because every page-break control in this react-pdf build is unusable:
 * `break`, `minPresenceAhead` and `wrap: false` on a large node all make it
 * emit an undefined coordinate (-2.2e+22) and render nothing at all. A `Page`
 * boundary is the one thing it cannot get wrong.
 *
 * THE COST, stated because it is real: `subPageNumber` counts within a `Page`
 * component, so the folio uses the document-wide counter instead. In the signed
 * documents that is the same thing — each instrument renders on its own. In the
 * combined reading copy it runs continuously, which is what a reading copy
 * wants anyway.
 */
const renderDocument = (spec: LeaseDocumentSpec, parties: LeaseParty[]) => {
  const front = spec.keyTerms !== undefined && spec.keyTerms.length > 0;

  const body = h(
    Page,
    { size: 'LETTER', style: styles.page, key: `${spec.key}-body` },
    runningHead(spec),
    footer(spec),
    ...(front ? [] : [coverBlock(spec, parties)]),
    ...(front || !spec.amountsDue ? [] : [amountsDueTable(spec.amountsDue.lines, spec.amountsDue.totalUsd)]),
    /*
      SECTION HEAD, THEN ITS CLAUSES. The heads were modelled and never printed,
      so the document ran `4.2 LATE PAYMENT` straight into `4.3 RETURNED
      PAYMENTS` with no `4. RENT AND CHARGES` between them — decimal numbering
      asserting a parent the reader was never shown.
    */
    ...groupIntoSections(spec.clauses).flatMap((section) => [
      h(
        View,
        { style: styles.sectionHead, key: `sec-${section.number}` },
        h(Text, { style: styles.sectionHeadNumber }, section.number),
        h(Text, { style: styles.sectionHeadName }, section.name.toUpperCase()),
      ),
      /*
        A SECTION WITH ONE CLAUSE DOES NOT REPEAT ITSELF. `numberClauses` gives
        a lone clause the bare section number, so the document printed
        "1 PARTIES" as the section head and "1 PARTIES" again directly beneath.
      */
      ...(section.clauses.length === 1
        ? [text(section.clauses[0].text, styles.bodyText, `b-${section.clauses[0].clause.slug}`)]
        : section.clauses.flatMap((rendered) => {
            const headingRow = h(
              View,
              {
                style: styles.sectionRow,
                key: `h-${rendered.clause.slug}`,
                // Keeps a two-line heading from splitting across a page break.
                wrap: false,
              },
              h(Text, { style: styles.sectionNumber }, rendered.number ?? ''),
              h(Text, { style: styles.sectionHeadingText }, rendered.clause.heading.toUpperCase()),
            );

            const body = text(rendered.text, styles.bodyText, `b-${rendered.clause.slug}`);

            /*
              KEEP A HEADING WITH ITS FIRST WORDS, WITHOUT `minPresenceAhead`.

              A heading emitted as a sibling of its body can be placed at a page
              foot with the body starting overleaf — five clauses did exactly
              that, leaving a title alone above a third of a page of white.

              `minPresenceAhead` is the idiomatic fix and is UNUSABLE here: it
              renders this lease correctly and then emits the -2.2e+22 sentinel
              on other documents, which fails the render outright. Tried, and
              recorded so it is not tried again.

              So the pair is bound in one `wrap: false` node instead — but only
              where the clause is SHORT. `wrap: false` on a large node is the
              same crash, and a bound unit taller than the text area can never
              be placed at all. Long clauses keep the old behaviour, which is
              also where an orphan matters least: a long body fills the page
              under its own heading.
            */
            const SHORT_ENOUGH = 420;

            return rendered.text.length <= SHORT_ENOUGH
              ? [h(View, { key: `k-${rendered.clause.slug}`, wrap: false }, headingRow, body)]
              : [headingRow, body];
          })),
    ]),
    ...signatureBlocks(parties, spec.key, spec.withInitials),
  );

  if (!front) {
    return [body];
  }

  return [
    // The deal, alone. No running head — the title block says all of it.
    h(
      Page,
      { size: 'LETTER', style: styles.page, key: `${spec.key}-front` },
      footer(spec),
      coverBlock(spec, parties),
      ...(spec.amountsDue ? [amountsDueTable(spec.amountsDue.lines, spec.amountsDue.totalUsd)] : []),
    ),
    ...(spec.showToc
      ? [
          h(
            Page,
            { size: 'LETTER', style: styles.page, key: `${spec.key}-toc` },
            runningHead(spec),
            footer(spec),
            tableOfContents(spec.clauses),
          ),
        ]
      : []),
    body,
  ];
};

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
