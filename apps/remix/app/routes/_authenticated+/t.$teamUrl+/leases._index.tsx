import {
  PICANA_FACTS,
  PICANA_MONEY,
  PICANA_PARTIES,
  PICANA_VALUES,
} from '@bizrethink/customizations/lease/matters/picana-ln';
import { buildLeaseDocuments } from '@bizrethink/customizations/lease/render/render-lease';
import { canAccessLeaseBuilder } from '@bizrethink/customizations/server-only/feature-access';
import { getSession } from '@documenso/auth/server/lib/utils/get-session';
import { getTeamByUrl } from '@documenso/lib/server-only/team/get-team';
import { prisma } from '@documenso/prisma';
import { Alert, AlertDescription, AlertTitle } from '@documenso/ui/primitives/alert';
import { Badge } from '@documenso/ui/primitives/badge';
import { Button } from '@documenso/ui/primitives/button';
import { msg } from '@lingui/core/macro';
import { AlertTriangle, FileText, Lock } from 'lucide-react';
import { useLoaderData } from 'react-router';

import { appMetaTags } from '~/utils/meta';

import type { Route } from './+types/leases._index';

/**
 * BizRethink lease builder — internal preview.
 *
 * NEW FILE in apps/remix rather than a modification of one. A Remix route
 * cannot live anywhere else, and adding a file upstream does not have is
 * additive in the same sense `packages/bizrethink/` is — nothing upstream
 * ships is changed, so nothing can conflict on a sync beyond a same-path
 * collision, which `leases.*` will not have.
 *
 * Both gates are enforced server-side in the loader, never in the component:
 *
 *   1. `canAccessLeaseBuilder` — deny by default, per organisation or per user.
 *   2. Clause status — unreviewed clause text renders only for a
 *      BizRethink-internal organisation.
 *
 * This page deliberately does not send anything. It generates and reports, so
 * the document can be read before any of it reaches a signer.
 */

export function meta() {
  return appMetaTags(msg`Lease Builder`);
}

const PROPERTY_ADDRESS = '29090 Picana Lane, Wesley Chapel, Florida 33543';

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
    // 404 rather than 403: a feature nobody has been granted should not
    // advertise that it exists.
    throw new Response('Not Found', { status: 404 });
  }

  const billing = await prisma.bizrethinkOrganisationBilling.findUnique({
    where: { organisationId: team.organisationId },
    select: { bizrethinkInternal: true },
  });

  const organisationIsInternal = billing?.bizrethinkInternal ?? false;

  const { documents, missing } = buildLeaseDocuments({
    facts: PICANA_FACTS,
    money: PICANA_MONEY,
    values: PICANA_VALUES,
    parties: PICANA_PARTIES,
    propertyAddress: PROPERTY_ADDRESS,
  });

  /*
    Lock 2, checked against the clauses this matter actually selects rather
    than the library as a whole — an organisation becomes able to send exactly
    when the clauses it uses have been reviewed, not when all 47 have.
  */
  const unreviewed = documents
    .flatMap((doc) => doc.clauses)
    .filter(({ clause }) => clause.status !== 'published')
    .map(({ clause }) => clause.slug);

  return {
    propertyAddress: PROPERTY_ADDRESS,
    organisationIsInternal,
    monthlyRentUsd: PICANA_MONEY.rent.monthlyUsd,
    termStart: PICANA_MONEY.term.startDate,
    parties: PICANA_PARTIES.map((p) => ({ name: p.name, role: p.role })),
    documents: documents.map((doc) => ({
      key: doc.key,
      title: doc.title,
      clauseCount: doc.clauses.length,
      kind: doc.key === 'lease' ? 'Lease' : doc.key.startsWith('addendum:') ? 'Addendum' : 'Separate document',
    })),
    missing,
    unreviewedCount: new Set(unreviewed).size,
    readyToSend: missing.length === 0,
  };
}

export default function LeaseBuilderPage() {
  const {
    propertyAddress,
    organisationIsInternal,
    monthlyRentUsd,
    termStart,
    parties,
    documents,
    missing,
    unreviewedCount,
    readyToSend,
  } = useLoaderData<typeof loader>();

  const money = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

  return (
    <div className="mx-auto w-full max-w-screen-lg px-4 md:px-8">
      <div className="mt-8 flex flex-col gap-y-2">
        <h1 className="font-semibold text-3xl">Lease Builder</h1>
        <p className="text-muted-foreground">
          Florida residential lease, assembled from a clause library rather than a fixed template.
        </p>
      </div>

      {/*
        The honest banner. This page can produce a document that looks finished,
        and the clause text has not been reviewed by a lawyer. Saying so on the
        page is cheaper than remembering it.
      */}
      <Alert variant="warning" className="mt-6">
        <Lock className="h-4 w-4" />
        <AlertTitle>Internal preview — clause text is unreviewed</AlertTitle>
        <AlertDescription>
          All {unreviewedCount} clauses selected for this lease are drafts awaiting review by a Florida attorney. They
          render here because this organisation is marked BizRethink-internal
          {organisationIsInternal ? '' : ' — which it is NOT, so generation is blocked'}. They cannot be sent to a third
          party.
        </AlertDescription>
      </Alert>

      <div className="mt-8 grid gap-6 md:grid-cols-2">
        <section className="rounded-lg border p-4">
          <h2 className="font-medium text-sm">Matter</h2>
          <dl className="mt-3 space-y-2 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Property</dt>
              <dd className="text-right">{propertyAddress}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Monthly rent</dt>
              <dd className="tabular-nums">{money.format(monthlyRentUsd)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Term starts</dt>
              <dd>{termStart}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Parties</dt>
              <dd className="text-right">
                {parties.map((p) => (
                  <div key={p.name}>
                    {p.name} <span className="text-muted-foreground">({p.role})</span>
                  </div>
                ))}
              </dd>
            </div>
          </dl>
          <p className="mt-3 text-muted-foreground text-xs">
            Defined in <code>packages/bizrethink/lease/matters/picana-ln.ts</code>. Editing that file changes the
            document; nothing here is compiled into a clause.
          </p>
        </section>

        <section className="rounded-lg border p-4">
          <h2 className="font-medium text-sm">Documents this matter produces</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {documents.map((doc) => (
              <li key={doc.key} className="flex items-center justify-between gap-3">
                <span className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  {doc.title}
                </span>
                <span className="flex items-center gap-2">
                  <span className="text-muted-foreground text-xs">{doc.clauseCount} clauses</span>
                  <Badge variant="secondary">{doc.kind}</Badge>
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-muted-foreground text-xs">
            Each is its own PDF and its own envelope item. The flood disclosure is separate because Fla. Stat. §83.512
            requires it to be.
          </p>
        </section>
      </div>

      {missing.length > 0 && (
        <Alert variant="destructive" className="mt-6">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>{missing.length} answers outstanding — not ready to send</AlertTitle>
          <AlertDescription>
            <ul className="mt-2 list-disc space-y-1 pl-4">
              {missing.map((item) => (
                <li key={item} className="font-mono text-xs">
                  {item}
                </li>
              ))}
            </ul>
            <p className="mt-3 text-sm">
              Fla. Stat. §83.512 asks the landlord to state their own knowledge of flooding. These stay empty until
              answered — defaulting them would put an unverified statement of fact into a statutory disclosure.
            </p>
          </AlertDescription>
        </Alert>
      )}

      <div className="mt-6 flex items-center gap-3">
        <Button asChild variant="outline">
          <a href="preview" target="_blank" rel="noreferrer">
            Preview the lease PDF
          </a>
        </Button>
        <Button disabled title={readyToSend ? 'Not implemented yet' : 'Answers are outstanding'}>
          Send for signature
        </Button>
        <p className="text-muted-foreground text-xs">
          Sending is not wired up yet. The preview generates the real document.
        </p>
      </div>
    </div>
  );
}
