import { trpc } from '@documenso/trpc/react';
import { Alert, AlertDescription, AlertTitle } from '@documenso/ui/primitives/alert';
import { Button } from '@documenso/ui/primitives/button';
import { Input } from '@documenso/ui/primitives/input';
import { Label } from '@documenso/ui/primitives/label';
import { Textarea } from '@documenso/ui/primitives/textarea';
import { i18n } from '@lingui/core';
import { msg } from '@lingui/core/macro';
import { AlertTriangle, Check, FileText, Loader2, MessageSquarePlus, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useParams } from 'react-router';

/**
 * The reviewer's side of the review loop. A token, no account.
 *
 * A lawyer or a tenant must not have to sign up to read a lease they were
 * sent, so this route is authorised by the token in the URL and nothing else.
 * It is inside `_recipient+` because that group exists for exactly this — a
 * recipient of a resource whose authentication we do not care about — and it
 * carries `noindex, nofollow`.
 *
 * WHAT THE TWO AUDIENCES ARE TOLD DIFFERS, because what happens to their
 * comments differs. An attorney's comments block the send until the landlord
 * dispositions each one. A tenant's never block: a tenant comment is a
 * negotiating position, not a defect report. Saying so plainly is the honest
 * thing — a tenant who believes their comment halts the lease has been
 * misled.
 */

export function meta() {
  return [
    { title: i18n._(msg`Review a lease`) },
    { name: 'robots', content: 'noindex, nofollow, noarchive, nosnippet, noimageindex' },
  ];
}

type Draft = { clauseSlug: string; body: string };

export default function LeaseReviewPage() {
  const { token } = useParams();

  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [submitted, setSubmitted] = useState(false);

  const review = trpc.bizrethink.leaseBuilder.review.open.useQuery(
    { token: token ?? '' },
    { enabled: Boolean(token), retry: false },
  );

  const submit = trpc.bizrethink.leaseBuilder.review.submit.useMutation({
    onSuccess: () => setSubmitted(true),
  });

  if (review.isLoading) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center text-muted-foreground">
        <Loader2 className="mx-auto h-5 w-5 animate-spin" />
      </div>
    );
  }

  /*
    Absent, expired and already-returned all arrive here identically, by
    design — the server does not distinguish them.
  */
  if (review.error || !review.data) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>This review link is no longer active</AlertTitle>
          <AlertDescription>
            It may have expired, or the review may already have been returned. Ask whoever sent it for a new link.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const { review: meta, matter, comments, changedSinceIssued } = review.data;
  const isAttorney = meta.audience === 'attorney';

  if (submitted) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16">
        <Alert>
          <Check className="h-4 w-4" />
          <AlertTitle>Thank you — your review has been sent back</AlertTitle>
          <AlertDescription>
            {isAttorney
              ? 'The lease cannot be sent for signature until each of your comments has been accepted, actioned, or dismissed with a reason.'
              : 'Your comments have gone to the landlord. They decide what to change before the lease is sent for signature.'}{' '}
            This link is now closed.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const usable = drafts.filter((draft) => draft.body.trim() !== '');

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10">
      <h1 className="font-semibold text-2xl">{matter.title}</h1>
      <p className="mt-1 text-muted-foreground text-sm">
        For review by {meta.reviewerName}
        {meta.expiresAt && ` · link expires ${new Date(meta.expiresAt).toLocaleDateString()}`}
      </p>

      {/*
        What happens to a comment, said up front. An attorney needs to know
        their note is binding until answered; a tenant needs to know theirs is
        not, so they raise it with the landlord rather than assuming the
        document is on hold.
      */}
      <Alert className="mt-6">
        <MessageSquarePlus className="h-4 w-4" />
        <AlertTitle>{isAttorney ? 'Your comments block signature' : 'Your comments go to the landlord'}</AlertTitle>
        <AlertDescription>
          {isAttorney
            ? 'This lease cannot be sent for signature while any of your comments is unanswered. The landlord must accept it, change something in response, or dismiss it with a written reason that is recorded.'
            : 'Nothing here is agreed yet. The landlord reads your comments and decides what to change; anything still unresolved is worth raising with them directly before you sign.'}
        </AlertDescription>
      </Alert>

      {changedSinceIssued && (
        <Alert variant="warning" className="mt-4">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>The lease has changed since this link was sent</AlertTitle>
          <AlertDescription>
            The document below is current. Anything you were told about an earlier version may no longer hold.
          </AlertDescription>
        </Alert>
      )}

      <div className="mt-6">
        <Button asChild variant="outline">
          <a href={`/lease-review/${token}/document`} target="_blank" rel="noreferrer">
            <FileText className="mr-2 h-4 w-4" />
            Open the lease
          </a>
        </Button>
        {/*
          Rendered rather than embedded: a PDF in an iframe is unreadable on a
          phone, and a reviewer squinting at a lease is a reviewer who misses
          something.
        */}
      </div>

      {comments.length > 0 && (
        <section className="mt-10">
          <h2 className="font-semibold text-lg">Comments already left</h2>
          <ul className="mt-3 space-y-3">
            {comments.map((comment) => (
              <li key={comment.id} className="rounded-lg border p-4">
                {comment.clauseSlug && <p className="font-mono text-muted-foreground text-xs">{comment.clauseSlug}</p>}
                <p className="mt-1 whitespace-pre-wrap text-sm">{comment.body}</p>
                <p className="mt-2 text-muted-foreground text-xs">
                  {comment.authorName} · {new Date(comment.createdAt).toLocaleDateString()}
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mt-10">
        <h2 className="font-semibold text-lg">Your comments</h2>
        <p className="mt-1 text-muted-foreground text-sm">
          Add one per point. Naming the clause helps, but a comment about the lease as a whole is fine too.
        </p>

        <div className="mt-4 space-y-4">
          {drafts.map((draft, index) => (
            // Index as key: drafts have no id and are never reordered.
            <div key={index} className="rounded-lg border p-4">
              <div className="flex items-start gap-4">
                <div className="flex-1 space-y-3">
                  <div>
                    <Label htmlFor={`slug-${index}`}>Which clause? (optional)</Label>
                    <Input
                      id={`slug-${index}`}
                      value={draft.clauseSlug}
                      placeholder="e.g. 7.2, or Security Deposit"
                      onChange={(e) =>
                        setDrafts((prev) =>
                          prev.map((d, i) => (i === index ? { ...d, clauseSlug: e.target.value } : d)),
                        )
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor={`body-${index}`}>Comment</Label>
                    <Textarea
                      id={`body-${index}`}
                      rows={4}
                      value={draft.body}
                      onChange={(e) =>
                        setDrafts((prev) => prev.map((d, i) => (i === index ? { ...d, body: e.target.value } : d)))
                      }
                    />
                  </div>
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-6"
                  aria-label="Remove this comment"
                  onClick={() => setDrafts((prev) => prev.filter((_, i) => i !== index))}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}

          <Button variant="outline" onClick={() => setDrafts((prev) => [...prev, { clauseSlug: '', body: '' }])}>
            <Plus className="mr-2 h-4 w-4" />
            Add a comment
          </Button>
        </div>

        {submit.error && (
          <Alert variant="destructive" className="mt-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Your review was not sent</AlertTitle>
            <AlertDescription>{submit.error.message}</AlertDescription>
          </Alert>
        )}

        {/*
          One submission, then the link closes — a review is a single act, and
          a link that stays live afterwards can be reused by whoever else has
          the URL. Said plainly here so nobody submits half a review.
        */}
        <div className="mt-8 flex items-center gap-4 border-t pt-6">
          <Button
            disabled={submit.isPending}
            onClick={() =>
              submit.mutate({
                token: token ?? '',
                comments: usable.map((draft) => ({
                  clauseSlug: draft.clauseSlug.trim() === '' ? null : draft.clauseSlug.trim(),
                  body: draft.body.trim(),
                })),
              })
            }
          >
            {submit.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sending…
              </>
            ) : usable.length === 0 ? (
              'Send back with no comments'
            ) : (
              `Send back ${usable.length} comment${usable.length === 1 ? '' : 's'}`
            )}
          </Button>

          <p className="text-muted-foreground text-xs">
            Sending closes this link. Add everything you want to say first.
          </p>
        </div>
      </section>
    </div>
  );
}
