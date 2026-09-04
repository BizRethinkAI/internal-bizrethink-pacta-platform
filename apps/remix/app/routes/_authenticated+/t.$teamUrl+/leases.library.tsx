import { canAccessLeaseBuilder } from '@bizrethink/customizations/server-only/feature-access';
import { getSession } from '@documenso/auth/server/lib/utils/get-session';
import { getTeamByUrl } from '@documenso/lib/server-only/team/get-team';
import { trpc } from '@documenso/trpc/react';
import { Alert, AlertDescription, AlertTitle } from '@documenso/ui/primitives/alert';
import { Badge } from '@documenso/ui/primitives/badge';
import { Button } from '@documenso/ui/primitives/button';
import { Input } from '@documenso/ui/primitives/input';
import { Label } from '@documenso/ui/primitives/label';
import { Textarea } from '@documenso/ui/primitives/textarea';
import { msg } from '@lingui/core/macro';
import { AlertTriangle, Check, ChevronDown, ChevronRight, Loader2, ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import { useLoaderData } from 'react-router';

import { appMetaTags } from '~/utils/meta';

import type { Route } from './+types/leases.library';

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
  return appMetaTags(msg`Clause library`);
}

export async function loader({ request, params }: Route.LoaderArgs) {
  const { teamUrl } = params;

  if (!teamUrl) {
    throw new Response('Not Found', { status: 404 });
  }

  const { user } = await getSession(request);
  const team = await getTeamByUrl({ userId: user.id, teamUrl });

  if (!(await canAccessLeaseBuilder({ organisationId: team.organisationId, userId: user.id }))) {
    throw new Response('Not Found', { status: 404 });
  }

  return { organisationId: team.organisationId };
}

type ClauseRow = {
  slug: string;
  version: number;
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

  const library = trpc.bizrethink.leaseBuilder.clauseLibrary.list.useQuery({ organisationId });

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

  const copyShare = async (token: string, id: string) => {
    await navigator.clipboard.writeText(`${window.location.origin}/clause-review/${token}`);
    setCopiedShare(id);
    window.setTimeout(() => setCopiedShare(null), 2000);
  };

  const clauses = (library.data?.clauses ?? []) as unknown as ClauseRow[];
  const published = clauses.filter((clause) => clause.effectiveStatus === 'published').length;

  return (
    <div className="mx-auto w-full max-w-screen-lg px-4 pb-16 md:px-8">
      <div className="mt-8">
        <h1 className="font-semibold text-3xl">Clause library</h1>
        <p className="mt-1 max-w-2xl text-muted-foreground">
          Every clause a Florida lease can be assembled from. A clause reaches a third party only once an attorney has
          approved the exact words below.
        </p>
      </div>

      {clauses.length > 0 && (
        <Alert className="mt-6" variant={published === clauses.length ? 'default' : 'warning'}>
          <ShieldCheck className="h-4 w-4" />
          <AlertTitle>
            {published} of {clauses.length} clauses approved
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
                  <p className="text-muted-foreground text-xs">{row.reviewerEmail}</p>
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

      {library.isLoading && (
        <p className="mt-8 flex items-center gap-2 text-muted-foreground text-sm">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading the library…
        </p>
      )}

      <ul className="mt-8 space-y-2">
        {clauses.map((clause) => (
          <ClauseRowItem
            key={clause.slug}
            clause={clause}
            organisationId={organisationId}
            onApproved={() => void library.refetch()}
          />
        ))}
      </ul>
    </div>
  );
}

const ClauseRowItem = ({
  clause,
  organisationId,
  onApproved,
}: {
  clause: ClauseRow;
  organisationId: string;
  onApproved: () => void;
}) => {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [bar, setBar] = useState('');
  const [notes, setNotes] = useState('');

  const approve = trpc.bizrethink.leaseBuilder.clauseLibrary.approve.useMutation({
    onSuccess: () => {
      setOpen(false);
      onApproved();
    },
  });

  const approved = clause.effectiveStatus === 'published';
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
                disabled={name.trim() === '' || approve.isPending}
                onClick={() =>
                  approve.mutate({
                    organisationId,
                    clauseSlug: clause.slug,
                    // Sent back exactly as displayed, so an approval cannot be
                    // attributed to wording the reader never saw.
                    fingerprint: clause.fingerprint,
                    approvedByName: name.trim(),
                    approvedByBarNumber: bar.trim() === '' ? null : bar.trim(),
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
