import {
  JURISDICTION_TIERS,
  jurisdictionLabel,
  jurisdictionName,
  PORTABLE_TIERS,
} from '@bizrethink/customizations/lease/clauses/approval-jurisdiction';
import { trpc } from '@documenso/trpc/react';

import { Alert, AlertDescription, AlertTitle } from '@documenso/ui/primitives/alert';
import { Badge } from '@documenso/ui/primitives/badge';
import { Button } from '@documenso/ui/primitives/button';
import { Textarea } from '@documenso/ui/primitives/textarea';
import { useState } from 'react';
import { useParams } from 'react-router';

/**
 * The clause library, read by a lawyer who has no account.
 *
 * The approval flow was always built for an attorney — it asks for a name and a
 * bar number — but the page sat behind an authenticated route with no way to
 * send it. The only path was to add counsel to the organisation as a user.
 * Meanwhile the product already had this exact mechanism for tenants.
 *
 * WAS read-only on purpose, and half of that reasoning still holds. Recording
 * an APPROVAL stays inside the organisation: it carries a bar number and a
 * jurisdiction, it is checked against the clause's own jurisdiction before it is
 * written, and it must be attributable to somebody who signed in. Sending a link
 * should not be the same act as granting that.
 *
 * But the other direction was wrong. A token holder could read 52 clauses and
 * say NOTHING — no comment, no objection, nothing. Findings came back by email
 * and somebody retyped them into a system with nowhere to put them, while a
 * TENANT could comment on every clause of a lease and have each one tracked to
 * a disposition. The person whose review actually gates the product had less
 * than the person whose comments are explicitly a negotiating position.
 *
 * So counsel can now record a finding per clause. It blocks that clause until
 * somebody answers it, which is what makes the review mean anything — enforced
 * in `approve`, which refuses while one is outstanding, and answered by staff
 * on `/admin/lease-library`.
 *
 * She also sees what she has already said. Recording a finding used to be
 * write-only: the box cleared, the page said "Recorded", and a reload showed
 * nothing — no record, no confirmation it had saved, no way to see a reply.
 */

/** One of counsel's own findings, as it comes back on her link. */
type RecordedFinding = {
  id: string;
  clauseSlug: string;
  body: string;
  answeredAt: string | Date | null;
  answer: string | null;
  createdAt: string | Date;
};

const ACCENT = 'text-[#1f3a5f] dark:text-[#8fb3d9]';
const ACTION = 'text-[#a2560c] dark:text-[#d99a4e]';
const DOC_SERIF = "[font-family:'Iowan_Old_Style',Charter,Georgia,'Times_New_Roman',serif]";

export default function ClauseReviewPage() {
  const { token = '' } = useParams();

  const query = trpc.bizrethink.leaseBuilder.clauseLibrary.openLibrary.useQuery({ token });

  /*
    A SEPARATE QUERY FROM `openLibrary`, deliberately. Recording a finding has
    to refetch whatever shows it, and `openLibrary` carries every clause body
    on the link — re-downloading the entire library to render one new line. This one
    is small and refetched often; that one is large and does not change.

    Scoped by the review row on the server, so this is the findings that came in
    on this link and nobody else's.
  */
  const findings = trpc.bizrethink.leaseBuilder.clauseLibrary.openFindings.useQuery({ token });

  const findingsFor = (clauseSlug: string) =>
    (findings.data?.findings ?? []).filter((finding) => finding.clauseSlug === clauseSlug);

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

  const { reviewerName, libraryMoved, clauses, jurisdiction } = query.data;

  const compelled = clauses.filter((c) => c.why.kind === 'compelled');
  const implementing = clauses.filter((c) => c.why.kind === 'implements');
  const discretionary = clauses.filter((c) => c.why.kind === 'discretionary');

  /*
    THE SPLIT THIS PAGE WAS HIDING. The link carries the clauses that reach a
    lease in one state — the ones that turn on its law, plus the ones that turn
    on no state's law at all. Rendered flat, an attorney read all of them under
    a heading naming one state, with nothing saying which was which and nothing
    telling her that most of them are not that state's.

    Clauses arrive in `inReviewOrder`, so this only splits them.
  */
  const tiers = JURISDICTION_TIERS.map((tier) => ({
    tier,
    rows: clauses.filter((clause) => clause.jurisdiction === tier),
  })).filter((group) => group.rows.length > 0);

  const stateName = jurisdictionName(jurisdiction);
  const portable = clauses.filter((clause) => PORTABLE_TIERS.has(clause.jurisdiction)).length;

  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <h1 className={`${DOC_SERIF} font-bold text-3xl tracking-tight`}>{stateName} lease clause library</h1>
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
          <br />
          <br />
          {/*
            SAID PLAINLY, because the page used to imply the opposite by
            omission. It is headed with one state's name and {portable} of these
            clauses turn on no state's law — they are in every state's library.
          */}
          They are grouped below by the law each one depends on. {portable} of the {clauses.length} turn on no
          state&rsquo;s law and appear in every state&rsquo;s library; the rest are {stateName}&rsquo;s.
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

      {tiers.map((group) => (
        <div key={group.tier} className="mt-10">
          <h2 className={`${DOC_SERIF} border-b pb-2 font-bold text-xl`}>{jurisdictionLabel(group.tier)}</h2>
          <p className="mt-1 text-muted-foreground text-sm">
            {group.rows.length} {group.rows.length === 1 ? 'clause' : 'clauses'} ·{' '}
            {PORTABLE_TIERS.has(group.tier)
              ? 'In every state\u2019s library.'
              : `Only in a ${jurisdictionName(group.tier)} lease.`}
          </p>

          <div className="mt-6 space-y-6">
            {group.rows.map((clause) => (
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

                <FindingBox
                  token={token}
                  clauseSlug={clause.slug}
                  recorded={findingsFor(clause.slug)}
                  onRecorded={() => void findings.refetch()}
                />
              </section>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Where counsel says what is wrong with a clause.
 *
 * THE ASYMMETRY THIS CLOSES. A tenant can comment on every clause of a lease
 * and have each comment tracked. Counsel — whose review is the critical path
 * for the whole product, and without which no lease may reach a third party —
 * had this page read-only: 52 clauses, approved/unapproved badges, and no way
 * to say anything. Findings arrived by email and somebody retyped them.
 *
 * Deliberately per clause rather than one box at the end. A finding that names
 * its clause can be answered against that clause; a paragraph covering four
 * needs somebody to split it first, and that somebody is not the attorney.
 *
 * NOT AN APPROVAL. Recording approval carries a bar number and a jurisdiction
 * and is checked against the clause's own jurisdiction before it is written.
 * That stays with staff, who have an account. This is the other direction:
 * saying what is wrong, which needs no such ceremony.
 */
function FindingBox({
  token,
  clauseSlug,
  recorded,
  onRecorded,
}: {
  token: string;
  clauseSlug: string;
  recorded: RecordedFinding[];
  onRecorded: () => void;
}) {
  const [body, setBody] = useState('');

  const record = trpc.bizrethink.leaseBuilder.clauseLibrary.recordFinding.useMutation({
    onSuccess: () => {
      setBody('');
      onRecorded();
    },
  });

  return (
    <div className="mt-3">
      {/*
        WHAT SHE ALREADY SAID, AND WHETHER ANYBODY REPLIED.

        This was write-only. The box cleared, the page said "Recorded", and a
        reload showed nothing at all — no record it had saved, no way to read
        back what she wrote, no way to see an answer. An attorney billing by
        the hour cannot tell a saved finding from a lost one, so the safe move
        is to write it twice, and the safest is to go back to email.
      */}
      {recorded.length > 0 && (
        <ul className="mb-3 space-y-2">
          {recorded.map((finding) => (
            <li key={finding.id} className="rounded border-l-2 border-l-muted-foreground/40 bg-muted/30 p-2">
              <p className="whitespace-pre-wrap text-sm">{finding.body}</p>
              <p className="mt-1 text-muted-foreground text-xs">
                Recorded {new Date(finding.createdAt).toLocaleDateString()}
                {finding.answeredAt === null && ' · holding this clause until it is answered'}
              </p>
              {finding.answeredAt !== null && (
                <p className="mt-2 border-t pt-2 text-sm">
                  <span className="text-muted-foreground text-xs">
                    Answered {new Date(finding.answeredAt).toLocaleDateString()}
                  </span>
                  <br />
                  {finding.answer}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}

      <Textarea
        aria-label={`Finding on ${clauseSlug}`}
        className="text-sm"
        onChange={(event) => setBody(event.target.value)}
        placeholder="What is wrong with this clause?"
        rows={2}
        value={body}
      />

      <div className="mt-2 flex items-center gap-3">
        <Button
          disabled={body.trim() === '' || record.isPending}
          onClick={() => record.mutate({ token, clauseSlug, body })}
          size="sm"
          variant="outline"
        >
          Record a finding
        </Button>

        {/*
          A failed save used to be invisible on the lease page and cost a
          reviewer their work. Not repeating that here.
        */}
        {record.error && <span className="text-destructive text-xs">{record.error.message}</span>}
      </div>
    </div>
  );
}
