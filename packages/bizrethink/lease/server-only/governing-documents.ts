import { prisma } from '@documenso/prisma';

/**
 * The governing documents a lease's signers may open by holding its link.
 *
 * RECORDED INSTRUMENTS ONLY. A capability URL is acceptable here because every
 * `hoa-governing` document is a public record — a declaration, its amendments,
 * the association's guidelines — already obtainable from the county recorder.
 * A move-in report is photographs of the inside of somebody's home and is never
 * served this way. Scoped to the lease's property and the lease itself in the
 * query, so another lease's document is indistinguishable from a missing one.
 *
 * Ordered as the receipt and the envelope's attachment list order them, so file
 * 12 of the download-all zip is item 12 on the page.
 */
export const findGoverningDocuments = async (matterId: string) => {
  const matter = await prisma.bizrethinkLeaseMatter.findUnique({
    where: { id: matterId },
    select: { id: true, propertyId: true },
  });

  if (!matter) {
    return null;
  }

  const documents = await prisma.bizrethinkDocument.findMany({
    where: {
      kind: 'hoa-governing',
      archivedAt: null,
      OR: [{ propertyId: matter.propertyId }, { matterId: matter.id }],
    },
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    select: { id: true, label: true, documentDataId: true },
  });

  return { matter, documents };
};
