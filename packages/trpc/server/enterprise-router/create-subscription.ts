import { createCheckoutSession } from '@documenso/ee/server-only/stripe/create-checkout-session';
import { createCustomer } from '@documenso/ee/server-only/stripe/create-customer';
// MODIFIED for BizRethink (overlay 051): DB-aware billing gate so the
// Stripe-config-in-admin-UI flow (overlay 045) actually unlocks the
// in-app upgrade flow.
import { NEXT_PUBLIC_WEBAPP_URL, isBillingEnabledFromConfig } from '@documenso/lib/constants/app';
import { ORGANISATION_MEMBER_ROLE_PERMISSIONS_MAP } from '@documenso/lib/constants/organisations';
import { AppError, AppErrorCode } from '@documenso/lib/errors/app-error';
import { buildOrganisationWhereQuery } from '@documenso/lib/utils/organisations';
import { prisma } from '@documenso/prisma';

import { authenticatedProcedure } from '../trpc';
import { ZCreateSubscriptionRequestSchema } from './create-subscription.types';

export const createSubscriptionRoute = authenticatedProcedure
  .input(ZCreateSubscriptionRequestSchema)
  .mutation(async ({ ctx, input }) => {
    const { organisationId, priceId, isPersonalLayoutMode } = input;

    ctx.logger.info({
      input: {
        organisationId,
        priceId,
      },
    });

    const userId = ctx.user.id;

    if (!(await isBillingEnabledFromConfig())) {
      throw new AppError(AppErrorCode.INVALID_REQUEST, {
        message: 'Billing is not enabled',
      });
    }

    const organisation = await prisma.organisation.findFirst({
      where: buildOrganisationWhereQuery({
        organisationId,
        userId,
        roles: ORGANISATION_MEMBER_ROLE_PERMISSIONS_MAP['MANAGE_BILLING'],
      }),
      include: {
        subscription: true,
        owner: {
          select: {
            email: true,
            name: true,
          },
        },
      },
    });

    if (!organisation) {
      throw new AppError(AppErrorCode.UNAUTHORIZED);
    }

    let customerId = organisation.customerId;

    if (!customerId) {
      const customer = await createCustomer({
        name: organisation.owner.name || organisation.owner.email,
        email: organisation.owner.email,
      });

      customerId = customer.id;

      await prisma.organisation.update({
        where: {
          id: organisationId,
        },
        data: {
          customerId: customer.id,
        },
      });
    }

    const returnUrl = isPersonalLayoutMode
      ? `${NEXT_PUBLIC_WEBAPP_URL()}/settings/billing-personal`
      : `${NEXT_PUBLIC_WEBAPP_URL()}/o/${organisation.url}/settings/billing`;

    const redirectUrl = await createCheckoutSession({
      customerId,
      priceId,
      returnUrl,
    });

    if (!redirectUrl) {
      throw new AppError(AppErrorCode.UNKNOWN_ERROR, {
        message: 'Failed to create checkout session',
      });
    }

    return {
      redirectUrl,
    };
  });
