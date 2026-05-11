import { getInternalClaimPlans } from '@documenso/ee/server-only/stripe/get-internal-claim-plans';
// MODIFIED for BizRethink (overlay 051): DB-aware billing gate.
import { isBillingEnabledFromConfig } from '@documenso/lib/constants/app';
import { prisma } from '@documenso/prisma';

import { authenticatedProcedure } from '../trpc';

export const getPlansRoute = authenticatedProcedure.query(async ({ ctx }) => {
  const userId = ctx.user.id;

  const plans = await getInternalClaimPlans();

  let canCreateFreeOrganisation = false;

  if (await isBillingEnabledFromConfig()) {
    const numberOfFreeOrganisations = await prisma.organisation.count({
      where: {
        ownerUserId: userId,
        subscription: {
          is: null,
        },
      },
    });

    canCreateFreeOrganisation = numberOfFreeOrganisations === 0;
  }

  return {
    plans,
    canCreateFreeOrganisation,
  };
});
