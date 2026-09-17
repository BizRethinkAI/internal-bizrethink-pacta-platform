import { trpc } from '@documenso/trpc/react';
import { Button } from '@documenso/ui/primitives/button';
import { Trans } from '@lingui/react/macro';
import { useState } from 'react';
import { INSTRUMENTS } from '../clauses/instruments';
import type { ProducedInstrument } from '../publish/recipient-contract';

/**
 * Publishing a template, and being told why you cannot.
 *
 * ADR 0023: publication is the control point. Once a recipe becomes a template
 * in the funder's team, the existing API can send it and nothing of ours
 * intervenes — so this is the last moment anybody chooses.
 *
 * IT REFUSES TODAY, and that is the designed state rather than an unfinished
 * one. No clause carries a counsel approval, so every package fails. The
 * refusals are shown BEFORE the button rather than after it, because a control
 * that only explains itself once pressed teaches people to press it and read
 * afterwards.
 *
 * Publishing needs team ADMIN or MANAGER. That is asserted in
 * `publishMcaTemplate`, not here — a screen is not a permission.
 */
export const McaPublishTemplate = ({
  teamId,
  templateId,
  version,
  instrument,
}: {
  teamId: number;
  templateId: string;
  version: number;
  instrument: ProducedInstrument;
}) => {
  const [error, setError] = useState<string | null>(null);
  const [published, setPublished] = useState<{ templateId: number } | null>(null);

  const status = trpc.bizrethink.mcaTemplates.publicationStatus.useQuery(
    { teamId, id: templateId, version, instrument },
    { retry: false, refetchOnWindowFocus: false },
  );

  const publish = trpc.bizrethink.mcaTemplates.publish.useMutation({
    onSuccess: (result) => {
      setError(null);
      setPublished({ templateId: result.templateId });
      void status.refetch();
    },
    onError: (cause) => setError(cause.message),
  });

  const refusals = status.data?.refusals ?? [];

  return (
    <section className="rounded-lg border p-5">
      <h3 className="font-semibold">
        <Trans>Publish {INSTRUMENTS[instrument].title}</Trans>
      </h3>

      {status.isLoading && (
        <p className="mt-1 text-muted-foreground text-sm">
          <Trans>Checking what stands in the way…</Trans>
        </p>
      )}

      {status.error && <p role="alert">{status.error.message}</p>}

      {status.data?.publishable === false && (
        <>
          <p className="mt-1 text-sm">
            <Trans>
              This template cannot be published yet. Everything below has to be resolved first — each line is a clause
              or an input, not a warning to acknowledge.
            </Trans>
          </p>
          <ul className="mt-3 max-h-64 space-y-1 overflow-y-auto text-sm">
            {refusals.map((refusal, index) => (
              <li key={`${refusal.slug}-${index}`} className="border-l-2 pl-3">
                <span className="font-medium">{refusal.slug}</span> — {refusal.reason}
              </li>
            ))}
          </ul>
          <p className="mt-2 text-muted-foreground text-xs">
            <Trans>{refusals.length} outstanding.</Trans>
          </p>
        </>
      )}

      {published && (
        <p className="mt-3 rounded border border-emerald-300 bg-emerald-50 p-3 text-sm">
          <Trans>Published as template {published.templateId}. The record is available over the API.</Trans>
        </p>
      )}

      {error && (
        <p role="alert" className="mt-3 text-destructive text-sm">
          {error}
        </p>
      )}

      <Button
        className="mt-4"
        type="button"
        disabled={status.isLoading || publish.isPending || status.data?.publishable !== true}
        onClick={() => publish.mutate({ teamId, id: templateId, version, instrument })}
      >
        {publish.isPending ? <Trans>Publishing…</Trans> : <Trans>Publish to this team</Trans>}
      </Button>
    </section>
  );
};
