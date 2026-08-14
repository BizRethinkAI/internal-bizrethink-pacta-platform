// BizRethink (overlay 041): trial bookkeeping for new external orgs.
import { startTrialForNewOrg } from '@bizrethink/customizations/server-only/billing/start-trial-for-new-org';
import { createCustomer } from '@documenso/ee/server-only/stripe/create-customer';
import { getSubscriptionClaim } from '@documenso/lib/server-only/subscription/get-subscription-claim';
import { prisma } from '@documenso/prisma';
import { OrganisationMemberRole, OrganisationType, Prisma, type SubscriptionClaim } from '@prisma/client';

import { IS_BILLING_ENABLED } from '../../constants/app';
import { ORGANISATION_INTERNAL_GROUPS } from '../../constants/organisations';
import { AppError, AppErrorCode } from '../../errors/app-error';
import { INTERNAL_CLAIM_ID } from '../../types/subscription';
import { generateDatabaseId, prefixedId } from '../../universal/id';
import { generateDefaultOrganisationSettings } from '../../utils/organisations';
import { createTeam } from '../team/create-team';

type CreateOrganisationOptions = {
  userId: number;
  name: string;
  type: OrganisationType;
  url?: string;
  customerId?: string;
  claim: Omit<SubscriptionClaim, 'createdAt' | 'updatedAt'>;
};

export const createOrganisation = async ({ name, url, type, userId, customerId, claim }: CreateOrganisationOptions) => {
  let customerIdToUse = customerId;

  if (!customerId && IS_BILLING_ENABLED()) {
    const user = await prisma.user.findUnique({
      where: {
        id: userId,
      },
    });

    if (!user) {
      throw new AppError(AppErrorCode.NOT_FOUND, {
        message: 'User not found',
      });
    }

    customerIdToUse = await createCustomer({
      name: user.name || user.email,
      email: user.email,
    })
      .then((customer) => customer.id)
      .catch((err) => {
        console.error(err);

        return undefined;
      });
  }

  return await prisma.$transaction(async (tx) => {
    const organisationSetting = await tx.organisationGlobalSettings.create({
      data: {
        ...generateDefaultOrganisationSettings(),
        defaultRecipients: Prisma.DbNull,
        id: generateDatabaseId('org_setting'),
      },
    });

    const organisationClaim = await tx.organisationClaim.create({
      data: {
        id: generateDatabaseId('org_claim'),
        originalSubscriptionClaimId: claim.id,
        ...createOrganisationClaimUpsertData(claim),
      },
    });

    const organisationAuthenticationPortal = await tx.organisationAuthenticationPortal.create({
      data: {
        id: generateDatabaseId('org_sso'),
        enabled: false,
        clientId: '',
        clientSecret: '',
        wellKnownUrl: '',
      },
    });

    const orgIdAndUrl = prefixedId('org');

    const organisation = await tx.organisation
      .create({
        data: {
          id: orgIdAndUrl,
          name,
          type,
          url: url || orgIdAndUrl,
          ownerUserId: userId,
          organisationGlobalSettingsId: organisationSetting.id,
          organisationClaimId: organisationClaim.id,
          organisationAuthenticationPortalId: organisationAuthenticationPortal.id,
          groups: {
            create: ORGANISATION_INTERNAL_GROUPS.map((group) => ({
              ...group,
              id: generateDatabaseId('org_group'),
            })),
          },
          customerId: customerIdToUse,
        },
        include: {
          groups: true,
        },
      })
      .catch((err) => {
        if (err.code === 'P2002') {
          throw new AppError(AppErrorCode.ALREADY_EXISTS, {
            message: 'Organisation URL already exists',
          });
        }

        throw err;
      });

    const adminGroup = organisation.groups.find((group) => group.organisationRole === OrganisationMemberRole.ADMIN);

    if (!adminGroup) {
      throw new AppError(AppErrorCode.UNKNOWN_ERROR, {
        message: 'Admin group not found',
      });
    }

    await tx.organisationMember.create({
      data: {
        id: generateDatabaseId('member'),
        userId,
        organisationId: organisation.id,
        organisationGroupMembers: {
          create: {
            id: generateDatabaseId('group_member'),
            groupId: adminGroup.id,
          },
        },
      },
    });

    return organisation;
  });
};

type CreatePersonalOrganisationOptions = {
  userId: number;
  orgUrl?: string;
  throwErrorOnOrganisationCreationFailure?: boolean;
  inheritMembers?: boolean;
  type?: OrganisationType;
};

export const createPersonalOrganisation = async ({
  userId,
  orgUrl,
  throwErrorOnOrganisationCreationFailure = false,
  inheritMembers = true,
  type = OrganisationType.PERSONAL,
}: CreatePersonalOrganisationOptions) => {
  // MODIFIED for BizRethink (overlay 041): route new external orgs to the PRO
  // claim with a 14-day trial instead of FREE. Internal orgs (BizRethink-operated)
  // are created separately or get bizrethinkInternal=true stamped via
  // admin/migration; this path is always external because it's called on every
  // public signup. Sourced via getSubscriptionClaim (upstream's new DB-backed
  // accessor) so the claim carries the real quota/rate-limit columns.
  const proSubscriptionClaim = await getSubscriptionClaim(INTERNAL_CLAIM_ID.PRO);

  const organisation = await createOrganisation({
    name: 'Personal Organisation',
    userId,
    url: orgUrl,
    type,
    claim: proSubscriptionClaim,
  }).catch((err) => {
    console.error(err);

    if (throwErrorOnOrganisationCreationFailure) {
      throw err;
    }

    // Todo: (LOGS)
  });

  // BizRethink (overlay 041): record the trial window so the trial-expire-sweep
  // cron (Phase 2) can downgrade the claim to FREE on expiry. Safe to fail
  // silently — the org is already created and usable on PRO; the trial state
  // is bookkeeping that defaults to "no row = external, no trial" downstream.
  if (organisation) {
    await startTrialForNewOrg({ organisationId: organisation.id, internal: false }).catch((err) => {
      console.error('[bizrethink] startTrialForNewOrg failed', err);
    });
  }

  if (organisation) {
    await createTeam({
      userId,
      teamName: 'Personal Team',
      teamUrl: prefixedId('personal'),
      organisationId: organisation.id,
      inheritMembers,
    }).catch((err) => {
      console.error(err);

      // Todo: (LOGS)
    });
  }

  return organisation;
};

export const createOrganisationClaimUpsertData = (
  subscriptionClaim: Omit<SubscriptionClaim, 'createdAt' | 'updatedAt'>,
) => {
  // Done like this to ensure type errors are thrown if items are added.
  const data: Omit<Prisma.SubscriptionClaimUncheckedCreateInput, 'id' | 'createdAt' | 'updatedAt' | 'locked' | 'name'> =
    {
      flags: {
        ...subscriptionClaim.flags,
      },
      envelopeItemCount: subscriptionClaim.envelopeItemCount,
      recipientCount: subscriptionClaim.recipientCount,
      teamCount: subscriptionClaim.teamCount,
      memberCount: subscriptionClaim.memberCount,
      documentRateLimits: subscriptionClaim.documentRateLimits ?? [],
      documentQuota: subscriptionClaim.documentQuota,
      emailRateLimits: subscriptionClaim.emailRateLimits ?? [],
      emailQuota: subscriptionClaim.emailQuota,
      apiRateLimits: subscriptionClaim.apiRateLimits ?? [],
      apiQuota: subscriptionClaim.apiQuota,
      emailTransportId: subscriptionClaim.emailTransportId ?? null,
    };

  return {
    ...data,
  };
};
