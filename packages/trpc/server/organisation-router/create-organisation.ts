// BizRethink (overlay 041): trial bookkeeping for new external orgs.
import { startTrialForNewOrg } from '@bizrethink/customizations/server-only/billing/start-trial-for-new-org';
import { OrganisationType } from '@prisma/client';

import { createCheckoutSession } from '@documenso/ee/server-only/stripe/create-checkout-session';
import { createCustomer } from '@documenso/ee/server-only/stripe/create-customer';
import { IS_BILLING_ENABLED, NEXT_PUBLIC_WEBAPP_URL } from '@documenso/lib/constants/app';
import { AppError, AppErrorCode } from '@documenso/lib/errors/app-error';
import { createOrganisation } from '@documenso/lib/server-only/organisation/create-organisation';
import { INTERNAL_CLAIM_ID, internalClaims } from '@documenso/lib/types/subscription';
import { generateStripeOrganisationCreateMetadata } from '@documenso/lib/utils/billing';
import { prisma } from '@documenso/prisma';

import { authenticatedProcedure } from '../trpc';
import {
  ZCreateOrganisationRequestSchema,
  ZCreateOrganisationResponseSchema,
} from './create-organisation.types';

export const createOrganisationRoute = authenticatedProcedure
  // .meta(createOrganisationMeta)
  .input(ZCreateOrganisationRequestSchema)
  .output(ZCreateOrganisationResponseSchema)
  .mutation(async ({ input, ctx }) => {
    const { name, priceId } = input;
    const { user } = ctx;

    ctx.logger.info({
      input: {
        priceId,
      },
    });

    // Check if user can create a free organiastion.
    if (IS_BILLING_ENABLED() && !priceId) {
      const userOrganisations = await prisma.organisation.findMany({
        where: {
          ownerUserId: user.id,
          subscription: {
            is: null,
          },
        },
      });

      if (userOrganisations.length >= 1) {
        throw new AppError(AppErrorCode.LIMIT_EXCEEDED, {
          message: 'You have reached the maximum number of free organisations.',
        });
      }
    }

    // Create checkout session for payment.
    if (IS_BILLING_ENABLED() && priceId) {
      const customer = await createCustomer({
        email: user.email,
        name: user.name || user.email,
      });

      const checkoutUrl = await createCheckoutSession({
        priceId,
        customerId: customer.id,
        returnUrl: `${NEXT_PUBLIC_WEBAPP_URL()}/settings/organisations`,
        subscriptionMetadata: generateStripeOrganisationCreateMetadata(name, user.id),
      });

      return {
        paymentRequired: true,
        checkoutUrl,
      };
    }

    // Free organisations should be Personal by default.
    const organisationType = IS_BILLING_ENABLED()
      ? OrganisationType.PERSONAL
      : OrganisationType.ORGANISATION;

    // MODIFIED for BizRethink (overlay 041): assign PRO claim with 14-day trial
    // instead of BIZRETHINK. New external orgs experience Pro features during
    // the trial window; trial-expire-sweep cron downgrades to FREE on expiry.
    const organisation = await createOrganisation({
      userId: user.id,
      name,
      type: organisationType,
      claim: internalClaims[INTERNAL_CLAIM_ID.PRO],
    });

    // BizRethink (overlay 041): record trial window for the new org.
    await startTrialForNewOrg({ organisationId: organisation.id, internal: false }).catch((err) => {
      console.error('[bizrethink] startTrialForNewOrg failed', err);
    });

    return {
      paymentRequired: false,
    };
  });
