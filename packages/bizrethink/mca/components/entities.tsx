import { trpc } from '@documenso/trpc/react';
import { Button } from '@documenso/ui/primitives/button';
import { Trans } from '@lingui/react/macro';
import { Link, useSearchParams } from 'react-router';

import { LegalWorkspace } from '../../legal-ui/reader';
import { McaEntityEditor } from './entity-editor';

/**
 * The entities a team has saved. ADR 0026.
 *
 * An entity is added once and then CHOSEN when a template is created — the
 * shape the lease builder already uses for a property, and the reason a funder
 * types its own name and addresses once rather than once per document.
 *
 * WHAT THIS PAGE DOES NOT DO YET is create a template against one. The template
 * record does not name an entity until the change that follows this; until then
 * this is where entities are kept, and the template builder still carries its
 * own provider interview.
 */
export const McaEntities = ({ teamId, teamUrl, canWrite }: { teamId: number; teamUrl: string; canWrite: boolean }) => {
  const [search, setSearch] = useSearchParams();
  const id = search.get('entity');
  const creating = search.get('new') === '1';

  const list = trpc.bizrethink.mcaEntities.list.useQuery({ teamId });
  const saved = trpc.bizrethink.mcaEntities.get.useQuery(
    { teamId, id: id ?? '' },
    { enabled: Boolean(id), refetchOnWindowFocus: false },
  );
  const create = trpc.bizrethink.mcaEntities.create.useMutation();
  const update = trpc.bizrethink.mcaEntities.update.useMutation();

  const choose = (entityId: string | null) => setSearch(entityId ? { entity: entityId } : {});

  return (
    <LegalWorkspace>
      <div className="mx-auto max-w-5xl space-y-6 p-4 sm:p-6">
        <header className="space-y-2">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <h1 className="font-semibold text-2xl tracking-tight sm:text-3xl">
              <Trans>Entities</Trans>
            </h1>
            <Link className="font-medium text-sm underline" to={`/t/${teamUrl}/mca`}>
              <Trans>MCA templates</Trans>
            </Link>
          </div>
          <p className="text-muted-foreground">
            <Trans>
              The companies that issue your documents. Add an entity once, with its addresses and the programme terms it
              runs, and then create a template for each document it issues.
            </Trans>
          </p>
        </header>

        <section className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-semibold text-lg">
              <Trans>Saved entities</Trans>
            </h2>
            {canWrite && (
              <Button variant="outline" onClick={() => setSearch({ new: '1' })}>
                <Trans>Add an entity</Trans>
              </Button>
            )}
          </div>

          {list.isLoading && (
            <p role="status">
              <Trans>Loading entities…</Trans>
            </p>
          )}
          {list.error && <p role="alert">{list.error.message}</p>}
          {list.data?.length === 0 && !creating && (
            <p className="text-muted-foreground">
              <Trans>No entities yet. Add the company that issues your documents to begin.</Trans>
            </p>
          )}

          <ul className="space-y-2">
            {list.data?.map((entity) => (
              <li key={entity.id}>
                <Button
                  variant={entity.id === id ? 'default' : 'outline'}
                  onClick={() => choose(entity.id)}
                  className="w-full justify-start"
                >
                  {entity.label}
                </Button>
              </li>
            ))}
          </ul>
        </section>

        {creating && canWrite && (
          <section className="rounded-lg border p-4 sm:p-6">
            <h2 className="mb-4 font-semibold text-xl">
              <Trans>Add an entity</Trans>
            </h2>
            <McaEntityEditor
              teamId={teamId}
              onSave={async (entity) => {
                const result = await create.mutateAsync({ teamId, entity });
                setSearch({ entity: result.id });
                await list.refetch();
              }}
            />
          </section>
        )}

        {id && saved.error && <p role="alert">{saved.error.message}</p>}

        {id && saved.data && (
          <section className="rounded-lg border p-4 sm:p-6">
            <h2 className="mb-4 font-semibold text-xl">{saved.data.label}</h2>
            {!canWrite && (
              <p className="mb-3 text-muted-foreground text-sm">
                <Trans>
                  You can read this entity but not change it. Its terms decide which clauses every document it issues
                  contains, so editing one is a programme decision.
                </Trans>
              </p>
            )}
            <McaEntityEditor
              teamId={teamId}
              key={`${saved.data.id}:${saved.data.version}`}
              initial={{ label: saved.data.label, identity: saved.data.identity, policy: saved.data.policy }}
              readOnly={!canWrite}
              onSave={async (entity) => {
                await update.mutateAsync({
                  teamId,
                  id: saved.data.id,
                  data: { expectedVersion: saved.data.version, entity },
                });
                await Promise.all([saved.refetch(), list.refetch()]);
              }}
            />
          </section>
        )}
      </div>
    </LegalWorkspace>
  );
};
