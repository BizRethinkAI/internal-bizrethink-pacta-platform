import { getInternalClaimPlans } from '@documenso/ee/server-only/stripe/get-internal-claim-plans';
import { getSubscription } from '@documenso/ee/server-only/stripe/get-subscription';
import { syncStripeCustomerSubscription } from '@documenso/ee/server-only/stripe/sync-stripe-customer-subscription';
// MODIFIED for BizRethink (overlay 051): swap the sync env-var billing gate
// for the DB-aware async getter so Pacta's admin-UI Stripe config
// (overlay 045) actually unlocks the in-app billing page.
import { isBillingEnabledFromConfig } from '@documenso/lib/constants/app';
import { ORGANISATION_MEMBER_ROLE_PERMISSIONS_MAP } from '@documenso/lib/constants/organisations';
import { AppError, AppErrorCode } from '@documenso/lib/errors/app-error';
import { Stripe } from '@documenso/lib/server-only/stripe';
import { buildOrganisationWhereQuery } from '@documenso/lib/utils/organisations';
import { prisma } from '@documenso/prisma';

import type { Logger } from 'pino';

import { authenticatedProcedure } from '../trpc';
import { ZGetSubscriptionRequestSchema } from './get-subscription.types';

export const getSubscriptionRoute = authenticatedProcedure
  .input(ZGetSubscriptionRequestSchema)
  .query(async ({ ctx, input }) => {
    const { organisationId } = input;

    ctx.logger.info({
      input: {
        organisationId,
      },
    });

    const userId = ctx.user.id;

    if (!(await isBillingEnabledFromConfig())) {
      throw new AppError(AppErrorCode.INVALID_REQUEST, {
        message: 'Billing is not enabled',
      });
    }

    const [subscription, plans] = await Promise.all([
      // If the subscription is not found or there's an error, we return null to
      // avoid failing the entire request.
      getSubscription({
        organisationId,
        userId,
      }).catch(async (e) => {
        ctx.logger.error(`Failed to get subscription for organisation ${organisationId}`, e);

        await reconcileMissingStripeSubscription({ logger: ctx.logger, organisationId, userId, error: e });

        return null;
      }),
      getInternalClaimPlans(),
    ]);

    return {
      subscription,
      plans,
    };
  });

type ReconcileMissingStripeSubscriptionOptions = {
  logger: Logger;
  organisationId: string;
  userId: number;
  error: unknown;
};

/**
 * When the Stripe subscription no longer exists (e.g. deleted by Stripe's
 * test-mode retention policy, or removed manually), fire-and-forget a reconcile
 * so the stale local subscription row and any billing banner converge on the
 * next load. Reconcile failures must never break the read path that calls this.
 */
const reconcileMissingStripeSubscription = async ({
  logger,
  organisationId,
  userId,
  error,
}: ReconcileMissingStripeSubscriptionOptions) => {
  if (!(error instanceof Stripe.errors.StripeInvalidRequestError) || error.code !== 'resource_missing') {
    return;
  }

  const organisation = await prisma.organisation.findFirst({
    where: buildOrganisationWhereQuery({
      organisationId,
      userId,
      roles: ORGANISATION_MEMBER_ROLE_PERMISSIONS_MAP['MANAGE_ORGANISATION'],
    }),
    select: {
      customerId: true,
    },
  });

  if (!organisation?.customerId) {
    return;
  }

  void syncStripeCustomerSubscription({
    customerId: organisation.customerId,
  }).catch((syncError) => {
    logger.error(
      `Failed to reconcile subscription after resource_missing for organisation ${organisationId}`,
      syncError,
    );
  });
};
