import { trpc } from '@documenso/trpc/react';
import { Button } from '@documenso/ui/primitives/button';
import { Trans } from '@lingui/react/macro';
import { useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { LegalWorkspace } from '../../legal-ui/reader';
import { INSTRUMENTS } from '../clauses/instruments';
import { PRODUCED_INSTRUMENTS, type ProducedInstrument } from '../publish/recipient-contract';
import type { McaTemplateSnapshot } from '../templates/compile';
import { McaPackageReader } from './package-reader';

/**
 * Look at a saved template before publishing it.
 *
 * ADR 0025: the artifact this vertical produces is a TEMPLATE, and a deal never
 * enters here. So there is nothing to fill in — the whole question is which
 * document of this template to look at, and the answer is that document
 * rendered with specimen values.
 *
 * WHAT THIS REPLACED was a 430-line transaction interview: merchant legal name,
 * guarantors, signers, deposit account, funding figures. It produced an internal
 * draft, which was the only artifact the builder could render. That is how a
 * per-deal interview survived being rejected — not by decision, but because the
 * first renderer needed something to put in the fields.
 */
export const McaTemplateUseWorkspace = ({ teamId, teamUrl }: { teamId: number; teamUrl: string }) => {
  const [search] = useSearchParams();
  const id = search.get('template') ?? '';
  const version = Number(search.get('revision') ?? 1);
  const template = trpc.bizrethink.mcaTemplates.preview.useQuery(
    { teamId, id, version },
    { enabled: Boolean(id) && Number.isInteger(version) && version > 0, retry: false, refetchOnWindowFocus: false },
  );

  return (
    <LegalWorkspace>
      <div className="mx-auto max-w-5xl space-y-5 p-4 sm:p-6">
        <Link className="text-sm underline" to={`/t/${teamUrl}/mca${id ? `?template=${encodeURIComponent(id)}` : ''}`}>
          <Trans>Back to provider templates</Trans>
        </Link>
        <h1 className="font-semibold text-2xl">
          <Trans>Preview this template</Trans>
        </h1>
        <p className="text-muted-foreground">
          <Trans>
            Each document is shown as it will be published, with specimen values in place of the fields a funder's own
            platform fills per transaction. A preview is not for signing and cannot be sent.
          </Trans>
        </p>
        {template.error && <p role="alert">{template.error.message}</p>}
        {template.isLoading && (
          <p>
            <Trans>Loading the selected template…</Trans>
          </p>
        )}
        {!id && (
          <p>
            <Trans>Select a saved provider template first.</Trans>
          </p>
        )}
        {template.data && (
          <McaTemplatePreview
            key={`${id}:${version}`}
            teamId={teamId}
            templateId={id}
            version={version}
            template={template.data}
          />
        )}
      </div>
    </LegalWorkspace>
  );
};

const McaTemplatePreview = ({
  teamId,
  templateId,
  version,
  template,
}: {
  teamId: number;
  templateId: string;
  version: number;
  /*
    ONLY WHAT IT RENDERS. Demanding a whole `McaTemplateSnapshot` made every
    field of a compiled template a prop requirement; this reads the instrument
    off each document and nothing else off the template.
  */
  template: Pick<McaTemplateSnapshot, 'documents'>;
}) => {
  const [downloading, setDownloading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  /**
   * Only what this template compiles, and only what the builder produces.
   * ADR 0019 keeps the split funding letter the processor's, so it is never
   * offered here even when the programme uses one.
   */
  const available = template.documents
    .map((document) => document.instrument)
    .filter((instrument): instrument is ProducedInstrument =>
      (PRODUCED_INSTRUMENTS as readonly string[]).includes(instrument),
    );

  const download = async (instrument: ProducedInstrument) => {
    setDownloading(instrument);
    setError(null);

    try {
      const response = await fetch('/api/bizrethink/mca-template-preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teamId, id: templateId, version, instrument }),
      });

      if (!response.ok) {
        const body = (await response.json()) as { message?: string };

        throw new Error(body.message ?? 'The preview could not be generated.');
      }

      const url = URL.createObjectURL(await response.blob());
      const anchor = document.createElement('a');

      anchor.href = url;
      anchor.download = `mca-${instrument}-preview.pdf`;
      anchor.click();

      setTimeout(() => URL.revokeObjectURL(url), 30_000);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'The preview could not be generated.');
    } finally {
      setDownloading(null);
    }
  };

  return (
    <div className="space-y-5">
      <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm">
        <Trans>
          Specimen values, not a transaction. Nothing here is saved, sent or signed, and no merchant's details are
          entered or held.
        </Trans>
      </div>
      {error && (
        <p role="alert" className="text-destructive">
          {error}
        </p>
      )}
      <ul className="space-y-2">
        {available.map((instrument) => (
          <li key={instrument} className="flex items-center justify-between gap-4 rounded-md border p-3">
            <span>{INSTRUMENTS[instrument].title}</span>
            <Button type="button" disabled={downloading !== null} onClick={() => void download(instrument)}>
              {downloading === instrument ? <Trans>Preparing…</Trans> : <Trans>Download preview</Trans>}
            </Button>
          </li>
        ))}
      </ul>
      <McaPackageReader documents={template.documents} unfilled />
    </div>
  );
};
