import { trpc } from '@documenso/trpc/react';
import { Button } from '@documenso/ui/primitives/button';
import { Trans } from '@lingui/react/macro';
import { useState } from 'react';
import { McaPackageCounselReader } from './package-counsel-reader';

export const McaPackageCounselRoute = ({ token }: { token: string }) => {
  const view = trpc.bizrethink.mcaPackageReview.open.useQuery({ token }, { retry: false });
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const record = trpc.bizrethink.mcaPackageReview.recordFinding.useMutation({
    onSuccess: async (_data, input) => {
      setDrafts((previous) => ({ ...previous, [input.targetIds[0]]: '' }));
      await view.refetch();
    },
  });
  if (view.error) {
    return (
      <div role="alert" className="mx-auto max-w-xl p-8">
        <h1 className="font-semibold text-xl">
          <Trans>Review unavailable</Trans>
        </h1>
        <p>{view.error.message}</p>
      </div>
    );
  }
  if (!view.data) {
    return (
      <p className="p-8">
        <Trans>Loading counsel package…</Trans>
      </p>
    );
  }
  const data = view.data;
  return (
    <McaPackageCounselReader
      {...data}
      renderFinding={(item) => {
        const target = `content:${item.slug}`;
        return (
          <details className="rounded border p-3">
            <summary className="cursor-pointer text-sm">
              <Trans>Findings for this item</Trans> ·{' '}
              {data.findings.filter((finding) => finding.targetIds.includes(target)).length}
            </summary>
            <div className="mt-3 space-y-3">
              {data.findings
                .filter((finding) => finding.targetIds.includes(target))
                .map((finding) => (
                  <div key={finding.id} className="rounded bg-muted/30 p-3 text-sm">
                    <p className="font-medium">{finding.authorName}</p>
                    <p className="whitespace-pre-wrap">{finding.body}</p>
                    {finding.answer ? (
                      <p className="mt-2 whitespace-pre-wrap">
                        <Trans>Staff response:</Trans> {finding.answer}
                      </p>
                    ) : (
                      <p>
                        <Trans>Unanswered — approval held</Trans>
                      </p>
                    )}
                  </div>
                ))}
              <label className="block text-sm">
                <Trans>Finding</Trans>
                <textarea
                  className="mt-1 block min-h-24 w-full rounded border bg-background p-2"
                  maxLength={10000}
                  value={drafts[target] ?? ''}
                  onChange={(event) => setDrafts((previous) => ({ ...previous, [target]: event.target.value }))}
                />
              </label>
              {record.error && record.variables?.targetIds.includes(target) && (
                <p role="alert">{record.error.message}</p>
              )}
              <Button
                disabled={record.isPending || !drafts[target]?.trim()}
                onClick={() => record.mutate({ token, targetIds: [target], body: drafts[target] })}
              >
                <Trans>Record finding</Trans>
              </Button>
            </div>
          </details>
        );
      }}
    />
  );
};
