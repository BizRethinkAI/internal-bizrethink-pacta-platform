import { AppError } from '@documenso/lib/errors/app-error';
import { trpc } from '@documenso/trpc/react';
import { Button } from '@documenso/ui/primitives/button';
import { msg } from '@lingui/core/macro';
import { useLingui } from '@lingui/react';
import { Trans } from '@lingui/react/macro';
import { useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { LegalSummary, LegalWorkspace } from '../../legal-ui/reader';
import { INSTRUMENTS } from '../clauses/instruments';
import { PRODUCED_INSTRUMENTS, type ProducedInstrument } from '../publish/recipient-contract';
import type { McaTemplateSnapshot } from '../templates/compile';
import { McaOperatingRequirements } from './operating-requirements';
import { McaPackageReader } from './package-reader';
import { McaProviderReviewManager } from './provider-review-manager';
import { McaPublishTemplate } from './publish-template';

export const McaProviderTemplates = ({ teamId, canWrite }: { teamId: number; canWrite: boolean }) => {
  const { _ } = useLingui();
  const [search, setSearch] = useSearchParams();
  const id = search.get('template');
  const versionText = search.get('revision');
  const version = versionText && /^\d+$/.test(versionText) ? Number(versionText) : undefined;
  const list = trpc.bizrethink.mcaTemplates.list.useQuery({ teamId });
  const saved = trpc.bizrethink.mcaTemplates.get.useQuery(
    { teamId, id: id ?? '', version },
    { enabled: Boolean(id), refetchOnWindowFocus: false },
  );
  const create = trpc.bizrethink.mcaTemplates.create.useMutation();
  const update = trpc.bizrethink.mcaTemplates.update.useMutation();
  const [previewRequested, setPreviewRequested] = useState(false);
  const [workspaceView, setWorkspaceView] = useState('answers');
  const [templateQuery, setTemplateQuery] = useState('');
  /*
    WHICH DOCUMENT A NEW TEMPLATE IS. ADR 0026: entity + type = one template.

    Asked only when creating one. A template does not change which document it
    is, so an existing one has no control for this and `updateMcaTemplate`
    refuses to accept the field at all.
  */
  const [instrument, setInstrument] = useState<ProducedInstrument>('frpa');
  const [entityId, setEntityId] = useState('');
  const [createError, setCreateError] = useState<string | null>(null);
  const [reviseError, setReviseError] = useState<string | null>(null);
  const entities = trpc.bizrethink.mcaEntities.list.useQuery({ teamId });
  const preview = trpc.bizrethink.mcaTemplates.preview.useQuery(
    { teamId, id: id ?? '', version: saved.data?.version ?? 1 },
    { enabled: previewRequested && Boolean(saved.data), retry: false, staleTime: 0 },
  );
  const isOldRevision = saved.data && saved.data.version !== saved.data.currentRevision;
  const choose = (templateId: string | null) => {
    setPreviewRequested(false);
    setWorkspaceView('answers');
    setSearch(templateId ? { template: templateId } : {});
  };
  return (
    <LegalWorkspace>
      <div className="mx-auto max-w-5xl space-y-6 p-4 sm:p-6">
        <header className="space-y-2">
          <h1 className="font-semibold text-2xl">
            <Trans>MCA provider templates</Trans>
          </h1>
          <p className="text-muted-foreground">
            <Trans>
              Set a provider's programme once, then reuse its document package. Merchant details, funding figures,
              equipment elections and signatures belong to each transaction.
            </Trans>
          </p>
        </header>
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-amber-950 text-sm">
          <Trans>
            Internal drafting workspace. Saved templates and previews do not authorize merchant delivery or signing.
          </Trans>
        </div>
        <section className="space-y-3 rounded-lg border p-4">
          <div className="flex items-center justify-between gap-4">
            <h2 className="font-semibold">
              <Trans>Saved templates</Trans>
            </h2>
            {canWrite && (
              <Button variant="outline" onClick={() => choose(null)}>
                <Trans>New provider template</Trans>
              </Button>
            )}
          </div>
          {list.error && <p role="alert">{list.error.message}</p>}
          {list.isLoading && (
            <p>
              <Trans>Loading templates…</Trans>
            </p>
          )}
          {list.data?.length === 0 && (
            <p className="text-muted-foreground text-sm">
              <Trans>No templates saved for this team yet.</Trans>
            </p>
          )}
          <input
            aria-label="Search saved templates"
            placeholder="Find a saved template…"
            value={templateQuery}
            onChange={(event) => setTemplateQuery(event.target.value)}
            className="h-10 w-full rounded-md border bg-background px-3 text-sm"
          />
          <ul className="max-h-52 divide-y overflow-y-auto">
            {list.data
              ?.filter((item) => item.label.toLowerCase().includes(templateQuery.toLowerCase()))
              .map((item) => (
                <li key={item.id} className="flex items-center justify-between gap-3 py-2">
                  <button
                    type="button"
                    className="text-left font-medium underline underline-offset-4"
                    onClick={() => choose(item.id)}
                  >
                    {item.label}
                  </button>
                  <span className="text-muted-foreground text-sm">
                    <Trans>Revision {item.currentRevision}</Trans>
                  </span>
                </li>
              ))}
          </ul>
          {list.data?.length === 100 && (
            <p className="text-muted-foreground text-sm">
              <Trans>Showing the 100 most recently updated templates.</Trans>
            </p>
          )}
        </section>
        {saved.error && <p role="alert">{saved.error.message}</p>}
        {id && saved.isLoading && (
          <p>
            <Trans>Loading provider answers…</Trans>
          </p>
        )}
        {saved.data && (
          <section className="space-y-3 rounded-lg border p-4">
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="font-semibold">
                <Trans>Saved revision {saved.data.version}</Trans>
              </h2>
              <label className="text-sm">
                <Trans>Revision history</Trans>{' '}
                <select
                  aria-label="Revision history"
                  value={saved.data.version}
                  onChange={(event) => {
                    setPreviewRequested(false);
                    setWorkspaceView('answers');
                    setSearch({ template: saved.data.id, revision: event.target.value });
                  }}
                >
                  {Array.from({ length: saved.data.currentRevision }, (_, i) => i + 1)
                    .reverse()
                    .map((revision) => (
                      <option value={revision} key={revision}>
                        {revision}
                      </option>
                    ))}
                </select>
              </label>
              <Button
                variant="outline"
                onClick={() => {
                  setPreviewRequested(true);
                  setWorkspaceView('package');
                }}
                disabled={!saved.data.current}
              >
                <Trans>Preview document package</Trans>
              </Button>
            </div>
            {canWrite && saved.data.current && !isOldRevision && (
              <div className="space-y-3">
                {/*
                  ONE TEMPLATE PUBLISHES ONE DOCUMENT: its own.

                  This asked the PROGRAMME which documents it runs, and offered
                  a control for each — correct while a template was a package.
                  ADR 0026 made a template one document, so `instrumentsFor`
                  now answers a different question: which documents this funder
                  is entitled to have templates FOR, across templates. Asking it
                  here offered to publish documents this template does not
                  contain, and `publishMcaTemplate` would refuse them at the
                  artifact step rather than the page never offering them.

                  The template names its own document, so that is what is asked.
                */}
                <McaPublishTemplate
                  teamId={teamId}
                  templateId={saved.data.id}
                  version={saved.data.version}
                  instrument={saved.data.instrument}
                />
              </div>
            )}
            {saved.data.entity?.policy?.recipientStates && (
              <McaOperatingRequirements states={saved.data.entity.policy.recipientStates} />
            )}
            {saved.data.current && !isOldRevision && (
              <Link
                className="inline-block rounded border px-3 py-2 font-medium text-sm"
                to={`preview?template=${encodeURIComponent(saved.data.id)}&revision=${saved.data.version}`}
              >
                <Trans>Preview this template</Trans>
              </Link>
            )}
            {!saved.data.current && (
              <p role="alert">
                <Trans>
                  Content or requirements have changed. Review the provider answers and save a new revision to refresh
                  this template.
                </Trans>
              </p>
            )}
            {isOldRevision && (
              <p className="text-sm">
                <Trans>This is a read-only historical revision.</Trans>{' '}
                <button type="button" className="underline" onClick={() => choose(saved.data.id)}>
                  <Trans>Open latest revision</Trans>
                </button>
              </p>
            )}
            <fieldset className="flex min-w-0 flex-wrap gap-2 border-t pt-4" aria-label="Template revision views">
              {[
                { id: 'answers', label: 'Provider answers' },
                { id: 'package', label: 'Document package' },
                { id: 'requirements', label: 'Requirements' },
              ].map((tab) => (
                <Button
                  key={tab.id}
                  size="sm"
                  variant={workspaceView === tab.id ? 'secondary' : 'ghost'}
                  aria-pressed={workspaceView === tab.id}
                  disabled={tab.id !== 'answers' && !saved.data.current}
                  onClick={() => {
                    setWorkspaceView(tab.id);
                    if (tab.id !== 'answers') {
                      setPreviewRequested(true);
                    }
                  }}
                >
                  {tab.label}
                </Button>
              ))}
            </fieldset>
            {previewRequested && preview.isLoading && (
              <p role="status">
                <Trans>Loading document package…</Trans>
              </p>
            )}
            {previewRequested && preview.error && <p role="alert">{preview.error.message}</p>}
            {previewRequested && preview.data && workspaceView !== 'answers' && (
              <McaPackagePreview snapshot={preview.data} requirementsOnly={workspaceView === 'requirements'} />
            )}
            <McaProviderReviewManager
              key={`${saved.data.id}:${saved.data.version}`}
              teamId={teamId}
              id={saved.data.id}
              version={saved.data.version}
              canWrite={canWrite}
              current={saved.data.current}
            />
          </section>
        )}
        {!id && canWrite && (
          <section className="space-y-4 rounded-lg border p-4 sm:p-6">
            <h2 className="font-semibold text-xl">
              <Trans>Create a template</Trans>
            </h2>
            <p className="text-muted-foreground text-sm">
              <Trans>
                A template is one entity's version of one document. Choose the entity that issues it and which document
                it is; both are fixed afterwards, because a template that changed either would make every revision
                behind it a record of something else.
              </Trans>
            </p>

            <label className="block space-y-1">
              <span className="font-medium text-sm">
                <Trans>Which entity issues it?</Trans>
              </span>
              <select
                className="w-full rounded-md border p-2 text-sm"
                value={entityId}
                onChange={(event) => setEntityId(event.target.value)}
              >
                <option value="">{_(msg`Choose an entity…`)}</option>
                {entities.data?.map((entity) => (
                  <option key={entity.id} value={entity.id}>
                    {entity.label}
                  </option>
                ))}
              </select>
            </label>

            {entities.data?.length === 0 && (
              <p className="text-muted-foreground text-sm">
                <Trans>
                  No entities yet. Add the company that issues your documents first — its addresses and programme terms
                  are answered once there rather than once per document.
                </Trans>
              </p>
            )}

            <label className="block space-y-1">
              <span className="font-medium text-sm">
                <Trans>Which document is it?</Trans>
              </span>
              <select
                className="w-full rounded-md border p-2 text-sm"
                value={instrument}
                onChange={(event) => setInstrument(event.target.value as ProducedInstrument)}
              >
                {PRODUCED_INSTRUMENTS.map((produced) => (
                  <option key={produced} value={produced}>
                    {INSTRUMENTS[produced].title}
                  </option>
                ))}
              </select>
            </label>

            {createError && (
              <p role="alert" className="text-destructive text-sm">
                {createError}
              </p>
            )}

            <Button
              disabled={!entityId || create.isPending}
              onClick={async () => {
                setCreateError(null);
                try {
                  const result = await create.mutateAsync({ teamId, entityId, instrument });
                  setPreviewRequested(false);
                  setSearch({ template: result.id, revision: String(result.currentRevision) });
                  await list.refetch();
                } catch (cause) {
                  setCreateError(AppError.parseError(cause).message);
                }
              }}
            >
              <Trans>Create template</Trans>
            </Button>
          </section>
        )}

        {saved.data && canWrite && !isOldRevision && (
          <section className="space-y-3 rounded-lg border p-4 sm:p-6">
            <h2 className="font-semibold text-xl">
              <Trans>Take a fresh copy of the entity</Trans>
            </h2>
            <p className="text-muted-foreground text-sm">
              <Trans>
                This template holds a copy of its entity as it stood when this revision was made. Editing the entity
                never changes a document already published — creating a new revision is how an edit reaches one.
              </Trans>
            </p>
            {reviseError && (
              <p role="alert" className="text-destructive text-sm">
                {reviseError}
              </p>
            )}
            <Button
              variant="outline"
              disabled={update.isPending}
              onClick={async () => {
                setReviseError(null);
                try {
                  const result = await update.mutateAsync({
                    teamId,
                    id: saved.data.id,
                    data: { expectedVersion: saved.data.version },
                  });
                  setPreviewRequested(false);
                  setSearch({ template: result.id, revision: String(result.currentRevision) });
                  await Promise.all([saved.refetch(), list.refetch()]);
                } catch (cause) {
                  setReviseError(AppError.parseError(cause).message);
                }
              }}
            >
              <Trans>Create a new revision</Trans>
            </Button>
          </section>
        )}
      </div>
    </LegalWorkspace>
  );
};

/**
 * Takes ONLY THE THREE PARTS IT RENDERS, not a whole snapshot.
 *
 * It asked for `McaTemplateSnapshot`, which made every field of a compiled
 * template a prop requirement — including the fingerprint, which this renders
 * nowhere. Asking for what it uses means adding a field to a compiled template
 * cannot break a component that never reads it.
 */
export const McaPackagePreview = ({
  snapshot,
  requirementsOnly = false,
}: {
  snapshot: Pick<McaTemplateSnapshot, 'documents' | 'requirements'>;
  requirementsOnly?: boolean;
}) => {
  return (
    <div data-mca-template-preview className="space-y-4 border-t pt-4">
      <p className="font-medium text-amber-800">
        <Trans>Internal draft — transaction fields remain unfilled</Trans>
      </p>
      {!requirementsOnly && <McaPackageReader documents={snapshot.documents} unfilled />}
      {/*
        NO PROCESSOR SECTION. A template names no processor (ADR 0026 §6): the
        split funding letter is the processor's, used exactly as supplied, and
        the caller picks the processor-specific template when it creates that
        envelope. `processor_name` remains a widget on the FRPA, because which
        processor a merchant uses is a fact about the deal.
      */}
      <section>
        <h3 className="font-semibold">
          <Trans>Disclosure and agreement requirements to check per transaction</Trans>
        </h3>
        <ul className="list-disc space-y-1 pl-5 text-sm">
          {snapshot.requirements.map((requirement) => (
            <li key={requirement.slug}>
              {requirement.jurisdiction}: {requirement.citation}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
};

export const McaTemplateAdminHub = ({ grants }: { grants: { builder: boolean; draft: boolean } }) => {
  const access = trpc.bizrethink.mcaTemplates.access.useQuery();
  const mutation = trpc.bizrethink.mcaTemplates.setAccess.useMutation();
  const [current, setCurrent] = useState(grants);
  const change = async (feature: 'mca-builder' | 'mca-clause-draft-rendering', enabled: boolean) => {
    await mutation.mutateAsync({ feature, enabled });
    setCurrent((previous) => ({ ...previous, [feature === 'mca-builder' ? 'builder' : 'draft']: enabled }));
    await access.refetch();
  };
  return (
    <LegalWorkspace>
      <div className="space-y-5">
        <h1 className="font-semibold text-3xl tracking-tight">
          <Trans>MCA template workspace</Trans>
        </h1>
        <p className="text-muted-foreground">
          <Trans>
            Templates belong to a team. These admin controls grant access only to your account and do not change team
            membership or permission to send documents.
          </Trans>
        </p>
        <LegalSummary
          values={[
            { label: <Trans>Eligible teams</Trans>, value: access.data?.teams.length ?? '—' },
            { label: <Trans>Provider interview access</Trans>, value: current.builder ? 'Enabled' : 'Disabled' },
            { label: <Trans>Internal draft previews</Trans>, value: current.draft ? 'Enabled' : 'Disabled' },
          ]}
        />
        <div className="flex flex-wrap gap-3">
          <Button
            disabled={mutation.isPending}
            variant="outline"
            onClick={() => void change('mca-builder', !current.builder).catch(() => undefined)}
          >
            {current.builder ? (
              <Trans>Disable my provider interview access</Trans>
            ) : (
              <Trans>Enable my provider interview access</Trans>
            )}
          </Button>
          <Button
            disabled={mutation.isPending}
            variant="outline"
            onClick={() => void change('mca-clause-draft-rendering', !current.draft).catch(() => undefined)}
          >
            {current.draft ? (
              <Trans>Disable my internal draft previews</Trans>
            ) : (
              <Trans>Enable my internal draft previews</Trans>
            )}
          </Button>
        </div>
        {mutation.error && <p role="alert">{mutation.error.message}</p>}
        <h2 className="font-semibold text-lg">
          <Trans>Open a team workspace</Trans>
        </h2>
        {access.error && <p role="alert">{access.error.message}</p>}
        {access.isLoading && (
          <p role="status">
            <Trans>Loading teams…</Trans>
          </p>
        )}
        <ul className="grid gap-3 sm:grid-cols-2">
          {access.data?.teams.map((team) => (
            <li key={team.id} className="rounded-lg border p-4">
              <Link className="block font-medium underline underline-offset-4" to={`/t/${team.url}/mca`}>
                {team.name}
              </Link>
            </li>
          ))}
        </ul>
        {access.data?.teams.length === 0 && (
          <p className="text-muted-foreground">
            <Trans>No teams with MCA access are available to this account.</Trans>
          </p>
        )}
      </div>
    </LegalWorkspace>
  );
};
