// MODIFIED for BizRethink (overlay 090): redact server diagnostics before transport.
import { createServerConsole } from '@bizrethink/customizations/server-only/logging/server-console';
import { prisma } from '@documenso/prisma';

const serverConsole = createServerConsole('packages/lib/server-only/user/service-accounts/legacy-service-account');

const LEGACY_SERVICE_ACCOUNT_EMAIL = 'serviceaccount@documenso.com';

export const legacyServiceAccountEmail = () => {
  try {
    // eslint-disable-next-line turbo/no-undeclared-env-vars
    if (process.env.NEXT_PRIVATE_LEGACY_SERVICE_ACCOUNT_EMAIL) {
      // eslint-disable-next-line turbo/no-undeclared-env-vars
      return process.env.NEXT_PRIVATE_LEGACY_SERVICE_ACCOUNT_EMAIL;
    }

    const { hostname } = new URL(process.env.NEXT_PUBLIC_WEBAPP_URL || 'http://localhost:3000');

    return `serviceaccount@${hostname}`;
  } catch (error) {
    return LEGACY_SERVICE_ACCOUNT_EMAIL;
  }
};

export const migrateLegacyServiceAccount = async () => {
  if (legacyServiceAccountEmail() !== LEGACY_SERVICE_ACCOUNT_EMAIL) {
    serverConsole.log(`Migrating legacy service account to new email: ${legacyServiceAccountEmail()}`);

    await prisma.user.updateMany({
      where: {
        email: LEGACY_SERVICE_ACCOUNT_EMAIL,
      },
      data: {
        email: legacyServiceAccountEmail(),
      },
    });
  }
};
