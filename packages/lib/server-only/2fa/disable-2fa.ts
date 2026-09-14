// MODIFIED for BizRethink (overlay 087): removal stays bound to the proved factor.
import { removeAccountMfa } from '@bizrethink/customizations/server-only/account-mfa';
import { prisma } from '@documenso/prisma';
import type { User } from '@prisma/client';
import { UserSecurityAuditLogType } from '@prisma/client';

import { AppError, AppErrorCode } from '../../errors/app-error';
import type { RequestMetadata } from '../../universal/extract-request-metadata';
import { validateTwoFactorAuthentication } from './validate-2fa';

type DisableTwoFactorAuthenticationOptions = {
  user: Pick<User, 'id' | 'email' | 'twoFactorEnabled' | 'twoFactorSecret' | 'twoFactorBackupCodes'>;
  totpCode?: string;
  backupCode?: string;
  requestMetadata?: RequestMetadata;
};

export const disableTwoFactorAuthentication = async ({
  totpCode,
  backupCode,
  user,
  requestMetadata,
}: DisableTwoFactorAuthenticationOptions) => {
  let isValid = false;

  if (!totpCode && !backupCode) {
    throw new AppError(AppErrorCode.INVALID_REQUEST);
  }

  if (totpCode) {
    isValid = await validateTwoFactorAuthentication({ totpCode, user });
  } else if (backupCode) {
    isValid = await validateTwoFactorAuthentication({ backupCode, user });
  }

  if (!isValid) {
    throw new AppError('INCORRECT_TWO_FACTOR_CODE');
  }

  await prisma.$transaction(async (tx) => {
    await removeAccountMfa(tx, user);

    await tx.userSecurityAuditLog.create({
      data: {
        userId: user.id,
        type: UserSecurityAuditLogType.AUTH_2FA_DISABLE,
        userAgent: requestMetadata?.userAgent,
        ipAddress: requestMetadata?.ipAddress,
      },
    });
  });

  return true;
};
