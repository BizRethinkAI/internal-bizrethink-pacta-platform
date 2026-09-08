import type {
  McaLibraryInstrumentView,
  McaLibraryPageClause,
  McaLibraryReviewView,
  SourceState,
} from '@bizrethink/customizations';
import { INSTRUMENTS, MCA_INSTRUMENTS, type McaInstrument } from '@bizrethink/customizations/mca/clauses/instruments';
import { JURISDICTION_NAMES } from '@bizrethink/customizations/mca/jurisdictions';
import { getSession } from '@documenso/auth/server/lib/utils/get-session';
import { isAdmin } from '@documenso/lib/utils/is-admin';
import { trpc } from '@documenso/trpc/react';
import { Alert, AlertDescription, AlertTitle } from '@documenso/ui/primitives/alert';
import { Badge } from '@documenso/ui/primitives/badge';
import { Button } from '@documenso/ui/primitives/button';
import { Input } from '@documenso/ui/primitives/input';
import { Label } from '@documenso/ui/primitives/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@documenso/ui/primitives/select';
import { Textarea } from '@documenso/ui/primitives/textarea';
import { msg } from '@lingui/core/macro';
import { Trans } from '@lingui/react/macro';
import { AlertTriangle, Check, ChevronDown, ChevronRight, FileWarning, Loader2, Lock, ScrollText } from 'lucide-react';
import { useState } from 'react';
import { useLoaderData, useRevalidator } from 'react-router';

import { buildMcaLibraryView } from '~/utils/bizrethink-mca-library.server';
import { appMetaTags } from '~/utils/meta';

import type { Route } from './+types/mca-library';

export function meta() {
  return appMetaTags(msg`MCA Clauses`);
}

/**
 * The MCA clause library — our contract text, and counsel's sign-off on it.
 *
 * A SIBLING OF `/admin/lease-library`, AND A SEPARATE PAGE FROM `/admin/mca`.
 * ADR 0008: the MCA vertical is two surfaces with two release paths.
 * `/admin/mca` shows conformity — whether a disclosure meets a state's statute,
 * where the words are the regulator's and there is nothing for counsel to
 * approve, and it must never acquire an Approve button. The first person to
 * press one there would record an attorney's name against California's words.
 * This page is the other surface, where approval is exactly what is needed.
 *
 * RECORDING, NOT SIGNING — and the page says so out loud. A member of staff
 * enters the approval under the attorney's name and bar number. Presenting that
 * as a signature by the attorney would be worse than not having the feature, so
 * both people are printed: who typed it, and whose authority it claims.
 *
 * AN APPROVAL LAPSES WHEN THE TEXT CHANGES, which is the safety property the
 * whole design turns on. Lapsed approvals are shown rather than hidden.
 *
 * ADMIN-GATED IN THE LOADER as well as by the layout, for the reason
 * `/admin/mca` gives: the layout's check runs for the route group, but a loader
 * that fetches before it resolves would still read.
 *
 * No organisation is resolved. The library is instance content — the same
 * clauses and the same approvals for every customer — so there is no tenancy to
 * authorise against, and the review rows carry no `organisationId`.
 */
export async function loader({ request }: Route.LoaderArgs) {
  const { user } = await getSession(request);

  if (!isAdmin(user)) {
    throw new Response('Not Found', { status: 404 });
  }

  return await buildMcaLibraryView();
}

const SOURCE_LABEL: Record<SourceState, string> = {
  verified: 'Source unchanged',
  'digest-moved': 'Source has changed — re-vendor needed',
  'source-missing': 'Source not readable here',
};

/*
  NO GREEN FOR ANYTHING BUT `verified`, and amber rather than red for
  `source-missing`.

  A moved digest is the loudest thing this page can say: the document was edited
  in `lombard-contracts` and every clause below it may be quoting a superseded
  sentence. A missing source is different in kind — the evidence is absent from
  this environment, which is a deployment fact and not a defect in the text.
  Colouring them the same would teach a reader to ignore both.
*/
const SOURCE_VARIANT: Record<SourceState, 'default' | 'secondary' | 'destructive'> = {
  verified: 'default',
  'digest-moved': 'destructive',
  'source-missing': 'secondary',
};

const COUNTERPARTY_LABEL: Record<string, string> = {
  merchant: 'Merchant',
  'iso-partner': 'ISO partner',
  processor: 'Processor',
};

export default function AdminMcaLibraryPage() {
  const { instruments, clauses, reviews, totals, evidence } = useLoaderData<typeof loader>();

  /*
    ONE SOURCE OF DATA, REVALIDATED. Every mutation on this page re-runs the
    loader rather than refetching half of it. The lease library fetches clauses
    over one query and share links over another, and had to remember to refetch
    both after answering a finding — a page where two lists can disagree about
    whether a clause is approved is a page that will eventually say both.
  */
  const revalidator = useRevalidator();
  const reload = () => void revalidator.revalidate();

  return (
    <div>
      <h1 className="font-semibold text-4xl">
        <Trans>MCA Clauses</Trans>
      </h1>

      <p className="mt-2 text-muted-foreground text-sm">
        <Trans>
          The negotiated agreements — our contract text, not a regulator's. Conformity for the prescribed disclosure
          forms is a separate page.
        </Trans>
      </p>

      {/*
        Stated first and plainly, because the failure mode of a page like this
        is looking reassuring. Clauses under headings and version numbers read
        as considered whoever typed them.
      */}
      <Alert className="mt-6" variant={totals.publishable === totals.clauses ? 'default' : 'warning'}>
        <Lock className="h-4 w-4" />
        <AlertTitle>
          {totals.publishable} of {totals.clauses} clauses may be sent to a merchant, and {totals.outstanding} findings
          are outstanding
        </AlertTitle>
        <AlertDescription>
          A clause is publishable once an attorney's approval names its author, which is what the provenance gate
          demands of attorney-drafted text — and only while the words stay the words that were approved. Outstanding
          counts only findings nobody has disposed of: {totals.findingsCited} were cited across the library and the rest
          are recorded as implemented, rejected or withdrawn in the review manifests.
        </AlertDescription>
      </Alert>

      {/*
        Stated plainly rather than buried. Someone reading this page a year from
        now needs to know what the approval record actually is.
      */}
      <Alert className="mt-4">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>What an approval here is, and is not</AlertTitle>
        <AlertDescription>
          You record an attorney's approval on their behalf, under their name and bar number. It is a record of their
          sign-off, not a signature by them, and the page prints both the attorney and the person who typed it. An
          approval is pinned to the exact wording shown — editing a clause lapses it, and the clause returns to
          unapproved.
        </AlertDescription>
      </Alert>

      {evidence.sourcesMoved.length > 0 && (
        <Alert className="mt-4" variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>
            <Trans>
              {evidence.sourcesMoved.length} document(s) changed since these clauses were transcribed from them
            </Trans>
          </AlertTitle>
          <AlertDescription>
            <Trans>
              The clause text below may be quoting superseded sentences. Re-vendor the affected documents from
              lombard-contracts and re-earn their verification dates.
            </Trans>
          </AlertDescription>
        </Alert>
      )}

      {(!evidence.registerAvailable || evidence.sourcesMissing.length > 0) && (
        <Alert className="mt-4" variant="warning">
          <FileWarning className="h-4 w-4" />
          <AlertTitle>
            <Trans>Some evidence is not present in this environment</Trans>
          </AlertTitle>
          <AlertDescription>
            <Trans>
              What is missing cannot be checked here, so an empty result below is not a clean one. This is a deployment
              fact rather than a defect in the text.
            </Trans>
          </AlertDescription>
        </Alert>
      )}

      <CounselLinks reviews={reviews} onChanged={reload} />

      {instruments.map((instrument) => (
        <InstrumentCard
          key={instrument.id}
          instrument={instrument}
          clauses={clauses.filter((clause) => clause.instrument === instrument.id)}
          onApproved={reload}
        />
      ))}
    </div>
  );
}

/**
 * Sending an agreement out to be read, and taking the link back.
 *
 * ONE AGREEMENT PER LINK. An MCA deal is a set of documents and an attorney is
 * engaged to read one of them; a link carrying the whole library would also go
 * stale whenever a clause in a document the reviewer never saw moved, which is
 * the fastest way to teach somebody to ignore a staleness warning.
 *
 * READ-ONLY ON THE OTHER END. Recording an approval carries a bar number and
 * must be attributable to somebody who signed in, so sending a link is not the
 * same act as granting write access.
 */
const CounselLinks = ({ reviews, onChanged }: { reviews: McaLibraryReviewView[]; onChanged: () => void }) => {
  const [sharing, setSharing] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [instrument, setInstrument] = useState<McaInstrument>('frpa');
  const [copied, setCopied] = useState<string | null>(null);

  const share = trpc.bizrethink.mcaClauseLibrary.share.useMutation({
    onSuccess: () => {
      setSharing(false);
      setName('');
      setEmail('');
      onChanged();
    },
  });

  const revoke = trpc.bizrethink.mcaClauseLibrary.revokeShare.useMutation({ onSuccess: onChanged });

  const live = reviews.filter((review) => review.usable);

  const copy = async (review: McaLibraryReviewView) => {
    await navigator.clipboard.writeText(`${window.location.origin}/mca-clause-review/${review.token}`);
    setCopied(review.id);
    window.setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="mt-8 rounded-lg border border-border p-4">
      <h2 className="font-semibold">Send an agreement to counsel</h2>
      <p className="mt-1 text-muted-foreground text-sm">
        They open a link and read one agreement with its provenance and its outstanding findings — no account needed.
        The link is read-only, expires, and can be revoked.
      </p>

      {live.length > 0 && (
        <ul className="mt-4 space-y-2">
          {live.map((review) => (
            <li key={review.id} className="flex items-start justify-between gap-4 rounded border border-border p-3">
              <div>
                <p className="font-medium text-sm">{review.reviewerName}</p>
                <p className="text-muted-foreground text-xs">
                  {review.reviewerEmail} · {INSTRUMENTS[review.instrument].title}
                </p>
                {/*
                  The words moved after the link went out. Said here as well as
                  on the reviewer's page, because the person who can do
                  something about it is on this side.
                */}
                {review.stale && (
                  <p className="mt-1 text-[#a2560c] text-xs dark:text-[#d99a4e]">
                    This agreement has changed since the link was sent. Revoke it and send a fresh one.
                  </p>
                )}
                <p className="mt-1 text-muted-foreground text-xs">
                  {review.expiresAt === null
                    ? 'No expiry — revoke it by hand.'
                    : `Expires ${new Date(review.expiresAt).toLocaleDateString()}`}
                </p>
              </div>
              <div className="flex flex-none items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={revoke.isPending}
                  onClick={() => revoke.mutate({ reviewId: review.id })}
                >
                  Revoke
                </Button>
                <Button variant="outline" size="sm" onClick={() => void copy(review)}>
                  {copied === review.id ? 'Copied' : 'Copy link'}
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {sharing ? (
        <div className="mt-4 space-y-3">
          <div>
            <Label htmlFor="mca-counsel-name">Attorney's name</Label>
            <Input
              id="mca-counsel-name"
              className="mt-1"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="mca-counsel-email">Email</Label>
            <Input
              id="mca-counsel-email"
              type="email"
              className="mt-1"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="mca-counsel-instrument">Which agreement</Label>
            <Select value={instrument} onValueChange={(value) => setInstrument(value as McaInstrument)}>
              <SelectTrigger id="mca-counsel-instrument" className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MCA_INSTRUMENTS.map((id) => (
                  <SelectItem key={id} value={id}>
                    {INSTRUMENTS[id].title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="mt-1 text-muted-foreground text-xs">
              The link carries this agreement's clauses and nothing else, and is pinned to their exact wording.
            </p>
          </div>

          {share.error && (
            <Alert variant="destructive">
              <AlertDescription>{share.error.message}</AlertDescription>
            </Alert>
          )}

          <div className="flex gap-2">
            <Button
              disabled={name.trim() === '' || email.trim() === '' || share.isPending}
              onClick={() => share.mutate({ reviewerName: name.trim(), reviewerEmail: email.trim(), instrument })}
            >
              {share.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Create the link
            </Button>
            <Button variant="ghost" onClick={() => setSharing(false)}>
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <Button variant="outline" className="mt-4" onClick={() => setSharing(true)}>
          Send one to counsel
        </Button>
      )}
    </div>
  );
};

const InstrumentCard = ({
  instrument,
  clauses,
  onApproved,
}: {
  instrument: McaLibraryInstrumentView;
  clauses: McaLibraryPageClause[];
  onApproved: () => void;
}) => {
  const approved = clauses.filter((clause) => clause.approved).length;

  return (
    <section className="mt-6 rounded-lg border border-border">
      <header className="flex flex-wrap items-center gap-x-3 gap-y-2 border-border border-b px-4 py-3">
        <ScrollText className="h-4 w-4 shrink-0 text-muted-foreground" />
        <h2 className="font-medium text-foreground">{instrument.title}</h2>
        <Badge variant="secondary">{COUNTERPARTY_LABEL[instrument.counterparty] ?? instrument.counterparty}</Badge>
        <span className="text-muted-foreground text-sm">{instrument.entity}</span>
        <span className="ml-auto flex items-center gap-2">
          <Badge variant={SOURCE_VARIANT[instrument.sourceState]}>{SOURCE_LABEL[instrument.sourceState]}</Badge>
          <span className="text-muted-foreground text-sm">
            {approved} of {instrument.clauseCount} approved · {instrument.outstanding} outstanding
          </span>
        </span>
      </header>

      <ul className="divide-y divide-border/60">
        {clauses.map((clause) => (
          <ClauseRow key={clause.slug} clause={clause} onApproved={onApproved} />
        ))}
      </ul>
    </section>
  );
};

/**
 * One clause, and the form that records an approval of its exact wording.
 *
 * The blockers are shown on the row rather than discovered on submit. The
 * router refuses either way, but a refusal after somebody has typed a name, a
 * bar number and a jurisdiction is a worse way to learn it.
 */
const ClauseRow = ({ clause, onApproved }: { clause: McaLibraryPageClause; onApproved: () => void }) => {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [bar, setBar] = useState('');
  const [admitted, setAdmitted] = useState('');
  const [notes, setNotes] = useState('');

  const approve = trpc.bizrethink.mcaClauseLibrary.approve.useMutation({
    onSuccess: () => {
      setOpen(false);
      onApproved();
    },
  });

  const lapsed = clause.approval?.lapsed === true;

  return (
    <li>
      <button
        type="button"
        className="flex w-full items-start justify-between gap-4 px-4 py-3 text-left"
        onClick={() => setOpen((prev) => !prev)}
      >
        <div className="flex gap-3">
          {open ? (
            <ChevronDown className="mt-1 h-4 w-4 flex-none text-muted-foreground" />
          ) : (
            <ChevronRight className="mt-1 h-4 w-4 flex-none text-muted-foreground" />
          )}
          <div>
            {/*
              The number the DOCUMENT prints, and an em dash where it prints
              none. Fourteen FRPA clauses are unnumbered — the granting clause
              among them — and inventing numbers for them here would put text on
              the page that is not in the contract.
            */}
            <p className="text-foreground">
              <span className="mr-2 font-mono text-muted-foreground text-xs">{clause.number || '—'}</span>
              {clause.heading || clause.slug}
            </p>
            <p className="mt-0.5 font-mono text-muted-foreground text-xs">
              {clause.slug} · {clause.provenance}
            </p>
            <p className="mt-0.5 text-muted-foreground text-xs">
              Read by{' '}
              {clause.examinedBy
                .map((entry) => `${entry.review}${entry.findings > 0 ? ` (${entry.findings})` : ''}`)
                .join(', ')}
              {clause.appliesInStates.length > 0 &&
                ` · in the agreement because of ${clause.appliesInStates
                  .map((state) => JURISDICTION_NAMES[state])
                  .join(' and ')} law`}
            </p>
          </div>
        </div>

        <div className="flex flex-none items-center gap-2">
          {clause.outstanding > 0 && (
            <Badge variant="destructive">
              {clause.outstanding === 1 ? '1 finding outstanding' : `${clause.outstanding} findings outstanding`}
            </Badge>
          )}
          {lapsed && <Badge variant="destructive">Lapsed — text changed</Badge>}
          {clause.approved ? (
            <Badge>
              <Check className="mr-1 h-3 w-3" />
              Approved
            </Badge>
          ) : (
            !lapsed && <Badge variant="neutral">Unapproved</Badge>
          )}
        </div>
      </button>

      {open && (
        <div className="border-border/60 border-t px-4 py-4">
          {/*
            VERBATIM, `«N»` MARKERS AND ALL. Those markers are the AcroForm
            anchors the Lombard pipeline injects and are printed in the document
            a merchant signs. Tidying them out of the display would show a
            reviewer a document we do not publish.
          */}
          <p className="whitespace-pre-wrap rounded-md bg-muted/40 p-4 text-sm leading-relaxed">{clause.body}</p>

          {clause.findings.length > 0 && (
            <ul className="mt-4 space-y-2">
              {clause.findings.map((finding) => (
                <li key={`${finding.id}-${finding.review}`} className="text-sm">
                  <span className="font-mono text-muted-foreground text-xs">{finding.id}</span>{' '}
                  <Badge variant={finding.outstanding ? 'destructive' : 'neutral'}>
                    {finding.review} · {finding.severity} · {finding.disposition}
                  </Badge>
                  <p className="mt-1 text-muted-foreground">{finding.finding}</p>
                </li>
              ))}
            </ul>
          )}

          {clause.approval && (
            <p className="mt-4 text-muted-foreground text-sm">
              {lapsed ? 'Was approved under the authority of' : 'Approved under the authority of'}{' '}
              <strong>{clause.approval.approvedByName}</strong>
              {clause.approval.approvedByBarNumber && ` (${clause.approval.approvedByBarNumber})`}, admitted in{' '}
              {JURISDICTION_NAMES[clause.approval.barJurisdiction as keyof typeof JURISDICTION_NAMES] ??
                clause.approval.barJurisdiction}
              , recorded by {clause.approval.recordedByName} on{' '}
              {new Date(clause.approval.approvedAt).toLocaleDateString()}
              {clause.approval.notes && ` — ${clause.approval.notes}`}
              {lapsed && '. The wording has changed since; this clause is unapproved again.'}
              {clause.approval.statesNotCovered.length > 0 &&
                ` This clause is also in the agreement because of ${clause.approval.statesNotCovered
                  .map((state) => JURISDICTION_NAMES[state])
                  .join(' and ')} law, which that admission does not speak to.`}
            </p>
          )}

          {clause.publishProblems.length > 0 && (
            <p className="mt-3 text-muted-foreground text-xs">
              The provenance gate refuses this clause: {clause.publishProblems.join('; ')}.
            </p>
          )}

          {!clause.approved && (
            <div className="mt-5 border-border border-t pt-5">
              <h3 className="font-medium">Record an attorney's approval of this wording</h3>

              {clause.heldByFindings !== null && (
                <Alert className="mt-3" variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Held by a finding nothing has disposed of</AlertTitle>
                  <AlertDescription>{clause.heldByFindings}</AlertDescription>
                </Alert>
              )}

              <div className="mt-3 grid gap-4 md:grid-cols-2">
                <div>
                  <Label htmlFor={`name-${clause.slug}`}>Attorney's name</Label>
                  <Input
                    id={`name-${clause.slug}`}
                    className="mt-1"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor={`bar-${clause.slug}`}>Bar number</Label>
                  <Input
                    id={`bar-${clause.slug}`}
                    className="mt-1"
                    value={bar}
                    placeholder="CA 123456"
                    onChange={(event) => setBar(event.target.value)}
                  />
                </div>
              </div>

              {/*
                REQUIRED, unlike the bar number. A number identifies a person;
                only the jurisdiction says what their approval is worth on a
                clause that is in the agreement because of a state's law.
                `BizrethinkClauseApproval` recorded a number and never which
                bar, and nothing could object to a Florida attorney approving a
                North Carolina clause.
              */}
              <div className="mt-4">
                <Label htmlFor={`admitted-${clause.slug}`}>Admitted in</Label>
                <Input
                  id={`admitted-${clause.slug}`}
                  className="mt-1"
                  value={admitted}
                  placeholder="California"
                  onChange={(event) => setAdmitted(event.target.value)}
                />
                <p className="mt-1 text-muted-foreground text-xs">
                  The bar this attorney is admitted in. It is checked against the states whose law puts this clause in
                  the agreement before the approval is recorded.
                </p>
              </div>

              <div className="mt-4">
                <Label htmlFor={`notes-${clause.slug}`}>Notes (optional)</Label>
                <Textarea
                  id={`notes-${clause.slug}`}
                  className="mt-1"
                  rows={2}
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                />
              </div>

              {approve.error && (
                <Alert variant="destructive" className="mt-4">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Not recorded</AlertTitle>
                  <AlertDescription>{approve.error.message}</AlertDescription>
                </Alert>
              )}

              <Button
                className="mt-4"
                disabled={
                  clause.heldByFindings !== null || name.trim() === '' || admitted.trim() === '' || approve.isPending
                }
                onClick={() =>
                  approve.mutate({
                    clauseSlug: clause.slug,
                    // Sent back exactly as displayed, so an approval cannot be
                    // attributed to wording the reader never saw.
                    fingerprint: clause.fingerprint,
                    approvedByName: name.trim(),
                    approvedByBarNumber: bar.trim() === '' ? null : bar.trim(),
                    barJurisdiction: admitted.trim(),
                    notes: notes.trim() === '' ? null : notes.trim(),
                  })
                }
              >
                {approve.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Record approval of this wording
              </Button>
            </div>
          )}
        </div>
      )}
    </li>
  );
};
