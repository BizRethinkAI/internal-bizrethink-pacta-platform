import { AppError, AppErrorCode } from '@documenso/lib/errors/app-error';
import { prefixedId } from '@documenso/lib/universal/id';
import { buildOrganisationWhereQuery } from '@documenso/lib/utils/organisations';
import { buildTeamWhereQuery } from '@documenso/lib/utils/teams';
import { prisma } from '@documenso/prisma';
import { authenticatedProcedure, procedure, router } from '@documenso/trpc/server/trpc';
import { z } from 'zod';

import { lookupAddress } from '../../lease/address/census';
import { toCustomClause } from '../../lease/clauses/custom';
import { FL_LIBRARY } from '../../lease/clauses/us-fl';
import { selectClauses } from '../../lease/engine/select-clauses';
import { validateAnswers } from '../../lease/engine/validate';
import { deriveFacts } from '../../lease/interview/derive-facts';
import type { LeasePartyInput } from '../../lease/parties/derive-parties';
import { derivePartyValues, partyEmails, toLeaseParties, validateParties } from '../../lease/parties/derive-parties';
import { buildLeaseDocuments } from '../../lease/render/render-lease';
import {
  applyDisposition,
  hashAnswers,
  isReviewUsable,
  REVIEW_LINK_TTL_DAYS,
  sendBlockers,
} from '../../lease/review/disposition';
import type { Disposition, LeaseReview, ReviewAudience, ReviewComment, ReviewStatus } from '../../lease/review/types';
import { US_FL } from '../../lease/rule-packs/us-fl';
import { createEnvelopeFromMatter } from '../../lease/server-only/create-envelope-from-matter';
import { canAccessLeaseBuilder, canRenderClause } from '../feature-access';

/**
 * The lease builder's server surface.
 *
 * Every procedure re-checks the access gate. A tRPC procedure is reachable
 * without going through the page that renders it, so gating the route alone
 * would leave the data one fetch away.
 *
 * Answers are stored as JSON and validated on the way out rather than the way
 * in: a half-finished interview must be saveable, so `saveStep` accepts an
 * incomplete answer set and `validate` is what refuses to let it be sent.
 */

const ZCustomClause = z.object({
  heading: z.string().min(1),
  body: z.string().min(1),
  section: z.string().min(1),
  asserts: z.array(z.string()).default([]),
});

const ZParty = z.object({
  name: z.string(),
  role: z.enum(['landlord', 'tenant']),
  email: z.string(),
});

const ZAnswers = z.object({
  facts: z.record(z.string(), z.unknown()),
  money: z.record(z.string(), z.unknown()),
  values: z.record(z.string(), z.unknown()),
  customClauses: z.array(ZCustomClause).default([]),
  /*
    Not `.email()` here. A half-finished interview must stay saveable, so the
    shape is checked on the way in and the content on the way out — the same
    split the rest of the answer set uses. `validateParties` is what refuses.
  */
  parties: z.array(ZParty).default([]),
});

/**
 * TWO CHECKS, AND THEY ANSWER DIFFERENT QUESTIONS.
 *
 * `canAccessLeaseBuilder` is a FEATURE GATE: is this feature switched on for
 * this person or their organisation? It is not authorization. A user-scoped
 * grant makes it return true for ANY organisationId, because it never looks at
 * membership — that is by design, so one person can be granted access across
 * every org they belong to.
 *
 * `buildOrganisationWhereQuery` is the AUTHORIZATION check: is this person
 * actually a member of the organisation whose data they just asked for?
 *
 * Conflating the two is a cross-tenant read. Every organisationId here arrives
 * from client input, so without the membership check a user holding a
 * user-scoped grant could list another organisation's properties and leases by
 * passing a different id. Both checks, every procedure, no exceptions.
 */
const assertAccess = async (organisationId: string, userId: number) => {
  const organisation = await prisma.organisation.findFirst({
    where: buildOrganisationWhereQuery({ organisationId, userId }),
    select: { id: true },
  });

  if (!organisation) {
    // Same shape as "feature off", deliberately: whether an organisation exists
    // is not something to confirm to someone outside it.
    throw new AppError(AppErrorCode.UNAUTHORIZED, {
      message: 'The lease builder is not enabled for this organisation.',
    });
  }

  if (!(await canAccessLeaseBuilder({ organisationId, userId }))) {
    throw new AppError(AppErrorCode.UNAUTHORIZED, {
      message: 'The lease builder is not enabled for this organisation.',
    });
  }
};

/**
 * The team is client-supplied too, and a matter carries it through to envelope
 * creation — so an unchecked teamId would put a lease in a team the author has
 * no access to.
 */
const assertTeamAccess = async (teamId: number, organisationId: string, userId: number) => {
  const team = await prisma.team.findFirst({
    where: { ...buildTeamWhereQuery({ teamId, userId }), organisationId },
    select: { id: true },
  });

  if (!team) {
    throw new AppError(AppErrorCode.UNAUTHORIZED, { message: 'No access to that team.' });
  }
};

/**
 * Scoped to organisations the user actually belongs to, in the query itself.
 *
 * Fetching by id and checking afterwards would answer two questions with two
 * different errors — NOT_FOUND for an id that does not exist, UNAUTHORIZED for
 * one belonging to someone else — which turns the endpoint into an existence
 * oracle. Both cases are now identical and indistinguishable.
 */
const loadMatter = async (id: string, userId: number) => {
  /*
    Two queries rather than a join: BizrethinkLeaseMatter deliberately has no
    Prisma @relation into Organisation, because a relation requires declaring
    the reverse field on an upstream model and this fork does not modify
    upstream files outside overlays. See ADR 0002.
  */
  const memberships = await prisma.organisation.findMany({
    where: { members: { some: { userId } } },
    select: { id: true },
  });

  const matter = await prisma.bizrethinkLeaseMatter.findFirst({
    where: { id, organisationId: { in: memberships.map((o) => o.id) } },
  });

  if (!matter) {
    throw new AppError(AppErrorCode.NOT_FOUND, { message: 'Lease not found' });
  }

  // Membership is established; this is the feature gate on top of it.
  await assertAccess(matter.organisationId, userId);

  return matter;
};

/**
 * The review loop's blockers for one matter.
 *
 * Two queries rather than a join. These are both BizRethink models so a Prisma
 * relation between them would be legal, but the rest of this feature reads
 * without one and a relation declared for a single call site is a schema
 * change earning nothing.
 */
/*
  Prisma stores `audience`, `status` and `disposition` as plain strings — the
  schema has no enums, because an enum addition is a migration every time the
  set grows and these are ours to widen. The casts are narrowed here, at the
  single boundary between the database and the domain, rather than scattered
  through the handlers.
*/
const toDomainReview = (review: {
  id: string;
  matterId: string;
  audience: string;
  status: string;
  expiresAt: Date | null;
  answersHash: string;
}): LeaseReview => ({
  id: review.id,
  matterId: review.matterId,
  audience: review.audience as ReviewAudience,
  status: review.status as ReviewStatus,
  expiresAt: review.expiresAt,
  answersHash: review.answersHash,
});

const toDomainComment = (comment: {
  id: string;
  reviewId: string;
  clauseSlug: string | null;
  body: string;
  authorName: string;
  disposition: string;
  dispositionReason: string | null;
  dispositionedAt: Date | null;
}): ReviewComment => ({
  id: comment.id,
  reviewId: comment.reviewId,
  clauseSlug: comment.clauseSlug,
  body: comment.body,
  authorName: comment.authorName,
  disposition: comment.disposition as Disposition,
  dispositionReason: comment.dispositionReason,
  dispositionedAt: comment.dispositionedAt,
});

const reviewBlockersFor = async (matterId: string): Promise<string[]> => {
  const reviews = await prisma.bizrethinkLeaseReview.findMany({ where: { matterId } });

  const comments = await prisma.bizrethinkReviewComment.findMany({
    where: { reviewId: { in: reviews.map((review) => review.id) } },
  });

  return sendBlockers({
    reviews: reviews.map(toDomainReview),
    comments: comments.map(toDomainComment),
    now: new Date(),
  });
};

/**
 * Rebuild the full answer set from a stored matter, re-deriving everything
 * derivable rather than trusting what was written.
 *
 * Derived figures are recomputed on every read because a stored derived value
 * is a value that can go stale. If rent is edited and the advance-rent top-up
 * were merely persisted, the lease would state a figure that no longer follows
 * from its own inputs — which is the defect this whole feature exists to
 * prevent, reintroduced through the back door.
 */
type HydratedValues = Record<string, string | number | boolean | null>;

const hydrate = (matter: {
  facts: unknown;
  money: unknown;
  values: unknown;
  customClauses: unknown;
  parties: unknown;
}): {
  facts: never;
  money: Parameters<typeof deriveFacts>[0];
  values: HydratedValues;
  customClauses: z.infer<typeof ZCustomClause>[];
  parties: LeasePartyInput[];
} => {
  const money = matter.money as Parameters<typeof deriveFacts>[0];
  const values = matter.values as HydratedValues;
  const facts = matter.facts as Record<string, unknown>;
  const parties = (matter.parties ?? []) as LeasePartyInput[];

  const endDate = String(values.endDate ?? money.term.startDate);

  return {
    facts: { ...facts, ...deriveFacts(money, endDate) } as never,
    money,
    values: {
      ...values,
      rentDueDay: money.rent.dueDayOfMonth,
      monthlyRentUsd: money.rent.monthlyUsd,
      /*
        The opening clause names the parties, and both variables are required.
        Derived here on every read rather than stored, for the same reason the
        money figures are: a stored derived value is a value that can go stale,
        and a lease whose first sentence names someone who is no longer a
        signer is exactly the class of contradiction this feature exists to
        prevent.
      */
      ...derivePartyValues(parties),
    },
    customClauses: (matter.customClauses ?? []) as z.infer<typeof ZCustomClause>[],
    parties,
  };
};

export const leaseBuilderRouter = router({
  property: router({
    list: authenticatedProcedure.input(z.object({ organisationId: z.string() })).query(async ({ ctx, input }) => {
      await assertAccess(input.organisationId, ctx.user.id);

      return await prisma.bizrethinkProperty.findMany({
        where: { organisationId: input.organisationId, archivedAt: null },
        orderBy: { createdAt: 'asc' },
      });
    }),

    create: authenticatedProcedure
      .input(
        z.object({
          organisationId: z.string(),
          label: z.string().min(1),
          addressLine: z.string().min(1),
          city: z.string().min(1),
          state: z.string().default('FL'),
          postalCode: z.string().min(1),
          county: z.string().min(1),
          propertyType: z.enum(['single-family', 'duplex', 'condo', 'multi-family']),
          yearBuilt: z.number().int().nullable(),
          hasPool: z.boolean(),
          hasHoa: z.boolean(),
          hoaName: z.string().nullable(),
          includedAppliances: z.string().nullable(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        await assertAccess(input.organisationId, ctx.user.id);

        return await prisma.bizrethinkProperty.create({
          data: {
            id: prefixedId('lease_property', 16),
            createdByUserId: ctx.user.id,
            ...input,
          },
        });
      }),

    /**
     * Normalise an address and derive its county, via the US Census geocoder.
     *
     * Server-side rather than from the browser: the endpoint sets no CORS
     * headers, and routing it through here keeps it behind the same access gate
     * as everything else rather than exposing an open proxy.
     *
     * Never throws. A geocoder that is slow, rate-limiting or wrong must not
     * stand between a landlord and a lease — every field it fills can be typed.
     */
    lookupAddress: authenticatedProcedure
      .input(z.object({ organisationId: z.string(), address: z.string().max(200) }))
      .query(async ({ ctx, input }) => {
        await assertAccess(input.organisationId, ctx.user.id);

        return { match: await lookupAddress(input.address) };
      }),
  }),

  matter: router({
    list: authenticatedProcedure.input(z.object({ organisationId: z.string() })).query(async ({ ctx, input }) => {
      await assertAccess(input.organisationId, ctx.user.id);

      return await prisma.bizrethinkLeaseMatter.findMany({
        where: { organisationId: input.organisationId },
        orderBy: { updatedAt: 'desc' },
        select: {
          id: true,
          title: true,
          status: true,
          propertyId: true,
          currentStepId: true,
          updatedAt: true,
          envelopeId: true,
        },
      });
    }),

    get: authenticatedProcedure.input(z.object({ id: z.string() })).query(async ({ ctx, input }) => {
      const matter = await loadMatter(input.id, ctx.user.id);

      return { ...matter, ...hydrate(matter) };
    }),

    create: authenticatedProcedure
      .input(
        z.object({
          organisationId: z.string(),
          teamId: z.number(),
          propertyId: z.string(),
          title: z.string().min(1),
          /** Set when this lease continues an earlier one. */
          supersedesMatterId: z.string().nullable().default(null),
          answers: ZAnswers,
        }),
      )
      .mutation(async ({ ctx, input }) => {
        await assertAccess(input.organisationId, ctx.user.id);
        await assertTeamAccess(input.teamId, input.organisationId, ctx.user.id);

        /*
          The property must belong to the same organisation. Without this a
          lease could be created against another organisation's property,
          copying its address and details into a document.
        */
        const property = await prisma.bizrethinkProperty.findFirst({
          where: { id: input.propertyId, organisationId: input.organisationId },
          select: { id: true },
        });

        if (!property) {
          throw new AppError(AppErrorCode.NOT_FOUND, { message: 'Property not found.' });
        }

        return await prisma.bizrethinkLeaseMatter.create({
          data: {
            id: prefixedId('lease_matter', 16),
            organisationId: input.organisationId,
            teamId: input.teamId,
            createdByUserId: ctx.user.id,
            propertyId: input.propertyId,
            title: input.title,
            supersedesMatterId: input.supersedesMatterId,
            facts: input.answers.facts,
            money: input.answers.money,
            values: input.answers.values,
            customClauses: input.answers.customClauses,
            parties: input.answers.parties,
          },
          select: { id: true },
        });
      }),

    /**
     * Save progress. Deliberately accepts an incomplete answer set — a 68-field
     * interview that could only be saved when valid would be an interview
     * nobody finishes.
     */
    saveStep: authenticatedProcedure
      .input(z.object({ id: z.string(), currentStepId: z.string(), answers: ZAnswers }))
      .mutation(async ({ ctx, input }) => {
        const matter = await loadMatter(input.id, ctx.user.id);

        if (matter.status !== 'draft') {
          throw new AppError(AppErrorCode.INVALID_REQUEST, {
            message: 'This lease has already been sent and can no longer be edited.',
          });
        }

        await prisma.bizrethinkLeaseMatter.update({
          where: { id: input.id },
          data: {
            currentStepId: input.currentStepId,
            facts: input.answers.facts,
            money: input.answers.money,
            values: input.answers.values,
            customClauses: input.answers.customClauses,
            parties: input.answers.parties,
          },
        });

        return { saved: true };
      }),

    /**
     * Everything standing between this lease and a signer.
     *
     * Three independent kinds of problem, kept separate because they are
     * resolved differently: statutory limits are corrected by changing an
     * answer, unfilled variables by answering a question, and unreviewed
     * clauses by an attorney.
     */
    validate: authenticatedProcedure.input(z.object({ id: z.string() })).query(async ({ ctx, input }) => {
      const matter = await loadMatter(input.id, ctx.user.id);
      const answers = hydrate(matter);

      const billing = await prisma.bizrethinkOrganisationBilling.findUnique({
        where: { organisationId: matter.organisationId },
        select: { bizrethinkInternal: true },
      });

      const library = [...FL_LIBRARY, ...answers.customClauses.map((clause, index) => toCustomClause(clause, index))];

      const selection = selectClauses({ facts: answers.facts, library });

      const { missing } = buildLeaseDocuments({
        facts: answers.facts,
        money: answers.money,
        values: answers.values,
        parties: toLeaseParties(answers.parties),
        propertyAddress: String(answers.values.propertyAddress ?? ''),
        customClauses: answers.customClauses,
      });

      const findings = validateAnswers({
        answers: {
          rent: { monthlyUsd: answers.money.rent.monthlyUsd },
          deposit: {
            returnDays: Number(answers.values.depositReturnDays ?? 0),
            claimNoticeDays: Number(answers.values.depositClaimNoticeDays ?? 0),
          },
          access: {
            noticeHours: Number(answers.values.entryNoticeHours ?? 0),
            earliestHour: 9,
            latestHour: 18,
          },
          earlyTermination: {
            offered: Boolean((answers.facts as Record<string, unknown>).earlyTerminationOffered),
            feeUsd: Number(answers.values.earlyTerminationFeeUsd ?? 0),
            tenantNoticeDays: Number(answers.values.earlyTerminationNoticeDays ?? 0),
          },
          lateFee: { graceDays: Number(answers.values.graceDays ?? 0) },
          nonRenewal: {
            required: Boolean((answers.facts as Record<string, unknown>).nonRenewalNoticeRequired),
            noticeDays: Number(answers.values.nonRenewalNoticeDays ?? 0),
          },
        },
        pack: US_FL,
      });

      const unreviewed = [...selection.selected, ...selection.addenda, ...selection.standaloneDisclosures]
        .filter(
          (clause) =>
            !canRenderClause({
              status: clause.status,
              organisationIsInternal: billing?.bizrethinkInternal ?? false,
            }),
        )
        .map((clause) => clause.slug);

      /*
        Kept as its own list rather than folded into `findings`: a party problem
        is fixed on the parties step, not by changing a term, and two of them
        (duplicate name, duplicate email) misroute a signing link silently
        rather than producing a visibly wrong document.
      */
      const partyFindings = validateParties(answers.parties);

      /*
        The review loop's own blockers, kept separate from statutory findings
        because they are resolved by a different act entirely: not by changing
        an answer, but by deciding what to do about somebody's comment.
      */
      const reviewFindings = await reviewBlockersFor(matter.id);

      return {
        findings,
        missing,
        partyFindings,
        reviewFindings,
        duplicateAssertions: selection.duplicateAssertions,
        unreviewedClauses: [...new Set(unreviewed)],
        blocking:
          findings.filter((f) => f.severity === 'blocks').length +
          missing.length +
          partyFindings.length +
          reviewFindings.length,
        readyToSend:
          findings.every((f) => f.severity !== 'blocks') &&
          missing.length === 0 &&
          partyFindings.length === 0 &&
          reviewFindings.length === 0,
        rulePackVersion: US_FL.version,
      };
    }),

    /**
     * Send the lease for signature.
     *
     * The last thing standing between a draft and a signer, and deliberately
     * the narrowest gate in the feature. Everything here is re-derived and
     * re-checked from stored answers rather than accepted from the client: the
     * caller supplies an id and nothing else, so there is no field on this
     * mutation through which a validated document could be swapped for another.
     *
     * `createEnvelopeFromMatter` re-runs both access locks itself. That
     * duplication is intentional — it is the narrowest point every caller must
     * pass through, and this router is not the only conceivable caller.
     */
    send: authenticatedProcedure.input(z.object({ id: z.string() })).mutation(async ({ ctx, input }) => {
      const matter = await loadMatter(input.id, ctx.user.id);

      /*
          Idempotency, not just tidiness. Two clicks on a slow connection would
          otherwise create two envelopes, and every signer would receive two
          links to two different documents with no way to tell which is the
          real lease.
        */
      if (matter.status !== 'draft' || matter.envelopeId) {
        throw new AppError(AppErrorCode.INVALID_REQUEST, {
          message: 'This lease has already been sent.',
        });
      }

      const answers = hydrate(matter);

      const partyFindings = validateParties(answers.parties);

      if (partyFindings.length > 0) {
        throw new AppError(AppErrorCode.INVALID_REQUEST, { message: partyFindings.join(' ') });
      }

      /*
        Re-checked HERE, not merely surfaced by `validate`.

        `validate` is advisory — it is a query, it powers a panel, and nothing
        forces a client to call it. This mutation is the only thing standing
        between a draft and real signers, so every rule that must hold is
        re-asserted at this point. An attorney's outstanding comment blocking
        the send is exactly such a rule, and a gate that lives only in a
        read-only query is not a gate.
      */
      const reviewFindings = await reviewBlockersFor(matter.id);

      if (reviewFindings.length > 0) {
        throw new AppError(AppErrorCode.INVALID_REQUEST, { message: reviewFindings.join(' ') });
      }

      const billing = await prisma.bizrethinkOrganisationBilling.findUnique({
        where: { organisationId: matter.organisationId },
        select: { bizrethinkInternal: true },
      });

      const envelope = await createEnvelopeFromMatter({
        input: {
          facts: answers.facts,
          money: answers.money,
          values: answers.values,
          parties: toLeaseParties(answers.parties),
          propertyAddress: String(answers.values.propertyAddress ?? ''),
          customClauses: answers.customClauses,
        },
        parties: toLeaseParties(answers.parties),
        emails: partyEmails(answers.parties),
        userId: ctx.user.id,
        teamId: matter.teamId,
        organisationId: matter.organisationId,
        organisationIsInternal: billing?.bizrethinkInternal ?? false,
        title: matter.title,
        requestMetadata: ctx.metadata,
      });

      /*
          Stamped only after the envelope exists. The rule pack version is
          recorded here because statutes move: a lease signed today must still
          be explainable against the rules that produced it in five years.
        */
      await prisma.bizrethinkLeaseMatter.update({
        where: { id: matter.id },
        data: {
          status: 'sent',
          envelopeId: envelope.id,
          rulePackVersion: US_FL.version,
          generatedAt: new Date(),
        },
      });

      return { envelopeId: envelope.id };
    }),
  }),
  /**
   * The review loop.
   *
   * `create`, `list` and `disposition` are the landlord's side and are
   * authenticated. `open` and `submit` are the REVIEWER's side, reached with a
   * token and no account — a lawyer or a tenant must not have to sign up to
   * read a lease they were sent.
   */
  review: router({
    create: authenticatedProcedure
      .input(
        z.object({
          matterId: z.string(),
          audience: z.enum(['attorney', 'tenant']),
          reviewerName: z.string().min(1),
          reviewerEmail: z.string().email(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        const matter = await loadMatter(input.matterId, ctx.user.id);

        if (matter.status !== 'draft') {
          throw new AppError(AppErrorCode.INVALID_REQUEST, {
            message: 'This lease has already been sent; there is nothing left to review.',
          });
        }

        /*
          The answer set is pinned at issue time so a reviewer returning after
          an edit can be shown what moved. Without it, "I already reviewed
          this" silently stops being true the moment a clause changes.
        */
        const answersHash = hashAnswers({
          facts: matter.facts,
          money: matter.money,
          values: matter.values,
          customClauses: matter.customClauses,
          parties: matter.parties,
        });

        return await prisma.bizrethinkLeaseReview.create({
          data: {
            id: prefixedId('lease_review', 16),
            matterId: matter.id,
            audience: input.audience,
            token: prefixedId('lrv', 32),
            reviewerName: input.reviewerName,
            reviewerEmail: input.reviewerEmail,
            answersHash,
            createdByUserId: ctx.user.id,
            expiresAt: new Date(Date.now() + REVIEW_LINK_TTL_DAYS * 24 * 60 * 60 * 1000),
          },
          select: { id: true, token: true, expiresAt: true, audience: true },
        });
      }),

    list: authenticatedProcedure.input(z.object({ matterId: z.string() })).query(async ({ ctx, input }) => {
      const matter = await loadMatter(input.matterId, ctx.user.id);

      const reviews = await prisma.bizrethinkLeaseReview.findMany({
        where: { matterId: matter.id },
        orderBy: { createdAt: 'desc' },
      });

      const comments = await prisma.bizrethinkReviewComment.findMany({
        where: { reviewId: { in: reviews.map((review) => review.id) } },
        orderBy: { createdAt: 'asc' },
      });

      return { reviews, comments };
    }),

    /**
     * Decide one comment. Once.
     *
     * The append-only rule lives in `applyDisposition`. The write is
     * additionally conditioned on the row still being pending, so two tabs
     * cannot both succeed with the later reason silently overwriting the
     * earlier one.
     */
    disposition: authenticatedProcedure
      .input(
        z.object({
          commentId: z.string(),
          disposition: z.enum(['accepted', 'edited', 'dismissed']),
          reason: z.string().nullable().default(null),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        const comment = await prisma.bizrethinkReviewComment.findUnique({ where: { id: input.commentId } });

        if (!comment) {
          throw new AppError(AppErrorCode.NOT_FOUND, { message: 'Comment not found' });
        }

        const review = await prisma.bizrethinkLeaseReview.findUnique({
          where: { id: comment.reviewId },
          select: { matterId: true },
        });

        if (!review) {
          throw new AppError(AppErrorCode.NOT_FOUND, { message: 'Comment not found' });
        }

        // Establishes org membership and the feature gate for this matter.
        await loadMatter(review.matterId, ctx.user.id);

        const result = applyDisposition({
          comment: toDomainComment(comment),
          disposition: input.disposition,
          reason: input.reason,
          now: new Date(),
        });

        if (!result.ok) {
          throw new AppError(AppErrorCode.INVALID_REQUEST, { message: result.error });
        }

        const written = await prisma.bizrethinkReviewComment.updateMany({
          // `disposition: 'pending'` in the WHERE is the concurrency guard.
          where: { id: comment.id, disposition: 'pending' },
          data: {
            disposition: result.comment.disposition,
            dispositionReason: result.comment.dispositionReason,
            dispositionedAt: result.comment.dispositionedAt,
            dispositionedByUserId: ctx.user.id,
          },
        });

        if (written.count === 0) {
          throw new AppError(AppErrorCode.INVALID_REQUEST, {
            message: 'This comment was dispositioned a moment ago. Reload to see the decision.',
          });
        }

        return { dispositioned: true };
      }),

    /**
     * The reviewer's side. No account, no session — a token.
     *
     * Returns this lease and this reviewer's own comments, and nothing about
     * the organisation, the other party, or any other matter.
     */
    open: procedure.input(z.object({ token: z.string() })).query(async ({ input }) => {
      const review = await prisma.bizrethinkLeaseReview.findUnique({ where: { token: input.token } });

      /*
        One error for "no such token", "expired" and "already returned". A
        reviewer cannot act on the difference, and distinguishing them would
        confirm to anyone holding a guessed token that it once existed.
      */
      if (!review || !isReviewUsable(toDomainReview(review), new Date())) {
        throw new AppError(AppErrorCode.NOT_FOUND, { message: 'This review link is no longer active.' });
      }

      const matter = await prisma.bizrethinkLeaseMatter.findUnique({
        where: { id: review.matterId },
        select: { id: true, title: true, facts: true, money: true, values: true, customClauses: true, parties: true },
      });

      if (!matter) {
        throw new AppError(AppErrorCode.NOT_FOUND, { message: 'This review link is no longer active.' });
      }

      const comments = await prisma.bizrethinkReviewComment.findMany({
        where: { reviewId: review.id },
        orderBy: { createdAt: 'asc' },
        // Dispositions are the landlord's business, not the reviewer's feed.
        select: { id: true, clauseSlug: true, body: true, authorName: true, createdAt: true },
      });

      /*
        Both audiences see the whole lease, so this flag is the only thing
        separating "you reviewed this" from "you reviewed something else".
      */
      const changedSinceIssued =
        hashAnswers({
          facts: matter.facts,
          money: matter.money,
          values: matter.values,
          customClauses: matter.customClauses,
          parties: matter.parties,
        }) !== review.answersHash;

      return {
        review: {
          id: review.id,
          audience: review.audience,
          reviewerName: review.reviewerName,
          expiresAt: review.expiresAt,
        },
        matter: { id: matter.id, title: matter.title },
        comments,
        changedSinceIssued,
      };
    }),

    /**
     * Leave comments and hand the lease back.
     *
     * All comments arrive together rather than one at a time: a review is a
     * single act, and a link that stays live after "I am done" is a link that
     * can be reused by whoever else has the URL.
     */
    submit: procedure
      .input(
        z.object({
          token: z.string(),
          comments: z
            .array(z.object({ clauseSlug: z.string().nullable().default(null), body: z.string().min(1).max(5000) }))
            .max(200),
        }),
      )
      .mutation(async ({ input }) => {
        const review = await prisma.bizrethinkLeaseReview.findUnique({ where: { token: input.token } });

        if (!review || !isReviewUsable(toDomainReview(review), new Date())) {
          throw new AppError(AppErrorCode.NOT_FOUND, { message: 'This review link is no longer active.' });
        }

        await prisma.$transaction([
          prisma.bizrethinkReviewComment.createMany({
            data: input.comments.map((comment) => ({
              id: prefixedId('lease_comment', 16),
              reviewId: review.id,
              clauseSlug: comment.clauseSlug,
              body: comment.body,
              authorName: review.reviewerName,
            })),
          }),
          /*
            Closing the link is in the same transaction as recording the
            comments. A submit that stored comments and left the link open
            would let a second submission double every comment.
          */
          prisma.bizrethinkLeaseReview.updateMany({
            where: { id: review.id, status: 'open' },
            data: { status: 'returned', returnedAt: new Date() },
          }),
        ]);

        return { submitted: true, commentCount: input.comments.length };
      }),
  }),
});
