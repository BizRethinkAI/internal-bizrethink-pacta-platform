import { renderLease } from '@bizrethink/customizations/lease/render/render-lease';
import { renderInputForMatter } from '@bizrethink/customizations/lease/server-only/matter-answers';
import { canAccessLeaseBuilder } from '@bizrethink/customizations/server-only/feature-access';
import { getSession } from '@documenso/auth/server/lib/utils/get-session';
import { getTeamByUrl } from '@documenso/lib/server-only/team/get-team';
import { prisma } from '@documenso/prisma';

import type { Route } from './+types/leases.$id.preview';

/**
 * Streams the lease this matter produces, as a PDF.
 *
 * Resource route — no component. It runs the real engine on the real answers,
 * so what you read is what a signer would receive, minus the signing fields:
 * the {{SIGNATURE, r1, …}} tokens are still visible because upstream's
 * auto-placer converts and whites them out at envelope creation, which this
 * route deliberately does not do.
 *
 * Only the lease body is returned. The addenda and the flood disclosure are
 * separate documents with their own PDFs, and merging them into one tidy
 * preview would misrepresent how they are actually issued — for the flood
 * disclosure that separateness is what Fla. Stat. §83.512 requires.
 */
export async function loader({ request, params }: Route.LoaderArgs) {
  const { teamUrl, id } = params;

  if (!teamUrl || !id) {
    throw new Response('Not Found', { status: 404 });
  }

  const { user } = await getSession(request);
  const team = await getTeamByUrl({ userId: user.id, teamUrl });

  if (!(await canAccessLeaseBuilder({ organisationId: team.organisationId, userId: user.id }))) {
    throw new Response('Not Found', { status: 404 });
  }

  const matter = await prisma.bizrethinkLeaseMatter.findFirst({
    where: { id, organisationId: team.organisationId },
  });

  if (!matter) {
    throw new Response('Not Found', { status: 404 });
  }

  /*
    Hydrated through the shared mapping rather than unpacked here. This route
    used to do its own, and drifted: it built signers from
    `values.landlordNames`, which became DERIVED when the party list landed, so
    every preview said "LANDLORD — TO BE CONFIRMED" whoever was signing.
  */
  const { rendered } = await renderLease(renderInputForMatter(matter));

  const lease = rendered.find((doc) => doc.key === 'lease');

  if (!lease) {
    throw new Response('Lease document was not produced', { status: 500 });
  }

  return new Response(new Uint8Array(lease.pdf), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'inline; filename="lease-preview.pdf"',
      // A draft preview must never be cached and mistaken for the executed
      // document.
      'Cache-Control': 'no-store',
    },
  });
}
