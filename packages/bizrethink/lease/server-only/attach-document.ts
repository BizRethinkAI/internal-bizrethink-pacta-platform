import { putFileServerSide } from '@documenso/lib/universal/upload/put-file.server';
import { prisma } from '@documenso/prisma';

import type { DocumentKind } from '../documents/derive-documents';
import { assertDocumentPlacement } from '../documents/placement';

/**
 * Store an uploaded document and hang it off a property or a lease.
 *
 * Authorisation is by ORGANISATION MEMBERSHIP resolved in the query, not
 * checked afterwards — the same shape `loadMatter` uses, and for the same
 * reason: fetching by id and checking after answers two questions with two
 * different errors and turns the endpoint into an existence oracle.
 */
export type AttachDocumentInput = {
  userId: number;
  propertyId?: string;
  matterId?: string;
  kind: string;
  label: string;
  reference?: string;
  /** ISO date on the face of the document, which is rarely the upload date. */
  documentDate?: string;
  file: File;
  /**
   * Pages, established by the caller.
   *
   * Not counted here: the exact fallback needs a real PDF parser, and that
   * dependency belongs to the route rather than to this package. Null is a
   * legitimate answer — the receipt then omits the extent rather than
   * asserting one nobody verified.
   */
  pageCount?: number | null;
};

const KINDS: DocumentKind[] = ['hoa-governing', 'move-in-report', 'move-out-report'];

const isKind = (value: string): value is DocumentKind => (KINDS as string[]).includes(value);

export const attachLeaseDocument = async (input: AttachDocumentInput) => {
  if (!isKind(input.kind)) {
    throw new Error(`"${input.kind}" is not a kind of document this system stores.`);
  }

  assertDocumentPlacement(input.kind, {
    propertyId: input.propertyId,
    matterId: input.matterId,
  });

  const memberships = await prisma.organisation.findMany({
    where: { members: { some: { userId: input.userId } } },
    select: { id: true },
  });

  const organisationIds = memberships.map((organisation) => organisation.id);

  /*
    The owning row is resolved inside the membership scope, so a property in
    someone else's organisation is indistinguishable from one that does not
    exist. Both arrive here as "not found".
  */
  const owner = input.propertyId
    ? await prisma.bizrethinkProperty.findFirst({
        where: { id: input.propertyId, organisationId: { in: organisationIds } },
        select: { organisationId: true },
      })
    : await prisma.bizrethinkLeaseMatter.findFirst({
        where: { id: input.matterId, organisationId: { in: organisationIds } },
        select: { organisationId: true },
      });

  if (!owner) {
    throw new Error('That property or lease could not be found.');
  }

  /*
    `file.size`, not a re-read of the buffer. Counting the pages already reads
    these bytes once and putFileServerSide reads them again; pulling a third
    copy of a 54 MB scan into memory to learn a number the File already carries
    is the kind of waste that only shows up on the largest upload.
  */
  const stored = await putFileServerSide(input.file);

  const documentData = await prisma.documentData.create({
    data: {
      type: stored.type,
      data: stored.data,
      initialData: stored.data,
    },
  });

  /*
    Appended, not inserted. Recording order is not upload order — an amendment
    is often to hand before the declaration it amends — so the list is
    reorderable afterwards rather than guessed at here.
  */
  const last = await prisma.bizrethinkDocument.findFirst({
    where: input.propertyId ? { propertyId: input.propertyId } : { matterId: input.matterId },
    orderBy: { sortOrder: 'desc' },
    select: { sortOrder: true },
  });

  return await prisma.bizrethinkDocument.create({
    data: {
      id: `bdoc_${crypto.randomUUID().replace(/-/g, '').slice(0, 20)}`,
      propertyId: input.propertyId ?? null,
      matterId: input.matterId ?? null,
      kind: input.kind,
      label: input.label,
      reference: input.reference ?? null,
      documentDate: input.documentDate ? new Date(`${input.documentDate}T00:00:00Z`) : null,
      documentDataId: documentData.id,
      contentType: input.file.type || 'application/pdf',
      sizeBytes: input.file.size,
      pageCount: input.pageCount ?? null,
      sortOrder: (last?.sortOrder ?? -1) + 1,
      organisationId: owner.organisationId,
      uploadedByUserId: input.userId,
    },
    select: {
      id: true,
      kind: true,
      label: true,
      reference: true,
      documentDate: true,
      pageCount: true,
      sizeBytes: true,
      sortOrder: true,
    },
  });
};
