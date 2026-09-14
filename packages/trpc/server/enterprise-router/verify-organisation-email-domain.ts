// MODIFIED for BizRethink (overlay 089): bounded resource work and trial/domain policy.
import { findVerifiableDomains } from '@bizrethink/customizations/server-only/resources/email-domains';
import { verifyEmailDomain } from '@documenso/ee/server-only/lib/verify-email-domain';
import { ORGANISATION_MEMBER_ROLE_PERMISSIONS_MAP } from '@documenso/lib/constants/organisations';
import { AppError, AppErrorCode } from '@documenso/lib/errors/app-error';
import { buildOrganisationWhereQuery } from '@documenso/lib/utils/organisations';
import { prisma } from '@documenso/prisma';

import { authenticatedProcedure } from '../trpc';
import {
  ZVerifyOrganisationEmailDomainRequestSchema,
  ZVerifyOrganisationEmailDomainResponseSchema,
} from './verify-organisation-email-domain.types';

export const verifyOrganisationEmailDomainRoute = authenticatedProcedure
  .input(ZVerifyOrganisationEmailDomainRequestSchema)
  .output(ZVerifyOrganisationEmailDomainResponseSchema)
  .mutation(async ({ input, ctx }) => {
    const { organisationId, emailDomainId } = input;
    const { user } = ctx;

    ctx.logger.info({
      input: {
        organisationId,
        emailDomainId,
      },
    });

    // MODIFIED for BizRethink: removed `if (!IS_BILLING_ENABLED()) throw …`
    // — on self-host, billing is always disabled. The downstream organisation-
    // membership check is the real authorization gate. See overlays/008.

    const organisation = await prisma.organisation.findFirst({
      where: buildOrganisationWhereQuery({
        organisationId,
        userId: user.id,
        roles: ORGANISATION_MEMBER_ROLE_PERMISSIONS_MAP['MANAGE_ORGANISATION'],
      }),
    });

    if (!organisation) {
      throw new AppError(AppErrorCode.UNAUTHORIZED);
    }

    const emailsToVerify = await findVerifiableDomains(organisation.id, emailDomainId);
    for (const email of emailsToVerify) {
      await verifyEmailDomain(email.id);
    }
  });
