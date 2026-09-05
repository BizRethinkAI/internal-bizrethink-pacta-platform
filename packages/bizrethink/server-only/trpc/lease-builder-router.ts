import { AppError, AppErrorCode } from '@documenso/lib/errors/app-error';
import { prefixedId } from '@documenso/lib/universal/id';
import { buildOrganisationWhereQuery } from '@documenso/lib/utils/organisations';
import { buildTeamWhereQuery } from '@documenso/lib/utils/teams';
import { prisma } from '@documenso/prisma';
import { authenticatedProcedure, procedure, router } from '@documenso/trpc/server/trpc';
import { z } from 'zod';

import { lookupAddress } from '../../lease/address/census';
import { clauseFingerprint, isApprovalCurrent, libraryFingerprint } from '../../lease/clauses/approval';
import { toCustomClause } from '../../lease/clauses/custom';
import { FL_LIBRARY } from '../../lease/clauses/us-fl';
import { whyThisClause } from '../../lease/clauses/why-this-clause';
import { scanCustomClauses } from '../../lease/engine/guardrails';
import { selectClauses } from '../../lease/engine/select-clauses';
import { validateAnswers } from '../../lease/engine/validate';
import type { deriveFacts } from '../../lease/interview/derive-facts';
import { entryWindow } from '../../lease/interview/entry-hours';
import { FL_INTERVIEW } from '../../lease/interview/steps';
import { applyTenantAnswers, tenantFieldsFor } from '../../lease/interview/tenant-answers';
import { staleWriteMessage } from '../../lease/matters/concurrency';
import { canDeleteMatter } from '../../lease/matters/lifecycle';
import type { LeasePartyInput } from '../../lease/parties/derive-parties';
import { partyEmails, toLeaseParties, validateParties } from '../../lease/parties/derive-parties';
import { buildLeaseDocuments } from '../../lease/render/render-lease';
import {
  applyDisposition,
  hashAnswers,
  isReviewUsable,
  REVIEW_LINK_TTL_DAYS,
  sendBlockers,
} from '../../lease/review/disposition';
import { toReadableSections } from '../../lease/review/readable-lease';
import type { Disposition, LeaseReview, ReviewAudience, ReviewComment, ReviewStatus } from '../../lease/review/types';
import { US_FL } from '../../lease/rule-packs/us-fl';
import { FL_NON_WAIVABLE } from '../../lease/rule-packs/us-fl-non-waivable';
import { loadClauseApprovals, statusWithApproval } from '../../lease/server-only/clause-approvals';
import { createEnvelopeFromMatter } from '../../lease/server-only/create-envelope-from-matter';
import { draftClause } from '../../lease/server-only/draft-clause';
import { hydrateMatter } from '../../lease/server-only/matter-answers';
import { loadPropertyContext } from '../../lease/server-only/property-context';
import { seedMatterFromProperty } from '../../lease/server-only/seed-from-property';
import type { UtilityRow } from '../../lease/utilities/derive-utilities';
import type { YardTask } from '../../lease/yard/derive-yard';
import { unassignedYardTasks } from '../../lease/yard/derive-yard';
import { canAccessLeaseBuilder, canRenderClause, canRenderDraftClauses } from '../feature-access';

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
    `doneBy` admits '' on purpose. An unfinished interview must stay saveable,
    and an unallocated task is a real intermediate state — it is `validate`
    that refuses to send one, not the save.
  */
  yardTasks: z
    .array(
      z.object({
        task: z.string(),
        doneBy: z.enum(['tenant', 'landlord', 'association', '']),
        frequency: z.string(),
        notes: z.string(),
      }),
    )
    .default([]),
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

  /*
    A third query, for the same reason there are already two: ADR 0002 keeps
    our models free of Prisma relations into upstream ones, and the convention
    is kept between our own.

    The utility rows are read LIVE rather than copied at creation. Which
    company supplies the electricity at an address does not change between
    tenancies, and a lease created before its property had utilities recorded
    would otherwise hold two empty required boxes that nothing could fill.
  */
  return { ...matter, ...(await loadPropertyContext(matter.propertyId, matter.id)) };
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

/**
 * The answer set as it stands, hashed the way `answersHash` was at issue.
 *
 * One function so the two callers cannot drift: a hash that omits something the
 * lease renders from turns "has this changed since the attorney read it?" into
 * a question that always answers no.
 */
const currentAnswersHash = (matter: {
  facts: unknown;
  money: unknown;
  values: unknown;
  customClauses: unknown;
  parties: unknown;
  yardTasks: unknown;
  propertyUtilities: unknown;
  propertyDocuments: unknown;
}): string =>
  hashAnswers({
    facts: matter.facts,
    money: matter.money,
    values: matter.values,
    customClauses: matter.customClauses,
    parties: matter.parties,
    // Moving palm trimming from you to the tenant changes the lease an
    // attorney signed off on.
    yardTasks: matter.yardTasks,
    // Read LIVE from the property rather than copied, so editing a utility row
    // rewrites the utility clause of a lease already out for review.
    utilities: matter.propertyUtilities,
    /*
      Live for the same reason, and it matters more here. The receipt addendum
      is a signed statement that the tenant received a NAMED list of documents.
      Attaching an amendment after a link went out changes that list, and a
      reviewer who approved the shorter one has approved something else.
    */
    documents: matter.propertyDocuments,
  });

const reviewBlockersFor = async (matterId: string, answersHash?: string): Promise<string[]> => {
  const reviews = await prisma.bizrethinkLeaseReview.findMany({ where: { matterId } });

  const comments = await prisma.bizrethinkReviewComment.findMany({
    where: { reviewId: { in: reviews.map((review) => review.id) } },
  });

  return sendBlockers({
    reviews: reviews.map(toDomainReview),
    comments: comments.map(toDomainComment),
    now: new Date(),
    /*
      Without this the loop had an obvious hole: disposition every comment,
      then change the rent, and the send is clear with the attorney's review
      recorded against a document that no longer exists.
    */
    answersHash,
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
  yardTasks?: unknown;
  // Read live from the property by loadPropertyContext, not stored on the
  // matter — see property-context.ts for why both arrive together.
  propertyUtilities?: unknown;
  propertyDocuments?: unknown;
}): {
  facts: never;
  money: Parameters<typeof deriveFacts>[0];
  values: HydratedValues;
  customClauses: z.infer<typeof ZCustomClause>[];
  parties: LeasePartyInput[];
  yardTasks: YardTask[];
} => {
  const hydrated = hydrateMatter(matter);

  return {
    facts: hydrated.facts as never,
    money: hydrated.money,
    values: hydrated.values as HydratedValues,
    customClauses: hydrated.customClauses as z.infer<typeof ZCustomClause>[],
    parties: hydrated.partyInputs,
    yardTasks: hydrated.yardTasks,
  };
};

/**
 * The statutory rule pack's input, built once.
 *
 * It used to be assembled inline inside the `validate` QUERY, which is why the
 * `send` mutation never ran these rules at all — there was nothing to call.
 * `validate` is advisory: it powers a panel, nothing forces a client to call
 * it, and its cache is enabled only on the review step. A rule that lives
 * there alone is a rule a send walks past.
 */
const statutoryInput = (answers: ReturnType<typeof hydrate>) => ({
  rent: { monthlyUsd: answers.money.rent.monthlyUsd },
  deposit: {
    returnDays: Number(answers.values.depositReturnDays ?? 0),
    claimNoticeDays: Number(answers.values.depositClaimNoticeDays ?? 0),
  },
  access: {
    noticeHours: Number(answers.values.entryNoticeHours ?? 0),
    /*
      The ANSWERS, not constants. Both entry times are free text and these were
      hardcoded, so the §83.53(2) check ran against numbers nobody had entered:
      a landlord could type "6:00am" to "11:00pm", see zero findings, and print
      that window into the lease under a chip telling them the statute
      constrains it.
    */
    ...entryWindow(answers.values.entryEarliestLabel, answers.values.entryLatestLabel, {
      earliestHour: US_FL.access.earliestHour,
      latestHour: US_FL.access.latestHour,
    }),
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
});

/**
 * The organisations a user may touch documents in.
 *
 * Every document query is scoped with this INSIDE the where clause rather than
 * checked after the row is fetched — the same shape `loadMatter` uses, so a
 * document in someone else's organisation is indistinguishable from one that
 * does not exist instead of answering with a different error.
 */
const documentScope = async (userId: number): Promise<string[]> => {
  const memberships = await prisma.organisation.findMany({
    where: { members: { some: { userId } } },
    select: { id: true },
  });

  return memberships.map((organisation) => organisation.id);
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

    /**
     * Start a lease with everything the property already knows.
     *
     * Seeding happens on the SERVER rather than in the browser, so the client
     * cannot claim a landlord the property does not have — the party list is
     * who signs, and it is not something a caller gets to assert.
     */
    startLease: authenticatedProcedure
      .input(z.object({ organisationId: z.string(), teamId: z.number(), propertyId: z.string() }))
      .mutation(async ({ ctx, input }) => {
        await assertAccess(input.organisationId, ctx.user.id);
        await assertTeamAccess(input.teamId, input.organisationId, ctx.user.id);

        const property = await prisma.bizrethinkProperty.findFirst({
          where: { id: input.propertyId, organisationId: input.organisationId },
        });

        if (!property) {
          throw new AppError(AppErrorCode.NOT_FOUND, { message: 'Property not found.' });
        }

        const seeded = seedMatterFromProperty({
          id: property.id,
          label: property.label,
          addressLine: property.addressLine,
          city: property.city,
          state: property.state,
          postalCode: property.postalCode,
          county: property.county,
          propertyType: property.propertyType,
          yearBuilt: property.yearBuilt,
          hasPool: property.hasPool,
          hasHoa: property.hasHoa,
          hoaName: property.hoaName,
          includedAppliances: property.includedAppliances,
          landlords: (property.landlords ?? []) as { name: string; email: string }[],
          noticeName: property.noticeName,
          noticeAddress: property.noticeAddress,
          utilities: (property.utilities ?? []) as UtilityRow[],
        });

        return await prisma.bizrethinkLeaseMatter.create({
          data: {
            id: prefixedId('lease_matter', 16),
            organisationId: input.organisationId,
            teamId: input.teamId,
            createdByUserId: ctx.user.id,
            propertyId: property.id,
            title: `${property.label} — lease`,
            facts: seeded.facts,
            money: seeded.money,
            values: seeded.values,
            parties: seeded.parties,
            yardTasks: seeded.yardTasks,
            customClauses: [],
          },
          select: { id: true },
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
          /*
            The landlord and the §83.50 notice details live here rather than on
            each lease: none of it changes between tenancies. Copied into a
            matter at creation, never referenced live.
          */
          landlords: z.array(z.object({ name: z.string().min(1), email: z.string() })).default([]),
          utilities: z
            .array(
              z.object({
                service: z.string(),
                provider: z.string().default(''),
                phone: z.string().default(''),
                paidBy: z.enum(['tenant', 'landlord']),
              }),
            )
            .max(30)
            .default([]),
          noticeName: z.string().nullable().default(null),
          noticeAddress: z.string().nullable().default(null),
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
     * Edit a property.
     *
     * SAFE BY THE SEEDING RULE, not by luck. A lease copies what it needs at
     * creation and never reads back, so correcting a typo here cannot rewrite
     * the signers or the address on a lease already drafted — still less one
     * out for signature. Existing leases keep what they were built with; new
     * ones pick this up.
     */
    update: authenticatedProcedure
      .input(
        z.object({
          organisationId: z.string(),
          id: z.string(),
          label: z.string().min(1),
          addressLine: z.string().min(1),
          city: z.string().min(1),
          state: z.string(),
          postalCode: z.string().min(1),
          county: z.string().min(1),
          propertyType: z.enum(['single-family', 'duplex', 'condo', 'multi-family']),
          yearBuilt: z.number().int().nullable(),
          hasPool: z.boolean(),
          hasHoa: z.boolean(),
          hoaName: z.string().nullable(),
          includedAppliances: z.string().nullable(),
          landlords: z.array(z.object({ name: z.string().min(1), email: z.string() })).default([]),
          utilities: z
            .array(
              z.object({
                service: z.string(),
                provider: z.string().default(''),
                phone: z.string().default(''),
                paidBy: z.enum(['tenant', 'landlord']),
              }),
            )
            .max(30)
            .default([]),
          noticeName: z.string().nullable().default(null),
          noticeAddress: z.string().nullable().default(null),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        await assertAccess(input.organisationId, ctx.user.id);

        const { id, organisationId, ...fields } = input;

        /*
          Scoped in the WHERE rather than fetched and checked. An id belonging
          to another organisation updates nothing and reports the same as an id
          that does not exist, which is not something to confirm to an outsider.
        */
        const updated = await prisma.bizrethinkProperty.updateMany({
          where: { id, organisationId },
          data: fields,
        });

        if (updated.count === 0) {
          throw new AppError(AppErrorCode.NOT_FOUND, { message: 'Property not found.' });
        }

        return { updated: true };
      }),

    /**
     * Archive a property. Soft, because leases reference it by id and a hard
     * delete would orphan every lease ever written against it.
     */
    archive: authenticatedProcedure
      .input(z.object({ organisationId: z.string(), id: z.string() }))
      .mutation(async ({ ctx, input }) => {
        await assertAccess(input.organisationId, ctx.user.id);

        const archived = await prisma.bizrethinkProperty.updateMany({
          where: { id: input.id, organisationId: input.organisationId, archivedAt: null },
          data: { archivedAt: new Date() },
        });

        if (archived.count === 0) {
          throw new AppError(AppErrorCode.NOT_FOUND, { message: 'Property not found.' });
        }

        return { archived: true };
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
            yardTasks: input.answers.yardTasks,
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
      .input(
        z.object({
          id: z.string(),
          currentStepId: z.string(),
          answers: ZAnswers,
          /*
            Which questions to put to the tenant. Stored as given — it is only
            a selection, and `tenantFieldsFor` re-checks it against the field
            definitions on every read, so nothing here can widen what a tenant
            is able to write.
          */
          delegatedFields: z.array(z.string()).max(50).default([]),
          /*
            The row's `updatedAt` as the client last saw it.

            The interview seeds every answer into React state at mount and
            writes the whole set back on each step change, and it is not the
            only writer: `applyTenantAnswers` writes a tenant's returned
            answers into the same `values` column. A landlord with the page
            open when the tenant returned their review link therefore destroyed
            what the tenant sent, on the next click of Next, with no warning.

            Optional so an older client keeps working rather than having every
            save fail.
          */
          expectedUpdatedAt: z.string().optional(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        const matter = await loadMatter(input.id, ctx.user.id);

        if (matter.status !== 'draft') {
          throw new AppError(AppErrorCode.INVALID_REQUEST, {
            message: 'This lease has already been sent and can no longer be edited.',
          });
        }

        /*
          Refused rather than merged. Merging by key would not help — the
          landlord's stale copy holds the SAME keys with the answers as they
          were before the tenant filled them, so a merge overwrites with blanks
          just as surely. And resyncing the page would throw away whatever the
          landlord had typed since it loaded. A lost update must not be settled
          by guessing which writer mattered.
        */
        const stale = staleWriteMessage({ expected: input.expectedUpdatedAt, actual: matter.updatedAt });

        if (stale !== null) {
          throw new AppError(AppErrorCode.INVALID_REQUEST, { message: stale });
        }

        const saved = await prisma.bizrethinkLeaseMatter.update({
          where: { id: input.id },
          data: {
            currentStepId: input.currentStepId,
            facts: input.answers.facts,
            money: input.answers.money,
            values: input.answers.values,
            customClauses: input.answers.customClauses,
            parties: input.answers.parties,
            yardTasks: input.answers.yardTasks,
            delegatedFields: input.delegatedFields,
          },
          select: { updatedAt: true },
        });

        // Returned so the client can carry it into its next write; without it
        // the second save of a session would always look stale.
        return { saved: true, updatedAt: saved.updatedAt.toISOString() };
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

      const draftRenderingAllowed = await canRenderDraftClauses({
        organisationId: matter.organisationId,
        userId: ctx.user.id,
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
        answers: statutoryInput(answers),
        pack: US_FL,
      });

      const approvals = await loadClauseApprovals();

      const unreviewed = [...selection.selected, ...selection.addenda, ...selection.standaloneDisclosures]
        .filter((clause) => !canRenderClause({ status: statusWithApproval(clause, approvals), draftRenderingAllowed }))
        .map((clause) => clause.slug);

      /*
        Kept as its own list rather than folded into `findings`: a party problem
        is fixed on the parties step, not by changing a term, and two of them
        (duplicate name, duplicate email) misroute a signing link silently
        rather than producing a visibly wrong document.
      */
      const partyFindings = validateParties(answers.parties);

      /*
        Also its own list, and for the same kind of reason: a yard job nobody
        has been given produces a document that is not visibly wrong. It reads
        perfectly — it simply never mentions who trims the palms, which is a
        thing you discover from an association's violation notice rather than
        from the lease.
      */
      const yardFindings = unassignedYardTasks(answers.yardTasks).map(
        (task) => `Nobody has been given "${task}". Assign it, or delete it if it does not apply here.`,
      );

      /*
        The review loop's own blockers, kept separate from statutory findings
        because they are resolved by a different act entirely: not by changing
        an answer, but by deciding what to do about somebody's comment.
      */
      const reviewFindings = await reviewBlockersFor(matter.id, currentAnswersHash(matter));

      /*
        Clauses the landlord wrote themselves, checked against the areas
        Florida does not let a lease contract around and against the answers
        already given. Reports what it matched and stops — a regex is not
        entitled to a verdict on a specific provision.
      */
      const clauseFindings = scanCustomClauses({
        clauses: answers.customClauses,
        facts: answers.facts,
        values: answers.values,
        pack: FL_NON_WAIVABLE,
      });

      return {
        findings,
        missing,
        partyFindings,
        yardFindings,
        reviewFindings,
        clauseFindings,
        duplicateAssertions: selection.duplicateAssertions,
        unreviewedClauses: [...new Set(unreviewed)],
        blocking:
          findings.filter((f) => f.severity === 'blocks').length +
          missing.length +
          partyFindings.length +
          yardFindings.length +
          /*
            It was computed here and then left out of both totals, while
            createEnvelopeFromMatter throws UNAUTHORIZED on exactly this — so
            the panel said nothing was blocking, the Send button was enabled,
            and the send failed naming raw slugs.
          */
          unreviewed.length +
          reviewFindings.length +
          clauseFindings.filter((f) => f.severity === 'blocks').length,
        readyToSend:
          findings.every((f) => f.severity !== 'blocks') &&
          missing.length === 0 &&
          partyFindings.length === 0 &&
          yardFindings.length === 0 &&
          unreviewed.length === 0 &&
          reviewFindings.length === 0 &&
          clauseFindings.every((f) => f.severity !== 'blocks'),
        rulePackVersion: US_FL.version,
      };
    }),

    /**
     * Throw away a draft.
     *
     * Only a draft, and only one with no envelope — `canDeleteMatter` holds
     * that rule and refuses any status it does not recognise, so a state
     * invented later is not quietly deletable.
     *
     * Its reviews and comments go with it, in the same transaction. They carry
     * no foreign key (ADR 0002 — no relations into upstream models, and the
     * convention is kept between our own for consistency), so nothing would
     * remove them otherwise. Orphaned comments are not merely clutter:
     * `sendBlockers` treats a comment whose review is missing as blocking,
     * precisely so that deleting a review cannot erase an objection.
     */
    delete: authenticatedProcedure.input(z.object({ id: z.string() })).mutation(async ({ ctx, input }) => {
      const matter = await loadMatter(input.id, ctx.user.id);

      const verdict = canDeleteMatter({ status: matter.status, envelopeId: matter.envelopeId });

      if (!verdict.ok) {
        throw new AppError(AppErrorCode.INVALID_REQUEST, { message: verdict.reason });
      }

      const reviews = await prisma.bizrethinkLeaseReview.findMany({
        where: { matterId: matter.id },
        select: { id: true },
      });

      await prisma.$transaction([
        prisma.bizrethinkReviewComment.deleteMany({
          where: { reviewId: { in: reviews.map((review) => review.id) } },
        }),
        prisma.bizrethinkLeaseReview.deleteMany({ where: { matterId: matter.id } }),
        // Guarded again at the write: two tabs must not race a send against
        // a delete and leave an envelope pointing at nothing.
        prisma.bizrethinkLeaseMatter.deleteMany({
          where: { id: matter.id, status: 'draft', envelopeId: null },
        }),
      ]);

      return { deleted: true };
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
      const reviewFindings = await reviewBlockersFor(matter.id, currentAnswersHash(matter));

      if (reviewFindings.length > 0) {
        throw new AppError(AppErrorCode.INVALID_REQUEST, { message: reviewFindings.join(' ') });
      }

      // Re-checked here for the same reason: `validate` is a query, and a gate
      // that lives only in a read-only query is not a gate.
      const blockingClauses = scanCustomClauses({
        clauses: answers.customClauses,
        facts: answers.facts,
        values: answers.values,
        pack: FL_NON_WAIVABLE,
      }).filter((finding) => finding.severity === 'blocks');

      if (blockingClauses.length > 0) {
        throw new AppError(AppErrorCode.INVALID_REQUEST, {
          message: blockingClauses.map((finding) => `${finding.clauseHeading}: ${finding.message}`).join(' '),
        });
      }
      /*
        THE OLDEST GATE HAD THE SHAPE THE NEWER ONES AVOID.

        Everything else here re-checks; the eight statutory rules — §83.49(3)(a),
        §83.53(2), §83.575, §83.595(4) — ran only in the advisory query. A
        five-day deposit-return window or an early-termination fee above the
        two-month cap reached real signers whenever the panel was one edit stale.
      */
      const statutory = validateAnswers({ answers: statutoryInput(answers), pack: US_FL }).filter(
        (finding) => finding.severity === 'blocks',
      );

      if (statutory.length > 0) {
        throw new AppError(AppErrorCode.INVALID_REQUEST, {
          message: statutory.map((finding) => `${finding.citation}: ${finding.message}`).join(' '),
        });
      }

      // Same reason again: this mutation is the only thing between a draft and
      // real signers, so every rule that must hold is checked here too.
      const unallocated = unassignedYardTasks(answers.yardTasks);

      if (unallocated.length > 0) {
        throw new AppError(AppErrorCode.INVALID_REQUEST, {
          message: `Nobody has been given ${unallocated.map((task) => `"${task}"`).join(', ')} in the yard. Assign each, or delete any that do not apply.`,
        });
      }

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
          // In the hash: moving palm trimming from you to the tenant changes
          // the lease an attorney signed off on.
          yardTasks: matter.yardTasks,
          /*
            And the property's utilities, which are read LIVE rather than
            copied — so editing a utility row rewrites the utility clause of a
            lease already out for review. Omitted, staleness reported "nothing
            moved".
          */
          utilities: matter.propertyUtilities,
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
     * Take a link back.
     *
     * `create` mints a fresh token every time, so a landlord who edited the
     * lease could always issue a NEW link — but the old one stayed live until
     * its expiry, months away, and nothing could kill it. Wrong recipient,
     * changed terms, a deal that falls through: the link kept working.
     *
     * Closing rather than deleting. The row carries the reviewer, the issue
     * date and any comments already returned; that history outlives the link's
     * usefulness, and a delete would orphan the comments. `isReviewUsable`
     * already rejects any status but `open`, so the close is the revocation —
     * it beats the expiry date rather than waiting for it.
     */
    revoke: authenticatedProcedure
      .input(z.object({ matterId: z.string(), reviewId: z.string() }))
      .mutation(async ({ ctx, input }) => {
        // Ownership is checked on the MATTER, not the review, so a guessed
        // review id from another organisation cannot be closed.
        const matter = await loadMatter(input.matterId, ctx.user.id);

        const review = await prisma.bizrethinkLeaseReview.findFirst({
          where: { id: input.reviewId, matterId: matter.id },
          select: { id: true, status: true },
        });

        if (!review) {
          throw new AppError(AppErrorCode.NOT_FOUND, { message: 'That review link no longer exists.' });
        }

        /*
          A returned review is a record of comments the landlord still has to
          answer. Revoking it would hide work rather than retract a link.
        */
        if (review.status !== 'open') {
          throw new AppError(AppErrorCode.INVALID_REQUEST, {
            message: 'That link is already closed.',
          });
        }

        await prisma.bizrethinkLeaseReview.update({
          where: { id: review.id },
          data: { status: 'closed' },
        });

        return { revoked: true };
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
        select: {
          id: true,
          title: true,
          facts: true,
          money: true,
          values: true,
          customClauses: true,
          parties: true,
          yardTasks: true,
          delegatedFields: true,
          // For the live utility read below.
          propertyId: true,
        },
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
        The property's utilities are part of what the lease renders and are read
        live, so they belong in the hash — otherwise editing a utility row moves
        the document while this flag still says nothing changed.
      */
      const context = await loadPropertyContext(matter.propertyId, matter.id);

      /*
        Both audiences see the whole lease, so this flag is the only thing
        separating "you reviewed this" from "you reviewed something else".
      */
      const changedSinceIssued = currentAnswersHash({ ...matter, ...context }) !== review.answersHash;

      // Through the shared mapping, so the reviewer reads the document the
      // landlord previews and the signers receive.
      const answers = hydrateMatter({ ...matter, ...context });

      /*
        Questions for the tenant, resolved from the field DEFINITIONS and
        merely selected by the stored list — so a wrong list cannot put a rent
        box in front of them. Only a tenant is asked: an attorney is reviewing
        the document, not living in it.
      */
      const storedDelegated = ((matter.delegatedFields ?? []) as unknown[]).filter(
        (name): name is string => typeof name === 'string',
      );

      const askedFields =
        review.audience === 'tenant'
          ? tenantFieldsFor(FL_INTERVIEW, storedDelegated).map((field) => ({
              name: field.name,
              label: field.label,
              help: field.help ?? null,
              placeholder: field.placeholder ?? null,
              kind: field.kind,
              /*
                Dropped here before, so the reviewer's page could not mark a
                required answer or refuse an incomplete submit — and the link
                closes permanently in the same transaction. A tenant left
                `tenantPreTermAddress` blank, the link died, and the landlord
                had to issue a fresh review to get an answer nobody had told
                them was mandatory.
              */
              required: field.required === true,
              answer: String((matter.values as Record<string, unknown>)[field.name] ?? ''),
            }))
          : [];

      return {
        review: {
          id: review.id,
          audience: review.audience,
          reviewerName: review.reviewerName,
          expiresAt: review.expiresAt,
        },
        matter: { id: matter.id, title: matter.title },
        /*
          THE LEASE ITSELF, not a button that opens a PDF in another tab.

          A reviewer used to read in one window and type a clause name from
          memory into a free-text box in the other, so nothing tied a comment to
          a clause. Built from the same `buildLeaseDocuments` the PDF is built
          from, so the two cannot describe different documents.
        */
        sections: toReadableSections(
          buildLeaseDocuments({
            facts: answers.facts,
            money: answers.money,
            values: answers.values,
            parties: answers.parties,
            propertyAddress: String(answers.values.propertyAddress ?? ''),
            customClauses: answers.customClauses,
          }).documents.find((doc) => doc.key === 'lease')?.clauses ?? [],
        ),
        comments,
        askedFields,
        changedSinceIssued,
        /*
          The documents the receipt addendum names, so a reviewer can open what
          they are being asked to acknowledge receipt of. Without these the
          receipt is a signature on a list nobody can read — which is the
          weakness it was written to remove, reproduced one level up.
        */
        attachments: [...context.propertyDocuments, ...context.matterDocuments].map((document) => ({
          id: document.id,
          kind: document.kind,
          label: document.label,
          reference: document.reference,
          documentDate: document.documentDate,
          pageCount: document.pageCount,
        })),
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
          /*
            Answers to the questions the landlord delegated. UNTRUSTED — this
            procedure is reached with a link and no session. The keys are
            filtered against the field definitions before anything is written;
            see applyTenantAnswers.
          */
          answers: z.record(z.string(), z.unknown()).default({}),
        }),
      )
      .mutation(async ({ input }) => {
        const review = await prisma.bizrethinkLeaseReview.findUnique({ where: { token: input.token } });

        if (!review || !isReviewUsable(toDomainReview(review), new Date())) {
          throw new AppError(AppErrorCode.NOT_FOUND, { message: 'This review link is no longer active.' });
        }

        /*
          Written only for a tenant review, and only through the allowlist. An
          attorney's link carries no questions, so it may not write answers
          either — the narrower the write, the less a leaked link is worth.
        */
        if (review.audience === 'tenant' && Object.keys(input.answers).length > 0) {
          const matter = await prisma.bizrethinkLeaseMatter.findUnique({
            where: { id: review.matterId },
            select: { values: true, delegatedFields: true, status: true },
          });

          // A sent lease is frozen. Its answers must not move under signers.
          if (matter && matter.status === 'draft') {
            const delegated = ((matter.delegatedFields ?? []) as unknown[]).filter(
              (name): name is string => typeof name === 'string',
            );

            await prisma.bizrethinkLeaseMatter.update({
              where: { id: review.matterId },
              data: {
                values: applyTenantAnswers({
                  values: (matter.values ?? {}) as Record<string, unknown>,
                  delegated,
                  submitted: input.answers,
                }) as never,
              },
            });
          }
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

  /**
   * The clause library, and attorney sign-off on it.
   *
   * This is the gate the whole product waits behind: 52 clauses drafted by a
   * language model and reviewed by nobody. Until a clause has a current
   * approval it renders only where draft rendering is explicitly granted, and
   * never reaches a third party.
   *
   * RECORDING, NOT SIGNING. The landlord enters the approval on the attorney's
   * behalf, capturing their name and bar number. `approvedByUserId` records
   * who typed it, which is deliberately a different field from who approved —
   * those differing is itself the honest description of what happened. A
   * signature by the attorney themselves would be a different feature, and
   * pretending this is one would be worse than not having it.
   */
  /**
   * Drafting help.
   *
   * Returns a PROPOSAL. Nothing is written to the matter here — the draft goes
   * back to the editor for the landlord to read, change and keep or discard.
   * A model that could write directly into a lease would be a model that could
   * put words in front of a signer that nobody read.
   */
  ai: router({
    draftClause: authenticatedProcedure
      .input(
        z.object({
          organisationId: z.string(),
          request: z.string().min(10).max(2000),
          sections: z.array(z.string()).min(1),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        await assertAccess(input.organisationId, ctx.user.id);

        return await draftClause({ request: input.request, sections: input.sections });
      }),
  }),

  clauseLibrary: router({
    list: authenticatedProcedure.input(z.object({ organisationId: z.string() })).query(async ({ ctx, input }) => {
      await assertAccess(input.organisationId, ctx.user.id);

      const approvals = await loadClauseApprovals();

      return {
        clauses: FL_LIBRARY.map((clause) => {
          const approval = approvals.get(clause.slug) ?? null;
          const current = isApprovalCurrent(clause, approval);

          return {
            slug: clause.slug,
            version: clause.version,
            section: clause.section,
            heading: clause.heading,
            body: clause.body,
            placement: clause.placement,
            requiredBy: clause.requiredBy ?? null,
            sourceKind: clause.source.kind,
            /*
                For a statute clause the approval IS the verbatim
                verification — `verbatimVerifiedAt` has been null on every one
                of these since they were transcribed, and it is what an
                attorney confirming the wording actually settles.
              */
            verbatimRequired: clause.source.kind === 'statute' && clause.source.verbatimRequired,
            citation: clause.source.kind === 'statute' ? clause.source.citation : null,
            verbatimVerifiedAt: clause.source.kind === 'statute' ? clause.source.verbatimVerifiedAt : null,
            /*
              Why the clause is in the library at all — the question the page
              could not answer. Sent rather than derived in the UI so the
              statutory walk stays the single source of the claim.
            */
            why: whyThisClause(clause),
            codeStatus: clause.status,
            effectiveStatus: statusWithApproval(clause, approvals),
            fingerprint: clauseFingerprint(clause),
            approval: approval
              ? {
                  approvedByName: approval.approvedByName,
                  approvedByBarNumber: approval.approvedByBarNumber,
                  approvedAt: approval.approvedAt,
                  notes: approval.notes,
                  // An approval that exists but no longer matches is shown
                  // as lapsed rather than hidden — "it was approved, then
                  // the text changed" is the useful thing to know.
                  lapsed: !current,
                }
              : null,
          };
        }),
      };
    }),

    /**
     * Send the library to a lawyer.
     *
     * The approval flow was built for an attorney — it asks for a name and a
     * bar number — and then sat behind an authenticated route with no way to
     * send it. The only path was to add the lawyer to the organisation. This is
     * the missing half of a mechanism the product already had for tenants.
     *
     * The fingerprint pins the library as it stood when the link was issued.
     * An approval recorded against text that has since moved is worthless; the
     * lease-review link learned that with `answersHash` and the reasoning is
     * the same for clause text.
     */
    share: authenticatedProcedure
      .input(
        z.object({
          organisationId: z.string(),
          reviewerName: z.string().min(1),
          reviewerEmail: z.string().email(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        await assertAccess(input.organisationId, ctx.user.id);

        return await prisma.bizrethinkLibraryReview.create({
          data: {
            id: prefixedId('library_review', 16),
            organisationId: input.organisationId,
            token: prefixedId('clr', 32),
            reviewerName: input.reviewerName,
            reviewerEmail: input.reviewerEmail,
            libraryFingerprint: libraryFingerprint(FL_LIBRARY),
            createdByUserId: ctx.user.id,
            expiresAt: new Date(Date.now() + REVIEW_LINK_TTL_DAYS * 24 * 60 * 60 * 1000),
          },
          select: { id: true, token: true, expiresAt: true },
        });
      }),

    /**
     * Take a counsel link back.
     *
     * Built in from the start, because the lease-review link shipped without it
     * and a link that cannot be revoked is a link that outlives the deal.
     * Closing rather than deleting: the row is the record of who was sent what.
     */
    /**
     * The counsel links that exist, newest first.
     *
     * Ordered deliberately. Two live links for the same person rendered as
     * identical cards on the tenant reviewer page — same name, same email, same
     * expiry — and the wrong one got copied. The page names the current one.
     */
    listShares: authenticatedProcedure.input(z.object({ organisationId: z.string() })).query(async ({ ctx, input }) => {
      await assertAccess(input.organisationId, ctx.user.id);

      const shares = await prisma.bizrethinkLibraryReview.findMany({
        where: { organisationId: input.organisationId },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          token: true,
          status: true,
          reviewerName: true,
          reviewerEmail: true,
          expiresAt: true,
          createdAt: true,
        },
      });

      return { shares };
    }),

    revokeShare: authenticatedProcedure
      .input(z.object({ organisationId: z.string(), shareId: z.string() }))
      .mutation(async ({ ctx, input }) => {
        await assertAccess(input.organisationId, ctx.user.id);

        const share = await prisma.bizrethinkLibraryReview.findFirst({
          where: { id: input.shareId, organisationId: input.organisationId },
          select: { id: true, status: true },
        });

        if (!share) {
          throw new AppError(AppErrorCode.NOT_FOUND, { message: 'That link no longer exists.' });
        }

        await prisma.bizrethinkLibraryReview.update({
          where: { id: share.id },
          data: { status: 'closed' },
        });

        return { revoked: true };
      }),

    /**
     * Open a counsel link. No account.
     *
     * One error for "no such token", "revoked" and "expired" — a reviewer
     * cannot act on the difference, and distinguishing them would confirm to
     * anyone holding a guessed token that it once existed.
     *
     * Returns clauses and provenance only. The holder is outside the
     * organisation and has no business seeing a tenancy.
     */
    openLibrary: procedure.input(z.object({ token: z.string() })).query(async ({ input }) => {
      const share = await prisma.bizrethinkLibraryReview.findUnique({
        where: { token: input.token },
        select: {
          id: true,
          organisationId: true,
          status: true,
          expiresAt: true,
          reviewerName: true,
          libraryFingerprint: true,
        },
      });

      const usable =
        share !== null &&
        share.status === 'open' &&
        (share.expiresAt === null || share.expiresAt.getTime() > Date.now());

      if (!share || !usable) {
        throw new AppError(AppErrorCode.NOT_FOUND, { message: 'This review link is no longer active.' });
      }

      const approvals = await loadClauseApprovals();

      return {
        reviewerName: share.reviewerName,
        /*
          True when a clause has changed since the link was sent. The reviewer
          is told rather than left to discover that the words they are reading
          are not the words the landlord meant to send.
        */
        libraryMoved: share.libraryFingerprint !== libraryFingerprint(FL_LIBRARY),
        clauses: FL_LIBRARY.map((clause) => ({
          slug: clause.slug,
          version: clause.version,
          section: clause.section,
          heading: clause.heading,
          body: clause.body,
          placement: clause.placement,
          why: whyThisClause(clause),
          sourceKind: clause.source.kind,
          verbatimRequired: clause.source.kind === 'statute' && clause.source.verbatimRequired,
          verbatimVerifiedAt: clause.source.kind === 'statute' ? clause.source.verbatimVerifiedAt : null,
          approved: statusWithApproval(clause, approvals) === 'published',
        })),
      };
    }),

    approve: authenticatedProcedure
      .input(
        z.object({
          organisationId: z.string(),
          clauseSlug: z.string(),
          /** The clause as the approver saw it. Rejected if it has moved since. */
          fingerprint: z.string(),
          approvedByName: z.string().min(1),
          approvedByBarNumber: z.string().nullable().default(null),
          notes: z.string().nullable().default(null),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        await assertAccess(input.organisationId, ctx.user.id);

        const clause = FL_LIBRARY.find((candidate) => candidate.slug === input.clauseSlug);

        if (!clause) {
          throw new AppError(AppErrorCode.NOT_FOUND, { message: 'No such clause in the library.' });
        }

        /*
          The fingerprint is sent back from the page that displayed the clause
          and checked against the library as it stands now. If a deploy changed
          the wording between the attorney reading it and the approval being
          recorded, this refuses rather than attributing sign-off to text they
          never saw.
        */
        const current = clauseFingerprint(clause);

        if (current !== input.fingerprint) {
          throw new AppError(AppErrorCode.INVALID_REQUEST, {
            message:
              'This clause changed since it was displayed. Reload and read it again before recording an approval.',
          });
        }

        await prisma.$transaction([
          // Older approvals are superseded, not deleted: the record of who
          // approved which words has to survive an edit.
          prisma.bizrethinkClauseApproval.updateMany({
            where: { clauseSlug: clause.slug, supersededAt: null },
            data: { supersededAt: new Date() },
          }),
          prisma.bizrethinkClauseApproval.create({
            data: {
              id: prefixedId('clause_approval', 16),
              clauseSlug: clause.slug,
              clauseVersion: clause.version,
              fingerprint: current,
              approvedByName: input.approvedByName.trim(),
              approvedByBarNumber: input.approvedByBarNumber?.trim() || null,
              approvedByUserId: ctx.user.id,
              notes: input.notes?.trim() || null,
            },
          }),
        ]);

        return { approved: true };
      }),
  }),

  /**
   * The documents a human uploaded, as opposed to everything else here, which
   * is assembled from clauses.
   *
   * Upload itself is NOT here — it is a multipart route, because tRPC carries
   * JSON and base64 would inflate a 54 MB scan by a third on the way up. See
   * `api+/bizrethink.lease-document.ts`. These are the operations that follow.
   */
  documents: router({
    list: authenticatedProcedure
      .input(z.object({ propertyId: z.string().optional(), matterId: z.string().optional() }))
      .query(async ({ ctx, input }) => {
        const scope = await documentScope(ctx.user.id);

        return await prisma.bizrethinkDocument.findMany({
          where: {
            ...(input.propertyId ? { propertyId: input.propertyId } : { matterId: input.matterId }),
            organisationId: { in: scope },
            archivedAt: null,
          },
          orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
          select: {
            id: true,
            kind: true,
            label: true,
            reference: true,
            documentDate: true,
            pageCount: true,
            sizeBytes: true,
            sortOrder: true,
          },
        });
      }),

    /**
     * Rename, re-reference, re-date or reorder. Never re-file: a document
     * cannot move between a property and a lease, because the two answer
     * different questions and moving one would silently change which leases
     * receipt it.
     */
    update: authenticatedProcedure
      .input(
        z.object({
          id: z.string(),
          label: z.string().min(1).optional(),
          reference: z.string().optional(),
          documentDate: z.string().optional(),
          sortOrder: z.number().int().min(0).optional(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        const scope = await documentScope(ctx.user.id);

        const { count } = await prisma.bizrethinkDocument.updateMany({
          where: { id: input.id, organisationId: { in: scope }, archivedAt: null },
          data: {
            ...(input.label === undefined ? {} : { label: input.label }),
            ...(input.reference === undefined ? {} : { reference: input.reference || null }),
            ...(input.documentDate === undefined
              ? {}
              : { documentDate: input.documentDate ? new Date(`${input.documentDate}T00:00:00Z`) : null }),
            ...(input.sortOrder === undefined ? {} : { sortOrder: input.sortOrder }),
          },
        });

        if (count === 0) {
          throw new AppError(AppErrorCode.NOT_FOUND, { message: 'Document not found' });
        }

        return { updated: true };
      }),

    /**
     * Archived, not deleted.
     *
     * A receipt addendum on a lease already signed names the documents that
     * were attached when it was signed. Destroying the bytes afterwards would
     * leave a signed statement that the tenant received something no longer
     * producible, which is the opposite of what the receipt is for.
     */
    remove: authenticatedProcedure.input(z.object({ id: z.string() })).mutation(async ({ ctx, input }) => {
      const scope = await documentScope(ctx.user.id);

      const { count } = await prisma.bizrethinkDocument.updateMany({
        where: { id: input.id, organisationId: { in: scope }, archivedAt: null },
        data: { archivedAt: new Date() },
      });

      if (count === 0) {
        throw new AppError(AppErrorCode.NOT_FOUND, { message: 'Document not found' });
      }

      return { removed: true };
    }),
  }),
});
