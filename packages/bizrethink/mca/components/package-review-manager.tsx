import { trpc } from '@documenso/trpc/react';
import { Button } from '@documenso/ui/primitives/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@documenso/ui/primitives/form/form';
import { Input } from '@documenso/ui/primitives/input';
import { zodResolver } from '@hookform/resolvers/zod';
import { Trans } from '@lingui/react/macro';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

const ZInvitation = z.object({
  reviewerName: z.string().trim().min(1).max(200),
  reviewerEmail: z.string().email(),
  contact: z.string().trim().min(1).max(500),
});

export const McaPackageReviewManager = () => {
  const list = trpc.bizrethink.mcaPackageReview.list.useQuery();
  const form = useForm<z.infer<typeof ZInvitation>>({
    resolver: zodResolver(ZInvitation),
    defaultValues: { reviewerName: '', reviewerEmail: '', contact: '' },
  });
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [copied, setCopied] = useState('');
  const [copyError, setCopyError] = useState('');
  const share = trpc.bizrethink.mcaPackageReview.share.useMutation({
    onSuccess: async () => {
      form.reset({ reviewerName: '', reviewerEmail: '', contact: form.getValues('contact') });
      await list.refetch();
    },
  });
  const revoke = trpc.bizrethink.mcaPackageReview.revoke.useMutation({ onSuccess: () => list.refetch() });
  const answer = trpc.bizrethink.mcaPackageReview.answer.useMutation({ onSuccess: () => list.refetch() });
  return (
    <section className="mt-5 space-y-4 rounded-lg border p-4" aria-label="Complete counsel packages">
      <h2 className="font-semibold text-lg">
        <Trans>Complete counsel package</Trans>
      </h2>
      <p className="text-muted-foreground text-sm">
        <Trans>
          Create a saved, neutral review copy of all six instruments, reusable content and disclosure requirements.
          Payzli material remains processor-specific. No email is sent; copy the link for your reviewer.
        </Trans>
      </p>
      <Form {...form}>
        <form className="space-y-3" onSubmit={form.handleSubmit((values) => share.mutate(values))}>
          <fieldset disabled={share.isPending} className="grid gap-3 sm:grid-cols-3">
            <FormField
              control={form.control}
              name="reviewerName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    <Trans>Package reviewer name</Trans>
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
                    <Trans>Package reviewer email</Trans>
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
                    <Trans>Business review contact</Trans>
                  </FormLabel>
                  <FormControl>
                    <Input required maxLength={500} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </fieldset>
          <p className="text-muted-foreground text-xs">
            <Trans>
              Only the contact you enter here appears in the new brief. Use the business contact you want counsel to
              see.
            </Trans>
          </p>
          <Button type="submit" disabled={share.isPending}>
            <Trans>Create complete package link</Trans>
          </Button>
        </form>
      </Form>
      {(share.error || revoke.error || answer.error || list.error || copyError) && (
        <p role="alert">
          {share.error?.message ?? revoke.error?.message ?? answer.error?.message ?? list.error?.message ?? copyError}
        </p>
      )}
      {list.data?.map((review) => (
        <article key={review.id} className="space-y-3 rounded border p-4" data-mca-package-review={review.id}>
          <p className="font-semibold">{review.reviewerName}</p>
          <p className="break-all text-sm">
            {review.reviewerEmail} ·{' '}
            {review.status === 'closed' ? 'Revoked' : new Date(review.expiresAt) <= new Date() ? 'Expired' : 'Active'} ·{' '}
            <Trans>Expires</Trans> {new Date(review.expiresAt).toLocaleDateString()}
          </p>
          <p className="text-xs">
            <Trans>Saved package:</Trans> {review.fingerprint.slice(0, 12)} ·{' '}
            {review.findings.filter((finding) => !finding.answeredAt).length} <Trans>unanswered findings</Trans>
          </p>
          {review.status === 'open' && new Date(review.expiresAt) > new Date() && (
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(`${window.location.origin}/mca-clause-review/${review.token}`);
                    setCopied(review.id);
                    setCopyError('');
                  } catch {
                    setCopyError('Copy failed. Use the review link below.');
                  }
                }}
              >
                {copied === review.id ? <Trans>Copied</Trans> : <Trans>Copy package link</Trans>}
              </Button>
              <a
                className="self-center text-sm underline"
                href={`/mca-clause-review/${review.token}`}
                target="_blank"
                rel="noreferrer"
              >
                <Trans>Open saved review</Trans>
              </a>
              <Button
                variant="outline"
                disabled={revoke.isPending}
                onClick={() => revoke.mutate({ reviewId: review.id })}
              >
                <Trans>Revoke package link</Trans>
              </Button>
            </div>
          )}
          {review.findings.map((finding) => (
            <details key={finding.id} className="rounded border p-3">
              <summary className="cursor-pointer text-sm">
                {finding.answeredAt ? 'Answered' : 'Unanswered'} · {finding.targetIds.join(', ')}
              </summary>
              <p className="mt-2 whitespace-pre-wrap">{finding.body}</p>
              {finding.answer ? (
                <p className="mt-2 whitespace-pre-wrap">{finding.answer}</p>
              ) : (
                <div className="mt-3 space-y-2">
                  <label className="block text-sm">
                    <Trans>Response to finding</Trans>
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
                    onClick={() => answer.mutate({ findingId: finding.id, answer: answers[finding.id] })}
                  >
                    <Trans>Record response</Trans>
                  </Button>
                </div>
              )}
            </details>
          ))}
        </article>
      ))}
    </section>
  );
};
