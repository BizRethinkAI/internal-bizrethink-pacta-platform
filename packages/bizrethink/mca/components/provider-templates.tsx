import { trpc } from '@documenso/trpc/react';
import { Button } from '@documenso/ui/primitives/button';
import { Trans } from '@lingui/react/macro';
import { useState } from 'react';
import { Link, useSearchParams } from 'react-router';

import type { McaTemplateSnapshot } from '../templates/compile';
import { McaProviderInterview } from './provider-interview';

export const McaProviderTemplates = ({ teamId, canWrite }: { teamId: number; canWrite: boolean }) => {
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
  const preview = trpc.bizrethink.mcaTemplates.preview.useQuery(
    { teamId, id: id ?? '', version: saved.data?.version ?? 1 },
    { enabled: previewRequested && Boolean(saved.data), retry: false, staleTime: 0 },
  );
  const isOldRevision = saved.data && saved.data.version !== saved.data.currentRevision;
  const choose = (templateId: string | null) => {
    setPreviewRequested(false);
    setSearch(templateId ? { template: templateId } : {});
  };
  return (
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
        <ul className="divide-y">
          {list.data?.map((item) => (
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
            <Button variant="outline" onClick={() => setPreviewRequested(true)} disabled={!saved.data.current}>
              <Trans>Preview document package</Trans>
            </Button>
          </div>
          {saved.data.current && !isOldRevision && (
            <Link
              className="inline-block rounded border px-3 py-2 font-medium text-sm"
              to={`draft?template=${encodeURIComponent(saved.data.id)}&revision=${saved.data.version}`}
            >
              <Trans>Use this template</Trans>
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
          {previewRequested && preview.error && <p role="alert">{preview.error.message}</p>}
          {previewRequested && preview.data && <McaPackagePreview snapshot={preview.data} />}
        </section>
      )}
      {((!id && canWrite) || saved.data) && (
        <section className="rounded-lg border p-4 sm:p-6">
          <McaProviderInterview
            key={`${id ?? 'new'}:${saved.data?.version ?? 0}`}
            initial={saved.data?.profile}
            readOnly={!canWrite || Boolean(isOldRevision)}
            onSave={async (profile) => {
              const result = saved.data
                ? await update.mutateAsync({
                    teamId,
                    id: saved.data.id,
                    data: { expectedVersion: saved.data.version, profile },
                  })
                : await create.mutateAsync({ teamId, data: profile });
              setPreviewRequested(false);
              setSearch({ template: result.id, revision: String(result.currentRevision) });
              await list.refetch();
            }}
          />
        </section>
      )}
    </div>
  );
};

export const McaPackagePreview = ({ snapshot }: { snapshot: McaTemplateSnapshot }) => {
  const labels = new Map(
    snapshot.documents.flatMap((document) =>
      document.items.flatMap((item) => item.fields.map((field) => [field.binding, field.label] as const)),
    ),
  );
  const readable = (body: string) =>
    body.replace(/\{\{field:([^}]+)\}\}/g, (_match, binding: string) => `[${labels.get(binding) ?? binding}]`);
  return (
    <div data-mca-template-preview className="space-y-4 border-t pt-4">
      <p className="font-medium text-amber-800">
        <Trans>Internal draft — transaction fields remain unfilled</Trans>
      </p>
      {snapshot.documents.map((document) => (
        <details key={document.instrument} className="rounded border p-3">
          <summary className="cursor-pointer font-medium">{document.title}</summary>
          {document.transactionSelection !== 'always' && (
            <p className="mt-2 text-muted-foreground text-sm">
              <Trans>
                Separate document, included only when the corresponding transaction or channel choice applies.
              </Trans>
            </p>
          )}
          <div className="mt-4 space-y-5">
            {document.items.map((item) => (
              <article key={item.slug} data-mca-template-item={item.slug}>
                <h3 className="font-semibold">
                  {item.number ? `${item.number} ` : ''}
                  {item.heading}
                </h3>
                {item.body && <p className="mt-1 whitespace-pre-wrap text-sm">{readable(item.body)}</p>}
                {item.repeatFor && (
                  <p className="text-muted-foreground text-sm">
                    <Trans>
                      Repeat for each guarantor in this instrument; each signs separately in the stated capacity.
                    </Trans>
                  </p>
                )}
                {item.fields.length > 0 && (
                  <dl className="mt-2 grid gap-x-4 gap-y-2 text-sm sm:grid-cols-2">
                    {item.fields.map((field) => (
                      <div key={field.binding}>
                        <dt className="text-muted-foreground">{field.label}</dt>
                        <dd>{field.value ?? '—'}</dd>
                      </div>
                    ))}
                  </dl>
                )}
              </article>
            ))}
          </div>
        </details>
      ))}
      <section>
        <h3 className="font-semibold">
          <Trans>Processor-controlled document</Trans>
        </h3>
        {snapshot.externalDocuments.map((document) => (
          <p key={document.instrument} className="text-sm">
            {document.processor}: {document.form.title} ({document.form.version}) — {document.form.reference}
          </p>
        ))}
        <p className="text-muted-foreground text-sm">
          <Trans>Obtain the required form and confirm its terms and acceptance for the transaction.</Trans>
        </p>
      </section>
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
    <div className="space-y-5">
      <h1 className="font-semibold text-2xl">
        <Trans>MCA template workspace</Trans>
      </h1>
      <p className="text-muted-foreground">
        <Trans>
          Templates belong to a team. These admin controls grant access only to your account and do not change team
          membership or permission to send documents.
        </Trans>
      </p>
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
      <ul className="space-y-2">
        {access.data?.teams.map((team) => (
          <li key={team.id}>
            <Link className="underline" to={`/t/${team.url}/mca`}>
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
  );
};
