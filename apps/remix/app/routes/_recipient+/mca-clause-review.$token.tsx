import { JURISDICTION_NAMES } from '@bizrethink/customizations/mca/jurisdictions';
import { trpc } from '@documenso/trpc/react';
import { Alert, AlertDescription, AlertTitle } from '@documenso/ui/primitives/alert';
import { Badge } from '@documenso/ui/primitives/badge';
import { useParams } from 'react-router';

/**
 * One MCA agreement, read by a lawyer who has no account.
 *
 * WHY THIS EXISTS AT ALL. ADR 0009 withdrew the sequencing that made counsel
 * engagement a phase blocking the clause library: counsel is a parallel track,
 * and *"we use Pacta to send counsel the clauses for review"* is the mechanism
 * that makes it parallel. Without this page the only way to get an attorney in
 * front of this text is to add them to the organisation as a user.
 *
 * READ-ONLY, AND THAT IS A DECISION RATHER THAN AN OMISSION — a narrower one
 * than the lease's, deliberately, and the difference is worth stating because
 * the lease link went the other way.
 *
 * Recording an APPROVAL stays inside the admin surface: it carries a bar number
 * and a jurisdiction, it is checked against the states whose law puts the
 * clause in the agreement, and it must be attributable to somebody who signed
 * in. Sending a link should not be the same act as granting that.
 *
 * Recording a FINDING is not offered either, and this is where MCA differs from
 * the lease. The lease's counsel link takes findings because there was nowhere
 * else for them to go. Here there already is somewhere: two adversarial reviews
 * of these documents, with dispositions recorded in `lombard-contracts`
 * manifests, which is what `outstandingFindings` below is read from. A second
 * register of what was found and what was done about it would drift from the
 * first, and when two registers disagree there is no principled way to say
 * which is right — the same argument `mca/README.md` makes for having one
 * calculator. Counsel's findings on this agreement come back the way the
 * previous two reviews did, and are recorded where those are.
 *
 * WHAT THE READER IS SHOWN, AND WHY EACH PART. The clauses of ONE agreement, in
 * document order, verbatim — `«N»` markers and all, because those are printed
 * in the contract a merchant signs and where a value lands in a sentence
 * changes the sentence. Whether an approval already covers the exact words.
 * Which state's law put the clause in the document, where one did. And what the
 * earlier reviews found and nobody has disposed of, because an attorney reading
 * a clause is the person best placed to use that.
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

  const { reviewerName, instrument, parties, agreementMoved, findingsReadable, briefing, sections } = query.data;

  const clauses = sections.flatMap((section) => section.clauses);
  const approved = clauses.filter((clause) => clause.approved).length;

  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <p className="text-muted-foreground text-sm">For {reviewerName}</p>
      <h1 className="mt-1 font-semibold text-3xl">{instrument.title}</h1>
      <p className="mt-1 text-muted-foreground text-sm">
        {parties.funder} · {clauses.length} clauses · {approved} carry a current approval
      </p>

      {agreementMoved && (
        <Alert className="mt-6" variant="warning">
          <AlertTitle>This agreement has changed since the link was sent</AlertTitle>
          <AlertDescription>
            At least one clause below is not in the words it was in when this link was created. Ask for a fresh link
            before recording anything against what you read here.
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
        AN EMPTY FINDING LIST AND AN UNREADABLE REGISTER LOOK IDENTICAL, and on
        this page the person acting on the difference is the attorney. Said
        before the count, because the count is exactly what cannot be trusted.
      */}
      {!findingsReadable && (
        <Alert className="mt-4" variant="warning">
          <AlertTitle>What the earlier reviews found cannot be read here</AlertTitle>
          <AlertDescription>
            Two adversarial reviews read these documents before you, and their register is not present in this
            environment. No finding is shown below, and that is an absence of evidence rather than an absence of
            findings.
          </AlertDescription>
        </Alert>
      )}

      {/*
        The outstanding-COUNT alert that used to sit here is now the briefing's
        `history` section, which says the same number with the context that
        makes it mean something. The two warnings above are kept as alerts
        because each is an exceptional condition the reader must act on, not a
        description of what they are about to read.
      */}

      {sections.map((section) => (
        <section key={section.id} className="mt-10">
          <h2 className="border-border border-b pb-2 font-semibold text-lg">{section.name}</h2>

          <ul className="mt-4 space-y-6">
            {section.clauses.map((clause) => (
              <li key={clause.slug}>
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  {/*
                    The number the document prints. Fourteen FRPA clauses carry
                    none — the granting clause among them — and this shows
                    nothing rather than inventing one.
                  */}
                  {clause.number !== '' && (
                    <span className="font-mono text-muted-foreground text-xs">{clause.number}</span>
                  )}
                  {/*
                    THE SLUG IS A REFERENCE, NOT A HEADING.

                    Forty of the 204 clauses carry no heading in the document —
                    the FRPA's holdback explainer, its §§10.3–10.6, every
                    recital in the set — and `clause.heading || clause.slug`
                    put `frpa.holdback-explainer` where a heading goes. An
                    attorney was being shown an internal identifier formatted as
                    if the contract printed it.

                    The slug still has to be visible: it is how counsel cites a
                    clause back to us, and it is the only stable handle an
                    unnumbered clause has. So it is shown on every clause, in
                    the margin, looking like the reference it is — and a clause
                    the document does not head simply has no heading, which is
                    the honest render.
                  */}
                  {clause.heading !== '' && <h3 className="font-medium">{clause.heading}</h3>}
                  <span className="font-mono text-muted-foreground/70 text-xs">{clause.slug}</span>
                  {clause.approved ? <Badge>Approved</Badge> : <Badge variant="neutral">No current approval</Badge>}
                </div>

                {(clause.requiredBy !== null || clause.appliesInStates.length > 0) && (
                  <p className="mt-1 text-muted-foreground text-xs">
                    {clause.appliesInStates.length > 0 &&
                      `In the agreement because of ${clause.appliesInStates
                        .map((state) => JURISDICTION_NAMES[state])
                        .join(' and ')} law. `}
                    {clause.requiredBy !== null && clause.requiredBy}
                  </p>
                )}

                <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed">{clause.text}</p>

                {clause.outstandingFindings.length > 0 && (
                  <ul className="mt-3 space-y-1 border-[#a2560c]/40 border-l-2 pl-3 dark:border-[#d99a4e]/40">
                    {clause.outstandingFindings.map((finding) => (
                      <li key={finding} className="text-muted-foreground text-xs">
                        {finding}
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
