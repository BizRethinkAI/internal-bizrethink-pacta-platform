// MODIFIED for BizRethink (overlay 089): bounded resource work and trial/domain policy.
import { getDomainChallenge } from '@bizrethink/customizations/server-only/resources/email-domains';
import { deleteEmailDomain } from '@documenso/ee/server-only/lib/delete-email-domain';
import { ORGANISATION_MEMBER_ROLE_PERMISSIONS_MAP } from '@documenso/lib/constants/organisations';
import { AppError, AppErrorCode } from '@documenso/lib/errors/app-error';
import { buildOrganisationWhereQuery } from '@documenso/lib/utils/organisations';
import { prisma } from '@documenso/prisma';

import { authenticatedProcedure } from '../trpc';
import {
  ZDeleteOrganisationEmailDomainRequestSchema,
  ZDeleteOrganisationEmailDomainResponseSchema,
} from './delete-organisation-email-domain.types';

export const deleteOrganisationEmailDomainRoute = authenticatedProcedure
  .input(ZDeleteOrganisationEmailDomainRequestSchema)
  .output(ZDeleteOrganisationEmailDomainResponseSchema)
  .mutation(async ({ input, ctx }) => {
    const { emailDomainId } = input;
    const { user } = ctx;

    ctx.logger.info({
      input: {
        emailDomainId,
      },
    });

    // MODIFIED for BizRethink: removed `if (!IS_BILLING_ENABLED()) throw …`
    // — on self-host, billing is always disabled. The downstream organisation-
    // membership check via buildOrganisationWhereQuery is the real authorization
    // gate. See overlays/008.

    const pending = await getDomainChallenge(emailDomainId, user.id);
    if (pending) {
      await deleteEmailDomain({ emailDomainId });
      return;
    }
    const emailDomain = await prisma.emailDomain.findFirst({
      where: {
        id: emailDomainId,
        organisation: buildOrganisationWhereQuery({
          organisationId: undefined,
          userId: user.id,
          roles: ORGANISATION_MEMBER_ROLE_PERMISSIONS_MAP['MANAGE_ORGANISATION'],
        }),
      },
    });

    if (!emailDomain) {
      throw new AppError(AppErrorCode.NOT_FOUND, {
        message: 'Email domain not found',
      });
    }

    await deleteEmailDomain({
      emailDomainId: emailDomain.id,
    });
  });
