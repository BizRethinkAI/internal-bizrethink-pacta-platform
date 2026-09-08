import { AppError, AppErrorCode } from '@documenso/lib/errors/app-error';
import { prefixedId } from '@documenso/lib/universal/id';
import { prisma } from '@documenso/prisma';
import { adminProcedure, procedure, router } from '@documenso/trpc/server/trpc';
import { z } from 'zod';

import {
  approvalBlocks,
  isMcaApprovalCurrent,
  mcaClauseFingerprint,
  mcaLibraryFingerprint,
  normaliseMcaAdmission,
} from '../../clauses/approval';
import { outstandingFindingsFor, REGISTER_AVAILABLE } from '../../clauses/examination';
import { INSTRUMENTS, MCA_INSTRUMENTS, type McaInstrument } from '../../clauses/instruments';
import { ALL_MCA_CLAUSES, libraryFor } from '../../clauses/library';
import { LOMBARD, resolveClauses } from '../../clauses/parties';
import { counselBriefing } from '../../review/briefing';
import { isMcaReviewUsable, MCA_REVIEW_LINK_TTL_DAYS, type McaLibraryReview, reviewIsStale } from '../../review/link';
import { toReadableAgreement } from '../../review/readable-agreement';
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
      const blocked = approvalBlocks(clause, {
        admission,
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

    const clauses = libraryFor(review.instrument);
    const approvals = await loadMcaClauseApprovals();
    const instrument = INSTRUMENTS[review.instrument];

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

    return {
      reviewerName: review.reviewerName,
      instrument: {
        id: instrument.id,
        title: instrument.title,
        counterparty: instrument.counterparty,
      },
      /*
        WHOSE PAPER THE REVIEWER IS READING.

        This was `instrument.entity` until the clause library was parameterised:
        "Lombard Capital LLC" was a field on the Future Receivables Purchase
        Agreement itself, which made the library one client's. It is a tenant
        fact now, so it comes from the tenant.

        THE SEAM: `BizrethinkMcaLibraryReview` has no tenant column, because it
        was designed before there was a tenant to name. There is exactly one
        today, so defaulting is honest rather than convenient — and this is the
        line that changes when a second client's review link is minted.
      */
      parties: LOMBARD.parties,
      /*
        True when a clause has changed since the link was sent. The reviewer is
        told rather than left to discover that the words they are reading are
        not the words that were meant to reach them.
      */
      agreementMoved: reviewIsStale(review, clauses),
      /*
        WHETHER THE FINDINGS BELOW CAN BE TRUSTED TO BE COMPLETE.

        `outstandingFindingsFor` reads the review register off disk and returns
        `[]` when the file is absent, so an empty list means either "nothing
        outstanding" or "we cannot tell". Telling an attorney nothing was found
        when we cannot tell is worse on this page than on any other, because
        she is the one person acting on it. `findingsHold` refuses an approval
        for the same reason; this is the read-only half of the same honesty.
      */
      findingsReadable: REGISTER_AVAILABLE,
      /*
        WHAT THE READER IS TOLD BEFORE THE FIRST CLAUSE.

        Derived per agreement rather than written into the page: the six are not
        interchangeable, and prose typed into a route renders the same sentences
        for all of them. `briefing.ts` carries the argument in full.

        The counts are computed here from the same lists the page renders, so
        the briefing cannot claim a number the clauses below contradict.
      */
      briefing: counselBriefing({
        instrument: review.instrument,
        tenant: LOMBARD,
        clauseCount: clauses.length,
        approvedCount: clauses.filter((clause) => isMcaApprovalCurrent(clause, approvals.get(clause.slug) ?? null))
          .length,
        outstandingCount: clauses.filter((clause) => outstandingFindingsFor(clause).length > 0).length,
        findingsReadable: REGISTER_AVAILABLE,
        sender: sender === null ? null : { name: sender.name ?? sender.email, email: sender.email },
        expiresAt: row.expiresAt,
        now: new Date(),
      }),
      /*
        Grouped and in reading order. `openLibrary` on the lease side returned a
        flat list in module-concatenation order, which is neither document order
        nor any other order a reader could name.
      */
      /*
        RESOLVED FOR THE TENANT BEFORE IT REACHES COUNSEL.

        Clause bodies carry `{{funder}}`, `{{equipmentAffiliate}}` and
        `{{processor}}` so the library is not one client's paperwork. An
        attorney must not be shown those: she is reading to decide whether these
        words may go to a merchant, and the words that go to a merchant name the
        parties. Sending the general form would be asking her to approve text no
        document contains.
      */
      sections: toReadableAgreement(resolveClauses(clauses, LOMBARD)).map((section) => ({
        ...section,
        clauses: section.clauses.map((readable) => {
          const clause = clauses.find((candidate) => candidate.slug === readable.slug);

          return {
            ...readable,
            /*
              WHY THE CLAUSE IS IN THE DOCUMENT, where a state's law put it
              there. Most of this corpus is our own commercial drafting and
              says nothing here — and saying so is the point: it tells a lawyer
              where their hour is worth spending.
            */
            requiredBy: clause?.requiredBy ?? null,
            appliesInStates: clause?.appliesInStates ?? [],
            /*
              Whether somebody's approval already covers these exact words.
              Read by an attorney deciding whether the clause still needs her,
              so it has to mean "current", not "approved once, at some point".
            */
            approved: clause === undefined ? false : isMcaApprovalCurrent(clause, approvals.get(clause.slug) ?? null),
            /*
              Findings from the two document reviews that nothing has disposed
              of. Counsel is the person best placed to read a clause knowing
              what a previous review said about it, and this page is where she
              is reading it.
            */
            outstandingFindings: clause === undefined ? [] : outstandingFindingsFor(clause).map((f) => f.finding),
          };
        }),
      })),
    };
  }),
});
