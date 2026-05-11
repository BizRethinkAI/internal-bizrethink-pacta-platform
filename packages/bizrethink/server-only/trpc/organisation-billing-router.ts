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

      const row = await prisma.bizrethinkOrganisationBilling.findUnique({
        where: { organisationId },
        select: {
          bizrethinkInternal: true,
          trialStartedAt: true,
          trialEndsAt: true,
        },
      });

      // No row = no BizRethink billing state recorded (legacy org pre-migration
      // OR a brand-new org where overlay 041's helper hasn't run yet). Returning
      // null lets the UI fall back to upstream's default billing display.
      return row ?? null;
    }),
});
