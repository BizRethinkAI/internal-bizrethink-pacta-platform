import { isReviewUsable } from '@bizrethink/customizations/lease/review/disposition';
import type { ReviewAudience, ReviewStatus } from '@bizrethink/customizations/lease/review/types';
import { getFileServerSide } from '@documenso/lib/universal/upload/get-file.server';
import { prisma } from '@documenso/prisma';

import type { Route } from './+types/lease-review.$token.attachment.$documentId';

/**
 * One attached document, as the reviewer or signer sees it. Authorised by token.
 *
 * The lease binds the tenant to the association's governing documents, and the
 * receipt addendum states they received them. This is what makes that true
 * rather than merely asserted — without it the receipt would be a signature on
 * a list of documents nobody could open.
 *
 * The document must belong to THIS review's lease or to its property. A token
 * is otherwise a key to every document in the organisation, and the id is a
 * short opaque string that a determined guesser has no reason to be given.
 */
export async function loader({ params }: Route.LoaderArgs) {
  const { token, documentId } = params;

  if (!token || !documentId) {
    throw new Response('Not Found', { status: 404 });
  }

  const review = await prisma.bizrethinkLeaseReview.findUnique({ where: { token } });

  // One 404 for absent, expired and already-returned, as everywhere else on
  // this route group: a reviewer cannot act on the difference, and
  // distinguishing them confirms a guessed token once existed.
  if (
    !review ||
    !isReviewUsable(
      {
        id: review.id,
        matterId: review.matterId,
        audience: review.audience as ReviewAudience,
        status: review.status as ReviewStatus,
        expiresAt: review.expiresAt,
        answersHash: review.answersHash,
      },
      new Date(),
    )
  ) {
    throw new Response('Not Found', { status: 404 });
  }

  const matter = await prisma.bizrethinkLeaseMatter.findUnique({
    where: { id: review.matterId },
    select: { id: true, propertyId: true },
  });

  if (!matter) {
    throw new Response('Not Found', { status: 404 });
  }

  const document = await prisma.bizrethinkDocument.findFirst({
    where: {
      id: documentId,
      archivedAt: null,
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
      // Inline: a reviewer reading a declaration alongside the lease should not
      // have to find it in a downloads folder to answer the question in front
      // of them.
      'Content-Disposition': `inline; filename="${document.label.replace(/["\\]/g, '')}.pdf"`,
      'Cache-Control': 'no-store, private',
      'X-Robots-Tag': 'noindex, nofollow',
    },
  });
}
