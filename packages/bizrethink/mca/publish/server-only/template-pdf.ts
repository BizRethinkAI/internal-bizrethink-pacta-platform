import { Document, Font, Page, renderToStream, StyleSheet, Text, View } from '@react-pdf/renderer';
import type { Style } from '@react-pdf/types';
import { createElement as h } from 'react';

import { SANS_REGULAR, SANS_SEMIBOLD, TINOS_REGULAR } from '../../../lease/render/fonts/font-data';
import type { ClauseField } from '../../clauses/types';
import { groupMcaSections } from '../../engine/section-headings';
import { fieldBlocks, fieldRows } from '../../render/field-layout';
import type { McaTemplateItem, McaTemplateSnapshot } from '../../templates/compile';
import { fieldPlanFor } from '../field-plan';
import type { ProducedInstrument } from '../recipient-contract';
import { markerFor } from './acroform';

/**
 * The renderer this vertical exists for: it produces a TEMPLATE.
 *
 * ADR 0025. Not a filled deal with a publishable mode beside it — a deal never
 * enters here at all. A page therefore carries exactly three kinds of thing
 * where a value belongs:
 *
 *   «widget_name»        a slot the funder's platform prefills per deal, which
 *                        `injectMcaWidgets` turns into an AcroForm widget
 *   the value itself     a fact the builder KNOWS at publication — the funder's
 *                        own address, its approved processor — set in type,
 *                        because a widget for it would need a value re-sent
 *                        every deal for something that never changes
 *   {{SIGNATURE, rN}}    a native placeholder Documenso turns into a signer
 *                        field at upload. NEVER a widget: a widget is
 *                        sender-writable only, so a signature built as one
 *                        ships permanently blank
 *
 * There is no second renderer beside it. The internal-draft renderer this
 * replaced took a filled deal and produced a review copy; ADR 0025 retired
 * both, and a preview is now this same function with specimen values in the
 * slots (`specimen.ts`) rather than a separate document that could disagree
 * with the one it previews.
 */

Font.register({ family: 'McaBody', src: TINOS_REGULAR });
Font.register({ family: 'McaSans', src: SANS_REGULAR });
Font.register({ family: 'McaSansBold', src: SANS_SEMIBOLD });

const styles = StyleSheet.create({
  // 72pt margins over a 468pt measure, as the real documents are set.
  page: {
    fontFamily: 'McaBody',
    fontSize: 10.5,
    paddingTop: 63,
    paddingBottom: 62,
    paddingHorizontal: 72,
    color: '#17202b',
  },
  footerParty: {
    position: 'absolute',
    top: 754,
    height: 13,
    left: 72,
    right: 72,
    fontFamily: 'McaSans',
    fontSize: 8,
    color: '#344054',
  },
  // A fixed render callback must not inherit a numeric lineHeight: react-pdf #3452.
  footer: {
    position: 'absolute',
    top: 742,
    height: 13,
    left: 72,
    right: 72,
    fontFamily: 'McaSans',
    fontSize: 8,
    color: '#667085',
  },
  banner: {
    position: 'absolute',
    top: 25,
    left: 72,
    right: 72,
    fontFamily: 'McaSansBold',
    fontSize: 8,
    color: '#935d17',
    borderBottomWidth: 0.5,
    borderBottomColor: '#d5c5ae',
    paddingBottom: 7,
  },
  title: { fontFamily: 'McaSansBold', fontSize: 19, lineHeight: 1.2, marginBottom: 14 },
  sectionHeading: { fontFamily: 'McaSansBold', fontSize: 14, lineHeight: 1.2, marginTop: 18, marginBottom: 8 },
  heading: { fontFamily: 'McaSansBold', fontSize: 11, marginBottom: 5, marginTop: 13 },
  paragraph: { fontSize: 10.5, marginBottom: 6, lineHeight: 1.45, textAlign: 'justify' },
  field: { borderBottomWidth: 0.4, borderBottomColor: '#d5d9df', paddingVertical: 5 },
  fieldRow: { flexDirection: 'row' },
  fieldCell: { flexBasis: '50%', flexGrow: 0, flexShrink: 1, paddingRight: 14 },
  fieldCellLast: { flexBasis: '50%', flexGrow: 0, flexShrink: 1 },
  fieldCellFull: { flexBasis: '100%', flexGrow: 0, flexShrink: 1 },
  moneyRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingVertical: 4.5,
    borderBottomWidth: 0.4,
    borderBottomColor: '#d5d9df',
  },
  moneyLabel: { flexGrow: 1, flexShrink: 1, fontFamily: 'McaSans', fontSize: 9, color: '#344054' },
  // MARKERS AND SIGNER TOKENS ARE SET IN TINOS, AND THAT IS A CORRECTNESS
  // DECISION, NOT A DESIGN ONE.
  //
  // `lease/render/lease-document.ts` flagged the class in Phase 0: an embedded
  // subset font encodes text differently and can defeat `page.findText()`,
  // which is how BOTH `injectMcaWidgets` finds a marker and upstream turns
  // `{{SIGNATURE, rN}}` into a signature field. This face is a fresh instance
  // of it — `@libpdf/core` reads the sans subset back scrambled
  // (`«effective_date»` comes out as `«eteciv_ed»aieq`), while pdfjs reads it
  // correctly, so the PDF is not broken and the extractor simply cannot read
  // that face. Tinos round-trips, and is what the lease proved.
  //
  // Labels may stay sans: nothing extracts them. Anything a machine must read
  // back may not.
  moneyValue: { flexBasis: 150, flexGrow: 0, flexShrink: 0, fontFamily: 'McaBody', fontSize: 10, textAlign: 'right' },
  label: { fontFamily: 'McaSans', fontSize: 8.5, color: '#667085' },
  value: { fontFamily: 'McaBody', fontSize: 10 },
  executionRow: { flexDirection: 'row', marginTop: 16 },
  executionCell: { flexBasis: '50%', flexGrow: 0, flexShrink: 1, paddingRight: 18 },
  executionCellLast: { flexBasis: '50%', flexGrow: 0, flexShrink: 1 },
  executionRole: { fontFamily: 'McaSansBold', fontSize: 8, letterSpacing: 2, color: '#935d17', marginBottom: 4 },
  executionParty: { fontFamily: 'McaBody', fontSize: 10.5, marginBottom: 2 },
  executionLine: { fontFamily: 'McaBody', fontSize: 9.5, color: '#344054', marginTop: 11 },
});

const text = (value: string, style: Style | Style[] = styles.paragraph) => h(Text, { style }, value);

/**
 * What fills each kind of slot.
 *
 * ONE LAYOUT, TWO FILLINGS. A preview built by a second code path is a preview
 * that can disagree with the thing it previews — and it would disagree exactly
 * when somebody is relying on it, while reviewing a document before publishing
 * it. So the layout is this module's, and only the filling differs.
 */
export type TemplateRenderMode = {
  /** Where a caller would prefill: a marker, or a specimen value. */
  slotFor: (widget: string, field: { binding: string; kind: ClauseField['kind']; label: string }) => string;
  /** A field the plan can neither mark nor print. */
  unplaced: (field: { binding: string; kind: ClauseField['kind']; label: string }) => string;
  /** Where a party signs: a native placeholder, or a printed rule. */
  signature: (signer: { signature: string; date: string }) => { signature: string; date: string };
  /** Printed at the top of every page, when the artifact must not be mistaken. */
  banner: string | null;
};

/** The publishable template: markers and native signer placeholders. */
export const PUBLISH_MODE: TemplateRenderMode = {
  slotFor: (widget) => markerFor(widget),
  unplaced: () => '—',
  signature: (signer) => ({ signature: signer.signature, date: `Date: ${signer.date}` }),
  banner: null,
};

export type TemplatePlacement = {
  /** Bindings rendered as a `«name»` slot, with the name each will carry. */
  marked: { binding: string; widget: string }[];
  /** Bindings the builder resolved at publication and set in type. */
  printed: string[];
  /**
   * Bindings this renderer can neither mark nor print.
   *
   * Reported rather than dropped. A field the template cannot fill is a gap in
   * the document, and a renderer that silently omitted it would hide the gap at
   * exactly the moment it becomes expensive. Most of these are the per-deal
   * names from `field-triage.ts` that no live template carries yet; emitting
   * them before the caller has agreed to send them would publish a template
   * full of slots nobody fills.
   */
  unplaced: string[];
};

/**
 * What each binding in this document becomes, decided once before rendering.
 *
 * `field-plan.ts` owns the decision; this only applies it, so the renderer and
 * `injectMcaWidgets` cannot disagree about which names the page carries.
 */
export const templatePlacement = (snapshot: McaTemplateSnapshot, instrument: ProducedInstrument): TemplatePlacement => {
  const plan = fieldPlanFor(instrument);
  const widgetFor = new Map(plan.marked.map((field) => [field.binding, field.widget]));
  const document = snapshot.documents.find((candidate) => candidate.instrument === instrument);
  const marked: { binding: string; widget: string }[] = [];
  const printed: string[] = [];
  const unplaced: string[] = [];
  const seen = new Set<string>();

  for (const item of document?.items ?? []) {
    for (const field of item.fields) {
      if (seen.has(field.binding) || field.kind === 'signature' || field.binding.endsWith('.signedDate')) {
        continue;
      }

      seen.add(field.binding);

      const widget = widgetFor.get(field.binding);

      if (widget) {
        marked.push({ binding: field.binding, widget });
      } else if (field.value !== null) {
        printed.push(field.binding);
      } else {
        unplaced.push(field.binding);
      }
    }
  }

  return { marked, printed, unplaced: unplaced.sort() };
};

/**
 * What a field prints.
 *
 * A marked field prints its marker; a resolved one prints its value. An
 * unplaced one prints an em-dash rather than vanishing — it is visible in the
 * document as something not yet provided, which is the honest rendering of a
 * field nobody can currently fill.
 */
const slot = (
  field: { binding: string; value: string | null; kind: ClauseField['kind']; label: string },
  widgetFor: Map<string, string>,
  mode: TemplateRenderMode,
): string => {
  const widget = widgetFor.get(field.binding);

  if (widget) {
    return mode.slotFor(widget, field);
  }

  return field.value ?? mode.unplaced(field);
};

const itemElements = (item: McaTemplateItem, widgetFor: Map<string, string>, mode: TemplateRenderMode) => {
  const heading = `${item.number ? `${item.number}  ` : ''}${item.heading}`;
  const paragraphs = item.body.split('\n').filter(Boolean);
  // Signature and date are native placeholders in the execution block, never
  // fields in the body.
  const printable = item.fields.filter((field) => field.kind !== 'signature' && !field.binding.endsWith('.signedDate'));
  const fields = fieldBlocks(printable).flatMap((block, blockIndex) =>
    block.kind === 'money'
      ? block.fields.map((field) =>
          h(
            View,
            { key: `${item.slug}:${field.binding}`, style: styles.moneyRow, wrap: false },
            text(field.label, styles.moneyLabel),
            text(slot(field, widgetFor, mode), styles.moneyValue),
          ),
        )
      : fieldRows(block.fields).map((row, index) =>
          h(
            View,
            { key: `${item.slug}:b${blockIndex}row${index}`, style: styles.fieldRow, wrap: false },
            ...row.map((field, column) =>
              h(
                View,
                {
                  key: `${item.slug}:${field.binding}`,
                  style: [
                    row.length === 1
                      ? styles.fieldCellFull
                      : column === row.length - 1
                        ? styles.fieldCellLast
                        : styles.fieldCell,
                    styles.field,
                  ],
                },
                text(field.label, styles.label),
                text(slot(field, widgetFor, mode), styles.value),
              ),
            ),
          ),
        ),
  );

  if (!paragraphs.length) {
    return [
      h(View, { key: `${item.slug}:first-field`, wrap: false }, text(heading, styles.heading), fields[0]),
      ...fields.slice(1),
    ];
  }

  return [
    h(
      Text,
      { key: `${item.slug}:opening`, style: [styles.paragraph, { marginTop: 13 }], orphans: 3, widows: 3 },
      h(Text, { style: { fontFamily: 'McaSansBold' } }, heading),
      '\n',
      paragraphs[0],
    ),
    ...paragraphs
      .slice(1)
      .map((paragraph, index) =>
        h(Text, { key: `${item.slug}:p${index}`, style: styles.paragraph, orphans: 3, widows: 3 }, paragraph),
      ),
    ...fields,
  ];
};

export const renderTemplateDocument = async (
  snapshot: McaTemplateSnapshot,
  instrument: ProducedInstrument,
  revision: number,
  mode: TemplateRenderMode,
): Promise<Buffer> => {
  const document = snapshot.documents.find((candidate) => candidate.instrument === instrument);

  if (!document) {
    throw new Error(`This template compiles no ${instrument}, so there is nothing to publish.`);
  }

  const plan = fieldPlanFor(instrument);
  const widgetFor = new Map(plan.marked.map((field) => [field.binding, field.widget]));
  const provider = snapshot.profile.buyer;

  const page = h(
    Page,
    { size: 'LETTER', style: styles.page },
    ...(mode.banner ? [h(Text, { key: 'banner', style: styles.banner, fixed: true }, mode.banner)] : []),
    h(
      Text,
      { key: 'party', style: styles.footerParty, fixed: true },
      [provider.legalName, provider.address].filter(Boolean).join('  •  '),
    ),
    h(Text, {
      key: 'foot',
      style: styles.footer,
      fixed: true,
      render: ({ pageNumber, totalPages }: { pageNumber: number; totalPages: number }) =>
        // A published template says which revision produced it. A signed
        // document that cannot be traced to its wording is not evidence of
        // much, and the reference costs one line.
        `${document.title} · rev ${revision} · ${pageNumber} / ${totalPages}`,
    }),
    text(document.title, styles.title),
    ...groupMcaSections(document.items, document.instrument).flatMap((section, index) => [
      h(Text, { key: `section:${index}`, style: styles.sectionHeading, minPresenceAhead: 90 }, section.heading),
      ...section.items.flatMap((item) => itemElements(item, widgetFor, mode)),
    ]),
    h(Text, { style: styles.heading, minPresenceAhead: 120 }, 'Execution'),
    // Two parties to a row, each block carrying the native placeholders
    // Documenso turns into that signer's fields at upload.
    ...plan.signers
      .reduce<(typeof plan.signers)[]>((rows, signer, index) => {
        if (index % 2 === 0) {
          rows.push([signer]);
        } else {
          rows[rows.length - 1].push(signer);
        }
        return rows;
      }, [])
      .map((row, index) =>
        h(
          View,
          { key: `execution:${index}`, style: styles.executionRow, wrap: false },
          ...row.map((signer, column) =>
            h(
              View,
              {
                key: signer.role,
                style: column === row.length - 1 ? styles.executionCellLast : styles.executionCell,
              },
              text(signer.role.replace(/_/g, ' ').toUpperCase().split('').join(' '), styles.executionRole),
              text(mode.signature(signer).signature, styles.executionParty),
              text(mode.signature(signer).date, styles.executionLine),
            ),
          ),
        ),
      ),
  );

  const stream = await renderToStream(h(Document, {}, page));
  const chunks: Buffer[] = [];

  for await (const chunk of stream) {
    chunks.push(Buffer.from(chunk));
  }

  return Buffer.concat(chunks);
};

/** The publishable template. */
export const renderMcaTemplatePdf = (
  snapshot: McaTemplateSnapshot,
  instrument: ProducedInstrument,
  revision: number,
): Promise<Buffer> => renderTemplateDocument(snapshot, instrument, revision, PUBLISH_MODE);
