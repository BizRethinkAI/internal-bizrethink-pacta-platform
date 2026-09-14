// MODIFIED for BizRethink (overlay 089): bounded resource work and trial/domain policy.
import { getDomainChallenge } from '@bizrethink/customizations/server-only/resources/email-domains';
import { AppError, AppErrorCode } from '@documenso/lib/errors/app-error';
import { prisma } from '@documenso/prisma';

import { adminProcedure } from '../trpc';
import { ZGetEmailDomainRequestSchema, ZGetEmailDomainResponseSchema } from './get-email-domain.types';

export const getEmailDomainRoute = adminProcedure
  .input(ZGetEmailDomainRequestSchema)
  .output(ZGetEmailDomainResponseSchema)
  .query(async ({ input }) => {
    const { emailDomainId } = input;

    const pending = await getDomainChallenge(emailDomainId);
    if (pending) {
      return pending;
    }
    const emailDomain = await prisma.emailDomain.findUnique({
      where: {
        id: emailDomainId,
      },
      omit: {
        privateKey: true,
      },
      include: {
        organisation: {
          select: {
            id: true,
            name: true,
            url: true,
          },
        },
        emails: true,
      },
    });

    if (!emailDomain) {
      throw new AppError(AppErrorCode.NOT_FOUND, {
        message: 'Email domain not found',
      });
    }

    return emailDomain;
  });
