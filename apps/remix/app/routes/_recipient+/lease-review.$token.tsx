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

type AskedField = {
  name: string;
  label: string;
  help: string | null;
  placeholder: string | null;
  kind: string;
  answer: string;
  required: boolean;
};

export default function LeaseReviewPage() {
  const { token } = useParams();

  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [seeded, setSeeded] = useState(false);
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
  const askedFields = ((review.data as { askedFields?: AskedField[] }).askedFields ?? []) as AskedField[];

  // Seeded once, so a re-render never overwrites what is being typed.
  if (!seeded && askedFields.length > 0) {
    setSeeded(true);
    setAnswers(Object.fromEntries(askedFields.map((field) => [field.name, field.answer])));
  }

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

  /*
    A draft with a clause reference and no body was dropped without a word. A
    reviewer who typed "7.2" into "Which clause?" and got distracted saw the
    button still offering to send back with no comments, sent, and the link
    closed on a comment that was never delivered.
  */
  const abandoned = drafts.filter((draft) => draft.body.trim() === '' && draft.clauseSlug.trim() !== '');

  /*
    Required answers, enforced here because this link is one-shot: submitting
    closes it in the same transaction, so an incomplete send costs a whole
    round trip through the landlord.
  */
  const unanswered = askedFields.filter((field) => field.required && (answers[field.name] ?? '').trim() === '');

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

      {/*
        Questions the landlord passed to the tenant rather than guessing at:
        their children's names, their dog's breed, where they live now. Placed
        ABOVE the comment box, because they are the thing being asked for —
        a form under a free-text box is a form people scroll past.
      */}
      {askedFields.length > 0 && (
        <section className="mt-10">
          <h2 className="font-semibold text-lg">A few details only you can give</h2>
          <p className="mt-1 text-muted-foreground text-sm">
            The landlord has asked you to fill these in rather than guess. They appear in the lease exactly as you write
            them, and the landlord sees them before anything is sent for signature.
          </p>

          <div className="mt-4 space-y-4">
            {askedFields.map((field) => (
              <div key={field.name}>
                <Label htmlFor={`asked-${field.name}`}>
                  {field.label}
                  {field.required && <span className="ml-1 text-destructive">*</span>}
                </Label>
                {field.help && <p className="mt-0.5 mb-1.5 text-muted-foreground text-xs">{field.help}</p>}
                {/*
                  The field's own kind. Every asked field rendered as a
                  two-row textarea regardless, so a single-line answer like
                  the pre-move-in address could carry newlines straight into
                  the lease text.
                */}
                {field.kind === 'textarea' ? (
                  <Textarea
                    id={`asked-${field.name}`}
                    rows={2}
                    placeholder={field.placeholder ?? undefined}
                    value={answers[field.name] ?? ''}
                    onChange={(e) => setAnswers((prev) => ({ ...prev, [field.name]: e.target.value }))}
                  />
                ) : (
                  <Input
                    id={`asked-${field.name}`}
                    placeholder={field.placeholder ?? undefined}
                    value={answers[field.name] ?? ''}
                    onChange={(e) => setAnswers((prev) => ({ ...prev, [field.name]: e.target.value }))}
                  />
                )}
              </div>
            ))}
          </div>
        </section>
      )}

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
                  aria-label={`Remove ${draft.clauseSlug || `comment ${index + 1}`}`}
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
            disabled={submit.isPending || unanswered.length > 0 || abandoned.length > 0}
            onClick={() =>
              submit.mutate({
                token: token ?? '',
                comments: usable.map((draft) => ({
                  clauseSlug: draft.clauseSlug.trim() === '' ? null : draft.clauseSlug.trim(),
                  body: draft.body.trim(),
                })),
                answers,
              })
            }
          >
            {submit.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sending…
              </>
            ) : usable.length === 0 && askedFields.length > 0 ? (
              'Send these back'
            ) : usable.length === 0 ? (
              'Send back with no comments'
            ) : (
              `Send back ${usable.length} comment${usable.length === 1 ? '' : 's'}`
            )}
          </Button>

          <p className="text-muted-foreground text-xs">
            Sending closes this link. Add everything you want to say first.
          </p>

          {/*
            Both of these are only worth saying because the link is ONE-SHOT.
            Submitting closes it in the same transaction, so anything missed
            here costs a whole round trip back through the landlord.
          */}
          {unanswered.length > 0 && (
            <p className="text-destructive text-xs">
              {unanswered.length === 1 ? 'One answer is' : `${unanswered.length} answers are`} still needed:{' '}
              {unanswered.map((field) => field.label).join('; ')}
            </p>
          )}

          {abandoned.length > 0 && (
            <p className="text-destructive text-xs">
              {abandoned.length === 1
                ? 'One comment names a clause but has nothing written in it, and would not be sent.'
                : `${abandoned.length} comments name a clause but have nothing written in them, and would not be sent.`}{' '}
              Write them, or remove them.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
