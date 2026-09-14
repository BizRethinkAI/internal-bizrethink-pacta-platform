import type {
  McaCounselFindingView,
  McaLibraryInstrumentView,
  McaLibraryPageItem,
  McaLibraryReviewView,
  SourceState,
} from '@bizrethink/customizations';
import { filterCatalogue } from '@bizrethink/customizations/legal-ui/catalogue';
import { CatalogueToolbar } from '@bizrethink/customizations/legal-ui/catalogue-toolbar';
import {
  LegalSummary,
  LegalText,
  LegalWorkspace,
  legalItemId,
  ReferenceWorkspace,
} from '@bizrethink/customizations/legal-ui/reader';
import { subjectLabel } from '@bizrethink/customizations/legal-ui/reading';
import legalStyles from '@bizrethink/customizations/legal-ui/reading.css?url';
import { INSTRUMENTS, MCA_INSTRUMENTS, type McaInstrument } from '@bizrethink/customizations/mca/clauses/instruments';
import { describeClauseVariance, describeWhyThisClause } from '@bizrethink/customizations/mca/clauses/metadata';
import { McaWorkspaceNav } from '@bizrethink/customizations/mca/components/workspace-nav';
import { groupMcaSections } from '@bizrethink/customizations/mca/engine/section-headings';
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
import {
  AlertTriangleIcon,
  CheckIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  FileWarningIcon,
  Loader2Icon,
  ScrollTextIcon,
} from 'lucide-react';
import { useState } from 'react';
import { useLoaderData, useRevalidator, useSearchParams } from 'react-router';

import { buildMcaLibraryView } from '~/utils/bizrethink-mca-library.server';
import { appMetaTags } from '~/utils/meta';

import type { Route } from './+types/mca-library';

export const links: Route.LinksFunction = () => [{ rel: 'stylesheet', href: legalStyles }];

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
  const data = useLoaderData<typeof loader>();
  const [params, setParams] = useSearchParams();
  const isReusable = params.get('catalogue') === 'reusable';
  const { reviews, counselFindings, evidence, reviewProfile } = data;
  const clauses: McaLibraryPageItem[] = isReusable ? data.reusable : data.clauses;
  const instruments = isReusable ? data.reusableInstruments : data.instruments;
  const totals = isReusable ? { ...data.reusableTotals, clauses: data.reusableTotals.items } : data.totals;
  const visible = filterCatalogue(clauses, params);
  const revalidator = useRevalidator();
  const reload = () => void revalidator.revalidate();
  const context = params.get('context') ?? '';

  return (
    <LegalWorkspace>
      <ReferenceWorkspace
        items={[...data.clauses, ...data.reusable]}
        contexts={data.readingContexts}
        captureReturn={() => {
          const saved = new URLSearchParams(params);
          return () => setParams(saved, { preventScrollReset: true });
        }}
        onNavigate={(reference) => {
          const target = [...data.clauses, ...data.reusable].find((item) => item.slug === reference.targetSlug);
          if (!target) {
            return;
          }
          const next = new URLSearchParams();
          if (target.kind !== 'clause') {
            next.set('catalogue', 'reusable');
          }
          next.set('instrument', target.instrument);
          next.set('item', target.slug);
          next.set('context', reference.context);
          setParams(next, { preventScrollReset: true });
        }}
      >
        <div className="min-w-0">
          <McaWorkspaceNav />
          <p className="mb-2 font-medium text-muted-foreground text-xs uppercase tracking-widest">
            <Trans>Authored content</Trans>
          </p>
          <h1 className="font-semibold text-3xl tracking-tight">
            {isReusable ? <Trans>MCA Reusable content</Trans> : <Trans>MCA Clauses</Trans>}
          </h1>
          <p className="mt-2 max-w-2xl text-muted-foreground text-sm leading-relaxed">
            {isReusable ? (
              <Trans>
                Document blocks, fields and interview guidance, with their placement, intended use and review evidence.
              </Trans>
            ) : (
              <Trans>Reusable agreement wording. Review each provision and its business alternatives in context.</Trans>
            )}
          </p>
          <LegalSummary
            values={[
              { label: isReusable ? <Trans>Reusable items</Trans> : <Trans>Clauses</Trans>, value: clauses.length },
              { label: <Trans>Current approvals</Trans>, value: totals.approved },
              { label: <Trans>Publication clearance</Trans>, value: totals.publishable },
              { label: <Trans>Historical findings outstanding</Trans>, value: totals.outstanding },
            ]}
          />
          <details className="mb-4 rounded-lg border bg-muted/20 p-4">
            <summary className="cursor-pointer font-medium text-sm">
              <Trans>Review links & counsel findings</Trans> · {reviews.length} links ·{' '}
              {counselFindings.filter((finding) => finding.answeredAt === null).length} unanswered
            </summary>
            <CounselLinks reviews={reviews} onChanged={reload} />
            <CounselFindings findings={counselFindings} onAnswered={reload} />
          </details>
          <details className="text-muted-foreground text-xs leading-relaxed">
            <summary className="cursor-pointer">
              <Trans>Numbering context, source status & approval rules</Trans>
            </summary>
            <p className="mt-3">
              <Trans>
                Numbers follow a review example; each alternative retains its own citation context. These are not
                confirmed commercial instructions.
              </Trans>{' '}
              {reviewProfile}
            </p>
            <p className="mt-2">
              <Trans>
                An approval records an attorney's sign-off under their name and bar number, with the staff recorder
                identified separately. This is not a signature by the attorney. It applies to the exact wording reviewed
                and lapses when that wording changes.
              </Trans>
            </p>
            <p className="mt-2">
              {totals.findingsCited} historical findings cited · {totals.outstanding} outstanding.{' '}
              <Trans>Publication clearance remains subject to the provenance gate.</Trans>
            </p>
          </details>
          {(evidence.sourcesMoved.length > 0 || !evidence.registerAvailable || evidence.sourcesMissing.length > 0) && (
            <Alert className="mt-4" variant="warning">
              <FileWarningIcon className="h-4 w-4" />
              <AlertTitle>
                <Trans>Some source evidence needs attention</Trans>
              </AlertTitle>
              <AlertDescription>
                {evidence.sourcesMoved.length} changed sources · {evidence.sourcesMissing.length} unreadable sources ·{' '}
                {evidence.registerAvailable ? 'findings register available' : 'findings register unavailable'}
              </AlertDescription>
            </Alert>
          )}
          <CatalogueToolbar
            subjects={[...new Set(clauses.map((item) => item.section))]}
            instruments={instruments}
            kinds={
              isReusable
                ? [
                    { id: 'document-block', title: 'Document blocks' },
                    { id: 'field-group', title: 'Field groups' },
                    { id: 'guidance', title: 'Interview guidance' },
                  ]
                : undefined
            }
          />
          <div className="flex flex-wrap items-center justify-between gap-3 text-muted-foreground text-xs">
            <p role="status">
              {visible.length} of {clauses.length} {isReusable ? 'items' : 'clauses'}
            </p>
            <details className="max-w-full">
              <summary className="cursor-pointer">
                <Trans>Subject index</Trans>
              </summary>
              <nav aria-label="Subject index" className="mt-3 flex max-w-full flex-wrap gap-2">
                {[...new Set(clauses.map((item) => item.section))].map((subject) => (
                  <button
                    type="button"
                    key={subject}
                    className="rounded border px-2 py-1 hover:bg-muted"
                    onClick={() => {
                      const next = new URLSearchParams(params);
                      next.set('subject', subject);
                      next.delete('item');
                      setParams(next, { preventScrollReset: true });
                    }}
                  >
                    {subjectLabel(subject)}
                  </button>
                ))}
              </nav>
            </details>
          </div>
          {context && data.readingContexts[context] && (
            <p className="mt-4 rounded-md border bg-muted/30 p-3 text-xs">
              <Trans>Reading in citation context</Trans>: {context}
            </p>
          )}
          {visible.length === 0 && (
            <div className="my-8 rounded-lg border border-dashed p-8 text-center text-muted-foreground">
              <Trans>No items match these filters. Clear a filter to return to the library.</Trans>
            </div>
          )}
          {instruments
            .filter((instrument) => visible.some((item) => item.instrument === instrument.id))
            .map((instrument) => (
              <InstrumentCard
                key={instrument.id}
                instrument={instrument}
                clauses={visible
                  .filter((item) => item.instrument === instrument.id)
                  .map((item) => ({ ...item, reading: data.readingContexts[context]?.[item.slug] ?? item.reading }))}
                onApproved={reload}
              />
            ))}
        </div>
      </ReferenceWorkspace>
    </LegalWorkspace>
  );
}

/**
 * What counsel sent back, and answering it.
 *
 * TWO REGISTERS, LABELLED, NOT MERGED. The alert at the top of this page counts
 * findings from the two adversarial DOCUMENT reviews, whose dispositions live
 * in `lombard-contracts` manifests and are cleared by editing a manifest and
 * re-vendoring. These came in on a review link, are attributable to the
 * attorney named on it, and are cleared with a sentence typed here. Merging
 * them would produce one list with two clearing procedures and no way to tell
 * from a row which one applies.
 *
 * ANSWERING IS NOT OPTIONAL HOUSEKEEPING. An unanswered finding holds its
 * clause against approval — `counselFindingsHold` — so this form is the only
 * way past it. That is deliberate: an approval written over an unanswered
 * objection records that one attorney signed off on text another attorney had
 * just objected to.
 */
const CounselFindings = ({ findings, onAnswered }: { findings: McaCounselFindingView[]; onAnswered: () => void }) => {
  const [answers, setAnswers] = useState<Record<string, string>>({});

  const answer = trpc.bizrethink.mcaClauseLibrary.answerFinding.useMutation({
    onSuccess: onAnswered,
  });

  const outstanding = findings.filter((finding) => finding.answeredAt === null);

  /*
    The section disappears when there is nothing in it, rather than rendering an
    empty-state card. A permanent panel reading "no findings" on a page that
    already leads with a count is furniture.
  */
  if (findings.length === 0) {
    return null;
  }

  return (
    <section className="mt-10">
      <h2 className="font-semibold text-2xl">
        <Trans>From counsel</Trans>
      </h2>

      <p className="mt-1 text-muted-foreground text-sm">
        <Trans>
          Recorded by attorneys through a review link. {outstanding.length} of {findings.length} are unanswered, and
          each unanswered one holds its clause against approval. These are separate from the findings the two document
          reviews raised, which are cleared in the review manifests.
        </Trans>
      </p>

      <ul className="mt-4 space-y-4">
        {findings.map((finding) => (
          <li key={finding.id} className="rounded-lg border border-border p-4">
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <span className="font-medium text-sm">{finding.clauseLabel}</span>
              <span className="font-mono text-muted-foreground text-xs">{finding.clauseSlug}</span>
              {finding.answeredAt === null ? (
                <Badge variant="secondary">Unanswered</Badge>
              ) : (
                <Badge variant="default">Answered</Badge>
              )}
              {/*
                A finding raised against wording that has since changed. Shown
                because an answer to it is an answer to a different question,
                and the person about to type one is who needs to know.
              */}
              {finding.clauseMoved && <Badge variant="destructive">Clause has changed since it was read</Badge>}
            </div>

            <p className="mt-1 text-muted-foreground text-xs">
              {finding.authorName} · {new Date(finding.createdAt).toLocaleDateString()}
            </p>

            <p className="mt-2 whitespace-pre-wrap text-sm">{finding.body}</p>

            {finding.answeredAt === null ? (
              <div className="mt-3">
                <Textarea
                  aria-label={`Answer to the finding on ${finding.clauseSlug}`}
                  className="text-sm"
                  onChange={(event) => setAnswers((current) => ({ ...current, [finding.id]: event.target.value }))}
                  placeholder="What was done about it? Counsel sees this."
                  rows={2}
                  value={answers[finding.id] ?? ''}
                />

                <div className="mt-2 flex items-center gap-3">
                  <Button
                    disabled={(answers[finding.id] ?? '').trim() === '' || answer.isPending}
                    onClick={() => answer.mutate({ findingId: finding.id, answer: answers[finding.id] ?? '' })}
                    size="sm"
                    variant="outline"
                  >
                    <Trans>Answer</Trans>
                  </Button>

                  {answer.error && <span className="text-destructive text-xs">{answer.error.message}</span>}
                </div>
              </div>
            ) : (
              <div className="mt-3 border-t pt-3">
                <p className="text-muted-foreground text-xs">
                  Answered {new Date(finding.answeredAt).toLocaleDateString()}
                </p>
                <p className="mt-1 whitespace-pre-wrap text-sm">{finding.answer}</p>
              </div>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
};

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
      <h2 className="font-semibold">Create a counsel review link</h2>
      <p className="mt-1 text-muted-foreground text-sm">
        They open a link and review one instrument’s clauses and reusable content without an account. They can record
        findings, but cannot approve content. The link expires and can be revoked.
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
              <div className="flex flex-wrap items-center gap-2">
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
              The link includes this instrument’s clauses and reusable content, pinned to their exact wording.
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
              {share.isPending ? <Loader2Icon className="mr-2 h-4 w-4 animate-spin" /> : null}
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
  clauses: McaLibraryPageItem[];
  onApproved: () => void;
}) => {
  const approved = clauses.filter((clause) => clause.approved).length;

  return (
    <section className="mt-6 rounded-lg border border-border">
      <header className="flex flex-wrap items-center gap-x-3 gap-y-2 border-border border-b px-4 py-3">
        <ScrollTextIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
        <h2 className="font-medium text-foreground">{instrument.title}</h2>
        <Badge variant="secondary">{COUNTERPARTY_LABEL[instrument.counterparty] ?? instrument.counterparty}</Badge>
        <span className="ml-auto flex items-center gap-2">
          <Badge variant={SOURCE_VARIANT[instrument.sourceState]}>{SOURCE_LABEL[instrument.sourceState]}</Badge>
          <span className="text-muted-foreground text-sm">
            {approved} of {clauses.length} approved · {instrument.outstanding} outstanding
          </span>
        </span>
      </header>

      {groupMcaSections(clauses).map((section, index) => (
        <section key={`${section.section}:${index}`} data-mca-section={section.section}>
          <h3 className="border-border border-b bg-muted/40 px-4 py-3 font-semibold">{section.heading}</h3>
          <ul className="divide-y divide-border/60">
            {section.items.map((clause) => (
              <ClauseRow key={clause.slug} clause={clause} onApproved={onApproved} />
            ))}
          </ul>
        </section>
      ))}
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
const ClauseRow = ({ clause, onApproved }: { clause: McaLibraryPageItem; onApproved: () => void }) => {
  const [rowParams, setRowParams] = useSearchParams();
  const open = rowParams.get('item') === clause.slug;
  const setOpen = (value: boolean) => {
    const next = new URLSearchParams(rowParams);
    if (value) {
      next.set('item', clause.slug);
    } else {
      next.delete('item');
    }
    setRowParams(next, { preventScrollReset: true });
  };
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
    <li data-mca-kind={clause.kind} data-mca-slug={clause.slug}>
      <button
        type="button"
        className="flex w-full flex-wrap items-start justify-between gap-3 px-4 py-4 text-left hover:bg-muted/30 focus-visible:outline focus-visible:outline-primary"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-controls={`detail-${clause.slug}`}
        id={legalItemId(clause.slug)}
      >
        <div className="flex gap-3">
          {open ? (
            <ChevronDownIcon className="mt-1 h-4 w-4 flex-none text-muted-foreground" />
          ) : (
            <ChevronRightIcon className="mt-1 h-4 w-4 flex-none text-muted-foreground" />
          )}
          <div>
            <p className="text-foreground">
              {clause.kind === 'clause' && (
                <span data-mca-number className="mr-2 font-mono text-muted-foreground text-xs">
                  {clause.reading.number ?? clause.number}
                </span>
              )}
              {clause.heading}
            </p>
            {clause.kind !== 'clause' && (
              <p className="mt-1 text-muted-foreground text-xs">
                {clause.kind === 'guidance' ? (
                  <Trans>Interview guidance — excluded from contracts</Trans>
                ) : clause.kind === 'field-group' ? (
                  <Trans>Required document fields</Trans>
                ) : (
                  <Trans>Required document block</Trans>
                )}
              </p>
            )}
            {clause.selectionNote && <p className="mt-1 text-muted-foreground text-xs">{clause.selectionNote}</p>}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {clause.outstanding > 0 && (
            <Badge variant="destructive">
              {clause.outstanding === 1 ? '1 finding outstanding' : `${clause.outstanding} findings outstanding`}
            </Badge>
          )}
          {lapsed && <Badge variant="destructive">Lapsed — text changed</Badge>}
          {clause.approved ? (
            <Badge>
              <CheckIcon className="mr-1 h-3 w-3" />
              Approved
            </Badge>
          ) : (
            !lapsed && <Badge variant="neutral">Unapproved</Badge>
          )}
        </div>
      </button>

      {open && (
        <div id={`detail-${clause.slug}`} className="space-y-5 border-border/60 border-t px-5 py-6 sm:px-8">
          <details className="rounded-md border bg-muted/20 p-3">
            <summary className="cursor-pointer font-medium text-sm">
              Context & provenance · version {clause.version}
            </summary>{' '}
            <p className="mt-1 text-muted-foreground text-xs">{describeWhyThisClause(clause.whyThisClause)}</p>
            <p className="mt-1 text-muted-foreground text-xs">{describeClauseVariance(clause.variance)}</p>
            <p className="mt-0.5 font-mono text-muted-foreground text-xs">
              {clause.slug} · {clause.provenance}
            </p>
            <p className="mt-0.5 text-muted-foreground text-xs">
              {clause.examinedBy.length ? (
                <>
                  Read by{' '}
                  {clause.examinedBy
                    .map((entry) => `${entry.review}${entry.findings > 0 ? ` (${entry.findings})` : ''}`)
                    .join(', ')}
                </>
              ) : (
                <>
                  <Trans>New fields — review pending. Source provisions:</Trans>{' '}
                  {clause.sourceExaminations.map((entry) => `${entry.slug} (${entry.review})`).join(', ')}
                </>
              )}
              {clause.appliesInStates.length > 0 &&
                ` · in the agreement because of ${clause.appliesInStates
                  .map((state) => JURISDICTION_NAMES[state])
                  .join(' and ')} law`}
            </p>
            <p className="mt-2 text-xs">
              Uses: {clause.uses.join(', ')} · Placement:{' '}
              {clause.placement
                ? JSON.stringify(clause.placement)
                : clause.kind === 'clause'
                  ? 'Numbered provision'
                  : 'No document placement'}
            </p>
            {clause.derivedFrom && <p className="mt-2 text-xs">Derived from: {clause.derivedFrom.join(', ')}</p>}
          </details>
          {/*
            VERBATIM, `«N»` MARKERS AND ALL. Those markers are the AcroForm
            anchors the Lombard pipeline injects and are printed in the document
            a merchant signs. Tidying them out of the display would show a
            reviewer a document we do not publish.
          */}
          {clause.body && <LegalText sourceId={clause.slug} segments={clause.reading.segments} />}
          {clause.fields && (
            <dl className="mt-3 grid gap-3 rounded-md border border-border p-4 sm:grid-cols-2">
              {clause.fields.map((field) => (
                <div key={field.widget}>
                  <dt className="text-muted-foreground text-xs">{field.label}</dt>
                  <dd className="mt-1 font-mono text-sm">{field.widget}</dd>
                  <dd className="mt-1 text-muted-foreground text-xs">
                    {field.requiredWhen ? (
                      <Trans>Required for an entity guarantor</Trans>
                    ) : field.required ? (
                      <Trans>Required</Trans>
                    ) : (
                      <Trans>Optional or completed when applicable</Trans>
                    )}
                  </dd>
                </div>
              ))}
            </dl>
          )}
          {clause.repeatFor === 'guarantor' && (
            <p className="mt-2 text-sm">
              <Trans>A separate identity block and signature are required for each intended guarantor.</Trans>
            </p>
          )}
          {clause.retiredFields?.map((field) => (
            <p key={field.widget} className="mt-2 text-muted-foreground text-xs">
              {field.widget}: {field.reason}
            </p>
          ))}

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
                  <AlertTriangleIcon className="h-4 w-4" />
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
                  <AlertTriangleIcon className="h-4 w-4" />
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
                {approve.isPending ? <Loader2Icon className="mr-2 h-4 w-4 animate-spin" /> : null}
                Record approval of this wording
              </Button>
            </div>
          )}
        </div>
      )}
    </li>
  );
};
