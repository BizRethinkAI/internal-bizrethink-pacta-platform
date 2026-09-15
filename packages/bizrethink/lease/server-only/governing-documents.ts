import { prisma } from '@documenso/prisma';

import type { GoverningIssuer, LeaseDocument } from '../documents/derive-documents';
import type { GoverningNames } from '../documents/governing-structure';

/**
 * The governing documents a lease's signers may open by holding its link, and
 * the names their receipt headings use.
 *
 * RECORDED INSTRUMENTS ONLY. A capability URL is acceptable here because every
 * `hoa-governing` document is a public record — a declaration, its amendments,
 * the association's guidelines — already obtainable from the county recorder.
 * A move-in report is photographs of the inside of somebody's home and is never
 * served this way. Scoped to the lease's property and the lease itself in the
 * query, so another lease's document is indistinguishable from a missing one.
 *
 * One lookup for the envelope's attachment list and the download-all zip, so
 * both order, number and name documents exactly as the receipt does.
 */
export const findGoverningDocuments = async (matterId: string) => {
  const matter = await prisma.bizrethinkLeaseMatter.findUnique({
    where: { id: matterId },
    select: { id: true, propertyId: true, values: true, facts: true },
  });

  if (!matter) {
    return null;
  }

  const rows = await prisma.bizrethinkDocument.findMany({
    where: {
      kind: 'hoa-governing',
      archivedAt: null,
      OR: [{ propertyId: matter.propertyId }, { matterId: matter.id }],
    },
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    select: {
      id: true,
      label: true,
      reference: true,
      documentDate: true,
      pageCount: true,
      issuer: true,
      description: true,
      amendsDocumentId: true,
      documentDataId: true,
    },
  });

  const documents: (LeaseDocument & { documentDataId: string })[] = rows.map((row) => ({
    id: row.id,
    kind: 'hoa-governing',
    label: row.label,
    reference: row.reference ?? '',
    documentDate: row.documentDate ? row.documentDate.toISOString().slice(0, 10) : '',
    pageCount: row.pageCount,
    issuer: (row.issuer as GoverningIssuer | null) ?? null,
    description: row.description,
    amendsDocumentId: row.amendsDocumentId,
    documentDataId: row.documentDataId,
  }));

  const values = (matter.values ?? {}) as Record<string, unknown>;
  const facts = (matter.facts ?? {}) as Record<string, unknown>;

  const names: GoverningNames = {
    association: typeof values.hoaName === 'string' ? values.hoaName : undefined,
    cdd: facts.hasCdd && typeof values.cddName === 'string' ? values.cddName : undefined,
  };

  return { matter, documents, names };
};
