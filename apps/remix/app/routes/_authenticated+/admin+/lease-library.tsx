import {
  JURISDICTION_TIERS,
  jurisdictionLabel,
  jurisdictionName,
  PORTABLE_TIERS,
} from '@bizrethink/customizations/lease/clauses/approval-jurisdiction';
import { outstandingFindings } from '@bizrethink/customizations/lease/clauses/findings';
import { getSession } from '@documenso/auth/server/lib/utils/get-session';
import { isAdmin } from '@documenso/lib/utils/is-admin';
import { prisma } from '@documenso/prisma';
import { trpc } from '@documenso/trpc/react';
import { Alert, AlertDescription, AlertTitle } from '@documenso/ui/primitives/alert';
import { Badge } from '@documenso/ui/primitives/badge';
import { Button } from '@documenso/ui/primitives/button';
import { Input } from '@documenso/ui/primitives/input';
import { Label } from '@documenso/ui/primitives/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@documenso/ui/primitives/select';
import { Textarea } from '@documenso/ui/primitives/textarea';
import { msg } from '@lingui/core/macro';
import {
  AlertTriangle,
  Check,
  ChevronDown,
  ChevronRight,
  Loader2,
  MessageSquareWarning,
  ShieldCheck,
} from 'lucide-react';
import { useState } from 'react';
import { useLoaderData } from 'react-router';

import { appMetaTags } from '~/utils/meta';

import type { Route } from './+types/lease-library';

/**
 * The clause library, and attorney sign-off on it.
 *
 * This page is the gate the whole product waits behind. Every clause was
 * drafted by a language model and reviewed by nobody; until one carries a
 * current approval it renders only where draft rendering is explicitly
 * granted, and never reaches a third party.
 *
 * RECORDING, NOT SIGNING — and the page says so. The landlord enters the
 * approval on the attorney's behalf, capturing their name and bar number.
 * Presenting that as a signature by the attorney would be worse than not
 * having the feature.
 *
 * AN APPROVAL LAPSES WHEN THE TEXT CHANGES. That is the safety property the
 * whole design turns on, and lapsed approvals are shown rather than hidden:
 * "it was approved, then the wording moved" is the useful thing to know.
 */

export function meta() {
  return appMetaTags(msg`Lease clause library`);
}

/**
 * PACTA STAFF ONLY.
 *
 * This page is the instance's legal content — clause text and versions,
 * statutory citations, attorney approvals and bar jurisdictions, draft vs
 * publishable status. It is identical for every customer, because it IS the
 * product. It is not a customer's data and never was.
 *
 * It used to live at `/t/:teamUrl/leases/library`, gated on
 * `canAccessLeaseBuilder` — a per-ORGANISATION feature flag. Every member of
 * any org with the lease builder could read it, and the customer's own Leases
 * home linked them straight to it. Correct for an internal tool with one user;
 * a disclosure the moment there are two.
 *
 * Gated here as well as by the admin layout: the layout's check runs for the
 * route group, but a loader that fetches before it resolves would still read.
 */
export async function loader({ request }: Route.LoaderArgs) {
  const { user } = await getSession(request);

  if (!isAdmin(user)) {
    throw new Response('Not Found', { status: 404 });
  }

  /*
    THE LIBRARY IS INSTANCE CONTENT; ITS SHARE LINKS ARE NOT — YET.

    `clauseLibrary.list` reads the clause library and the approval table and
    ignores the
    organisationId entirely for data; it uses it only for `assertAccess`. But
    `BizrethinkLibraryReview` — the counsel-review share links — carries an
    organisationId column, so listing and creating one still needs an
    organisation to stamp.

    Pacta's own organisation is the right one to stamp: these are OUR shares of
    OUR library with an attorney. Resolving it from the signed-in admin keeps
    every procedure unchanged and records the shares exactly where they are
    recorded today.

    The honest limitation: this assumes staff operate from one organisation.
    The durable fix is to drop organisationId from BizrethinkLibraryReview,
    which is a migration and belongs in its own change.
  */
  const organisation = await prisma.organisation.findFirst({
    where: { members: { some: { userId: user.id } } },
    orderBy: { createdAt: 'asc' },
    select: { id: true },
  });

  if (!organisation) {
    throw new Response('Not Found', { status: 404 });
  }

  return { organisationId: organisation.id };
}

/**
 * A defect report from counsel against one clause.
 *
 * Not a comment. A tenant's comment on a lease is a negotiating position and
 * does not block anything; this is an assertion that text we are calling lawful
 * is not, and it holds the clause until somebody answers it in writing.
 */
type FindingRow = {
  id: string;
  clauseSlug: string;
  body: string;
  authorName: string;
  answeredAt: string | Date | null;
  answer: string | null;
  createdAt: string | Date;
};

type ClauseRow = {
  slug: string;
  version: number;
  /*
    THE FIELD THIS PAGE NEVER RECEIVED. `clauseLibrary.list` did not send it, so
    the page rendered 64 clauses flat under a heading calling them Florida's —
    while `libraryFor()` had been splitting them into 36 portable and 28 Florida
    since 2026-09-06.
  */
  jurisdiction: string;
  section: string;
  heading: string;
  body: string;
  requiredBy: string | null;
  sourceKind: string;
  verbatimRequired: boolean;
  citation: string | null;
  verbatimVerifiedAt: string | null;
  why:
    | { kind: 'compelled'; citation: string; appliesWhen: string }
    | { kind: 'implements'; citation: string }
    | { kind: 'discretionary' };
  effectiveStatus: string;
  /** Does the recorded approval cover a lease in the jurisdiction being counted? */
  approvedForJurisdiction: boolean;
  fingerprint: string;
  approval: {
    approvedByName: string;
    approvedByBarNumber: string | null;
    approvedAt: string | Date;
    notes: string | null;
    lapsed: boolean;
  } | null;
};

export default function ClauseLibraryPage() {
  const { organisationId } = useLoaderData<typeof loader>();

  /*
    WHICH STATE'S LEASE THE PAGE IS TALKING ABOUT.

    One control, two jobs, and they are the same job. It decides which library a
    counsel link is minted against, and it decides what "36 of 64 approved"
    means — because an approval recorded by an attorney admitted in one state
    may or may not count for a lease in another, and a bare count that does not
    say which state is a number nobody can act on.

    TWO OPTIONS SINCE 2026-09-06. North Carolina has seventeen clauses of its
    own, so a link that could only carry Florida's would leave the second state
    unreviewable — and attorney review is the critical path for the whole
    product, not a background task.
  */
  const [jurisdiction, setJurisdiction] = useState<'US-FL' | 'US-NC'>('US-FL');

  const library = trpc.bizrethink.leaseBuilder.clauseLibrary.list.useQuery({ organisationId, jurisdiction });

  /*
    Sending the library to counsel. The approval form has always asked for an
    attorney's name and bar number, but this page sat behind an authenticated
    route with no way to send it — so the only path was to add the lawyer to
    the organisation as a user. This is the missing half.
  */
  const [sharing, setSharing] = useState(false);
  const [counselName, setCounselName] = useState('');
  const [counselEmail, setCounselEmail] = useState('');
  const [copiedShare, setCopiedShare] = useState<string | null>(null);

  const shares = trpc.bizrethink.leaseBuilder.clauseLibrary.listShares.useQuery({ organisationId });

  const share = trpc.bizrethink.leaseBuilder.clauseLibrary.share.useMutation({
    onSuccess: async () => {
      setSharing(false);
      setCounselName('');
      setCounselEmail('');
      await shares.refetch();
    },
  });

  const revokeShare = trpc.bizrethink.leaseBuilder.clauseLibrary.revokeShare.useMutation({
    onSuccess: async () => {
      await shares.refetch();
    },
  });

  const liveShares = (shares.data?.shares ?? []).filter((row) => row.status === 'open');

  /*
    WHAT COUNSEL SAID, AND WHETHER ANYBODY ANSWERED.

    `listFindings` shipped with no UI caller at all. A finding recorded through
    a review link landed in a table no page read, so the only way to know one
    existed was to query the database — and the counsel page told the attorney
    her finding would "hold this clause until somebody answers it" while
    offering nobody any way to see it, let alone answer.
  */
  const findings = trpc.bizrethink.leaseBuilder.clauseLibrary.listFindings.useQuery({ organisationId });

  const findingRows = (findings.data ?? []) as unknown as FindingRow[];
  const stillOpen = outstandingFindings(findingRows);

  /*
    Grouped by clause, outstanding first, and within a group oldest first.

    By clause because that is the unit a finding is answered against and the
    unit it blocks. Outstanding first because an answered finding is a record
    and an outstanding one is work — and the ordering the procedure returns
    (newest first) puts them in whichever order they happened to arrive.
  */
  const findingsByClause = Object.entries(
    findingRows.reduce<Record<string, FindingRow[]>>((groups, row) => {
      groups[row.clauseSlug] = [...(groups[row.clauseSlug] ?? []), row];

      return groups;
    }, {}),
  )
    .map(([clauseSlug, rows]) => ({
      clauseSlug,
      rows: [...rows].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()),
      open: outstandingFindings(rows).length,
    }))
    .sort((a, b) => b.open - a.open || a.clauseSlug.localeCompare(b.clauseSlug));

  const copyShare = async (token: string, id: string) => {
    await navigator.clipboard.writeText(`${window.location.origin}/clause-review/${token}`);
    setCopiedShare(id);
    window.setTimeout(() => setCopiedShare(null), 2000);
  };

  const clauses = (library.data?.clauses ?? []) as unknown as ClauseRow[];

  /*
    COUNTED THROUGH `coversJurisdiction`, on the server. It used to count
    `effectiveStatus === 'published'`, which answers "was this approved" and not
    "does that approval cover the lease I am about to assemble" — the same
    question the counsel badge asks, so both now come from the one helper.
  */
  const published = clauses.filter((clause) => clause.approvedForJurisdiction).length;

  /*
    Grouped by the law each clause depends on. The rows arrive in
    `inReviewOrder`, so a group's members are already in document order and this
    only has to split them.
  */
  const tiers = JURISDICTION_TIERS.map((tier) => ({
    tier,
    rows: clauses.filter((clause) => clause.jurisdiction === tier),
  })).filter((group) => group.rows.length > 0);

  return (
    <div className="mx-auto w-full max-w-screen-lg px-4 pb-16 md:px-8">
      <div className="mt-8">
        <h1 className="font-semibold text-3xl">Lease clause library</h1>
        {/*
          THE OLD HEADING WAS FALSE FOR 36 OF 64. It read "Every clause a
          Florida lease can be assembled from", which is true as a set and reads
          as a claim that all of them are Florida law. Most of them are not:
          they turn on no state's law at all, which is the whole reason a second
          state is a filter rather than a second copy of the library.
        */}
        <p className="mt-1 max-w-2xl text-muted-foreground">
          Every clause the library holds, grouped by the law it depends on. A lease is assembled from its own
          state&rsquo;s clauses plus the ones that turn on no state&rsquo;s law. A clause reaches a third party only
          once an attorney has approved the exact words below.
        </p>
      </div>

      {clauses.length > 0 && (
        <Alert className="mt-6" variant={published === clauses.length ? 'default' : 'warning'}>
          <ShieldCheck className="h-4 w-4" />
          <AlertTitle>
            {published} of {clauses.length} clauses carry an approval that covers a {jurisdictionName(jurisdiction)}{' '}
            lease
          </AlertTitle>
          <AlertDescription>
            {published === clauses.length
              ? 'Every clause in the library carries a current approval.'
              : 'The rest render only inside this organisation and cannot be sent to a third party.'}
          </AlertDescription>
        </Alert>
      )}

      {/*
        Stated plainly rather than buried. Someone reading this page a year
        from now needs to know what the approval record actually is.
      */}
      <Alert className="mt-4">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>What an approval here is, and is not</AlertTitle>
        <AlertDescription>
          You record an attorney's approval on their behalf, under their name and bar number. It is a record of their
          sign-off, not a signature by them. An approval is pinned to the exact wording shown — editing a clause lapses
          it, and the clause returns to unapproved.
        </AlertDescription>
      </Alert>

      {/*
        Read-only on the other end. A token holder sees every clause and why it
        exists; recording an approval stays in here, where it is attributable to
        someone who signed in. Sending a link should not grant write access.
      */}
      <div className="mt-8 rounded-lg border p-4">
        <h2 className="font-semibold">Send the library to counsel</h2>
        <p className="mt-1 text-muted-foreground text-sm">
          They open a link and read every clause with its provenance — no account needed. The link is read-only, and you
          can revoke it.
        </p>

        {liveShares.length > 0 && (
          <ul className="mt-4 space-y-2">
            {liveShares.map((row, index) => (
              <li key={row.id} className="flex items-start justify-between gap-4 rounded border p-3">
                <div>
                  <p className="font-medium text-sm">{row.reviewerName}</p>
                  <p className="text-muted-foreground text-xs">
                    {row.reviewerEmail} · {jurisdictionLabel(row.jurisdiction)}
                  </p>
                  {/*
                    Two live links for the same person rendered as identical
                    cards on the tenant reviewer page, and the wrong one got
                    copied. Newest first, and it says which.
                  */}
                  <p
                    className={
                      index === 0
                        ? 'mt-1 font-medium text-[#a2560c] text-xs dark:text-[#d99a4e]'
                        : 'mt-1 text-muted-foreground text-xs'
                    }
                  >
                    {index === 0 ? 'Current link — send this one' : 'Superseded. Revoke it so it cannot be opened.'}
                  </p>
                </div>
                <div className="flex flex-none items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={revokeShare.isPending}
                    onClick={() => revokeShare.mutate({ organisationId, shareId: row.id })}
                  >
                    Revoke
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => void copyShare(row.token, row.id)}>
                    {copiedShare === row.id ? 'Copied' : 'Copy link'}
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}

        {sharing ? (
          <div className="mt-4 space-y-3">
            <div>
              <Label htmlFor="counsel-name">Attorney's name</Label>
              <Input
                id="counsel-name"
                className="mt-1"
                value={counselName}
                onChange={(event) => setCounselName(event.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="counsel-email">Email</Label>
              <Input
                id="counsel-email"
                type="email"
                className="mt-1"
                value={counselEmail}
                onChange={(event) => setCounselEmail(event.target.value)}
              />
            </div>

            {/*
              WHICH LIBRARY GOES ON THE LINK. Every link used to carry all 64
              clauses whatever it was for. One option, because the library holds
              one state — the control exists so that adding the second is a line
              here rather than a redesign, and so the page says out loud that a
              link covers a jurisdiction.
            */}
            <div>
              <Label htmlFor="counsel-jurisdiction">Which library</Label>
              <Select value={jurisdiction} onValueChange={(value) => setJurisdiction(value as 'US-FL' | 'US-NC')}>
                <SelectTrigger id="counsel-jurisdiction" className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="US-FL">A Florida lease</SelectItem>
                  <SelectItem value="US-NC">A North Carolina lease</SelectItem>
                </SelectContent>
              </Select>
              <p className="mt-1 text-muted-foreground text-xs">
                The link carries the clauses that reach a lease in this state — the ones that turn on its law, plus the
                ones that turn on no state&rsquo;s law.
              </p>
            </div>

            {share.error && (
              <Alert variant="destructive">
                <AlertDescription>{share.error.message}</AlertDescription>
              </Alert>
            )}

            <div className="flex gap-2">
              <Button
                disabled={counselName.trim() === '' || counselEmail.trim() === '' || share.isPending}
                onClick={() =>
                  share.mutate({
                    organisationId,
                    reviewerName: counselName.trim(),
                    reviewerEmail: counselEmail.trim(),
                    jurisdiction,
                  })
                }
              >
                Create the link
              </Button>
              <Button variant="ghost" onClick={() => setSharing(false)}>
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <Button variant="outline" className="mt-4" onClick={() => setSharing(true)}>
            Send it to counsel
          </Button>
        )}
      </div>

      {/*
        THE OTHER END OF THE REVIEW LINK.

        Counsel could record a finding and nothing on this side displayed it.
        Findings arriving by email was the problem the feature was built to
        solve; a finding arriving into an unread table is the same problem with
        an extra step.
      */}
      <div className="mt-8 rounded-lg border p-4">
        <div className="flex items-baseline justify-between gap-4">
          <h2 className="flex items-center gap-2 font-semibold">
            <MessageSquareWarning className="h-4 w-4" />
            What counsel found
          </h2>
          {findingRows.length > 0 && (
            <p className="text-muted-foreground text-sm">
              {stillOpen.length} outstanding of {findingRows.length}
            </p>
          )}
        </div>

        <p className="mt-1 text-muted-foreground text-sm">
          A finding is a defect report against text we are calling lawful, not a comment. It holds its clause unapproved
          until somebody answers it here, in writing.
        </p>

        {findings.isLoading && (
          <p className="mt-4 flex items-center gap-2 text-muted-foreground text-sm">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading findings…
          </p>
        )}

        {!findings.isLoading && findingRows.length === 0 && (
          <p className="mt-4 text-muted-foreground text-sm">
            Nothing recorded yet. Findings appear here as counsel works through the link above.
          </p>
        )}

        {findingsByClause.length > 0 && (
          <ul className="mt-4 space-y-4">
            {findingsByClause.map((group) => (
              <FindingGroup
                key={group.clauseSlug}
                clauseSlug={group.clauseSlug}
                heading={clauses.find((clause) => clause.slug === group.clauseSlug)?.heading ?? null}
                rows={group.rows}
                organisationId={organisationId}
                onAnswered={async () => {
                  await findings.refetch();
                  /*
                    The library too: answering a finding is what releases the
                    clause for approval, and the approval form on this page
                    refuses while one is outstanding.
                  */
                  await library.refetch();
                }}
              />
            ))}
          </ul>
        )}
      </div>

      {library.isLoading && (
        <p className="mt-8 flex items-center gap-2 text-muted-foreground text-sm">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading the library…
        </p>
      )}

      {/*
        GROUPED BY THE LAW EACH CLAUSE DEPENDS ON, which this page never showed.
        Sixty-four rows in module-concatenation order told a reviewer nothing
        about which of them their admission covers, and the split has been real
        in `libraryFor()` since 2026-09-06.
      */}
      {tiers.map((group) => (
        <section key={group.tier} className="mt-8">
          <h2 className="font-semibold text-lg">{jurisdictionLabel(group.tier)}</h2>
          <p className="mt-0.5 text-muted-foreground text-sm">
            {group.rows.length} {group.rows.length === 1 ? 'clause' : 'clauses'} ·{' '}
            {PORTABLE_TIERS.has(group.tier)
              ? 'In every state\u2019s library.'
              : `Only in a ${jurisdictionName(group.tier)} lease.`}
          </p>

          <ul className="mt-3 space-y-2">
            {group.rows.map((clause) => (
              <ClauseRowItem
                key={clause.slug}
                clause={clause}
                /*
                  Shown on the row rather than only discovered on submit. The
                  guard in `approve` refuses, but a refusal after somebody has
                  typed a name, a bar number and a jurisdiction is a worse way
                  to learn it.
                */
                outstanding={stillOpen.filter((row) => row.clauseSlug === clause.slug).length}
                organisationId={organisationId}
                onApproved={() => void library.refetch()}
              />
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

/**
 * One clause's findings, and the box that answers them.
 *
 * ANSWERING REQUIRES TEXT. `answerFinding` enforces `.trim().min(1)`
 * server-side; the button enforces it here too, because a request that fails
 * validation and a request that succeeded look identical on a page with no
 * error surface — and an attorney's finding silently un-answered is worse than
 * one nobody tried to answer.
 */
const FindingGroup = ({
  clauseSlug,
  heading,
  rows,
  organisationId,
  onAnswered,
}: {
  clauseSlug: string;
  heading: string | null;
  rows: FindingRow[];
  organisationId: string;
  onAnswered: () => void | Promise<void>;
}) => {
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  const answerFinding = trpc.bizrethink.leaseBuilder.clauseLibrary.answerFinding.useMutation({
    onSuccess: async () => {
      await onAnswered();
    },
  });

  const open = outstandingFindings(rows);

  return (
    <li className="rounded border p-3">
      <div className="flex items-baseline justify-between gap-3">
        <p className="font-medium text-sm">{heading ?? clauseSlug}</p>
        {open.length > 0 ? (
          <Badge variant="destructive">{open.length} outstanding — approval held</Badge>
        ) : (
          <Badge variant="neutral">Answered</Badge>
        )}
      </div>
      <p className="mt-0.5 font-mono text-muted-foreground text-xs">{clauseSlug}</p>

      <ul className="mt-3 space-y-3">
        {rows.map((row) => {
          const answered = outstandingFindings([row]).length === 0;
          const draft = drafts[row.id] ?? '';

          return (
            <li key={row.id} className="border-t pt-3 first:border-t-0 first:pt-0">
              <p className="whitespace-pre-wrap text-sm">{row.body}</p>
              <p className="mt-1 text-muted-foreground text-xs">
                {row.authorName} · {new Date(row.createdAt).toLocaleDateString()}
              </p>

              {answered ? (
                <p className="mt-2 rounded bg-muted/40 p-2 text-sm">
                  <span className="text-muted-foreground text-xs">
                    Answered {row.answeredAt ? new Date(row.answeredAt).toLocaleDateString() : ''}
                  </span>
                  <br />
                  {row.answer}
                </p>
              ) : (
                <div className="mt-2">
                  <Label htmlFor={`answer-${row.id}`} className="text-xs">
                    What was done about it
                  </Label>
                  <Textarea
                    id={`answer-${row.id}`}
                    className="mt-1 text-sm"
                    rows={2}
                    value={draft}
                    onChange={(event) => setDrafts((prev) => ({ ...prev, [row.id]: event.target.value }))}
                  />
                  <Button
                    className="mt-2"
                    size="sm"
                    variant="outline"
                    disabled={draft.trim() === '' || answerFinding.isPending}
                    onClick={() => answerFinding.mutate({ organisationId, findingId: row.id, answer: draft.trim() })}
                  >
                    {answerFinding.isPending ? <Loader2 className="mr-2 h-3 w-3 animate-spin" /> : null}
                    Record the answer
                  </Button>
                </div>
              )}
            </li>
          );
        })}
      </ul>

      {answerFinding.error && (
        <Alert variant="destructive" className="mt-3">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Not recorded</AlertTitle>
          <AlertDescription>{answerFinding.error.message}</AlertDescription>
        </Alert>
      )}
    </li>
  );
};

const ClauseRowItem = ({
  clause,
  outstanding,
  organisationId,
  onApproved,
}: {
  clause: ClauseRow;
  outstanding: number;
  organisationId: string;
  onApproved: () => void;
}) => {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [bar, setBar] = useState('');
  const [admitted, setAdmitted] = useState('');
  const [notes, setNotes] = useState('');

  const approve = trpc.bizrethink.leaseBuilder.clauseLibrary.approve.useMutation({
    onSuccess: () => {
      setOpen(false);
      onApproved();
    },
  });

  /*
    Approved FOR THE JURISDICTION THE PAGE IS COUNTING, so the badge and the
    header count cannot disagree. `effectiveStatus` still arrives on the row and
    answers the narrower "is there a current approval at all"; nothing on this
    page reads it, and that is deliberate — two badges disagreeing about the
    word "approved" is worse than one badge answering the narrower question.
  */
  const approved = clause.approvedForJurisdiction;
  const lapsed = clause.approval?.lapsed === true;

  return (
    <li className="rounded-lg border">
      <button
        type="button"
        className="flex w-full items-start justify-between gap-4 p-4 text-left"
        onClick={() => setOpen((prev) => !prev)}
      >
        <div className="flex gap-3">
          {open ? (
            <ChevronDown className="mt-1 h-4 w-4 flex-none text-muted-foreground" />
          ) : (
            <ChevronRight className="mt-1 h-4 w-4 flex-none text-muted-foreground" />
          )}
          <div>
            <p className="font-medium">{clause.heading}</p>
            <p className="mt-0.5 font-mono text-muted-foreground text-xs">
              {clause.slug} · v{clause.version} · {clause.section}
            </p>
            {/*
              Repeated on the row, not only in the group heading. A row is read
              expanded, scrolled to, and screenshotted into an email, and in all
              three the heading is off-screen.
            */}
            <p className="mt-0.5 text-muted-foreground text-xs">{jurisdictionLabel(clause.jurisdiction)}</p>
            {/*
              WHY THIS CLAUSE EXISTS. The page used to show the slug and the
              section — true, and useless to a reviewer, who cannot tell a
              disclosure Florida compels from a house rule somebody invented.

              Three answers, from the 2026-09-03 statutory walk. Most of the
              library is discretionary, and saying so is the point: it tells a
              lawyer where their hour is worth spending.
            */}
            <p className="mt-1 text-xs">
              {clause.why.kind === 'compelled' && (
                <span className="text-[#a2560c] dark:text-[#d99a4e]">
                  Required by law — {clause.why.citation}. {clause.why.appliesWhen}
                </span>
              )}
              {clause.why.kind === 'implements' && (
                <span className="text-[#1f3a5f] dark:text-[#8fb3d9]">
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
                : 'Drafted in-house. No attorney has reviewed these words.'}
            </p>{' '}
          </div>
        </div>

        <div className="flex flex-none items-center gap-2">
          {outstanding > 0 && (
            <Badge variant="destructive">
              {outstanding === 1 ? '1 finding outstanding' : `${outstanding} findings outstanding`}
            </Badge>
          )}
          {lapsed && <Badge variant="destructive">Lapsed — text changed</Badge>}
          {approved ? (
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
        <div className="border-t p-4">
          <p className="whitespace-pre-wrap rounded-md bg-muted/40 p-4 text-sm leading-relaxed">{clause.body}</p>

          {clause.approval && (
            <p className="mt-3 text-muted-foreground text-sm">
              {lapsed ? 'Was approved by' : 'Approved by'} <strong>{clause.approval.approvedByName}</strong>
              {clause.approval.approvedByBarNumber && ` (${clause.approval.approvedByBarNumber})`} on{' '}
              {new Date(clause.approval.approvedAt).toLocaleDateString()}
              {clause.approval.notes && ` — ${clause.approval.notes}`}
              {lapsed && '. The wording has changed since; this clause is unapproved again.'}
            </p>
          )}

          {!approved && (
            <div className="mt-5 border-t pt-5">
              <h3 className="font-medium">Record an attorney's approval of this wording</h3>

              {/*
                A statute clause is a different act of review. Nobody is being
                asked whether the words are wise — the statute wrote them — but
                whether they match the statute as currently published. These
                were transcribed from an executed lease rather than read off
                the statute book, which is exactly the gap being closed.
              */}
              {outstanding > 0 && (
                <Alert className="mt-3" variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Held by an unanswered finding</AlertTitle>
                  <AlertDescription>
                    Counsel recorded a finding against this clause that nobody has answered. Answer it under &ldquo;What
                    counsel found&rdquo; above; an approval recorded now would be refused.
                  </AlertDescription>
                </Alert>
              )}

              {clause.verbatimRequired && (
                <Alert className="mt-3">
                  <ShieldCheck className="h-4 w-4" />
                  <AlertTitle>This text is prescribed by statute</AlertTitle>
                  <AlertDescription>
                    {clause.citation} requires substantially these words, and a paraphrase does not discharge the
                    obligation. Approving it confirms the wording above matches the statute as currently published — it
                    was transcribed from an executed lease, not read off the statute book.
                  </AlertDescription>
                </Alert>
              )}

              <div className="mt-3 grid gap-4 md:grid-cols-2">
                <div>
                  <Label htmlFor={`name-${clause.slug}`}>Attorney's name</Label>
                  <Input id={`name-${clause.slug}`} value={name} onChange={(e) => setName(e.target.value)} />
                </div>
                <div>
                  <Label htmlFor={`bar-${clause.slug}`}>Bar number</Label>
                  <Input
                    id={`bar-${clause.slug}`}
                    value={bar}
                    placeholder="FL123456"
                    onChange={(e) => setBar(e.target.value)}
                  />
                </div>
              </div>

              {/*
                REQUIRED, unlike the bar number. A number identifies a person;
                only the jurisdiction says what their approval is worth on this
                clause. Without it nothing could object to a Florida attorney
                approving a North Carolina one.
              */}
              <div className="mt-4">
                <Label htmlFor={`admitted-${clause.slug}`}>Admitted in</Label>
                <Input
                  id={`admitted-${clause.slug}`}
                  value={admitted}
                  placeholder="Florida or North Carolina"
                  onChange={(e) => setAdmitted(e.target.value)}
                />
                {/*
                  THIS SENTENCE USED TO ANSWER THE QUESTION COUNSEL WAS ASKED.
                  It said clauses depending on no state's law "may be approved
                  by any US admission" — the permissive reading, which
                  `approval-jurisdiction.ts` records as provisional and pending
                  counsel, stated to a user as settled law. Advice-shaped
                  strings are banned by docs/engineering-standard.md, and this
                  was worse than advice: it was a legal conclusion about the
                  very thing the review is meant to establish.

                  What replaces it says only what the software does with the
                  value, which is all this field needs to explain.
                */}
                <p className="mt-1 text-muted-foreground text-xs">
                  The bar this attorney is admitted in. It is checked against this clause&rsquo;s jurisdiction (
                  {jurisdictionLabel(clause.jurisdiction)}) before the approval is recorded.
                </p>
              </div>

              <div className="mt-4">
                <Label htmlFor={`notes-${clause.slug}`}>Notes (optional)</Label>
                <Textarea
                  id={`notes-${clause.slug}`}
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
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
                disabled={outstanding > 0 || name.trim() === '' || admitted.trim() === '' || approve.isPending}
                onClick={() =>
                  approve.mutate({
                    organisationId,
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
