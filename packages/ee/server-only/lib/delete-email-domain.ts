// MODIFIED for BizRethink (overlay 090): redact server diagnostics before transport.

import { DeleteEmailIdentityCommand } from '@aws-sdk/client-sesv2';
import { createServerConsole } from '@bizrethink/customizations/server-only/logging/server-console';

import { AppError, AppErrorCode } from '@documenso/lib/errors/app-error';
import { prisma } from '@documenso/prisma';

import { getSesClient } from './create-email-domain';

const serverConsole = createServerConsole('packages/ee/server-only/lib/delete-email-domain');

type DeleteEmailDomainOptions = {
  emailDomainId: string;
};

/**
 * Delete the email domain and SES email identity.
 *
 * Permission is assumed to be checked in the caller.
 */
export const deleteEmailDomain = async ({ emailDomainId }: DeleteEmailDomainOptions) => {
  const emailDomain = await prisma.emailDomain.findUnique({
    where: {
      id: emailDomainId,
    },
  });

  if (!emailDomain) {
    throw new AppError(AppErrorCode.NOT_FOUND, {
      message: 'Email domain not found',
    });
  }

  const sesClient = getSesClient();

  await sesClient
    .send(
      new DeleteEmailIdentityCommand({
        EmailIdentity: emailDomain.domain,
      }),
    )
    .catch((err) => {
      serverConsole.error(err);

      // Do nothing if it no longer exists in SES.
      if (err.name === 'NotFoundException') {
        return;
      }
    });

  await prisma.emailDomain.delete({
    where: {
      id: emailDomainId,
    },
  });
};
