// MODIFIED for BizRethink (overlay 089): bounded resource work and trial/domain policy.
import { findDomainRecords } from '@bizrethink/customizations/server-only/resources/email-domains';
import { AppError, AppErrorCode } from '@documenso/lib/errors/app-error';
import { buildOrganisationWhereQuery } from '@documenso/lib/utils/organisations';
import { prisma } from '@documenso/prisma';
import type { EmailDomainStatus } from '@prisma/client';

import { authenticatedProcedure } from '../trpc';
import {
  ZFindOrganisationEmailDomainsRequestSchema,
  ZFindOrganisationEmailDomainsResponseSchema,
} from './find-organisation-email-domain.types';

export const findOrganisationEmailDomainsRoute = authenticatedProcedure
  .input(ZFindOrganisationEmailDomainsRequestSchema)
  .output(ZFindOrganisationEmailDomainsResponseSchema)
  .query(async ({ input, ctx }) => {
    const { organisationId, emailDomainId, statuses, query, page, perPage } = input;
    const { user } = ctx;

    ctx.logger.info({
      input: {
        organisationId,
      },
    });

    return await findOrganisationEmailDomains({
      userId: user.id,
      organisationId,
      emailDomainId,
      statuses,
      query,
      page,
      perPage,
    });
  });

type FindOrganisationEmailDomainsOptions = {
  userId: number;
  organisationId: string;
  emailDomainId?: string;
  statuses?: EmailDomainStatus[];
  query?: string;
  page?: number;
  perPage?: number;
};

export const findOrganisationEmailDomains = async ({
  userId,
  organisationId,
  emailDomainId,
  statuses = [],
  query,
  page = 1,
  perPage = 100,
}: FindOrganisationEmailDomainsOptions) => {
  const organisation = await prisma.organisation.findFirst({
    where: buildOrganisationWhereQuery({ organisationId, userId }),
  });

  if (!organisation) {
    throw new AppError(AppErrorCode.NOT_FOUND);
  }

  return findDomainRecords({ organisationId: organisation.id, emailDomainId, query, statuses, page, perPage });
};
