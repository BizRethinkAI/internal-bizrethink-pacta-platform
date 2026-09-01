import { canAccessLeaseBuilder, canRenderDraftClauses } from '@bizrethink/customizations/server-only/feature-access';
import { getSession } from '@documenso/auth/server/lib/utils/get-session';
import { getTeamByUrl } from '@documenso/lib/server-only/team/get-team';
import { prisma } from '@documenso/prisma';
import { trpc } from '@documenso/trpc/react';
import { Alert, AlertDescription, AlertTitle } from '@documenso/ui/primitives/alert';
import { Badge } from '@documenso/ui/primitives/badge';
import { Button } from '@documenso/ui/primitives/button';
import { msg } from '@lingui/core/macro';
import { Building2, Lock, Pencil, Plus, ShieldCheck, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useLoaderData, useNavigate, useRevalidator } from 'react-router';

import type { ExistingProperty } from '~/components/general/lease/property-form';
import { PropertyForm } from '~/components/general/lease/property-form';
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

  const [properties, matters, draftRenderingAllowed] = await Promise.all([
    prisma.bizrethinkProperty.findMany({
      where: { organisationId: team.organisationId, archivedAt: null },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.bizrethinkLeaseMatter.findMany({
      where: { organisationId: team.organisationId },
      orderBy: { updatedAt: 'desc' },
      select: { id: true, title: true, status: true, propertyId: true, updatedAt: true, envelopeId: true },
    }),
    canRenderDraftClauses({ organisationId: team.organisationId, userId: user.id }),
  ]);

  return {
    teamUrl,
    organisationId: team.organisationId,
    teamId: team.id,
    draftRenderingAllowed,
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
      landlords: (p.landlords ?? []) as { name: string; email: string }[],
      utilities: (p.utilities ?? []) as ExistingProperty['utilities'],
      noticeName: p.noticeName,
      noticeAddress: p.noticeAddress,
    })),
    matters: matters.map((m) => ({ ...m, updatedAt: m.updatedAt.toISOString() })),
  };
}

export default function LeasesPage() {
  const { teamUrl, organisationId, teamId, draftRenderingAllowed, properties, matters } =
    useLoaderData<typeof loader>();

  const navigate = useNavigate();
  const revalidator = useRevalidator();

  const [addingProperty, setAddingProperty] = useState(false);
  const [editing, setEditing] = useState<ExistingProperty | null>(null);

  const deleteMatter = trpc.bizrethink.leaseBuilder.matter.delete.useMutation({
    onSuccess: () => revalidator.revalidate(),
  });

  /*
    Seeded on the SERVER, not here. The party list is who signs, and it is not
    something a browser gets to assert — a client-built payload could claim a
    landlord the property does not have. It also means the seeding rules live
    in one tested place rather than in a page.
  */
  const startLease = trpc.bizrethink.leaseBuilder.property.startLease.useMutation({
    onSuccess: ({ id }) => navigate(`/t/${teamUrl}/leases/${id}`),
  });

  return (
    <div className="mx-auto w-full max-w-screen-lg px-4 md:px-8">
      <div className="mt-8">
        <h1 className="font-semibold text-3xl">Leases</h1>
        <p className="mt-1 text-muted-foreground">
          Florida residential leases, assembled from a clause library rather than a fixed template.
        </p>

        <Button asChild variant="outline" size="sm" className="mt-4">
          <a href={`/t/${teamUrl}/leases/library`}>
            <ShieldCheck className="mr-2 h-4 w-4" />
            Clause library and attorney sign-off
          </a>
        </Button>
      </div>

      <Alert variant="warning" className="mt-6">
        <Lock className="h-4 w-4" />
        <AlertTitle>Internal preview — clause text is unreviewed</AlertTitle>
        <AlertDescription>
          The clause library has not been through review by a Florida attorney. It renders here because this
          organisation holds an explicit grant to render unreviewed clause text
          {draftRenderingAllowed ? '' : ' — which it does NOT, so generation is blocked'}. Nothing produced here may be
          sent to a third party.
        </AlertDescription>
      </Alert>

      <section className="mt-8">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-lg">Properties</h2>

          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setEditing(null);
              setAddingProperty(true);
            }}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add a property
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

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    aria-label={`Edit ${property.label}`}
                    onClick={() => {
                      setEditing({
                        id: property.id,
                        label: property.label,
                        addressLine: property.addressLine,
                        city: property.city,
                        state: property.state,
                        postalCode: property.postalCode,
                        county: property.county,
                        propertyType: property.propertyType as ExistingProperty['propertyType'],
                        yearBuilt: property.yearBuilt === null ? '' : String(property.yearBuilt),
                        hasPool: property.hasPool,
                        hasHoa: property.hasHoa,
                        hoaName: property.hoaName ?? '',
                        includedAppliances: property.includedAppliances ?? '',
                        landlords: property.landlords.length > 0 ? property.landlords : [{ name: '', email: '' }],
                        noticeName: property.noticeName ?? '',
                        noticeAddress: property.noticeAddress ?? '',
                        utilities: property.utilities,
                      });
                      setAddingProperty(true);
                    }}
                  >
                    <Pencil className="mr-2 h-4 w-4" />
                    Edit
                  </Button>

                  <Button
                    size="sm"
                    disabled={startLease.isPending}
                    onClick={() => startLease.mutate({ organisationId, teamId, propertyId: property.id })}
                  >
                    New lease
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <PropertyForm
        organisationId={organisationId}
        open={addingProperty}
        existing={editing}
        onOpenChange={(open) => {
          setAddingProperty(open);

          if (!open) {
            setEditing(null);
          }
        }}
        onCreated={() => revalidator.revalidate()}
      />

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

                <div className="flex items-center gap-2">
                  <Badge variant={matter.status === 'draft' ? 'neutral' : 'default'}>{matter.status}</Badge>

                  {/*
                    Only on a draft. A lease that has been sent is not the
                    landlord's to erase — recipients hold links to it, and the
                    server refuses regardless of what this renders.
                  */}
                  {matter.status === 'draft' && matter.envelopeId === null && (
                    <Button
                      variant="ghost"
                      size="sm"
                      aria-label={`Delete ${matter.title}`}
                      disabled={deleteMatter.isPending}
                      onClick={() => {
                        if (window.confirm(`Delete "${matter.title}"? This draft and its answers are gone for good.`)) {
                          deleteMatter.mutate({ id: matter.id });
                        }
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
