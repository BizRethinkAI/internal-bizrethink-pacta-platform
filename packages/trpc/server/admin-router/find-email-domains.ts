// MODIFIED for BizRethink (overlay 089): bounded resource work and trial/domain policy.
import { findDomainRecords } from '@bizrethink/customizations/server-only/resources/email-domains';

import { adminProcedure } from '../trpc';
import { ZFindEmailDomainsRequestSchema, ZFindEmailDomainsResponseSchema } from './find-email-domains.types';

export const findEmailDomainsRoute = adminProcedure
  .input(ZFindEmailDomainsRequestSchema)
  .output(ZFindEmailDomainsResponseSchema)
  .query(async ({ input }) => {
    const { query, page, perPage, status } = input;

    return await findEmailDomains({ query, page, perPage, status });
  });

type FindEmailDomainsOptions = {
  query?: string;
  page?: number;
  perPage?: number;
  status?: 'PENDING' | 'ACTIVE';
};

const findEmailDomains = async ({ query, page = 1, perPage = 20, status }: FindEmailDomainsOptions) => {
  return findDomainRecords({ query, statuses: status ? [status] : [], page, perPage });
};
