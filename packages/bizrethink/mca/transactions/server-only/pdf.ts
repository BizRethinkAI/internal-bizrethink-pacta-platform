import { Document, Font, Page, renderToStream, StyleSheet, Text, View } from '@react-pdf/renderer';
import type { Style } from '@react-pdf/types';
import { createElement as h } from 'react';
import { SANS_REGULAR, SANS_SEMIBOLD, TINOS_REGULAR } from '../../../lease/render/fonts/font-data';
import { groupMcaSections } from '../../engine/section-headings';
import { fieldBlocks, fieldRows } from '../../render/field-layout';
import type { McaTemplateItem } from '../../templates/compile';
import type { McaFilledDraft } from '../fill';

Font.register({ family: 'McaBody', src: TINOS_REGULAR });
Font.register({ family: 'McaSans', src: SANS_REGULAR });
Font.register({ family: 'McaSansBold', src: SANS_SEMIBOLD });
const styles = StyleSheet.create({
  page: {
    fontFamily: 'McaBody',
    fontSize: 10.5,
    paddingTop: 63,
    paddingBottom: 62,
    // 72pt margins over a 468pt measure, which is how the real documents are
    // set. The previous 48pt padding gave a 516pt measure that read as a report.
    paddingHorizontal: 72,
    color: '#17202b',
  },
  header: {
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
  // The cover. Display title, the funder's own identity, and nothing else.
  coverTitle: { fontFamily: 'McaSansBold', fontSize: 27, lineHeight: 1.15, marginTop: 150 },
  coverSubtitle: { fontFamily: 'McaSans', fontSize: 12, color: '#475467', marginTop: 10 },
  coverRule: { borderBottomWidth: 1, borderBottomColor: '#935d17', width: 96, marginTop: 22, marginBottom: 34 },
  coverEyebrow: { fontFamily: 'McaSansBold', fontSize: 7.5, letterSpacing: 2, color: '#935d17', marginTop: 16 },
  coverValue: { fontFamily: 'McaSans', fontSize: 10.5, color: '#17202b', marginTop: 3 },
  coverFoot: {
    position: 'absolute',
    bottom: 62,
    left: 72,
    right: 72,
    fontFamily: 'McaSans',
    fontSize: 8.5,
    color: '#667085',
  },
  title: { fontFamily: 'McaSansBold', fontSize: 19, lineHeight: 1.2, marginBottom: 10 },
  subtitle: { fontFamily: 'McaSans', fontSize: 10, marginBottom: 15 },
  sectionHeading: { fontFamily: 'McaSansBold', fontSize: 14, lineHeight: 1.2, marginTop: 18, marginBottom: 8 },
  heading: { fontFamily: 'McaSansBold', fontSize: 11, marginBottom: 5, marginTop: 13 },
  paragraph: { fontSize: 10.5, marginBottom: 6, lineHeight: 1.45, textAlign: 'justify' },
  field: { borderBottomWidth: 0.4, borderBottomColor: '#d5d9df', paddingVertical: 5 },
  // Two fields to a row, as the real documents print them. The cell keeps its
  // own rule so a short answer gets a short rule, not the width of the page.
  fieldRow: { flexDirection: 'row' },
  fieldCell: { flexBasis: '50%', flexGrow: 0, flexShrink: 1, paddingRight: 14 },
  fieldCellLast: { flexBasis: '50%', flexGrow: 0, flexShrink: 1 },
  fieldCellFull: { flexBasis: '100%', flexGrow: 0, flexShrink: 1 },
  // An itemization: label left, figure right, every figure on one edge.
  moneyRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingVertical: 4.5,
    borderBottomWidth: 0.4,
    borderBottomColor: '#d5d9df',
  },
  moneyLabel: { flexGrow: 1, flexShrink: 1, fontFamily: 'McaSans', fontSize: 9, color: '#344054' },
  moneyValue: { flexBasis: 120, flexGrow: 0, flexShrink: 0, fontFamily: 'McaSans', fontSize: 10, textAlign: 'right' },
  label: { fontFamily: 'McaSans', fontSize: 8.5, color: '#667085' },
  value: { fontFamily: 'McaSans', fontSize: 10 },
  warning: { fontFamily: 'McaSans', fontSize: 9, color: '#935d17', marginBottom: 9 },
  signature: { marginTop: 14, padding: 12, borderWidth: 0.5, borderColor: '#abb3bd' },
  signatureLine: { marginTop: 20, fontFamily: 'McaSans', fontSize: 10 },
});
const text = (value: string, style: Style | Style[] = styles.paragraph) => h(Text, { style }, value);

/** Review output only. No AcroForms, signing tokens, delivery artifacts or regulator-form imitations. */
export const renderMcaDraftPdf = async (draft: McaFilledDraft, revision: number): Promise<Buffer> => {
  const provider = draft.provider;
  const partyFoot = [provider.legalName, provider.address].filter(Boolean).join('  •  ');
  const chrome = (document: { id: string }) => [
    h(
      Text,
      { key: 'head', style: styles.header, fixed: true },
      'INTERNAL DRAFT — NOT FOR SIGNING OR MERCHANT DELIVERY',
    ),
    h(
      Text,
      { key: 'party', style: styles.footerParty, fixed: true },
      [partyFoot, provider.website].filter(Boolean).join('   '),
    ),
    h(Text, {
      key: 'foot',
      style: styles.footer,
      fixed: true,
      render: ({ pageNumber, totalPages }: { pageNumber: number; totalPages: number }) =>
        `PACTA MCA · Template revision ${revision} · ${document.id} · ${pageNumber} / ${totalPages}`,
    }),
  ];
  const covers = draft.documents.map((document) =>
    h(
      Page,
      { key: `${document.id}:cover`, size: 'LETTER', style: styles.page },
      ...chrome(document),
      text(document.title, styles.coverTitle),
      text('Prepared for review. Not executed.', styles.coverSubtitle),
      h(View, { style: styles.coverRule }),
      text('P R E P A R E D   B Y', styles.coverEyebrow),
      text(provider.legalName, styles.coverValue),
      text('D O C U M E N T   T Y P E', styles.coverEyebrow),
      text(document.title, styles.coverValue),
      text('T R A N S A C T I O N', styles.coverEyebrow),
      text(draft.reference || '[to complete]', styles.coverValue),
      text('C O N F I D E N T I A L I T Y', styles.coverEyebrow),
      text('Private & Confidential', styles.coverValue),
      h(
        Text,
        { style: styles.coverFoot },
        'This document contains confidential and proprietary information and is an internal draft.',
      ),
    ),
  );
  const pages = draft.documents.map((document) =>
    h(
      Page,
      { key: document.id, size: 'LETTER', style: styles.page },
      ...chrome(document),
      text(document.title, styles.title),
      text(
        `Transaction reference: ${draft.reference || '[to complete]'}  |  Provider template revision: ${revision}`,
        styles.subtitle,
      ),
      text(
        'This review copy is not a complete delivery package. Required disclosures, processor forms, clearance and separate signatures remain outstanding.',
        styles.warning,
      ),
      ...groupMcaSections(document.items).flatMap((section, index) => [
        h(Text, { key: `section:${index}`, style: styles.sectionHeading, minPresenceAhead: 90 }, section.heading),
        ...section.items.flatMap(itemElements),
      ]),
      h(Text, { style: styles.heading, minPresenceAhead: 100 }, 'Separate execution locations — unsigned'),
      ...document.signatures.map((signature, index) =>
        h(
          View,
          { key: `${signature.role}:${index}`, style: styles.signature, wrap: false },
          text(`${signature.role}: ${signature.partyName || '[party to identify]'}`, styles.heading),
          text(`Printed signer: ${signature.signerName || '[to complete]'}`, styles.value),
          text(`Capacity: ${signature.capacity || '[to complete]'}`, styles.value),
          text(`Email: ${signature.email || '[to complete before electronic signing]'}`, styles.value),
          text('Signature: ______________________________     Date: ______________', styles.signatureLine),
          text('Internal draft — no signature is collected or applied in this copy.', styles.label),
        ),
      ),
    ),
  );
  // Each document opens on its own cover, as the real agreements do; the
  // worksheet keeps its own chrome and needs none.
  const body = draft.documents.flatMap((document, index) => [covers[index], pages[index]]);
  body.push(
    h(
      Page,
      { key: 'requirements', size: 'LETTER', style: styles.page },
      h(Text, { style: styles.header, fixed: true }, 'INTERNAL WORKSHEET — NOT A STATUTORY DISCLOSURE'),
      h(Text, {
        style: styles.footer,
        fixed: true,
        render: ({ pageNumber, totalPages }: { pageNumber: number; totalPages: number }) =>
          `PACTA MCA · Template revision ${revision} · Review worksheet · ${pageNumber} / ${totalPages}`,
      }),
      text('Outstanding package requirements', styles.title),
      text(
        'This worksheet identifies work remaining. It is not a prescribed form, a compliance determination, processor acceptance or permission to obtain a report.',
        styles.warning,
      ),
      ...draft.blockers.map((blocker) =>
        h(Text, { key: blocker.kind, style: styles.paragraph }, `• ${blocker.detail}`),
      ),
      text('Disclosure and agreement sources to assess', styles.heading),
      ...draft.requirements.map((requirement) =>
        h(
          Text,
          { key: requirement.slug, style: styles.paragraph },
          `${requirement.jurisdiction}: ${requirement.citation}`,
        ),
      ),
      text('Processor-controlled document', styles.heading),
      ...draft.externalDocuments.map((entry) =>
        h(
          Text,
          { key: entry.instrument, style: styles.paragraph },
          `${entry.processor}: ${entry.form.title}, version ${entry.form.version}. Reference: ${entry.form.reference}. Actual transaction acceptance is outstanding.`,
        ),
      ),
      text('Inputs still to complete', styles.heading),
      ...(draft.missing.length
        ? draft.missing.map((entry, index) =>
            h(Text, { key: index, style: styles.paragraph }, `${entry.document}: ${entry.label}`),
          )
        : [text('No required draft input is blank. The independent package requirements above still apply.')]),
    ),
  );
  const stream = await renderToStream(
    h(
      Document,
      {
        title: `MCA internal draft — revision ${revision}`,
        author: 'Pacta',
        subject: `Provider template fingerprint ${draft.templateFingerprint}; internal review only`,
      },
      ...body,
    ),
  );
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
};

/** A heading and its first paragraph share one wrappable Text node. Orphan
 * protection then keeps real body lines with the title without binding a whole
 * long clause into a box taller than the page. Field labels stay with values. */
const itemElements = (item: McaTemplateItem) => {
  const heading = `${item.number ? `${item.number}  ` : ''}${item.heading}`;
  const paragraphs = item.body.split('\n').filter(Boolean);
  const printable = item.fields.filter((field) => field.kind !== 'signature' && !field.binding.endsWith('.signedDate'));
  const answer = (field: (typeof printable)[number]) =>
    field.value || (field.required ? '[to complete]' : '[not designated]');
  const fields = fieldBlocks(printable).flatMap((block, blockIndex) =>
    block.kind === 'money'
      ? block.fields.map((field) =>
          h(
            View,
            { key: `${item.slug}:${field.widget}`, style: styles.moneyRow, wrap: false },
            text(field.label, styles.moneyLabel),
            text(answer(field), styles.moneyValue),
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
                  key: `${item.slug}:${field.widget}`,
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
                text(answer(field), styles.value),
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
