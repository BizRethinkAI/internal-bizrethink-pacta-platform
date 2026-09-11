import { getFileServerSide } from '@documenso/lib/universal/upload/get-file.server';
import { prisma } from '@documenso/prisma';

import type { Route } from './+types/lease-attachment.$matterId.$documentId';

/**
 * One governing document, as a SIGNER sees it.
 *
 * The receipt addendum has the tenant acknowledge having received each of the
 * association's governing documents "and has had the opportunity to read them".
 * Until this route existed that was true of a reviewer and false of a signer:
 * `lease-review.$token.attachment.$documentId` is scoped to a REVIEW token, and
 * the signing view had no attachment route at all. A signer acknowledged
 * receipt of sixteen instruments with no way to open one.
 *
 * KEYED ON THE MATTER, NOT THE ENVELOPE OR A RECIPIENT TOKEN, and both halves
 * of that are forced:
 *
 *   - `EnvelopeAttachment` belongs to an ENVELOPE and carries one `data` string
 *     shared by every recipient, so a per-signer token cannot go in the URL.
 *   - `createEnvelope` creates the envelope and its attachments in the same
 *     call, so at the moment the link is built there is no envelope id to put
 *     in it. The matter id exists first and is stable across a re-send.
 *
 * So this is a capability URL: holding it is the authorisation. That is
 * acceptable for what it serves and only for that — see the `kind` filter.
 */
export async function loader({ params }: Route.LoaderArgs) {
  const { matterId, documentId } = params;

  if (!matterId || !documentId) {
    throw new Response('Not Found', { status: 404 });
  }

  const matter = await prisma.bizrethinkLeaseMatter.findUnique({
    where: { id: matterId },
    select: { id: true, propertyId: true },
  });

  if (!matter) {
    throw new Response('Not Found', { status: 404 });
  }

  const document = await prisma.bizrethinkDocument.findFirst({
    where: {
      id: documentId,
      archivedAt: null,
      /*
        RECORDED INSTRUMENTS ONLY, and this is the line that makes a capability
        URL safe here. Every `hoa-governing` document is a public record — a
        declaration, its amendments, the association's guidelines, a district
        resolution — already obtainable from the county recorder by anyone who
        asks.

        A `move-in-report` is not. It is photographs of the inside of somebody's
        home, and it must never be reachable by holding a link. It stays on the
        review route, which is token-scoped and expires.
      */
      kind: 'hoa-governing',
      // Scoped in the query rather than checked after, so a document belonging
      // to another lease is indistinguishable from one that does not exist.
      OR: [{ propertyId: matter.propertyId }, { matterId: matter.id }],
    },
    select: { label: true, contentType: true, documentDataId: true },
  });

  if (!document) {
    throw new Response('Not Found', { status: 404 });
  }

  const documentData = await prisma.documentData.findUnique({
    where: { id: document.documentDataId },
    select: { type: true, data: true },
  });

  if (!documentData) {
    throw new Response('Not Found', { status: 404 });
  }

  const bytes = await getFileServerSide(documentData);

  return new Response(new Uint8Array(bytes), {
    headers: {
      'Content-Type': document.contentType,
      // Inline: a signer reading a declaration beside the lease should not have
      // to find it in a downloads folder to answer the question in front of them.
      'Content-Disposition': `inline; filename="${document.label.replace(/["\\]/g, '')}.pdf"`,
      'Cache-Control': 'no-store, private',
      'X-Robots-Tag': 'noindex, nofollow',
    },
  });
}
