import { trpc } from '@documenso/trpc/react';
import { Button } from '@documenso/ui/primitives/button';
import { Trans } from '@lingui/react/macro';
import { useState } from 'react';
import type { McaReviewPackage } from '../review/package-schema';
import { reviewTargets } from '../review/targets';

type Finding = {
  id: string;
  targetIds: string[];
  body: string;
  authorName: string;
  answer: string | null;
  answeredAt: Date | null;
};

export const McaHolisticReviewTools = ({
  token,
  snapshot,
  findings,
  reviewedTargetIds,
  completedAt,
  completionBlockers,
  onChanged,
}: {
  token: string;
  snapshot: McaReviewPackage;
  findings: Finding[];
  reviewedTargetIds: string[];
  completedAt: Date | null;
  completionBlockers: string[];
  onChanged: () => Promise<unknown>;
}) => {
  const [selected, setSelected] = useState<string[]>([]);
  const [query, setQuery] = useState('');
  const [body, setBody] = useState('');
  const [pendingReview, setPendingReview] = useState<{ targetId: string; reviewed: boolean } | null>(null);
  const targets = reviewTargets(snapshot);
  const units = targets.filter((target) => target.reviewUnit);
  const record = trpc.bizrethink.mcaPackageReview.recordFinding.useMutation({
    onSuccess: async () => {
      setBody('');
      setSelected([]);
      await onChanged();
    },
  });
  const mark = trpc.bizrethink.mcaPackageReview.markUnit.useMutation({
    onSuccess: onChanged,
    onSettled: () => setPendingReview(null),
  });
  const complete = trpc.bizrethink.mcaPackageReview.complete.useMutation({ onSuccess: onChanged });
  return (
    <section className="space-y-4 rounded-lg border p-5" aria-label="Holistic review">
      <h2 className="font-semibold text-xl">
        <Trans>Package review progress & findings</Trans>
      </h2>
      <p role="status">
        {units.filter((unit) => reviewedTargetIds.includes(unit.id)).length} / {units.length}{' '}
        <Trans>review units marked reviewed</Trans> · {findings.filter((finding) => !finding.answeredAt).length}{' '}
        <Trans>unanswered findings</Trans>
      </p>
      <p className="text-muted-foreground text-sm">
        <Trans>
          Review completion records coverage of this saved copy. It is not an attorney’s approval, confirmation of
          current law, or permission to send or sign.
        </Trans>
      </p>
      {completedAt && (
        <p className="font-medium">
          <Trans>Review complete for saved copy</Trans> · {new Date(completedAt).toLocaleDateString()}
        </p>
      )}
      <details className="rounded border p-3">
        <summary className="cursor-pointer">
          <Trans>Review checklist</Trans>
        </summary>
        <div className="mt-3 space-y-2">
          {units.map((unit) => (
            <label key={unit.id} className="flex items-start gap-3 text-sm">
              <input
                type="checkbox"
                className="mt-1"
                disabled={pendingReview !== null || mark.isPending || complete.isPending}
                checked={
                  pendingReview?.targetId === unit.id ? pendingReview.reviewed : reviewedTargetIds.includes(unit.id)
                }
                onChange={(event) => {
                  const change = { targetId: unit.id, reviewed: event.target.checked };
                  setPendingReview(change);
                  mark.mutate({ token, ...change });
                }}
              />
              <span>
                <Trans>Reviewed:</Trans> {unit.label}
              </span>
            </label>
          ))}
        </div>
      </details>
      {!completedAt && (
        <>
          <ul className="list-disc pl-5 text-muted-foreground text-sm">
            {completionBlockers.map((blocker) => (
              <li key={blocker}>{blocker}</li>
            ))}
          </ul>
          <Button
            disabled={completionBlockers.length > 0 || complete.isPending || mark.isPending}
            onClick={() => complete.mutate({ token })}
          >
            <Trans>Complete review of saved copy</Trans>
          </Button>
        </>
      )}
      <details className="rounded border p-3">
        <summary className="cursor-pointer font-medium">
          <Trans>Record a holistic finding</Trans>
        </summary>
        <div className="mt-3 space-y-3">
          <p className="text-sm">
            <Trans>
              Select the whole package, one or more provisions, instruments, requirements or processor forms. Unanswered
              findings prevent review completion. Shared-library content findings also hold the affected wording against
              a new approval; provider findings remain with that provider revision.
            </Trans>
          </p>
          <label className="block text-sm">
            <Trans>Find review targets</Trans>
            <input
              className="mt-1 w-full rounded border p-2"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>
          <div className="max-h-52 space-y-2 overflow-y-auto rounded border p-3">
            {targets
              .filter((target) => target.label.toLowerCase().includes(query.toLowerCase()))
              .map((target) => (
                <label key={target.id} className="flex items-start gap-3 text-sm">
                  <input
                    type="checkbox"
                    className="mt-1"
                    checked={selected.includes(target.id)}
                    disabled={!selected.includes(target.id) && selected.length >= 50}
                    onChange={(event) =>
                      setSelected((previous) =>
                        event.target.checked ? [...previous, target.id] : previous.filter((id) => id !== target.id),
                      )
                    }
                  />
                  <span>{target.label}</span>
                </label>
              ))}
          </div>
          <p className="text-sm">
            {selected.length} <Trans>targets selected</Trans>
          </p>
          <label className="block text-sm">
            <Trans>Holistic finding</Trans>
            <textarea
              className="mt-1 min-h-28 w-full rounded border p-2"
              maxLength={10000}
              value={body}
              onChange={(event) => setBody(event.target.value)}
            />
          </label>
          <Button
            disabled={record.isPending || !body.trim() || selected.length === 0}
            onClick={() => record.mutate({ token, targetIds: selected, body })}
          >
            <Trans>Record holistic finding</Trans>
          </Button>
        </div>
      </details>
      {(record.error || mark.error || complete.error) && (
        <p role="alert">{record.error?.message ?? mark.error?.message ?? complete.error?.message}</p>
      )}
      <details className="rounded border p-3">
        <summary className="cursor-pointer">
          <Trans>All findings on this package</Trans> · {findings.length}
        </summary>
        <div className="mt-3 space-y-4">
          {findings.map((finding) => (
            <article key={finding.id} className="space-y-2 border-b pb-3 text-sm">
              <p className="font-semibold">
                {finding.authorName} · {finding.answeredAt ? 'Answered' : 'Unanswered'}
              </p>
              <p>{finding.targetIds.map((id) => targets.find((target) => target.id === id)?.label ?? id).join('; ')}</p>
              <p className="whitespace-pre-wrap">{finding.body}</p>
              {finding.answer && (
                <p className="whitespace-pre-wrap">
                  <Trans>Staff response:</Trans> {finding.answer}
                </p>
              )}
            </article>
          ))}
        </div>
      </details>
    </section>
  );
};
