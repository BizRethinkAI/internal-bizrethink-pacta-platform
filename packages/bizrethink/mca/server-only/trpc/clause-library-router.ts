import { AppError, AppErrorCode } from '@documenso/lib/errors/app-error';
import { prefixedId } from '@documenso/lib/universal/id';
import { prisma } from '@documenso/prisma';
import { adminProcedure, procedure, router } from '@documenso/trpc/server/trpc';
import { z } from 'zod';

import {
  approvalBlocks,
  mcaClauseFingerprint,
  mcaLibraryFingerprint,
  normaliseMcaAdmission,
} from '../../clauses/approval';
import { outstandingFindingsFor, REGISTER_AVAILABLE } from '../../clauses/examination';
import { MCA_INSTRUMENTS, type McaInstrument } from '../../clauses/instruments';
import { ALL_MCA_CLAUSES, libraryFor } from '../../clauses/library';
import { LOMBARD, resolveClauses } from '../../clauses/parties';
import { counselReviewView } from '../../review/counsel-view';
import { isMcaReviewUsable, MCA_REVIEW_LINK_TTL_DAYS, type McaLibraryReview } from '../../review/link';
import { loadMcaClauseApprovals } from '../clause-approvals';

/**
 * Recording counsel's approval of MCA clause text, and sending it out to be
 * read.
 *
 * ADMIN-GATED, NOT ORGANISATION-SCOPED, and this is the one place it is worth
 * saying why in a router rather than in a model. The lease equivalent takes an
 * `organisationId` on every procedure and its own comments explain that the
 * library ignores it for data — the page resolves the signed-in admin's oldest
 * organisation purely to have something to stamp on a row, and says in a
 * comment that it is assuming staff operate from one. The clause library is
 * instance content: the same clauses, the same provenance, the same approvals
 * for every customer. `adminProcedure` is the honest gate, and it removes the
 * whole class of bug that produced the cross-tenant write in `answerFinding`,
 * where a caller-supplied id was authorised against an organisation the caller
 * merely NAMED.
 *
 * WHAT IS NOT HERE. No procedure records a finding. MCA findings come from two
 * adversarial reviews of the documents and their dispositions live in
 * `lombard-contracts` manifests; a second, Pacta-side register of what was done
 * about a finding is refused for the reason `mca/README.md` refuses a second
 * calculator — two registers drift, and when they disagree there is no
 * principled way to say which is right. `findingsHold` reads the vendored one.
 */

/**
 * An agreement this library holds.
 *
 * Refined against `MCA_INSTRUMENTS` rather than written out again as a literal
 * union. A second hand-written list is a list that drifts, and the drift would
 * be silent in the worst direction: an instrument the router rejects but the
 * library holds is an agreement nobody can send for review.
 */
const ZMcaInstrument = z
  .string()
  .refine((value): value is McaInstrument => MCA_INSTRUMENTS.includes(value as McaInstrument), {
    message: 'Not one of the agreements this library holds.',
  });

/** The one error a token holder gets, whatever went wrong. */
const NO_SUCH_LINK = 'This review link is no longer active.';

export const mcaClauseLibraryRouter = router({
  /**
   * Record an attorney's approval of one clause's exact wording.
   *
   * IT RECORDS, IT DOES NOT SIGN. `ctx.user` is the member of staff typing;
   * `approvedByName` and `approvedByBarNumber` are the attorney whose authority
   * the approval claims. Both are stored, in different columns, and the page
   * prints both.
   */
  approve: adminProcedure
    .input(
      z.object({
        clauseSlug: z.string(),
        /** The clause as the approver saw it. Rejected if it has moved since. */
        fingerprint: z.string(),
        approvedByName: z.string().min(1),
        approvedByBarNumber: z.string().nullable().default(null),
        /**
         * Which bar the attorney is admitted in — "CA", "California", "US-CA".
         *
         * Required, unlike the bar number. A number identifies a person; only
         * the jurisdiction says what their approval is worth on a clause that
         * is in the agreement because of a particular state's law.
         */
        barJurisdiction: z.string().min(1),
        notes: z.string().nullable().default(null),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      /*
        EVERY clause, deliberately. Staff record an approval against a clause of
        any agreement; `approvalBlocks` decides whether this attorney may
        approve this one. Scoping the lookup to an instrument would make a
        clause unapprovable rather than unapproved.
      */
      const clause = ALL_MCA_CLAUSES.find((candidate) => candidate.slug === input.clauseSlug);

      if (!clause) {
        throw new AppError(AppErrorCode.NOT_FOUND, { message: 'No such clause in the library.' });
      }

      const admission = normaliseMcaAdmission(input.barJurisdiction);

      /*
        The admission first, then the findings — see `approvalBlocks`, which
        owns that order and the argument for it. The fingerprint is checked
        last, here, because it is the only one whose remedy is "reload and read
        it again".
      */
      /*
        WHAT COUNSEL SAID, AND WHETHER ANYBODY ANSWERED IT.

        The assertion the lease was missing. Without this count the textarea on
        the review page is decorative: counsel writes "this indemnity is
        unenforceable in New York", it lands in a table, and the clause is
        approved that afternoon by somebody who never saw it. `approve` is the
        only place that can notice, because it is the only place an approval is
        written.

        BY SLUG, ACROSS EVERY LINK. A finding recorded on one review is a
        finding against the clause, not against that reviewer's copy of it — two
        attorneys reading the same agreement on two links raise objections to
        the same words, and scoping this to a single review would let the second
        approval sail past the first one's objection.
      */
      const unansweredCounselFindings = await prisma.bizrethinkMcaLibraryFinding.count({
        where: { clauseSlug: clause.slug, answeredAt: null },
      });

      const blocked = approvalBlocks(clause, {
        admission,
        unansweredCounselFindings,
        outstanding: outstandingFindingsFor(clause),
        /*
          An unreadable register returns an empty findings list, which is
          indistinguishable from a clean clause. Passed in rather than read
          inside `approvalBlocks` so the rule stays pure and the environment
          fact stays at the edge.
        */
        evidenceAvailable: REGISTER_AVAILABLE,
      });

      if (blocked !== null) {
        throw new AppError(AppErrorCode.INVALID_REQUEST, { message: blocked });
      }

      /*
        `admission` is non-null here — `approvalBlocks` refuses a null one — but
        the compiler does not know that, and narrowing it by re-checking is
        cheaper than an assertion that would survive somebody reordering the
        guard above.
      */
      if (admission === null) {
        throw new AppError(AppErrorCode.INVALID_REQUEST, { message: 'Record which bar the attorney is admitted in.' });
      }

      const current = mcaClauseFingerprint(clause);

      /*
        Sent back from the page that displayed the clause and checked against
        the library as it stands now. If a deploy changed the wording between
        the attorney reading it and the approval being recorded, this refuses
        rather than attributing sign-off to text they never saw.
      */
      if (current !== input.fingerprint) {
        throw new AppError(AppErrorCode.INVALID_REQUEST, {
          message: 'This clause changed since it was displayed. Reload and read it again before recording an approval.',
        });
      }

      await prisma.$transaction([
        // Older approvals are superseded, not deleted: the record of who
        // approved which words has to survive an edit.
        prisma.bizrethinkMcaClauseApproval.updateMany({
          where: { clauseSlug: clause.slug, supersededAt: null },
          data: { supersededAt: new Date() },
        }),
        prisma.bizrethinkMcaClauseApproval.create({
          data: {
            id: prefixedId('mca_clause_approval', 16),
            clauseSlug: clause.slug,
            clauseVersion: clause.version,
            instrument: clause.instrument,
            fingerprint: current,
            approvedByName: input.approvedByName.trim(),
            approvedByBarNumber: input.approvedByBarNumber?.trim() || null,
            barJurisdiction: admission,
            // The person at the keyboard. Not the approver.
            recordedByUserId: ctx.user.id,
            notes: input.notes?.trim() || null,
          },
        }),
      ]);

      return { approved: true };
    }),

  /**
   * Send one agreement to a lawyer who has no account.
   *
   * ONE AGREEMENT PER LINK, not the whole library. An MCA deal is a set of
   * documents and an attorney is engaged to read one of them; a link carrying
   * all of the library would also go stale — "the agreement has changed" —
   * whenever a clause in a document the reviewer never saw moved.
   */
  share: adminProcedure
    .input(
      z.object({
        reviewerName: z.string().min(1),
        reviewerEmail: z.string().email(),
        instrument: ZMcaInstrument,
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return await prisma.bizrethinkMcaLibraryReview.create({
        data: {
          id: prefixedId('mca_library_review', 16),
          token: prefixedId('mclr', 32),
          reviewerName: input.reviewerName,
          reviewerEmail: input.reviewerEmail,
          instrument: input.instrument,
          // Of the SCOPED agreement. See the model comment.
          libraryFingerprint: mcaLibraryFingerprint(libraryFor(input.instrument)),
          createdByUserId: ctx.user.id,
          expiresAt: new Date(Date.now() + MCA_REVIEW_LINK_TTL_DAYS * 24 * 60 * 60 * 1000),
        },
        select: { id: true, token: true, expiresAt: true },
      });
    }),

  /**
   * Take a link back.
   *
   * Closing rather than deleting: the row is the record of who was sent what
   * and when, and a link that cannot be revoked is a link that outlives the
   * engagement.
   */
  revokeShare: adminProcedure.input(z.object({ reviewId: z.string() })).mutation(async ({ input }) => {
    const { count } = await prisma.bizrethinkMcaLibraryReview.updateMany({
      where: { id: input.reviewId, status: 'open' },
      data: { status: 'closed' },
    });

    if (count === 0) {
      throw new AppError(AppErrorCode.NOT_FOUND, { message: 'That link no longer exists, or was already revoked.' });
    }

    return { revoked: true };
  }),

  /**
   * Open a link. No account.
   *
   * ONE ERROR for "no such token", "revoked" and "expired". A reviewer cannot
   * act on the difference, and distinguishing them would confirm to anyone
   * holding a guessed token that it once existed.
   *
   * Returns the agreement and its provenance, and nothing else. The holder is
   * outside the organisation and has no business seeing a deal.
   */
  openLibrary: procedure.input(z.object({ token: z.string() })).query(async ({ input }) => {
    const row = await prisma.bizrethinkMcaLibraryReview.findUnique({
      where: { token: input.token },
      select: {
        id: true,
        status: true,
        expiresAt: true,
        reviewerName: true,
        instrument: true,
        libraryFingerprint: true,
        createdByUserId: true,
      },
    });

    if (row === null) {
      throw new AppError(AppErrorCode.NOT_FOUND, { message: NO_SUCH_LINK });
    }

    const review: McaLibraryReview = {
      id: row.id,
      token: input.token,
      status: row.status === 'closed' ? 'closed' : 'open',
      reviewerName: row.reviewerName,
      reviewerEmail: '',
      instrument: row.instrument as McaInstrument,
      libraryFingerprint: row.libraryFingerprint,
      expiresAt: row.expiresAt,
    };

    if (!isMcaReviewUsable(review, new Date())) {
      throw new AppError(AppErrorCode.NOT_FOUND, { message: NO_SUCH_LINK });
    }

    const approvals = await loadMcaClauseApprovals();

    /*
      WHO TO REPLY TO, resolved rather than assumed.

      The briefing has to end with a name and an address, because this page
      collects nothing and a read-only page that does not say where comments go
      reads as an oversight rather than as the deliberate single-register design
      it is. `createdByUserId` is an `Int` with no relation on the model, so
      this is a second query rather than an include.

      NULL IS A SUPPORTED ANSWER. A staff account can be deleted while the link
      it minted is still live, and `counselBriefing` falls back to "reply to
      whoever sent you this link" rather than printing a hole where a name goes.
    */
    const sender = await prisma.user.findUnique({
      where: { id: row.createdByUserId },
      select: { name: true, email: true },
    });

    /*
      WHAT COUNSEL IS SENT, BUILT BY A PURE FUNCTION AND NOT BY THIS PROCEDURE.

      It was an object literal here, which is why nothing could assert anything
      about it without a database — and nothing did. `counsel-view.ts` carries
      the property that is now stated over every string in it, for all six
      agreements.

      THE SEAM ON `LOMBARD`: `BizrethinkMcaLibraryReview` has no tenant column,
      because it was designed before there was a tenant to name. There is
      exactly one today, so defaulting is honest rather than convenient — and
      this is the line that changes when a second client's review link is
      minted.
    */
    return counselReviewView({
      review,
      tenant: LOMBARD,
      approvals,
      sender: sender === null ? null : { name: sender.name ?? sender.email, email: sender.email },
      now: new Date(),
    });
  }),

  /**
   * The findings on one link, read back by the person who wrote them.
   *
   * COUNSEL MUST SEE WHAT SHE JUST WROTE. On the lease this was write-only: the
   * box cleared, the page said "Recorded", and a reload showed nothing at all —
   * no record it had saved, no answer, no way to tell a saved finding from a
   * lost one. An attorney billing by the hour responds to that by writing it
   * twice, and then by going back to email.
   *
   * SCOPED BY THE TOKEN AND NOTHING ELSE. A holder sees the findings that
   * arrived on their own link and nobody else's, and cannot ask for anything
   * wider, because there is no other input.
   *
   * The answer is included. A finding that was answered and one still
   * outstanding are different states, and counsel is the person who most needs
   * to know which is which before she writes the same thing twice.
   */
  openFindings: procedure.input(z.object({ token: z.string() })).query(async ({ input }) => {
    const row = await prisma.bizrethinkMcaLibraryReview.findUnique({
      where: { token: input.token },
      select: { id: true, status: true, expiresAt: true },
    });

    const usable =
      row !== null && row.status === 'open' && (row.expiresAt === null || row.expiresAt.getTime() > Date.now());

    if (row === null || !usable) {
      throw new AppError(AppErrorCode.NOT_FOUND, { message: NO_SUCH_LINK });
    }

    const findings = await prisma.bizrethinkMcaLibraryFinding.findMany({
      where: { reviewId: row.id },
      orderBy: { createdAt: 'asc' },
      select: { id: true, clauseSlug: true, body: true, answeredAt: true, answer: true, createdAt: true },
    });

    return { findings };
  }),

  /**
   * Counsel records a defect against one clause.
   *
   * UNAUTHENTICATED, because the whole point of a review link is that counsel
   * needs no account. Attribution comes from the review row rather than from
   * anything the caller sends: a caller who could name themselves could name
   * somebody else.
   *
   * WHY THIS EXISTS WHEN THE PAGE ONCE REFUSED TO COLLECT FINDINGS. The refusal
   * had a stated reason, and it is worth being precise about what that reason
   * covered: findings from the two adversarial DOCUMENT reviews live in
   * `lombard-contracts` manifests, and a second Pacta-side register of those
   * same findings would drift from the first. Nothing recorded here is a second
   * copy of one. It arrives only through a link we minted, it is attributable
   * to the reviewer named on that link, and no manifest has ever held one.
   * There is one register per origin, and the review page labels the origin of
   * every finding it shows.
   *
   * IT BLOCKS. An unanswered finding holds the clause — see
   * `counselFindingsHold`. That is what separates this from a comment box.
   */
  recordFinding: procedure
    .input(
      z.object({
        token: z.string(),
        clauseSlug: z.string(),
        body: z.string().trim().min(1),
      }),
    )
    .mutation(async ({ input }) => {
      const share = await prisma.bizrethinkMcaLibraryReview.findUnique({
        where: { token: input.token },
        select: {
          id: true,
          status: true,
          expiresAt: true,
          reviewerName: true,
          reviewerEmail: true,
          instrument: true,
        },
      });

      const usable =
        share !== null &&
        share.status === 'open' &&
        (share.expiresAt === null || share.expiresAt.getTime() > Date.now());

      if (share === null || !usable) {
        throw new AppError(AppErrorCode.NOT_FOUND, { message: NO_SUCH_LINK });
      }

      /*
        SCOPED TO THE LINK'S OWN AGREEMENT, not the whole library. A finding
        against a clause the reviewer was never shown is one nobody can answer
        in context, and a typo would become a blocker no page will ever display
        — unclearable, because `approve` counts it and no screen shows it.
      */
      const clause = libraryFor(share.instrument as McaInstrument).find(
        (candidate) => candidate.slug === input.clauseSlug,
      );

      if (clause === undefined) {
        throw new AppError(AppErrorCode.NOT_FOUND, { message: 'No such clause in this agreement.' });
      }

      return await prisma.bizrethinkMcaLibraryFinding.create({
        data: {
          id: prefixedId('mca_library_finding', 16),
          reviewId: share.id,
          clauseSlug: clause.slug,
          body: input.body,
          // From the review row, never from the caller.
          authorName: share.reviewerName,
          authorEmail: share.reviewerEmail,
          /*
            THE CLAUSE AS SHE READ IT, party names resolved. `openLibrary`
            resolves `{{funder}}` before counsel sees a word, so the canonical
            library form is not what was on her screen — and an answer to a
            finding against different words is an answer to a different
            question.
          */
          clauseFingerprint: mcaClauseFingerprint(resolveClauses([clause], LOMBARD)[0]),
        },
        select: { id: true, clauseSlug: true, body: true, authorName: true, createdAt: true },
      });
    }),

  /**
   * Staff answer a finding.
   *
   * BOTH HALVES REQUIRED — a timestamp with no text would make this as fast to
   * bypass as to satisfy, and the answer is what unblocks approval of the
   * clause.
   *
   * ADMIN-GATED RATHER THAN ORGANISATION-SCOPED, like every other write in this
   * router. The lease's `answerFinding` takes an `organisationId` from the
   * caller and had to be re-scoped by the review to close a cross-tenant hole:
   * a caller-supplied finding id authorised against an organisation the caller
   * merely NAMED. There is no organisation here to name, so the hole has no
   * shape to take.
   */
  answerFinding: adminProcedure
    .input(
      z.object({
        findingId: z.string(),
        answer: z.string().trim().min(1),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { count } = await prisma.bizrethinkMcaLibraryFinding.updateMany({
        /*
          ANSWERED ONCE. Re-answering would let a later edit quietly replace the
          reasoning that unblocked an approval already recorded against it —
          the same argument the lease's `applyDisposition` makes for dispositions
          being append-only.
        */
        where: { id: input.findingId, answeredAt: null },
        data: {
          answer: input.answer,
          answeredAt: new Date(),
          answeredByUserId: ctx.user.id,
        },
      });

      if (count === 0) {
        throw new AppError(AppErrorCode.NOT_FOUND, {
          message: 'That finding no longer exists, or has already been answered.',
        });
      }

      return { answered: true };
    }),

  /** Every finding on the library, newest first, for the staff page. */
  listFindings: adminProcedure.query(async () => {
    return await prisma.bizrethinkMcaLibraryFinding.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        clauseSlug: true,
        body: true,
        authorName: true,
        clauseFingerprint: true,
        answeredAt: true,
        answer: true,
        createdAt: true,
        review: { select: { instrument: true, reviewerName: true } },
      },
    });
  }),
});
