import { attachmentContentDisposition } from '@bizrethink/customizations/lease/documents/content-disposition';
import { bundleEntryName, zipDocuments } from '@bizrethink/customizations/lease/documents/governing-bundle';
import { structureGoverningDocuments } from '@bizrethink/customizations/lease/documents/governing-structure';
import { findGoverningDocuments } from '@bizrethink/customizations/lease/server-only/governing-documents';
import { getFileServerSide } from '@documenso/lib/universal/upload/get-file.server';
import { prisma } from '@documenso/prisma';

import type { Route } from './+types/lease-attachment.$matterId.all';

/**
 * Every governing document of a lease, in one download.
 *
 * The same capability link, and the same recorded-instruments-only scope, as
 * `lease-attachment.$matterId.$documentId` — see `findGoverningDocuments` for
 * why holding the link is enough. Added because opening sixteen links one at a
 * time was the tenant's only way to receive what the receipt says they received.
 *
 * Built in memory: a lease's governing documents run to a few hundred pages,
 * about 12MB on the pilot. Stored, not recompressed.
 */
export async function loader({ params }: Route.LoaderArgs) {
  const found = params.matterId ? await findGoverningDocuments(params.matterId) : null;

  if (!found || found.documents.length === 0) {
    throw new Response('Not Found', { status: 404 });
  }

  const files = [];

  // The receipt's structure: a folder per issuing body, the receipt's numbers.
  for (const group of structureGoverningDocuments(found.documents, found.names)) {
    for (const { document, number } of group.entries) {
      const documentData = await prisma.documentData.findUnique({
        where: { id: found.documents.find((each) => each.id === document.id)?.documentDataId ?? '' },
        select: { type: true, data: true },
      });

      if (!documentData) {
        throw new Response('Not Found', { status: 404 });
      }

      files.push({
        name: bundleEntryName(group.heading, number, document.label),
        bytes: new Uint8Array(await getFileServerSide(documentData)),
      });
    }
  }

  return new Response(zipDocuments(files), {
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': attachmentContentDisposition('Association governing documents.zip'),
      'Cache-Control': 'no-store, private',
      'X-Robots-Tag': 'noindex, nofollow',
    },
  });
}
