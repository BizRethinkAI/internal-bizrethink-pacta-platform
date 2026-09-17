import type { ClauseField } from '../../clauses/types';
import type { McaTemplateSnapshot } from '../../templates/compile';
import type { ProducedInstrument } from '../recipient-contract';
import { renderTemplateDocument, type TemplateRenderMode } from './template-pdf';

/**
 * A preview is the template, rendered with specimen values. ADR 0025.
 *
 * The vertical builds templates and a deal never enters it, so there is nothing
 * real to fill a preview with — and nothing real should. What a reviewer needs
 * is to see the document's shape before it is published: where the figures sit,
 * whether a long address wraps, whether a clause and its fields stay together.
 * Specimen values give that without a merchant's details ever arriving here.
 *
 * REALISTIC SHAPE, UNMISTAKABLE CONTENT. A figure has to be the length of a
 * figure or the layout lies. The party names say `Specimen` so that nobody
 * reading a preview is ever in doubt about whether it is somebody's deal.
 */

const SPECIMEN_TEXT: Record<string, string> = {
  'merchant.legalName': 'Specimen Merchant Holdings LLC',
  'merchant.dba': 'Specimen Coffee House',
  'merchant.entityType': 'Limited Liability Company',
  'merchant.formationState': 'Delaware',
  'merchant.principalState': 'Virginia',
  'merchant.contactName': 'A. Specimen',
  'merchant.phone': '(555) 010-0100',
  'merchant.email': 'specimen@example.com',
  'merchant.businessAddress': '100 Example Street, Suite 4, Dover, DE 19901',
  'merchant.noticeAddress': 'PO Box 100, Dover, DE 19901',
  'merchant.documentTaxIdentifier': '00-0000000',
  'guarantor.legalName': 'B. Specimen',
  'guarantor.noticeAddress': '12 Example Lane, Dover, DE 19901',
  'guarantor.phone': '(555) 010-0200',
  'guarantor.email': 'guarantor.specimen@example.com',
  'guarantor.signerCapacity': 'Managing Member',
  'account.bankName': 'Example National Bank',
  'account.documentIdentifier': '••••6789',
  'account.routingNumber': '000000000',
  'funding.factorRate': '1.35',
  'funding.specifiedPercentage': '12%',
  'funding.collectionFrequency': 'Each banking day',
  'funding.originationFeePercentage': '3%',
  'equipment.description': 'Example Terminal, Model X2',
  'equipment.quantity': '2',
  'equipment.termMonths': '48',
  'equipment.location': '100 Example Street, Suite 4, Dover, DE 19901',
};

/**
 * What stands in for a real value.
 *
 * Deterministic: the same binding gets the same specimen every time, so two
 * previews of one template are comparable and a diff between them means
 * something.
 */
export const specimenFor = (field: Pick<ClauseField, 'binding' | 'kind' | 'label'>): string => {
  const known = SPECIMEN_TEXT[field.binding];

  if (known) {
    return known;
  }

  if (field.kind === 'currency') {
    return '$12,345.67';
  }

  if (field.kind === 'date') {
    return '2026-01-31';
  }

  // Everything else takes its own label, prefixed so it cannot be read as an
  // answer. A specimen that looked like a real answer would be worse than an
  // obviously empty one, because a reviewer would try to check it.
  return `Specimen — ${field.label.replace(/^[^—]*—\s*/, '')}`;
};

/**
 * A PREVIEW MUST NOT BE PUBLISHABLE, and this is where that is enforced.
 *
 * No marker, so `injectMcaWidgets` has nothing to place. No `{{SIGNATURE, rN}}`,
 * so Documenso's extraction at upload makes no signer field. Upload one by
 * mistake and it is inert — a document that goes nowhere, rather than one that
 * looks like it works and collects nothing.
 */
const PREVIEW_MODE: TemplateRenderMode = {
  slotFor: (_widget, field) => specimenFor(field),
  unplaced: (field) => specimenFor(field),
  signature: () => ({
    signature: '____________________________',
    date: 'Date: ____________________',
  }),
  banner: 'PREVIEW — SPECIMEN VALUES, NOT FOR SIGNING OR MERCHANT DELIVERY',
};

export const renderMcaTemplatePreviewPdf = (
  snapshot: McaTemplateSnapshot,
  instrument: ProducedInstrument,
  revision: number,
): Promise<Buffer> => renderTemplateDocument(snapshot, instrument, revision, PREVIEW_MODE);
