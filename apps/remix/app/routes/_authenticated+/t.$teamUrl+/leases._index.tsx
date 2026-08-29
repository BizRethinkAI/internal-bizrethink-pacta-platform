import { canAccessLeaseBuilder } from '@bizrethink/customizations/server-only/feature-access';
import { getSession } from '@documenso/auth/server/lib/utils/get-session';
import { getTeamByUrl } from '@documenso/lib/server-only/team/get-team';
import { prisma } from '@documenso/prisma';
import { trpc } from '@documenso/trpc/react';
import { Alert, AlertDescription, AlertTitle } from '@documenso/ui/primitives/alert';
import { Badge } from '@documenso/ui/primitives/badge';
import { Button } from '@documenso/ui/primitives/button';
import { msg } from '@lingui/core/macro';
import { Building2, Lock, Plus } from 'lucide-react';
import { useLoaderData, useNavigate, useRevalidator } from 'react-router';

import { appMetaTags } from '~/utils/meta';

import type { Route } from './+types/leases._index';

/**
 * Properties, and the leases written against them.
 *
 * The property/lease split is the point rather than tidiness. The 2026 lease on
 * 29090 Picana Ln continued a tenancy begun under a different manager; because
 * nothing linked the two, a deposit already held had to be described in prose
 * on page 22 while the summary table said $0.00. A lease that knows its
 * property — and on renewal, the lease before it — cannot make that mistake.
 */

export function meta() {
  return appMetaTags(msg`Leases`);
}

export async function loader({ request, params }: Route.LoaderArgs) {
  const { teamUrl } = params;

  if (!teamUrl) {
    throw new Response('Not Found', { status: 404 });
  }

  const { user } = await getSession(request);
  const team = await getTeamByUrl({ userId: user.id, teamUrl });

  if (!(await canAccessLeaseBuilder({ organisationId: team.organisationId, userId: user.id }))) {
    throw new Response('Not Found', { status: 404 });
  }

  const [properties, matters, billing] = await Promise.all([
    prisma.bizrethinkProperty.findMany({
      where: { organisationId: team.organisationId, archivedAt: null },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.bizrethinkLeaseMatter.findMany({
      where: { organisationId: team.organisationId },
      orderBy: { updatedAt: 'desc' },
      select: { id: true, title: true, status: true, propertyId: true, updatedAt: true },
    }),
    prisma.bizrethinkOrganisationBilling.findUnique({
      where: { organisationId: team.organisationId },
      select: { bizrethinkInternal: true },
    }),
  ]);

  return {
    teamUrl,
    organisationId: team.organisationId,
    teamId: team.id,
    organisationIsInternal: billing?.bizrethinkInternal ?? false,
    properties: properties.map((p) => ({
      id: p.id,
      label: p.label,
      addressLine: p.addressLine,
      city: p.city,
      state: p.state,
      postalCode: p.postalCode,
      county: p.county,
      propertyType: p.propertyType,
      yearBuilt: p.yearBuilt,
      hasPool: p.hasPool,
      hasHoa: p.hasHoa,
      hoaName: p.hoaName,
      includedAppliances: p.includedAppliances,
    })),
    matters: matters.map((m) => ({ ...m, updatedAt: m.updatedAt.toISOString() })),
  };
}

type LoadedProperty = Awaited<ReturnType<typeof loader>>['properties'][number];

export default function LeasesPage() {
  const { teamUrl, organisationId, teamId, organisationIsInternal, properties, matters } =
    useLoaderData<typeof loader>();

  const navigate = useNavigate();
  const revalidator = useRevalidator();

  const createProperty = trpc.bizrethink.leaseBuilder.property.create.useMutation({
    onSuccess: () => revalidator.revalidate(),
  });

  const createMatter = trpc.bizrethink.leaseBuilder.matter.create.useMutation({
    onSuccess: ({ id }) => navigate(`/t/${teamUrl}/leases/${id}`),
  });

  const startLease = (property: LoadedProperty) => {
    /*
      The property answers what it can — type, year built, pool, association,
      appliances, county — so the interview opens partly filled and a renewal is
      minutes rather than an hour.

      Everything else is null rather than a plausible default. A number nobody
      typed is a number nobody checked, and this document gets signed.
    */
    createMatter.mutate({
      organisationId,
      teamId,
      propertyId: property.id,
      title: `${property.label} — lease`,
      supersedesMatterId: null,
      answers: {
        facts: {
          propertyType: property.propertyType,
          propertyYearBuilt: property.yearBuilt,
          hasPool: property.hasPool,
          hasHoa: property.hasHoa,
          petsPermitted: false,
          landlordProvidesLawnService: false,
          lateFeePolicy: 'flat',
          terminationOnSale: false,
          holdoverPenalty: false,
          earlyTerminationOffered: false,
        },
        money: {
          rent: { monthlyUsd: null, dueDayOfMonth: 1 },
          term: { startDate: null },
          deposit: {
            securityUsd: null,
            alreadyHeldUsd: 0,
            advanceRentUsd: null,
            advanceRentHeldUsd: 0,
            prepaidRentUsd: 0,
          },
          prorationMethod: 'actual-days-in-month',
        },
        values: {
          propertyAddress: `${property.addressLine}, ${property.city}, ${property.state} ${property.postalCode}`,
          propertyTypeLabel: property.propertyType.replace('-', ' '),
          venueCounty: property.county,
          hoaName: property.hoaName,
          includedAppliances: property.includedAppliances,
        },
        customClauses: [],
      },
    });
  };

  return (
    <div className="mx-auto w-full max-w-screen-lg px-4 md:px-8">
      <div className="mt-8">
        <h1 className="font-semibold text-3xl">Leases</h1>
        <p className="mt-1 text-muted-foreground">
          Florida residential leases, assembled from a clause library rather than a fixed template.
        </p>
      </div>

      <Alert variant="warning" className="mt-6">
        <Lock className="h-4 w-4" />
        <AlertTitle>Internal preview — clause text is unreviewed</AlertTitle>
        <AlertDescription>
          The clause library has not been through review by a Florida attorney. It renders here because this
          organisation is marked BizRethink-internal
          {organisationIsInternal ? '' : ' — which it is NOT, so generation is blocked'}. Nothing produced here may be
          sent to a third party.
        </AlertDescription>
      </Alert>

      <section className="mt-8">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-lg">Properties</h2>

          {/* Seeded rather than a blank form: the one property this is being
              dogfooded on. A property form is the next thing to build. */}
          <Button
            variant="outline"
            size="sm"
            disabled={createProperty.isPending || properties.length > 0}
            onClick={() =>
              createProperty.mutate({
                organisationId,
                label: '29090 Picana Ln',
                addressLine: '29090 Picana Lane',
                city: 'Wesley Chapel',
                state: 'FL',
                postalCode: '33543',
                county: 'Pasco',
                propertyType: 'single-family',
                yearBuilt: 2005,
                hasPool: true,
                hasHoa: true,
                hoaName: 'Estancia at Wiregrass Ranch',
                includedAppliances:
                  'refrigerator, oven and range, microwave, dishwasher, clothes washer and clothes dryer',
              })
            }
          >
            <Plus className="mr-2 h-4 w-4" />
            Add 29090 Picana Ln
          </Button>
        </div>

        {properties.length === 0 ? (
          <p className="mt-3 rounded-lg border border-dashed p-6 text-center text-muted-foreground text-sm">
            No properties yet. A property is set up once — its type, year built, pool and association decide which
            clauses Florida lets you agree, so every lease written against it opens partly answered.
          </p>
        ) : (
          <ul className="mt-3 space-y-2">
            {properties.map((property) => (
              <li key={property.id} className="flex items-center justify-between rounded-lg border p-4">
                <div className="flex items-center gap-3">
                  <Building2 className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">{property.label}</p>
                    <p className="text-muted-foreground text-sm">
                      {property.propertyType.replace('-', ' ')} · {property.city}, {property.state} · {property.county}{' '}
                      County
                      {property.hasPool && ' · pool'}
                      {property.hasHoa && ' · HOA'}
                    </p>
                  </div>
                </div>

                <Button size="sm" disabled={createMatter.isPending} onClick={() => startLease(property)}>
                  New lease
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-10 mb-16">
        <h2 className="font-semibold text-lg">Leases</h2>

        {matters.length === 0 ? (
          <p className="mt-3 rounded-lg border border-dashed p-6 text-center text-muted-foreground text-sm">
            No leases yet. Start one from a property above.
          </p>
        ) : (
          <ul className="mt-3 space-y-2">
            {matters.map((matter) => (
              <li key={matter.id} className="flex items-center justify-between rounded-lg border p-4">
                <div>
                  <a href={`/t/${teamUrl}/leases/${matter.id}`} className="font-medium hover:underline">
                    {matter.title}
                  </a>
                  <p className="text-muted-foreground text-sm">
                    Updated {new Date(matter.updatedAt).toLocaleDateString()}
                  </p>
                </div>

                <Badge variant={matter.status === 'draft' ? 'neutral' : 'default'}>{matter.status}</Badge>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
