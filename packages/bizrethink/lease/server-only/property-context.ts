import { prisma } from '@documenso/prisma';

import type { LeaseDocument } from '../documents/derive-documents';

/**
 * The property-level facts a matter is rendered against, in one place.
 *
 * WHY THIS IS A FUNCTION AND NOT FOUR QUERIES. Utilities are read live from
 * the property rather than copied into the matter, and four separate call
 * sites had to remember to pass them: the landlord's preview, the reviewer's
 * PDF, the review page, and the router's own loader. One of them once forgot,
 * and a reviewer read a lease whose utility clause said "none" on both sides
 * while the landlord's preview read correctly — the exact divergence the
 * shared render mapping exists to prevent.
 *
 * Adding uploaded documents would have made it a fifth thing to remember at
 * four sites. So the shape is assembled here instead, and a caller who has a
 * property id cannot get half of it.
 */
export type PropertyContext = {
  propertyUtilities: unknown;
  propertyDocuments: LeaseDocument[];
};

export const loadPropertyContext = async (propertyId: string): Promise<PropertyContext> => {
  /*
    Two queries rather than a join, for the reason ADR 0002 gives: our models
    carry no Prisma @relation into upstream ones, and the convention is kept
    between our own so the rule reads the same everywhere.
  */
  const [property, documents] = await Promise.all([
    prisma.bizrethinkProperty.findUnique({
      where: { id: propertyId },
      select: { utilities: true },
    }),
    prisma.bizrethinkDocument.findMany({
      where: { propertyId, archivedAt: null },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      select: {
        id: true,
        kind: true,
        label: true,
        reference: true,
        documentDate: true,
        pageCount: true,
      },
    }),
  ]);

  return {
    propertyUtilities: property?.utilities ?? [],
    propertyDocuments: documents.map((document) => ({
      id: document.id,
      kind: document.kind as LeaseDocument['kind'],
      label: document.label,
      reference: document.reference ?? '',
      /*
        Rendered as a date, never a timestamp: the receipt prints "dated 2
        September 2021", and a Date carried through would print the container's
        midnight in whatever zone it runs in.
      */
      documentDate: document.documentDate ? document.documentDate.toISOString().slice(0, 10) : '',
      pageCount: document.pageCount,
    })),
  };
};
