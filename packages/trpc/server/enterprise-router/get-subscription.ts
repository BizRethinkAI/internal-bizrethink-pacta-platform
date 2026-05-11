import { getInternalClaimPlans } from '@documenso/ee/server-only/stripe/get-internal-claim-plans';
import { getSubscription } from '@documenso/ee/server-only/stripe/get-subscription';
// MODIFIED for BizRethink (overlay 051): swap the sync env-var billing gate
// for the DB-aware async getter so Pacta's admin-UI Stripe config
// (overlay 045) actually unlocks the in-app billing page.
import { isBillingEnabledFromConfig } from '@documenso/lib/constants/app';
import { AppError, AppErrorCode } from '@documenso/lib/errors/app-error';

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
      getSubscription({
        organisationId,
        userId,
      }),
      getInternalClaimPlans(),
    ]);

    return {
      subscription,
      plans,
    };
  });
