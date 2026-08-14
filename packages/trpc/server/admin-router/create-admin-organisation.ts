// BizRethink (overlay 041): trial bookkeeping for new external orgs.
import { startTrialForNewOrg } from '@bizrethink/customizations/server-only/billing/start-trial-for-new-org';
import { createOrganisation } from '@documenso/lib/server-only/organisation/create-organisation';
import { getSubscriptionClaim } from '@documenso/lib/server-only/subscription/get-subscription-claim';
import { INTERNAL_CLAIM_ID } from '@documenso/lib/types/subscription';
import { OrganisationType } from '@prisma/client';
import { adminProcedure } from '../trpc';
import {
  ZCreateAdminOrganisationRequestSchema,
  ZCreateAdminOrganisationResponseSchema,
} from './create-admin-organisation.types';

export const createAdminOrganisationRoute = adminProcedure
  .input(ZCreateAdminOrganisationRequestSchema)
  .output(ZCreateAdminOrganisationResponseSchema)
  .mutation(async ({ input, ctx }) => {
    const { ownerUserId, data } = input;

    ctx.logger.info({
      input: {
        ownerUserId,
      },
    });

    // MODIFIED for BizRethink (overlay 041): admin-created orgs get the PRO
    // claim with a 14-day trial instead of FREE, matching the public signup
    // path. The trial-expire-sweep cron downgrades to FREE on expiry.
    const proSubscriptionClaim = await getSubscriptionClaim(INTERNAL_CLAIM_ID.PRO);

    const organisation = await createOrganisation({
      userId: ownerUserId,
      name: data.name,
      type: OrganisationType.ORGANISATION,
      claim: proSubscriptionClaim,
    });

    // BizRethink (overlay 041): record the trial window for the new org.
    await startTrialForNewOrg({ organisationId: organisation.id, internal: false }).catch((err) => {
      console.error('[bizrethink] startTrialForNewOrg failed', err);
    });

    return {
      organisationId: organisation.id,
    };
  });
