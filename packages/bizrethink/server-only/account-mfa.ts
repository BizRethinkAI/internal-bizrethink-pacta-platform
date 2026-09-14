import { DOCUMENSO_ENCRYPTION_KEY } from '@documenso/lib/constants/crypto';
import { AppError, AppErrorCode } from '@documenso/lib/errors/app-error';
import { getBackupCodes } from '@documenso/lib/server-only/2fa/get-backup-code';
import { symmetricEncrypt } from '@documenso/lib/universal/crypto';
import { prisma } from '@documenso/prisma';
import type { Prisma, User } from '@prisma/client';

type Factor = Pick<User, 'id' | 'twoFactorSecret'>;

/** Setup may replace only an unconfirmed enrollment, never an enabled factor. */
export const stageAccountMfa = async ({
  userId,
  secret,
  backupCodes,
}: {
  userId: number;
  secret: string;
  backupCodes: string;
}) => {
  const { count } = await prisma.user.updateMany({
    where: { id: userId, disabled: false, twoFactorEnabled: false },
    data: { twoFactorSecret: secret, twoFactorBackupCodes: backupCodes },
  });
  if (count !== 1) {
    throw new AppError('TWO_FACTOR_ALREADY_ENABLED', { statusCode: 400 });
  }
};

/** Confirm exactly the staged secret that the submitted TOTP proved. */
export const activateAccountMfa = async (tx: Prisma.TransactionClient, user: Factor) => {
  const { count } = await tx.user.updateMany({
    where: { id: user.id, disabled: false, twoFactorEnabled: false, twoFactorSecret: user.twoFactorSecret },
    data: { twoFactorEnabled: true },
  });
  if (count !== 1) {
    throw new AppError('TWO_FACTOR_SETUP_REQUIRED', { statusCode: 400 });
  }
  return tx.user.findUniqueOrThrow({ where: { id: user.id } });
};

/** An old proof cannot disable a replacement factor or a disabled account. */
export const removeAccountMfa = async (tx: Prisma.TransactionClient, user: Factor) => {
  const { count } = await tx.user.updateMany({
    where: { id: user.id, disabled: false, twoFactorEnabled: true, twoFactorSecret: user.twoFactorSecret },
    data: { twoFactorEnabled: false, twoFactorBackupCodes: null, twoFactorSecret: null },
  });
  if (count !== 1) {
    throw new AppError('INCORRECT_TWO_FACTOR_CODE', { statusCode: 400 });
  }
};

/**
 * Lock and reread the primary row: callers may hold an old session/login snapshot.
 * Retain the encrypted format so existing accounts and the remaining-code screen
 * keep working. Removal and success are one transaction; no reusable success is
 * returned before the write commits.
 */
export const consumeAccountRecoveryCode = async (userId: number, backupCode: string): Promise<boolean> => {
  const key = DOCUMENSO_ENCRYPTION_KEY;
  if (!key) {
    throw new AppError(AppErrorCode.UNKNOWN_ERROR);
  }
  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "User" WHERE id = ${userId} FOR UPDATE`;
    const user = await tx.user.findUnique({ where: { id: userId } });
    if (!user || user.disabled || !user.twoFactorEnabled || !user.twoFactorBackupCodes || !user.twoFactorSecret) {
      return false;
    }
    const codes = getBackupCodes({ user });
    if (!codes?.includes(backupCode)) {
      return false;
    }
    const { count } = await tx.user.updateMany({
      where: { id: userId, disabled: false, twoFactorEnabled: true, twoFactorBackupCodes: user.twoFactorBackupCodes },
      data: {
        twoFactorBackupCodes: symmetricEncrypt({
          data: JSON.stringify(codes.filter((code) => code !== backupCode)),
          key,
        }),
      },
    });
    return count === 1;
  });
};

export const readRemainingAccountRecoveryCodes = async (provedUser: Factor) => {
  // Read within a transaction so replica lag cannot show an already-consumed code.
  return prisma.$transaction(async (tx) => {
    const user = await tx.user.findUnique({ where: { id: provedUser.id } });
    if (!user || user.disabled || !user.twoFactorEnabled || user.twoFactorSecret !== provedUser.twoFactorSecret) {
      throw new AppError('INCORRECT_TWO_FACTOR_CODE', { statusCode: 400 });
    }
    return getBackupCodes({ user });
  });
};
