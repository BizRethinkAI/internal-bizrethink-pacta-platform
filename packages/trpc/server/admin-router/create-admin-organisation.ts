// BizRethink (overlay 041): trial bookkeeping for new external orgs.
import { startTrialForNewOrg } from '@bizrethink/customizations/server-only/billing/start-trial-for-new-org';
import { OrganisationType } from '@prisma/client';

import { createOrganisation } from '@documenso/lib/server-only/organisation/create-organisation';
import { INTERNAL_CLAIM_ID, internalClaims } from '@documenso/lib/types/subscription';

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

    // MODIFIED for BizRethink (overlay 041): admin-created orgs default to PRO
    // claim with 14-day trial. Admins promote orgs to BIZRETHINK tier by
    // flipping bizrethinkInternal=true via the admin override panel (Phase 3)
    // or direct DB update for now. Keeping admin route external-by-default
    // avoids accidentally minting BIZRETHINK-tier orgs for non-team users.
    const organisation = await createOrganisation({
      userId: ownerUserId,
      name: data.name,
      type: OrganisationType.ORGANISATION,
      claim: internalClaims[INTERNAL_CLAIM_ID.PRO],
    });

    // BizRethink (overlay 041): record trial window for the new org.
    await startTrialForNewOrg({ organisationId: organisation.id, internal: false }).catch((err) => {
      console.error('[bizrethink] startTrialForNewOrg failed', err);
    });

    return {
      organisationId: organisation.id,
    };
  });
