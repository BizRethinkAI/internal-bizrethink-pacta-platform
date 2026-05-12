import React from 'react';

import { ArrowRight } from 'lucide-react';

import { cn } from '@documenso/ui/lib/utils';

// MODIFIED for BizRethink (overlay 061): optional `docsHref` prop renders
// a "Learn more →" link below the subtitle pointing at a relevant article
// on pacta.ink/docs. Each settings page that has an applicable doc article
// just passes its URL — the rendering is centralized so the visual + new-tab
// behavior stay consistent everywhere.

export type SettingsHeaderProps = {
  title: string | React.ReactNode;
  subtitle: string | React.ReactNode;
  hideDivider?: boolean;
  children?: React.ReactNode;
  className?: string;
  /** Optional URL to a pacta.ink/docs article. Renders an inline link. */
  docsHref?: string;
  /** Optional label for the docs link (default: "Learn more"). */
  docsLabel?: string;
};

export const SettingsHeader = ({
  children,
  title,
  subtitle,
  className,
  hideDivider,
  docsHref,
  docsLabel = 'Learn more',
}: SettingsHeaderProps) => {
  return (
    <>
      <div className={cn('flex flex-row items-center justify-between', className)}>
        <div>
          <h3 className="text-lg font-medium">{title}</h3>

          <p className="text-muted-foreground text-sm md:mt-2">{subtitle}</p>

          {docsHref && (
            <a
              href={docsHref}
              target="_blank"
              rel="noopener noreferrer"
              className="text-foreground/70 hover:text-foreground mt-2 inline-flex items-center gap-1 text-xs font-medium underline-offset-2 hover:underline"
            >
              {docsLabel}
              <ArrowRight className="h-3 w-3" aria-hidden="true" />
            </a>
          )}
        </div>

        {children}
      </div>

      {!hideDivider && <hr className="my-4" />}
    </>
  );
};
