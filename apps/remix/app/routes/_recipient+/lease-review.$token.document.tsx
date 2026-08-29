import { renderLease } from '@bizrethink/customizations/lease/render/render-lease';
import { isReviewUsable } from '@bizrethink/customizations/lease/review/disposition';
import type { ReviewAudience, ReviewStatus } from '@bizrethink/customizations/lease/review/types';
import { renderInputForMatter } from '@bizrethink/customizations/lease/server-only/matter-answers';
import { prisma } from '@documenso/prisma';

import type { Route } from './+types/lease-review.$token.document';

/**
 * The lease, as the reviewer sees it. Authorised by token alone.
 *
 * Named `.document` rather than `.pdf`: a route file ending in `.pdf.tsx`
 * makes TypeScript resolve its generated `+types/...pdf` import against the
 * ambient `*.pdf` asset module declaration instead of the route's own types.
 *
 * Rendered from the same `renderInputForMatter` mapping the landlord's own
 * preview uses. A reviewer reading a different document from the one the
 * landlord previewed would defeat the entire point of a review, and two
 * separate mappings is exactly how that happens — it already did once.
 *
 * The whole lease, not a redacted view. Both audiences see everything: a
 * tenant will be a signer, and a redacted review is theatre.
 */
export async function loader({ params }: Route.LoaderArgs) {
  const { token } = params;

  if (!token) {
    throw new Response('Not Found', { status: 404 });
  }

  const review = await prisma.bizrethinkLeaseReview.findUnique({ where: { token } });

  /*
    One 404 for absent, expired and already-returned. A reviewer cannot act on
    the difference, and distinguishing them would confirm to anyone holding a
    guessed token that it once existed.
  */
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

  const matter = await prisma.bizrethinkLeaseMatter.findUnique({ where: { id: review.matterId } });

  if (!matter) {
    throw new Response('Not Found', { status: 404 });
  }

  const { rendered } = await renderLease(renderInputForMatter(matter));
  const lease = rendered.find((doc) => doc.key === 'lease');

  if (!lease) {
    throw new Response('Lease document was not produced', { status: 500 });
  }

  return new Response(new Uint8Array(lease.pdf), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'inline; filename="lease-for-review.pdf"',
      // Never cached: a draft under review changes, and a stale copy in a
      // shared browser is a reviewer commenting on the wrong document.
      'Cache-Control': 'no-store, private',
      // Belt and braces alongside the route group's meta.
      'X-Robots-Tag': 'noindex, nofollow',
    },
  });
}
