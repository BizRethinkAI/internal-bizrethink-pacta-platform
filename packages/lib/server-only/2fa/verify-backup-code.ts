// MODIFIED for BizRethink (overlay 087): atomically consume a current code.
import { consumeAccountRecoveryCode } from '@bizrethink/customizations/server-only/account-mfa';
import type { User } from '@prisma/client';

type VerifyBackupCodeParams = {
  user: Pick<User, 'id' | 'twoFactorEnabled' | 'twoFactorBackupCodes'>;
  backupCode: string;
};

export const verifyBackupCode = ({ user, backupCode }: VerifyBackupCodeParams) =>
  consumeAccountRecoveryCode(user.id, backupCode);
