import { describeOpened } from '@bizrethink/customizations/lease/review/deletion';
import { trpc } from '@documenso/trpc/react';
import { Alert, AlertDescription, AlertTitle } from '@documenso/ui/primitives/alert';
import { Badge } from '@documenso/ui/primitives/badge';
import { Button } from '@documenso/ui/primitives/button';
import { Input } from '@documenso/ui/primitives/input';
import { Label } from '@documenso/ui/primitives/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@documenso/ui/primitives/select';
import { Textarea } from '@documenso/ui/primitives/textarea';
import { AlertTriangle, Check, Copy, Loader2, Plus, Scale, User } from 'lucide-react';
import { useState } from 'react';

/**
 * The landlord's side of the review loop.
 *
 * Two things happen here: sending the lease out to be read, and deciding what
 * to do about what came back.
 *
 * THE DISPOSITION IS THE POINT. An attorney's comment blocks the send until it
 * has been accepted, actioned, or dismissed with a written reason — and the
 * reason is recorded and cannot afterwards be revised. That record is the
 * artifact of value: evidence of why a lease went out over an attorney's note,
 * which is exactly what you would want to exist if it were ever litigated.
 *
 * Dismissal exists so a stylistic note cannot halt a lease and turn a reviewer
 * into a bottleneck. Requiring the reason is what keeps that honest.
 */

type Review = {
  id: string;
  audience: string;
  status: string;
  token: string;
  reviewerName: string;
  reviewerEmail: string;
  expiresAt: string | Date | null;
  firstOpenedAt: string | Date | null;
  openCount: number;
};

type Comment = {
  id: string;
  reviewId: string;
  clauseSlug: string | null;
  body: string;
  authorName: string;
  disposition: string;
  dispositionReason: string | null;
};

export type ReviewPanelProps = {
  matterId: string;
  /** Absolute origin, so the copied link works outside this tab. */
  origin: string;
};

export const LeaseReviewPanel = ({ matterId, origin }: ReviewPanelProps) => {
  const [inviting, setInviting] = useState(false);
  const [audience, setAudience] = useState<'attorney' | 'tenant'>('attorney');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [copied, setCopied] = useState<string | null>(null);

  const list = trpc.bizrethink.leaseBuilder.review.list.useQuery({ matterId });

  const create = trpc.bizrethink.leaseBuilder.review.create.useMutation({
    onSuccess: async () => {
      setInviting(false);
      setName('');
      setEmail('');
      await list.refetch();
    },
  });

  const revoke = trpc.bizrethink.leaseBuilder.review.revoke.useMutation({
    onSuccess: async () => {
      await list.refetch();
    },
  });

  const remove = trpc.bizrethink.leaseBuilder.review.remove.useMutation({
    onSuccess: async () => {
      await list.refetch();
    },
  });

  /*
    Spent links are kept, not deleted — the row is the record that this document
    went to this person on this date. But four revoked duplicates above the one
    live link is the list working against its own purpose, so they collapse.
  */
  const [showSpent, setShowSpent] = useState(false);

  const reviews = (list.data?.reviews ?? []) as unknown as Review[];
  const comments = (list.data?.comments ?? []) as unknown as Comment[];

  const linkFor = (review: Review) => `${origin}/lease-review/${review.token}`;

  const copy = async (review: Review) => {
    await navigator.clipboard.writeText(linkFor(review));
    setCopied(review.id);
    window.setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="mt-6 space-y-6">
      <div>
        <h3 className="font-semibold text-lg">Send it to be read first</h3>
        <p className="mt-1 max-w-2xl text-muted-foreground text-sm">
          A reviewer opens a link — no account needed. An attorney's comments hold the lease until you have answered
          each one. A tenant's never do: a tenant comment is a negotiating position, not a defect report.
        </p>
      </div>

      {reviews.length > 0 && (
        <ul className="space-y-2">
          {reviews
            .filter((review) => showSpent || review.status !== 'closed')
            .map((review) => {
              const own = comments.filter((comment) => comment.reviewId === review.id);
              const pending = own.filter((comment) => comment.disposition === 'pending').length;

              /*
              Two live links for the same person rendered as two identical
              cards — same name, same email, same expiry, same Copy button —
              separated only by list order. Copying the wrong one sends the
              reviewer a lease that has already moved on. The list is newest
              first, so the first open row is the one to send.
            */
              const live = reviews.filter((r) => r.status === 'open');
              const isCurrent = review.status === 'open' && live[0]?.id === review.id;
              const isSuperseded = review.status === 'open' && !isCurrent;

              return (
                <li key={review.id} className="rounded-lg border p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex gap-3">
                      {review.audience === 'attorney' ? (
                        <Scale className="mt-0.5 h-4 w-4 flex-none text-muted-foreground" />
                      ) : (
                        <User className="mt-0.5 h-4 w-4 flex-none text-muted-foreground" />
                      )}
                      <div>
                        <p className="font-medium">
                          {review.reviewerName}{' '}
                          <span className="font-normal text-muted-foreground text-sm">({review.audience})</span>
                        </p>
                        <p className="text-muted-foreground text-sm">{review.reviewerEmail}</p>
                        <p className="mt-1 text-muted-foreground text-xs">
                          {review.status === 'open' && review.expiresAt
                            ? `Link live until ${new Date(review.expiresAt).toLocaleDateString()}`
                            : review.status === 'returned'
                              ? `Returned ${own.length} comment${own.length === 1 ? '' : 's'}`
                              : 'Revoked'}
                        </p>
                        {/*
                        OPENED, not "read". This records that the URL was
                        fetched; mail scanners fetch links too, and a landlord
                        told the tenant "read" the lease would rely on it.
                      */}
                        <p className="mt-0.5 text-muted-foreground text-xs">
                          {describeOpened(
                            review.firstOpenedAt ? new Date(review.firstOpenedAt) : null,
                            review.openCount ?? 0,
                          )}
                        </p>
                        {isCurrent && (
                          <p className="mt-1 font-medium text-[#a2560c] text-xs dark:text-[#d99a4e]">
                            Current link — send this one
                          </p>
                        )}
                        {isSuperseded && (
                          <p className="mt-1 text-muted-foreground text-xs">
                            Superseded by a newer link. Revoke it so it cannot be opened.
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {pending > 0 && review.audience === 'attorney' && (
                        <Badge variant="destructive">{pending} to answer</Badge>
                      )}
                      {review.status === 'open' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={revoke.isPending}
                          onClick={() => revoke.mutate({ matterId, reviewId: review.id })}
                        >
                          Revoke
                        </Button>
                      )}
                      {/*
                      Only offered where there is nothing to lose: a revoked
                      link nobody opened and nobody commented on. The server
                      decides again — this is convenience, not the rule.
                    */}
                      {review.status === 'closed' && !review.firstOpenedAt && own.length === 0 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={remove.isPending}
                          onClick={() => remove.mutate({ matterId, reviewId: review.id })}
                        >
                          Delete
                        </Button>
                      )}
                      {review.status === 'open' && (
                        <Button variant="outline" size="sm" onClick={() => void copy(review)}>
                          {copied === review.id ? (
                            <>
                              <Check className="mr-2 h-4 w-4" />
                              Copied
                            </>
                          ) : (
                            <>
                              <Copy className="mr-2 h-4 w-4" />
                              Copy link
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                  </div>

                  {own.length > 0 && (
                    <ul className="mt-4 space-y-3 border-t pt-4">
                      {own.map((comment) => (
                        <CommentRow
                          key={comment.id}
                          comment={comment}
                          blocking={review.audience === 'attorney'}
                          onDone={() => void list.refetch()}
                        />
                      ))}
                    </ul>
                  )}
                </li>
              );
            })}
        </ul>
      )}

      {reviews.some((review) => review.status === 'closed') && (
        <button
          type="button"
          className="text-muted-foreground text-sm underline underline-offset-4"
          onClick={() => setShowSpent((shown) => !shown)}
        >
          {showSpent
            ? 'Hide revoked links'
            : `Show ${reviews.filter((review) => review.status === 'closed').length} revoked link${
                reviews.filter((review) => review.status === 'closed').length === 1 ? '' : 's'
              }`}
        </button>
      )}

      {inviting ? (
        <div className="rounded-lg border p-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <Label htmlFor="review-audience">Who is reading it?</Label>
              <p className="mt-0.5 mb-1.5 text-muted-foreground text-xs">
                Decides whether their comments hold the lease.
              </p>
              <Select value={audience} onValueChange={(next) => setAudience(next as 'attorney' | 'tenant')}>
                <SelectTrigger id="review-audience">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="attorney">An attorney — comments block sending</SelectItem>
                  <SelectItem value="tenant">The tenant — comments do not block</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="review-name">Their name</Label>
              <p className="mt-0.5 mb-1.5 text-muted-foreground text-xs">Recorded against every comment they leave.</p>
              <Input id="review-name" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="review-email">Their email</Label>
              <p className="mt-0.5 mb-1.5 text-muted-foreground text-xs">
                For the record — you send the link yourself.
              </p>
              <Input id="review-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
          </div>

          {create.error && <p className="mt-3 font-medium text-destructive text-sm">{create.error.message}</p>}

          <div className="mt-4 flex items-center gap-3">
            <Button
              disabled={name.trim() === '' || email.trim() === '' || create.isPending}
              onClick={() =>
                create.mutate({ matterId, audience, reviewerName: name.trim(), reviewerEmail: email.trim() })
              }
            >
              {create.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Create the link
            </Button>
            <Button variant="ghost" onClick={() => setInviting(false)}>
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <Button variant="outline" onClick={() => setInviting(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Send it for review
        </Button>
      )}
    </div>
  );
};

/**
 * One comment, and the decision about it.
 *
 * Decided once. The controls disappear afterwards rather than offering an
 * edit, because a dismissal reason that can be revised later is not evidence
 * of anything — which is the whole reason it is recorded.
 */
const CommentRow = ({ comment, blocking, onDone }: { comment: Comment; blocking: boolean; onDone: () => void }) => {
  const [reason, setReason] = useState('');
  const [dismissing, setDismissing] = useState(false);

  const disposition = trpc.bizrethink.leaseBuilder.review.disposition.useMutation({ onSuccess: onDone });

  const settled = comment.disposition !== 'pending';

  return (
    <li className="rounded-md bg-muted/40 p-3">
      {comment.clauseSlug && <p className="font-mono text-muted-foreground text-xs">{comment.clauseSlug}</p>}
      <p className="mt-1 whitespace-pre-wrap text-sm">{comment.body}</p>
      <p className="mt-1 text-muted-foreground text-xs">{comment.authorName}</p>

      {settled ? (
        <div className="mt-3 flex flex-wrap items-baseline gap-2 border-t pt-3">
          <Badge variant={comment.disposition === 'dismissed' ? 'neutral' : 'default'}>{comment.disposition}</Badge>
          {comment.dispositionReason && (
            <span className="text-muted-foreground text-sm">{comment.dispositionReason}</span>
          )}
        </div>
      ) : (
        <div className="mt-3 border-t pt-3">
          {!dismissing ? (
            <div className="flex flex-wrap items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={disposition.isPending}
                onClick={() => disposition.mutate({ commentId: comment.id, disposition: 'accepted', reason: null })}
              >
                Accepted — I made this change
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={disposition.isPending}
                onClick={() => disposition.mutate({ commentId: comment.id, disposition: 'edited', reason: null })}
              >
                Changed something else
              </Button>
              <Button size="sm" variant="ghost" disabled={disposition.isPending} onClick={() => setDismissing(true)}>
                Dismiss
              </Button>
              {blocking && <span className="text-muted-foreground text-xs">Holds the lease until answered</span>}
            </div>
          ) : (
            <div className="space-y-2">
              <Label htmlFor={`reason-${comment.id}`}>Why are you not acting on this?</Label>
              <p className="text-muted-foreground text-xs">
                Recorded with the lease and cannot be changed afterwards. It is the record of why the lease went out
                over this comment.
              </p>
              <Textarea
                id={`reason-${comment.id}`}
                rows={3}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  disabled={reason.trim().length < 8 || disposition.isPending}
                  onClick={() =>
                    disposition.mutate({ commentId: comment.id, disposition: 'dismissed', reason: reason.trim() })
                  }
                >
                  Dismiss and record this
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setDismissing(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {disposition.error && (
            <Alert variant="destructive" className="mt-3">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Not recorded</AlertTitle>
              <AlertDescription>{disposition.error.message}</AlertDescription>
            </Alert>
          )}
        </div>
      )}
    </li>
  );
};
