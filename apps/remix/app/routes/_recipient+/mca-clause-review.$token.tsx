import legalStyles from '@bizrethink/customizations/legal-ui/reading.css?url';
import { McaCounselReader } from '@bizrethink/customizations/mca/components/counsel-reader';
import { McaPackageCounselRoute } from '@bizrethink/customizations/mca/components/package-counsel-route';
import { trpc } from '@documenso/trpc/react';
import { Alert, AlertDescription, AlertTitle } from '@documenso/ui/primitives/alert';
import { Button } from '@documenso/ui/primitives/button';
import { Textarea } from '@documenso/ui/primitives/textarea';
import { i18n } from '@lingui/core';
import { msg } from '@lingui/core/macro';
import { useState } from 'react';
import { useParams } from 'react-router';

import type { Route } from './+types/mca-clause-review.$token';

export const links: Route.LinksFunction = () => [{ rel: 'stylesheet', href: legalStyles }];

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
    { title: i18n._(msg`Review clause library · Pacta`) },
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
  body,
  setBody,
}: {
  token: string;
  clauseSlug: string;
  recorded: RecordedFinding[];
  onRecorded: () => void;
  body: string;
  setBody: (body: string) => void;
}) {
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
        {record.error && (
          <span role="alert" className="text-destructive text-xs">
            {record.error.message}
          </span>
        )}
        {record.isSuccess && (
          <span role="status" className="text-sm">
            Finding recorded
          </span>
        )}
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
const _withEmphasis = (paragraph: string) =>
  paragraph
    .split(/\*\*(.+?)\*\*/g)
    .map((part, index) => (index % 2 === 1 ? <strong key={index}>{part}</strong> : part));

export default function McaClauseReviewPage() {
  const { token = '' } = useParams();
  return token.startsWith('mcpr_') ? <McaPackageCounselRoute token={token} /> : <LegacyMcaClauseReviewPage />;
}

const LegacyMcaClauseReviewPage = () => {
  const { token = '' } = useParams();
  const [drafts, setDrafts] = useState<Record<string, string>>({});

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

  return (
    <McaCounselReader
      view={query.data}
      findingError={findings.error?.message}
      renderFinding={(clause) => (
        <FindingBox
          clauseSlug={clause.slug}
          token={token}
          onRecorded={() => void findings.refetch()}
          recorded={(findings.data?.findings ?? []).filter((finding) => finding.clauseSlug === clause.slug)}
          body={drafts[clause.slug] ?? ''}
          setBody={(body) => setDrafts((previous) => ({ ...previous, [clause.slug]: body }))}
        />
      )}
    />
  );
};
