// MODIFIED for BizRethink (overlay 089): bounded resource work and trial/domain policy.
import { CreateEmailIdentityCommand, SESv2Client } from '@aws-sdk/client-sesv2';
import { AppError, AppErrorCode } from '@documenso/lib/errors/app-error';
import { env } from '@documenso/lib/utils/env';

export const getSesClient = () => {
  const accessKeyId = env('NEXT_PRIVATE_SES_ACCESS_KEY_ID');
  const secretAccessKey = env('NEXT_PRIVATE_SES_SECRET_ACCESS_KEY');
  const region = env('NEXT_PRIVATE_SES_REGION');

  if (!accessKeyId || !secretAccessKey || !region) {
    throw new AppError(AppErrorCode.UNKNOWN_ERROR, {
      message: 'Missing AWS SES credentials',
    });
  }

  return new SESv2Client({
    region,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });
};

export async function verifyDomainWithDKIM(domain: string, selector: string, privateKey: string) {
  const command = new CreateEmailIdentityCommand({
    EmailIdentity: domain,
    DkimSigningAttributes: {
      DomainSigningSelector: selector,
      DomainSigningPrivateKey: privateKey,
    },
  });

  return await getSesClient().send(command);
}

// BizRethink overlay 089: pending requests do not reserve global ownership.
export { createDomainChallenge as createEmailDomain } from '@bizrethink/customizations/server-only/resources/email-domains';
