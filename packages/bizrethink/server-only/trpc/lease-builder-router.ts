import { AppError, AppErrorCode } from '@documenso/lib/errors/app-error';
import { prefixedId } from '@documenso/lib/universal/id';
import { prisma } from '@documenso/prisma';
import { authenticatedProcedure, router } from '@documenso/trpc/server/trpc';
import { z } from 'zod';

import { toCustomClause } from '../../lease/clauses/custom';
import { FL_LIBRARY } from '../../lease/clauses/us-fl';
import { selectClauses } from '../../lease/engine/select-clauses';
import { validateAnswers } from '../../lease/engine/validate';
import { deriveFacts } from '../../lease/interview/derive-facts';
import { buildLeaseDocuments } from '../../lease/render/render-lease';
import { US_FL } from '../../lease/rule-packs/us-fl';
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

const ZAnswers = z.object({
  facts: z.record(z.string(), z.unknown()),
  money: z.record(z.string(), z.unknown()),
  values: z.record(z.string(), z.unknown()),
  customClauses: z.array(ZCustomClause).default([]),
});

/** Shared by every procedure that touches a matter. */
const assertAccess = async (organisationId: string, userId: number) => {
  if (!(await canAccessLeaseBuilder({ organisationId, userId }))) {
    throw new AppError(AppErrorCode.UNAUTHORIZED, {
      message: 'The lease builder is not enabled for this organisation.',
    });
  }
};

const loadMatter = async (id: string, userId: number) => {
  const matter = await prisma.bizrethinkLeaseMatter.findUnique({ where: { id } });

  if (!matter) {
    throw new AppError(AppErrorCode.NOT_FOUND, { message: 'Lease not found' });
  }

  await assertAccess(matter.organisationId, userId);

  return matter;
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
}): {
  facts: never;
  money: Parameters<typeof deriveFacts>[0];
  values: HydratedValues;
  customClauses: z.infer<typeof ZCustomClause>[];
} => {
  const money = matter.money as Parameters<typeof deriveFacts>[0];
  const values = matter.values as HydratedValues;
  const facts = matter.facts as Record<string, unknown>;

  const endDate = String(values.endDate ?? money.term.startDate);

  return {
    facts: { ...facts, ...deriveFacts(money, endDate) } as never,
    money,
    values: { ...values, rentDueDay: money.rent.dueDayOfMonth, monthlyRentUsd: money.rent.monthlyUsd },
    customClauses: (matter.customClauses ?? []) as z.infer<typeof ZCustomClause>[],
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
        parties: [],
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

      return {
        findings,
        missing,
        duplicateAssertions: selection.duplicateAssertions,
        unreviewedClauses: [...new Set(unreviewed)],
        blocking: findings.filter((f) => f.severity === 'blocks').length + missing.length,
        readyToSend: findings.every((f) => f.severity !== 'blocks') && missing.length === 0,
        rulePackVersion: US_FL.version,
      };
    }),
  }),
});
