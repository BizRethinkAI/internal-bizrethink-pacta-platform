import { deriveFacts } from '@bizrethink/customizations/lease/interview/derive-facts';
import { renderLease } from '@bizrethink/customizations/lease/render/render-lease';
import type { LeaseParty } from '@bizrethink/customizations/lease/render/signature-blocks';
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

  const money = matter.money as Parameters<typeof deriveFacts>[0];
  const values = matter.values as Record<string, string | number | boolean | null>;
  const facts = matter.facts as Record<string, unknown>;

  /*
    Derived facts are recomputed here rather than read from the row. A stored
    derived value is one that can go stale — edit the rent and a persisted
    advance-rent top-up would state a figure that no longer follows from its own
    inputs, which is the defect this whole feature exists to prevent.
  */
  const endDate = String(values.endDate ?? money.term.startDate);

  const parties: LeaseParty[] = [
    { name: String(values.landlordNames ?? 'LANDLORD — TO BE CONFIRMED'), role: 'landlord' },
    { name: String(values.tenantNames ?? 'TENANT — TO BE CONFIRMED'), role: 'tenant' },
  ];

  const { rendered } = await renderLease({
    facts: { ...facts, ...deriveFacts(money, endDate) } as never,
    money,
    values: { ...values, rentDueDay: money.rent.dueDayOfMonth, monthlyRentUsd: money.rent.monthlyUsd },
    parties,
    propertyAddress: String(values.propertyAddress ?? ''),
    customClauses: matter.customClauses as never,
  });

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
