import { Trans } from '@lingui/react/macro';
import { File } from 'lucide-react';

import { NEXT_PUBLIC_WEBAPP_URL } from '@documenso/lib/constants/app';
import { VerifiedIcon } from '@documenso/ui/icons/verified';
import { cn } from '@documenso/ui/lib/utils';
import { Button } from '@documenso/ui/primitives/button';

// MODIFIED for BizRethink (overlay 054): Pacta-branded equivalent of
// `UserProfileTimur` that ships with upstream Documenso. The Timur version
// hard-codes a photo of one of Documenso's founders and uses Documenso's
// brand voice — out of place on Pacta's signup page. This component mirrors
// the layout (URL pill / avatar / verified badge / "Documents" card stub)
// but uses a generic B2B persona ("Acme Capital") and Pacta's voice so the
// hero feels native to the product.
//
// No image asset dependency on purpose — uses an initials-avatar tile so
// adding/maintaining the page doesn't require image-pipeline work. If we
// ever want a real photo or video preview, swap the colored tile out.

export type UserProfilePactaProps = {
  className?: string;
  rows?: number;
};

export const UserProfilePacta = ({ className, rows = 2 }: UserProfilePactaProps) => {
  const baseUrl = new URL(NEXT_PUBLIC_WEBAPP_URL() ?? 'http://localhost:3000');

  return (
    <div
      className={cn(
        'dark:bg-background flex flex-col items-center rounded-xl bg-neutral-100 p-4',
        className,
      )}
    >
      <div className="border-border bg-background text-muted-foreground inline-block max-w-full truncate rounded-md border px-2.5 py-1.5 text-sm">
        {baseUrl.host}/u/acme-capital
      </div>

      <div className="mt-4">
        <div className="bg-documenso-200 dark:bg-documenso-500/20 text-documenso-800 dark:text-documenso-300 flex h-20 w-20 items-center justify-center rounded-full text-2xl font-semibold">
          AC
        </div>
      </div>

      <div className="mt-6">
        <div className="flex items-center justify-center gap-x-2">
          <h2 className="text-2xl font-semibold">Acme Capital</h2>

          <VerifiedIcon className="text-primary h-8 w-8" />
        </div>

        <p className="text-muted-foreground mt-4 max-w-[40ch] text-center text-sm">
          <Trans>Agreements you can trust.</Trans>
        </p>

        <p className="text-muted-foreground mt-1 max-w-[40ch] text-center text-sm">
          <Trans>
            Pick a document below to start signing. Every Pacta signature is timestamped, audited,
            and cryptographically sealed.
          </Trans>
        </p>
      </div>

      <div className="mt-8 w-full">
        <div className="dark:divide-foreground/30 dark:border-foreground/30 divide-y-2 divide-neutral-200 overflow-hidden rounded-lg border-2 border-neutral-200">
          <div className="text-muted-foreground dark:bg-foreground/20 bg-neutral-50 p-4 font-medium">
            <Trans>Documents</Trans>
          </div>

          {Array(rows)
            .fill(0)
            .map((_, i) => (
              <div
                key={i}
                className="dark:bg-foreground/10 flex items-center justify-between bg-white p-4"
              >
                <div className="flex items-center">
                  <File className="text-muted-foreground mr-2 h-5 w-5" />
                  <div className="dark:bg-foreground/20 h-3 w-32 rounded-md bg-neutral-200" />
                </div>

                <Button size="sm">
                  <Trans>Sign</Trans>
                </Button>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
};
