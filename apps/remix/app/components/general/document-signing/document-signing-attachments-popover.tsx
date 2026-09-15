import { toSafeHref } from '@documenso/lib/utils/is-http-url';
import { trpc } from '@documenso/trpc/react';
import { Button } from '@documenso/ui/primitives/button';
import { Popover, PopoverContent, PopoverTrigger } from '@documenso/ui/primitives/popover';
import { Trans } from '@lingui/react/macro';
import { ExternalLink, PaperclipIcon } from 'lucide-react';

export type DocumentSigningAttachmentsPopoverProps = {
  envelopeId: string;
  token: string;
  // MODIFIED for BizRethink (overlay 091): a function trigger receives the count, so a custom trigger can show it.
  trigger?: React.ReactNode | ((count: number) => React.ReactNode);
};

export const DocumentSigningAttachmentsPopover = ({
  envelopeId,
  token,
  trigger,
}: DocumentSigningAttachmentsPopoverProps) => {
  const { data: attachments } = trpc.envelope.attachment.find.useQuery({
    envelopeId,
    token,
  });

  if (!attachments || attachments.data.length === 0) {
    return null;
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        {typeof trigger === 'function' ? (
          trigger(attachments.data.length)
        ) : trigger ? (
          trigger
        ) : (
          <Button variant="outline" className="gap-2">
            <PaperclipIcon className="h-4 w-4" />
            <span>
              <Trans>Attachments</Trans>{' '}
              {attachments && attachments.data.length > 0 && <span className="ml-1">({attachments.data.length})</span>}
            </span>
          </Button>
        )}
      </PopoverTrigger>

      <PopoverContent className="w-96" align="start">
        <div className="space-y-4">
          <div>
            <h4 className="font-medium">
              <Trans>Attachments</Trans>
            </h4>
            <p className="mt-1 text-muted-foreground text-sm">
              <Trans>Documents and resources related to this envelope.</Trans>
            </p>
          </div>

          {/* MODIFIED for BizRethink (overlay 091): full names, and a list that scrolls — sixteen governing documents fell below the screen. */}
          <div className="max-h-[60vh] space-y-2 overflow-y-auto pr-1">
            {attachments?.data.map((attachment) => (
              <a
                key={attachment.id}
                href={toSafeHref(attachment.data)}
                title={attachment.data}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-center justify-between rounded-md border border-border px-3 py-2.5 transition duration-200 hover:bg-muted/50"
              >
                <div className="flex min-w-0 flex-1 items-center gap-2.5">
                  <div className="rounded bg-muted p-2">
                    <PaperclipIcon className="h-4 w-4" />
                  </div>

                  <span className="block break-words text-muted-foreground text-sm underline hover:text-foreground">
                    {attachment.label}
                  </span>
                </div>

                <ExternalLink className="h-4 w-4 opacity-0 transition duration-200 group-hover:opacity-100" />
              </a>
            ))}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};
