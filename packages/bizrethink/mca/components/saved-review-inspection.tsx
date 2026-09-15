import { trpc } from '@documenso/trpc/react';
import { Button } from '@documenso/ui/primitives/button';
import { Trans } from '@lingui/react/macro';
import { useState } from 'react';
import { McaPackageCounselReader } from './package-counsel-reader';

export const SavedReviewInspection = ({
  reviewId,
  provider,
}: {
  reviewId: string;
  provider?: { teamId: number; id: string; version: number };
}) => {
  const [open, setOpen] = useState(false);
  const library = trpc.bizrethink.mcaPackageReview.inspect.useQuery(
    { reviewId },
    { enabled: open && !provider, retry: false },
  );
  const revision = trpc.bizrethink.mcaPackageReview.inspectProvider.useQuery(
    { reviewId, ...(provider ?? { teamId: 0, id: '', version: 1 }) },
    { enabled: open && Boolean(provider), retry: false },
  );
  const result = provider ? revision : library;
  return (
    <div className="space-y-3">
      <Button variant="outline" onClick={() => setOpen((previous) => !previous)}>
        {open ? <Trans>Close saved copy</Trans> : <Trans>Inspect saved review copy</Trans>}
      </Button>
      {open && (
        <div className="rounded border p-3">
          <p className="font-medium text-sm">
            <Trans>
              Staff archive view. This saved wording remains available after the public link expires or is revoked.
            </Trans>
          </p>
          {result.error && <p role="alert">{result.error.message}</p>}
          {result.isLoading && (
            <p>
              <Trans>Loading saved copy…</Trans>
            </p>
          )}
          {result.data && (
            <McaPackageCounselReader
              {...result.data}
              changedDocuments={[]}
              requirementsChanged={false}
              renderFinding={() => null}
            />
          )}
        </div>
      )}
    </div>
  );
};
