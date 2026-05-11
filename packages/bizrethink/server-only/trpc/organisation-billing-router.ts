import { z } from 'zod';

import { AppError, AppErrorCode } from '@documenso/lib/errors/app-error';
import { buildOrganisationWhereQuery } from '@documenso/lib/utils/organisations';
import { prisma } from '@documenso/prisma';
import { authenticatedProcedure, router } from '@documenso/trpc/server/trpc';

// Phase J (SaaS billing) — TRPC router exposing the BizrethinkOrganisationBilling
// row for an org. Used by the billing-page trial banner and (Phase 2 onward)
// by the trial-expire-sweep cron + admin override panel.
//
// Procedures:
//   bizrethink.organisationBilling.get — fetch trial state + internal flag
//                                        for an org. Any org member can read.
//
// Authorization: caller must be a member of the target organisation. We use
// buildOrganisationWhereQuery() with no required role so any seat (admin /
// manager / member) can see billing state — same access level as the upstream
// `o/<orgUrl>/settings/billing` page.

const ZOrgIdInput = z.object({
  organisationId: z.string(),
});

const ZBillingState = z
  .object({
    bizrethinkInternal: z.boolean(),
    trialStartedAt: z.date().nullable(),
    trialEndsAt: z.date().nullable(),
    // Phase L follow-up (2026-05-11): true when the org has an active Stripe
    // subscription. The trial banner should suppress itself in that case —
    // upstream's own "subscribed to Pacta Pro" line already conveys the state.
    hasActiveSubscription: z.boolean(),
  })
  .nullable();

export const organisationBillingRouter = router({
  get: authenticatedProcedure
    .input(ZOrgIdInput)
    .output(ZBillingState)
    .query(async ({ input, ctx }) => {
      const { organisationId } = input;

      // Verify membership — same gating as the upstream billing page.
      const org = await prisma.organisation.findFirst({
        where: buildOrganisationWhereQuery({
          organisationId,
          userId: ctx.user.id,
        }),
        select: { id: true },
      });

      if (!org) {
        throw new AppError(AppErrorCode.UNAUTHORIZED, {
          message: 'You do not have access to this organisation.',
        });
      }

      const [row, activeSubscription] = await Promise.all([
        prisma.bizrethinkOrganisationBilling.findUnique({
          where: { organisationId },
          select: {
            bizrethinkInternal: true,
            trialStartedAt: true,
            trialEndsAt: true,
          },
        }),
        // Check upstream's Subscription table — anything other than INACTIVE
        // means the org is on a real paid (or trialing-via-Stripe) plan and
        // the BizRethink trial banner should hide itself.
        prisma.subscription.findFirst({
          where: {
            organisationId,
            status: { in: ['ACTIVE', 'PAST_DUE'] },
          },
          select: { id: true },
        }),
      ]);

      const hasActiveSubscription = !!activeSubscription;

      // No row = no BizRethink billing state recorded (legacy org pre-migration
      // OR a brand-new org where overlay 041's helper hasn't run yet). Returning
      // null lets the UI fall back to upstream's default billing display.
      if (!row) {
        return null;
      }

      return {
        ...row,
        hasActiveSubscription,
      };
    }),
});
