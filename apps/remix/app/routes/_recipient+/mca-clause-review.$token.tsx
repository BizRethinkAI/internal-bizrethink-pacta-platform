import { describeClauseVariance, describeWhyThisClause } from '@bizrethink/customizations/mca/clauses/metadata';
import { trpc } from '@documenso/trpc/react';
import { Alert, AlertDescription, AlertTitle } from '@documenso/ui/primitives/alert';
import { Badge } from '@documenso/ui/primitives/badge';
import { Button } from '@documenso/ui/primitives/button';
import { Textarea } from '@documenso/ui/primitives/textarea';
import { i18n } from '@lingui/core';
import { msg } from '@lingui/core/macro';
import { Trans } from '@lingui/react/macro';
import { useState } from 'react';
import { useParams } from 'react-router';

export function meta() {
  return [
    /*
      NAMED, BECAUSE THIS IS A LINK WE EMAIL TO A LAWYER WHO HAS NO ACCOUNT.

      The parent `_recipient+` layout titles everything under it "Sign Document
      - Documenso" and renders its header only when `sessionData?.user` exists.
      A reviewer is never signed in, so this page inherited a tab, a bookmark
      and a forwarded screenshot all naming the wrong product and the wrong
      action: it is not a signing page, and the product is not Documenso.

      The lease counsel route reached this conclusion first and left the reason
      in a comment. This is the same fix on the agreement side.

      NOT the instrument's own title. Six agreements go out on these links and
      the title is set before the loader resolves which one; a title that said
      "Future Receivables Purchase Agreement" for an Equipment Lease link would
      be worse than a general one.
    */
    { title: i18n._(msg`Review an agreement · Pacta`) },
    /*
      Repeated rather than inherited: a route that exports `meta` REPLACES what
      the parent supplies instead of merging into it, so omitting this would
      strip the crawler directives from the one page in the app holding
      unexecuted contract text with no login in front of it.
    */
    { name: 'robots', content: 'noindex, nofollow, noarchive, nosnippet, noimageindex' },
  ];
}

type RecordedFinding = {
  id: string;
  clauseSlug: string;
  body: string;
  answeredAt: Date | string | null;
  answer: string | null;
  createdAt: Date | string;
};

/**
 * What counsel says back, against one clause.
 *
 * THE PAGE SHIPPED READ-ONLY AND THAT WAS THE WRONG CALL. The reason given was
 * real but narrower than the conclusion drawn from it: findings from the two
 * adversarial DOCUMENT reviews live in `lombard-contracts` manifests, and a
 * second Pacta-side register of those same findings would drift. Nothing
 * counsel writes here is a second copy of one — it arrives on a link we minted,
 * it is attributable to the reviewer named on that link, and no manifest has
 * ever held one. One register per origin, and each is labelled.
 *
 * NOT AN APPROVAL. Recording an approval carries a bar number and an admitting
 * jurisdiction and is checked against the states whose law puts the clause in
 * the agreement; that stays with staff, who have an account. This is the other
 * direction — saying what is wrong — and it needs no such ceremony.
 *
 * IT BLOCKS. An unanswered finding holds the clause against approval. That is
 * what separates it from a comment box, and it is the part the lease shipped
 * without.
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

  const record = trpc.bizrethink.mcaClauseLibrary.recordFinding.useMutation({
    onSuccess: () => {
      setBody('');
      onRecorded();
    },
  });

  return (
    <div className="mt-3">
      {/*
        WHAT SHE ALREADY SAID, AND WHETHER ANYBODY REPLIED.

        The lease's version of this box was write-only: it cleared, the page
        said "Recorded", and a reload showed nothing at all — no record it had
        saved, no answer, no way to tell a saved finding from a lost one. An
        attorney billing by the hour responds to that by writing it twice, and
        then by going back to email.
      */}
      {recorded.length > 0 && (
        <ul className="mb-3 space-y-2">
          {recorded.map((finding) => (
            <li key={finding.id} className="rounded border-l-2 border-l-muted-foreground/40 bg-muted/30 p-2">
              <p className="whitespace-pre-wrap text-sm">{finding.body}</p>
              <p className="mt-1 text-muted-foreground text-xs">
                You recorded this on {new Date(finding.createdAt).toLocaleDateString()}
                {finding.answeredAt === null && ' · holding this clause against approval until it is answered'}
              </p>
              {finding.answeredAt !== null && (
                <div className="mt-2 border-t pt-2">
                  <p className="text-muted-foreground text-xs">
                    Answered {new Date(finding.answeredAt).toLocaleDateString()}
                  </p>
                  <p className="mt-1 whitespace-pre-wrap text-sm">{finding.answer}</p>
                </div>
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
          A failed save was invisible on the lease page once and cost a reviewer
          their work. Not repeating that here.
        */}
        {record.error && <span className="text-destructive text-xs">{record.error.message}</span>}
      </div>
    </div>
  );
}

/**
 * One MCA agreement, read by a lawyer who has no account.
 *
 * WHY THIS EXISTS AT ALL. ADR 0009 withdrew the sequencing that made counsel
 * engagement a phase blocking the clause library: counsel is a parallel track,
 * and *"we use Pacta to send counsel the clauses for review"* is the mechanism
 * that makes it parallel. Without this page the only way to get an attorney in
 * front of this text is to add them to the organisation as a user.
 *
 * IT TAKES FINDINGS AND NOT APPROVALS, and that asymmetry is the decision.
 *
 * Recording an APPROVAL stays inside the admin surface: it carries a bar number
 * and a jurisdiction, it is checked against the states whose law puts the
 * clause in the agreement, and it must be attributable to somebody who signed
 * in. Sending a link should not be the same act as granting that.
 *
 * Recording a FINDING is the other direction — saying what is wrong — and needs
 * no such ceremony. It arrives on a link we minted, it is attributable to the
 * reviewer named on that link, and an unanswered one holds the clause against
 * approval by anybody. That is what separates the box from a comment field.
 *
 * WHAT THE READER IS SHOWN, AND WHY EACH PART. The clauses of ONE agreement, in
 * document order — `«N»` markers and all, because those are printed in the
 * contract a merchant signs and where a value lands in a sentence changes the
 * sentence. Whether an approval already covers the exact words. Which state's
 * law put the clause in the document, where one did. Nothing else.
 *
 * WHAT SHE IS NO LONGER SHOWN, because it is the change this file exists to
 * record: the two adversarial DOCUMENT reviews' findings, which were printed
 * under the clause each one names. ADR 0012 decided they are drafting input —
 * *"they stop being shown to a reviewing attorney as annotations on the
 * product"* — and they audited a draft every FRPA clause has since been
 * rewritten away from, so they described text that no longer exists. The
 * register survives, and is what a DRAFTER works from.
 */
/**
 * `**like this**` becomes bold, and nothing else is interpreted.
 *
 * A markdown dependency for one construct would be a dependency shipped to an
 * unauthenticated page, and the briefing is our own text rather than anything a
 * reader supplies — but it is still text going through a splitter, so the parts
 * are rendered as React children and never as HTML.
 */
const withEmphasis = (paragraph: string) =>
  paragraph
    .split(/\*\*(.+?)\*\*/g)
    .map((part, index) => (index % 2 === 1 ? <strong key={index}>{part}</strong> : part));

export default function McaClauseReviewPage() {
  const { token = '' } = useParams();

  const query = trpc.bizrethink.mcaClauseLibrary.openLibrary.useQuery({ token });

  /*
    Separate from `openLibrary` so that recording a finding refetches the
    findings alone. Re-reading the whole agreement to show one new sentence
    would scroll a reader who is halfway down a hundred clauses back to the top.
  */
  const findings = trpc.bizrethink.mcaClauseLibrary.openFindings.useQuery({ token });

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

  const { reviewerName, instrument, parties, agreementMoved, briefing, sections } = query.data;

  const clauses = sections.flatMap((section) => section.clauses);
  const approved = clauses.filter((clause) => clause.approved).length;

  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <p className="text-muted-foreground text-sm">For {reviewerName}</p>
      <h1 className="mt-1 font-semibold text-3xl">{instrument.title}</h1>
      <p className="mt-1 text-muted-foreground text-sm">
        {parties.funder} · {clauses.length} review items · {approved} carry a current approval
      </p>

      {agreementMoved && (
        <Alert className="mt-6" variant="warning">
          <AlertTitle>This agreement has changed since the link was sent</AlertTitle>
          <AlertDescription>
            The library’s text, selection or citation context has changed since this link was created. Ask for a fresh
            link before recording anything against what you read here.
          </AlertDescription>
        </Alert>
      )}

      {/*
        THE BRIEFING, AND WHY IT REPLACED A FOUR-LINE ALERT.

        The link was opened as counsel would open it, and the page gave a
        funder's name, a clause count and a hundred paragraphs of contract text.
        A lawyer cannot review a document whose purpose has not been stated: not
        what the business is, not who is asking, not what an approval would
        cause, not which of six documents this is, not what is deliberately
        absent, and — worst, because the page collects nothing — not where a
        comment goes. Every one of those was answerable from what this package
        already knew.

        RENDERED, NOT SUMMARISED, AND NOT COLLAPSED BEHIND A DISCLOSURE. The
        reader has been engaged to read carefully; hiding the terms of the
        engagement behind "show more" optimises the page for someone who is not
        the audience.
      */}
      <section className="mt-8 rounded-lg border border-border bg-muted/30 px-6 py-5">
        {briefing.map((part) => (
          <div key={part.id} className="mt-6 first:mt-0">
            <h2 className="font-semibold text-base">{part.title}</h2>

            {part.body.map((paragraph, index) => (
              <p key={index} className="mt-2 text-sm leading-relaxed">
                {withEmphasis(paragraph)}
              </p>
            ))}
          </div>
        ))}
      </section>

      {/*
        THE "THE REGISTER CANNOT BE READ HERE" WARNING IS GONE WITH THE FINDINGS
        IT DESCRIBED. It told an attorney that two adversarial reviews existed
        and that their register was absent from this environment, so that an
        empty finding list would not read as a clean bill. With no finding list
        there is nothing for it to qualify — and a page that names a register
        the reader cannot see either invites a request for it or reads as
        something withheld. The register is still read, and still holds an
        approval: see `findingsHold` on the staff side, which is where the
        readable/unreadable distinction has consequences.
      */}

      {sections.map((section) => (
        <section key={section.id} className="mt-10">
          <h2 className="border-border border-b pb-2 font-semibold text-lg">{section.name}</h2>

          <ul className="mt-4 space-y-6">
            {section.clauses.map((clause) => (
              <li key={clause.slug}>
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  {clause.number !== '' && (
                    <span className="font-mono text-muted-foreground text-xs">{clause.number}</span>
                  )}
                  <h3 className="font-medium">{clause.heading}</h3>
                  {clause.kind === 'explainer' && (
                    <Badge variant="neutral">
                      <Trans>Funding terms note</Trans>
                    </Badge>
                  )}
                  {clause.approved ? <Badge>Approved</Badge> : <Badge variant="neutral">No current approval</Badge>}
                </div>

                {clause.selectionNote && <p className="mt-1 text-muted-foreground text-sm">{clause.selectionNote}</p>}

                <p className="mt-1 text-muted-foreground text-xs">{describeWhyThisClause(clause.whyThisClause)}</p>
                <p className="mt-1 text-muted-foreground text-xs">{describeClauseVariance(clause.variance)}</p>

                {clause.text && <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed">{clause.text}</p>}
                {clause.fields && (
                  <dl className="mt-3 grid gap-3 rounded-md border border-border p-4 sm:grid-cols-2">
                    {clause.fields.map((field) => (
                      <div key={field.widget}>
                        <dt className="text-muted-foreground text-xs">{field.label}</dt>
                        <dd className="mt-1 font-mono text-sm">{field.widget}</dd>
                      </div>
                    ))}
                  </dl>
                )}

                {/*
                  THE EARLIER REVIEWS' FINDINGS WERE PRINTED HERE, under the
                  clause each one names. ADR 0012 decided on 2026-09-10 that
                  they are drafting input and stop being shown to a reviewing
                  attorney; the decision was recorded and the code change never
                  happened, and no test in this repository asserted anything
                  about what this page renders, so nothing was red for a day.

                  THEY DESCRIBED TEXT THAT NO LONGER EXISTS. They audited
                  `Lombard_FRPA_v4` and every FRPA clause has since been
                  rewritten. Under §2.1 the clause now says the merchant makes
                  NO representation as to fair market value; the note beneath it
                  said §2.1 makes the merchant agree that the price EQUALS fair
                  market value — an annotation asserting the opposite of the
                  clause it sat under. Two of them named an internal working
                  paper by filename and told outside counsel our own entity
                  records were unverified.

                  They are not fetched and hidden. The router no longer sends
                  them: a field the page declines to paint is still in the JSON
                  the browser holds and still readable by anyone with the link.

                  The box below is the other register — what THIS reader writes,
                  on a link we minted, attributable to the reviewer named on it.
                  It stays, and with nothing above it no longer needs a label to
                  tell the two apart.
                */}
                <FindingBox
                  clauseSlug={clause.slug}
                  onRecorded={() => void findings.refetch()}
                  recorded={(findings.data?.findings ?? []).filter((finding) => finding.clauseSlug === clause.slug)}
                  token={token}
                />
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
