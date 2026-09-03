import { trpc } from '@documenso/trpc/react';

import { Alert, AlertDescription, AlertTitle } from '@documenso/ui/primitives/alert';
import { Badge } from '@documenso/ui/primitives/badge';
import { useParams } from 'react-router';

/**
 * The clause library, read by a lawyer who has no account.
 *
 * The approval flow was always built for an attorney — it asks for a name and a
 * bar number — but the page sat behind an authenticated route with no way to
 * send it. The only path was to add counsel to the organisation as a user.
 * Meanwhile the product already had this exact mechanism for tenants.
 *
 * Read-only on purpose. A token holder can see every clause and why it exists;
 * recording an approval stays inside the organisation, where it is attributable
 * to a person who signed in. Sending a link should not be the same act as
 * granting write access.
 */

const ACCENT = 'text-[#1f3a5f] dark:text-[#8fb3d9]';
const ACTION = 'text-[#a2560c] dark:text-[#d99a4e]';
const DOC_SERIF = "[font-family:'Iowan_Old_Style',Charter,Georgia,'Times_New_Roman',serif]";

export default function ClauseReviewPage() {
  const { token = '' } = useParams();

  const query = trpc.bizrethink.leaseBuilder.clauseLibrary.openLibrary.useQuery({ token });

  if (query.isPending) {
    return <div className="mx-auto max-w-3xl px-6 py-16 text-muted-foreground">Loading…</div>;
  }

  if (query.error || !query.data) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-16">
        <Alert variant="destructive">
          <AlertTitle>This review link is no longer active</AlertTitle>
          <AlertDescription>
            It may have been revoked or expired. Ask the person who sent it for a new one.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const { reviewerName, libraryMoved, clauses } = query.data;

  const compelled = clauses.filter((c) => c.why.kind === 'compelled');
  const implementing = clauses.filter((c) => c.why.kind === 'implements');
  const discretionary = clauses.filter((c) => c.why.kind === 'discretionary');

  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <h1 className={`${DOC_SERIF} font-bold text-3xl tracking-tight`}>Florida lease clause library</h1>
      <p className="mt-1 text-muted-foreground text-sm">For review by {reviewerName}</p>

      {/*
        The single most important thing a reviewer can be told, and it was
        nowhere on the internal page either. Everything else on this page is
        detail; this is the frame.
      */}
      <Alert className="mt-6">
        <AlertTitle>What you are reading</AlertTitle>
        <AlertDescription>
          These clauses were drafted in-house and <strong>no attorney has reviewed them</strong>. Every clause says why
          it is here: <span className={ACTION}>required by law</span>,{' '}
          <span className={ACCENT}>implements a statute</span>, or our own drafting. Only {compelled.length} of{' '}
          {clauses.length} are compelled by statute — the rest are editorial judgement, which is where your reading is
          worth most.
        </AlertDescription>
      </Alert>

      {libraryMoved && (
        <Alert variant="destructive" className="mt-4">
          <AlertTitle>The library has changed since this link was sent</AlertTitle>
          <AlertDescription>
            What you are reading is current, but it is not what was sent. Anything discussed about an earlier version
            may no longer hold.
          </AlertDescription>
        </Alert>
      )}

      <dl className="mt-8 grid grid-cols-3 gap-px overflow-hidden rounded border bg-border">
        {[
          ['Required by law', compelled.length, ACTION],
          ['Implements a statute', implementing.length, ACCENT],
          ['Our drafting', discretionary.length, 'text-muted-foreground'],
        ].map(([label, count, tone]) => (
          <div key={String(label)} className="bg-background p-3">
            <dt className="text-muted-foreground text-xs uppercase tracking-wide">{label}</dt>
            <dd className={`${DOC_SERIF} font-bold text-2xl ${String(tone)}`}>{count}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-10 space-y-6">
        {clauses.map((clause) => (
          <section key={clause.slug} className="border-b pb-6 last:border-b-0">
            <div className="flex items-baseline justify-between gap-3">
              <h2 className={`${DOC_SERIF} font-semibold text-lg`}>{clause.heading}</h2>
              {clause.approved ? (
                <Badge variant="neutral">Approved</Badge>
              ) : (
                <Badge variant="secondary">Unapproved</Badge>
              )}
            </div>

            <p className="mt-1 font-mono text-muted-foreground text-xs">
              {clause.slug} · v{clause.version}
            </p>

            <p className="mt-1 text-xs">
              {clause.why.kind === 'compelled' && (
                <span className={ACTION}>
                  Required by law — {clause.why.citation}. {clause.why.appliesWhen}
                </span>
              )}
              {clause.why.kind === 'implements' && (
                <span className={ACCENT}>
                  Implements {clause.why.citation}. The statute does not dictate this wording.
                </span>
              )}
              {clause.why.kind === 'discretionary' && (
                <span className="text-muted-foreground">Our drafting. No statute requires this clause.</span>
              )}
            </p>

            <p className="mt-0.5 text-muted-foreground text-xs">
              {clause.sourceKind === 'statute'
                ? clause.verbatimRequired
                  ? clause.verbatimVerifiedAt
                    ? `Prescribed text — read off the statute on ${clause.verbatimVerifiedAt}.`
                    : 'Prescribed text — NOT yet checked against the statute book.'
                  : 'Safe-harbour form — the statute asks for "substantially" this.'
                : 'Drafted in-house.'}
            </p>

            <p className={`${DOC_SERIF} mt-3 whitespace-pre-wrap text-[0.95rem] leading-relaxed`}>{clause.body}</p>
          </section>
        ))}
      </div>
    </div>
  );
}
