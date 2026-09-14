// MODIFIED for BizRethink (overlay 087): setup cannot overwrite enabled MFA.
import { stageAccountMfa } from '@bizrethink/customizations/server-only/account-mfa';
import type { User } from '@prisma/client';
import { base32 } from '@scure/base';
import crypto from 'crypto';
import { createTOTPKeyURI } from 'oslo/otp';

import { DOCUMENSO_ENCRYPTION_KEY } from '../../constants/crypto';
import { symmetricEncrypt } from '../../universal/crypto';

type SetupTwoFactorAuthenticationOptions = {
  user: Pick<User, 'id' | 'email'>;
};

const ISSUER = 'Documenso';

export const setupTwoFactorAuthentication = async ({ user }: SetupTwoFactorAuthenticationOptions) => {
  const key = DOCUMENSO_ENCRYPTION_KEY;

  if (!key) {
    throw new Error('MISSING_ENCRYPTION_KEY');
  }

  const secret = crypto.randomBytes(10);

  const backupCodes = Array.from({ length: 10 })
    .fill(null)
    .map(() => crypto.randomBytes(5).toString('hex'))
    .map((code) => `${code.slice(0, 5)}-${code.slice(5)}`.toUpperCase());

  const accountName = user.email;
  const uri = createTOTPKeyURI(ISSUER, accountName, secret);
  const encodedSecret = base32.encode(new Uint8Array(secret));

  await stageAccountMfa({
    userId: user.id,
    secret: symmetricEncrypt({ data: encodedSecret, key }),
    backupCodes: symmetricEncrypt({ data: JSON.stringify(backupCodes), key }),
  });

  return {
    secret: encodedSecret,
    uri,
  };
};
