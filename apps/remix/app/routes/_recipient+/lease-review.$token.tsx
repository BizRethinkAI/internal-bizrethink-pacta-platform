import { trpc } from '@documenso/trpc/react';
import { Alert, AlertDescription, AlertTitle } from '@documenso/ui/primitives/alert';
import { Button } from '@documenso/ui/primitives/button';
import { Input } from '@documenso/ui/primitives/input';
import { Label } from '@documenso/ui/primitives/label';
import { Textarea } from '@documenso/ui/primitives/textarea';
import { i18n } from '@lingui/core';
import { msg } from '@lingui/core/macro';
import { AlertTriangle, Check, Download, Loader2, MessageSquarePlus } from 'lucide-react';
import { useState } from 'react';
import { useParams } from 'react-router';
import { BrandingLogo } from '~/components/general/branding-logo';

/**
 * The reviewer's side of the review loop. A token, no account.
 *
 * A lawyer or a tenant must not have to sign up to read a lease they were
 * sent, so this route is authorised by the token in the URL and nothing else.
 * It is inside `_recipient+` because that group exists for exactly this — a
 * recipient of a resource whose authentication we do not care about — and it
 * carries `noindex, nofollow`.
 *
 * THE LEASE IS THE PAGE. It used to be a button. "Open the lease" launched the
 * signing PDF in another tab, so a reviewer read in one window and, in the
 * other, typed a clause name from memory into a free-text box — unvalidated,
 * unlinked, and handed back to the landlord as whatever string arrived. They
 * also saw `{{SIGNATURE, r2, width=160, height=44}}` in the middle of the
 * document they were being asked to comment on.
 *
 * Now the clauses are rendered here, and a comment is written ON one, so it
 * carries that clause's slug without anybody typing it.
 *
 * WHAT THE TWO AUDIENCES ARE TOLD DIFFERS, because what happens to their
 * comments differs. An attorney's comments block the send until the landlord
 * dispositions each one. A tenant's never block: a tenant comment is a
 * negotiating position, not a defect report. Saying so plainly is the honest
 * thing — a tenant who believes their comment halts the lease has been misled.
 */

export function meta() {
  return [
    /*
      Named, because this is a link a landlord emails to a stranger and asks
      them to read a legal document on. The parent `_recipient+` layout titles
      everything under it "Sign Document - Documenso" and renders its header
      only when `sessionData?.user` exists — so a reviewer, who is not signed
      in and never will be, would otherwise land on a page with no indication
      of whose product it is. This route's own meta wins; the missing logo did
      not.
    */
    { title: i18n._(msg`Review a lease · Pacta`) },
    { name: 'robots', content: 'noindex, nofollow, noarchive, nosnippet, noimageindex' },
  ];
}

/**
 * `clauseSlug` is now CARRIED, not typed.
 *
 * `null` means the comment is about the document as a whole, which the model
 * has always allowed and the UI never did — it offered a text box captioned
 * "Which clause? (optional)".
 */
type Draft = { clauseSlug: string | null; body: string };

type AskedField = {
  name: string;
  label: string;
  help: string | null;
  placeholder: string | null;
  kind: string;
  answer: string;
  required: boolean;
};

type ReadableClause = { slug: string; number: string; heading: string; text: string };
type ReadableSection = { number: string; name: string; clauses: ReadableClause[] };

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
  const sections = ((review.data as { sections?: ReadableSection[] }).sections ?? []) as ReadableSection[];

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
    A started comment with nothing written in it was dropped without a word,
    while the button still offered to send back with no comments.
  */
  const abandoned = drafts.filter((draft) => draft.body.trim() === '');

  /*
    Required answers, enforced here because this link is one-shot: submitting
    closes it in the same transaction, so an incomplete send costs a whole
    round trip through the landlord.
  */
  const unanswered = askedFields.filter((field) => field.required && (answers[field.name] ?? '').trim() === '');

  const blocked = submit.isPending || unanswered.length > 0 || abandoned.length > 0;

  const addDraft = (clauseSlug: string | null) => setDrafts((prev) => [...prev, { clauseSlug, body: '' }]);
  const editDraft = (at: number, body: string) =>
    setDrafts((prev) => prev.map((draft, i) => (i === at ? { ...draft, body } : draft)));
  const dropDraft = (at: number) => setDrafts((prev) => prev.filter((_, i) => i !== at));

  /** One comment box, wherever it sits. */
  const composer = (at: number, placeholder: string) => (
    <div key={at} className="mt-3 rounded-r-md border-primary border-l-2 bg-muted/40 p-3">
      <p className="font-semibold text-[0.65rem] uppercase tracking-widest">Your comment</p>
      <Textarea
        className="mt-1 min-h-16"
        rows={2}
        value={drafts[at].body}
        placeholder={placeholder}
        onChange={(event) => editDraft(at, event.target.value)}
      />
      <Button
        variant="ghost"
        size="sm"
        className="mt-1 h-auto px-1.5 py-0.5 text-xs"
        aria-label={`Remove this comment on ${drafts[at].clauseSlug ?? 'the lease as a whole'}`}
        onClick={() => dropDraft(at)}
      >
        Remove
      </Button>
    </div>
  );

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10 pb-28">
      {/*
        The mark carries the weight it has in the app header. A reviewer arrives
        from an email, on a domain they have never seen, to read a legal
        document — the first thing the page owes them is whose it is.
      */}
      <BrandingLogo className="mb-8 h-10 w-auto" />

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
        <AlertTitle>{isAttorney ? 'Your comments block signature' : 'Nothing here is agreed yet'}</AlertTitle>
        <AlertDescription>
          {isAttorney
            ? 'This lease cannot be sent for signature while any of your comments is unanswered. The landlord must accept it, change something in response, or dismiss it with a written reason that is recorded.'
            : 'Comment on anything you want changed. The landlord reads every comment and decides what to do with it — a comment does not change the lease by itself, and anything still unresolved is worth raising with them before you sign.'}
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

      {/*
        Questions the landlord passed to the reviewer rather than guessing at.
        Above the document because they gate the send: a required answer left
        blank closes the link with nothing to show for it.
      */}
      {askedFields.length > 0 && (
        <section className="mt-8 rounded-lg border border-primary/40 bg-muted/30 p-5">
          <h2 className="font-semibold text-lg">
            {askedFields.length === 1
              ? 'One thing only you can answer'
              : `${askedFields.length} things only you can answer`}
          </h2>
          <p className="mt-1 text-muted-foreground text-sm">
            These go into the lease exactly as you write them. The landlord sees them before anything is sent for
            signature.
          </p>

          <div className="mt-5 space-y-4">
            {askedFields.map((field) => (
              <div key={field.name}>
                <Label htmlFor={`asked-${field.name}`}>
                  {field.label}
                  {field.required && <span className="ml-1 text-destructive">*</span>}
                </Label>
                {field.help && <p className="mt-0.5 mb-1.5 text-muted-foreground text-xs">{field.help}</p>}
                {/*
                  The field's own kind. Everything rendered as a two-row
                  textarea regardless, so a single-line answer like the
                  pre-move-in address could carry newlines into the lease.
                */}
                {field.kind === 'textarea' ? (
                  <Textarea
                    id={`asked-${field.name}`}
                    rows={2}
                    placeholder={field.placeholder ?? undefined}
                    value={answers[field.name] ?? ''}
                    onChange={(event) => setAnswers((prev) => ({ ...prev, [field.name]: event.target.value }))}
                  />
                ) : (
                  <Input
                    id={`asked-${field.name}`}
                    placeholder={field.placeholder ?? undefined}
                    value={answers[field.name] ?? ''}
                    onChange={(event) => setAnswers((prev) => ({ ...prev, [field.name]: event.target.value }))}
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
                <p className="whitespace-pre-wrap text-sm">{comment.body}</p>
                <p className="mt-2 text-muted-foreground text-xs">
                  {comment.authorName} · {new Date(comment.createdAt).toLocaleDateString()}
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/*
        THE LEASE, CLAUSE BY CLAUSE. A comment written here arrives carrying the
        clause's slug, so the landlord sees the note beside the provision it is
        about rather than a string somebody typed from memory.
      */}
      <section className="mt-12">
        <div className="flex items-baseline gap-3 border-b pb-2">
          <h2 className="font-semibold text-lg">The lease</h2>
          <span className="ml-auto text-muted-foreground text-xs">Comment on any clause</span>
        </div>

        {sections.map((section) => (
          <div key={section.number}>
            <h3 className="mt-8 border-b pb-1 font-semibold text-primary text-xs uppercase tracking-widest">
              {section.number} · {section.name}
            </h3>

            {section.clauses.map((clause) => (
              <article key={clause.slug} className="group grid grid-cols-[3rem_1fr] gap-x-2 py-4">
                <div className="pt-0.5 pl-2 font-semibold text-primary text-xs tabular-nums">{clause.number}</div>
                <div>
                  <h4 className="font-semibold text-xs uppercase tracking-wider">{clause.heading}</h4>
                  <p className="mt-1 max-w-prose whitespace-pre-line text-sm leading-relaxed">{clause.text}</p>
                </div>

                <div className="col-start-2">
                  {drafts.map((draft, at) =>
                    draft.clauseSlug === clause.slug
                      ? composer(at, 'What would you like changed, or what is unclear?')
                      : null,
                  )}
                </div>

                {/*
                  Revealed on hover or focus on a pointer device, always visible
                  without one — a control that only appears on hover is a
                  control a phone cannot reach.
                */}
                <div className="col-start-2 mt-2 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100 max-md:opacity-100">
                  <Button variant="outline" size="sm" onClick={() => addDraft(clause.slug)}>
                    <MessageSquarePlus className="mr-2 h-3.5 w-3.5" />
                    {drafts.some((draft) => draft.clauseSlug === clause.slug)
                      ? 'Add another'
                      : 'Comment on this clause'}
                  </Button>
                </div>
              </article>
            ))}
          </div>
        ))}
      </section>

      {/* A note about the document as a whole, rather than about one clause. */}
      <section className="mt-12 border-t pt-6">
        <h2 className="font-semibold text-lg">Anything else</h2>
        <p className="mt-1 text-muted-foreground text-sm">
          A comment about the lease as a whole, rather than about one clause.
        </p>

        {drafts.map((draft, at) =>
          draft.clauseSlug === null ? composer(at, 'Anything the landlord should know.') : null,
        )}

        <Button variant="outline" size="sm" className="mt-3" onClick={() => addDraft(null)}>
          <MessageSquarePlus className="mr-2 h-4 w-4" />
          Add a general comment
        </Button>
      </section>

      <div className="mt-10 border-t pt-6">
        <Button asChild variant="outline" size="sm">
          <a href={`/lease-review/${token}/document`} target="_blank" rel="noreferrer">
            <Download className="mr-2 h-4 w-4" />
            Download the PDF
          </a>
        </Button>
        <p className="mt-2 text-muted-foreground text-xs">
          Everything you will be asked to sign, as one file — the lease and every addendum and disclosure attached to
          it.
        </p>
      </div>

      {submit.error && (
        <Alert variant="destructive" className="mt-6">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Your review was not sent</AlertTitle>
          <AlertDescription>{submit.error.message}</AlertDescription>
        </Alert>
      )}

      {/*
        Fixed, because the document above it is long. A send button at the foot
        of forty-three clauses is a send button nobody finds, and the finality
        has to be stated where the finality happens rather than in a paragraph
        somewhere above.
      */}
      <div className="fixed inset-x-0 bottom-0 z-10 border-t bg-background/95 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-3xl flex-wrap items-center gap-x-4 gap-y-1">
          <p className="text-muted-foreground text-xs">
            {usable.length === 0 ? 'No comments yet' : `${usable.length} comment${usable.length === 1 ? '' : 's'}`}
            {unanswered.length > 0 && (
              <span className="ml-2 font-semibold text-destructive">
                {unanswered.length === 1 ? '1 answer still needed' : `${unanswered.length} answers still needed`}
              </span>
            )}
            {abandoned.length > 0 && (
              <span className="ml-2 font-semibold text-destructive">
                {abandoned.length === 1 ? '1 empty comment' : `${abandoned.length} empty comments`}
              </span>
            )}
          </p>

          <p className="ml-auto text-muted-foreground text-xs">Sending closes this link.</p>

          <Button
            disabled={blocked}
            onClick={() =>
              submit.mutate({
                token: token ?? '',
                comments: usable.map((draft) => ({ clauseSlug: draft.clauseSlug, body: draft.body.trim() })),
                answers,
              })
            }
          >
            {submit.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sending…
              </>
            ) : (
              'Send back to the landlord'
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
