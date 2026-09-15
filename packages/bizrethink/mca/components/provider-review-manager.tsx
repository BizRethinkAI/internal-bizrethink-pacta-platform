import { trpc } from '@documenso/trpc/react';
import { Button } from '@documenso/ui/primitives/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@documenso/ui/primitives/form/form';
import { Input } from '@documenso/ui/primitives/input';
import { zodResolver } from '@hookform/resolvers/zod';
import { Trans } from '@lingui/react/macro';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { SavedReviewInspection } from './saved-review-inspection';

const ZInvitation = z.object({
  reviewerName: z.string().trim().min(1).max(200),
  reviewerEmail: z.string().email(),
  contact: z.string().trim().min(1).max(500),
  processorText: z.string().max(500000),
});

export const McaProviderReviewManager = ({
  teamId,
  id,
  version,
  canWrite,
  current,
}: {
  teamId: number;
  id: string;
  version: number;
  canWrite: boolean;
  current: boolean;
}) => {
  const scope = { teamId, id, version };
  const [open, setOpen] = useState(false);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const form = useForm<z.infer<typeof ZInvitation>>({
    resolver: zodResolver(ZInvitation),
    defaultValues: { reviewerName: '', reviewerEmail: '', contact: '', processorText: '' },
  });
  const list = trpc.bizrethink.mcaPackageReview.listProvider.useQuery(scope, { enabled: open, retry: false });
  const share = trpc.bizrethink.mcaPackageReview.shareProvider.useMutation({
    onSuccess: async () => {
      form.reset({ ...form.getValues(), reviewerName: '', reviewerEmail: '' });
      await list.refetch();
    },
  });
  const answer = trpc.bizrethink.mcaPackageReview.answerProvider.useMutation({ onSuccess: () => list.refetch() });
  const revoke = trpc.bizrethink.mcaPackageReview.revokeProvider.useMutation({ onSuccess: () => list.refetch() });
  return (
    <details className="space-y-4 rounded-lg border p-4" onToggle={(event) => setOpen(event.currentTarget.open)}>
      <summary className="cursor-pointer font-semibold">
        <Trans>Counsel review of this revision</Trans>
      </summary>
      <p className="text-sm">
        <Trans>
          Invite counsel to review this saved provider revision, its applicable instruments and requirements together.
          Each invitation freezes its own copy. Internal draft access is required; an invitation does not approve or
          release the template.
        </Trans>
      </p>
      {canWrite && current && (
        <Form {...form}>
          <form
            className="space-y-3"
            onSubmit={form.handleSubmit((values) =>
              share.mutate({
                ...scope,
                ...values,
                processorText: values.processorText.trim() ? values.processorText : null,
              }),
            )}
          >
            <fieldset disabled={share.isPending} className="grid gap-3 sm:grid-cols-3">
              <FormField
                control={form.control}
                name="reviewerName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      <Trans>Provider reviewer name</Trans>
                    </FormLabel>
                    <FormControl>
                      <Input required maxLength={200} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="reviewerEmail"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      <Trans>Provider reviewer email</Trans>
                    </FormLabel>
                    <FormControl>
                      <Input required type="email" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="contact"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      <Trans>Provider review contact</Trans>
                    </FormLabel>
                    <FormControl>
                      <Input required maxLength={500} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </fieldset>
            <FormField
              control={form.control}
              name="processorText"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    <Trans>Controlled processor form text</Trans>
                  </FormLabel>
                  <FormControl>
                    <textarea
                      className="min-h-32 w-full rounded border bg-background p-3"
                      maxLength={500000}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <p className="text-muted-foreground text-xs">
              <Trans>
                Include the complete text of the exact processor form named in this revision, preserving wording and
                order. If left empty, the saved package is labelled incomplete and counsel cannot complete review. No
                form or acceptance is inferred from a reference.
              </Trans>
            </p>
            <Button type="submit" disabled={share.isPending}>
              <Trans>Create provider review link</Trans>
            </Button>
          </form>
        </Form>
      )}
      {!current && (
        <p>
          <Trans>
            Refresh stale source content in a new template revision before creating another invitation. Existing saved
            reviews remain available below.
          </Trans>
        </p>
      )}
      {(share.error || list.error || answer.error || revoke.error) && (
        <p role="alert">
          {share.error?.message ?? list.error?.message ?? answer.error?.message ?? revoke.error?.message}
        </p>
      )}
      {list.data?.map((review) => (
        <article key={review.id} className="space-y-3 rounded border p-4" data-mca-provider-review={review.id}>
          <h3 className="font-semibold">{review.reviewerName}</h3>
          <p className="text-sm">
            {review.status === 'closed' ? 'Revoked' : new Date(review.expiresAt) <= new Date() ? 'Expired' : 'Active'} ·{' '}
            {review.completedAt ? 'Review complete for saved copy' : 'Review in progress'} ·{' '}
            {review.findings.filter((finding) => !finding.answeredAt).length} <Trans>unanswered findings</Trans>
          </p>
          {review.status === 'open' && new Date(review.expiresAt) > new Date() && (
            <div className="flex gap-3">
              <a
                href={`/mca-clause-review/${review.token}`}
                target="_blank"
                rel="noreferrer"
                className="self-center text-sm underline"
              >
                <Trans>Open provider review</Trans>
              </a>
              {canWrite && (
                <Button
                  variant="outline"
                  disabled={revoke.isPending}
                  onClick={() => revoke.mutate({ ...scope, reviewId: review.id })}
                >
                  <Trans>Revoke provider review</Trans>
                </Button>
              )}
            </div>
          )}
          <SavedReviewInspection reviewId={review.id} provider={scope} />
          {review.findings.map((finding) => (
            <details key={finding.id} className="rounded border p-3">
              <summary className="cursor-pointer text-sm">
                {finding.answeredAt ? 'Answered' : 'Unanswered'} · {finding.targetIds.join(', ')}
              </summary>
              <p className="mt-2 whitespace-pre-wrap">{finding.body}</p>
              {finding.answer ? (
                <p className="mt-2 whitespace-pre-wrap">{finding.answer}</p>
              ) : (
                canWrite && (
                  <div className="mt-3 space-y-2">
                    <label className="block text-sm">
                      <Trans>Provider finding response</Trans>
                      <textarea
                        className="mt-1 w-full rounded border p-2"
                        maxLength={10000}
                        value={answers[finding.id] ?? ''}
                        onChange={(event) =>
                          setAnswers((previous) => ({ ...previous, [finding.id]: event.target.value }))
                        }
                      />
                    </label>
                    <Button
                      disabled={answer.isPending || !answers[finding.id]?.trim()}
                      onClick={() => answer.mutate({ ...scope, findingId: finding.id, answer: answers[finding.id] })}
                    >
                      <Trans>Record provider response</Trans>
                    </Button>
                  </div>
                )
              )}
            </details>
          ))}
        </article>
      ))}
    </details>
  );
};
