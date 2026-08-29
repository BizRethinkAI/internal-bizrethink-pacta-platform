import {
  PICANA_FACTS,
  PICANA_MONEY,
  PICANA_PARTIES,
  PICANA_VALUES,
} from '@bizrethink/customizations/lease/matters/picana-ln';
import { renderLease } from '@bizrethink/customizations/lease/render/render-lease';
import { canAccessLeaseBuilder } from '@bizrethink/customizations/server-only/feature-access';
import { getSession } from '@documenso/auth/server/lib/utils/get-session';
import { getTeamByUrl } from '@documenso/lib/server-only/team/get-team';

import type { Route } from './+types/leases.preview';

/**
 * Streams the generated lease as a PDF.
 *
 * Resource route — no component, no UI. It renders the real document from the
 * real engine, so what you read here is exactly what a signer would receive,
 * minus the signing fields: the `{{SIGNATURE, r1, ...}}` tokens are still
 * visible because upstream's auto-placer converts and whites them out at
 * envelope creation, which this route deliberately does not do.
 *
 * Only the lease body is returned. The addenda and the flood disclosure are
 * separate documents with their own PDFs — merging them here to make a tidier
 * preview would misrepresent how they are actually issued.
 */
export async function loader({ request, params }: Route.LoaderArgs) {
  const { teamUrl } = params;

  if (!teamUrl) {
    throw new Response('Not Found', { status: 404 });
  }

  const { user } = await getSession(request);

  const team = await getTeamByUrl({ userId: user.id, teamUrl });

  const allowed = await canAccessLeaseBuilder({
    organisationId: team.organisationId,
    userId: user.id,
  });

  if (!allowed) {
    throw new Response('Not Found', { status: 404 });
  }

  const { rendered } = await renderLease({
    facts: PICANA_FACTS,
    money: PICANA_MONEY,
    values: PICANA_VALUES,
    parties: PICANA_PARTIES,
    propertyAddress: '29090 Picana Lane, Wesley Chapel, Florida 33543',
  });

  const lease = rendered.find((doc) => doc.key === 'lease');

  if (!lease) {
    throw new Response('Lease document was not produced', { status: 500 });
  }

  return new Response(new Uint8Array(lease.pdf), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'inline; filename="lease-preview.pdf"',
      // A preview of a draft must never be cached and mistaken for the
      // executed document.
      'Cache-Control': 'no-store',
    },
  });
}
