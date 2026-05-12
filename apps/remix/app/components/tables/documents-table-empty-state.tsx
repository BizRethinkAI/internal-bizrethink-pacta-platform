// MODIFIED for BizRethink (overlay 061): docs CTA on the all-empty state so
// new users who don't know "how do I send a document?" have a clear path
// to the walkthrough instead of staring at an empty table.
import { msg } from '@lingui/core/macro';
import { useLingui } from '@lingui/react';
import { ArrowRight, Bird, CheckCircle2 } from 'lucide-react';
import { match } from 'ts-pattern';

import { ExtendedDocumentStatus } from '@documenso/prisma/types/extended-document-status';

export type DocumentsTableEmptyStateProps = { status: ExtendedDocumentStatus };

export const DocumentsTableEmptyState = ({ status }: DocumentsTableEmptyStateProps) => {
  const { _ } = useLingui();

  const {
    title,
    message,
    icon: Icon,
    docsHref,
    docsLabel,
  } = match(status)
    .with(ExtendedDocumentStatus.COMPLETED, () => ({
      title: msg`Nothing to do`,
      message: msg`There are no completed documents yet. Documents that you have created or received will appear here once completed.`,
      icon: CheckCircle2,
      docsHref: undefined as string | undefined,
      docsLabel: undefined as string | undefined,
    }))
    .with(ExtendedDocumentStatus.DRAFT, () => ({
      title: msg`No active drafts`,
      message: msg`There are no active drafts at the current moment. You can upload a document to start drafting.`,
      icon: CheckCircle2,
      docsHref: undefined as string | undefined,
      docsLabel: undefined as string | undefined,
    }))
    .with(ExtendedDocumentStatus.ALL, () => ({
      title: msg`We're all empty`,
      message: msg`You have not yet created or received any documents. To create a document please upload one.`,
      icon: Bird,
      docsHref: 'https://pacta.ink/docs/getting-started/send-your-first-document',
      docsLabel: 'Learn how to send your first document',
    }))
    .otherwise(() => ({
      title: msg`Nothing to do`,
      message: msg`All documents have been processed. Any new documents that are sent or received will show here.`,
      icon: CheckCircle2,
      docsHref: undefined as string | undefined,
      docsLabel: undefined as string | undefined,
    }));

  return (
    <div
      className="text-muted-foreground/60 flex h-60 flex-col items-center justify-center gap-y-4"
      data-testid="empty-document-state"
    >
      <Icon className="h-12 w-12" strokeWidth={1.5} />

      <div className="text-center">
        <h3 className="text-lg font-semibold">{_(title)}</h3>

        <p className="mt-2 max-w-[60ch]">{_(message)}</p>

        {docsHref && docsLabel && (
          <a
            href={docsHref}
            target="_blank"
            rel="noopener noreferrer"
            className="text-foreground/80 hover:text-foreground mt-4 inline-flex items-center gap-1.5 text-sm font-medium underline-offset-2 hover:underline"
          >
            {docsLabel}
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </a>
        )}
      </div>
    </div>
  );
};
