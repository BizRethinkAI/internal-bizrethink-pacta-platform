import * as fs from 'node:fs';
import { env } from '@documenso/lib/utils/env';
import { P12Signer } from '@libpdf/core';

// MODIFIED for BizRethink (overlay 011): cert + passphrase resolution
// consults the singleton `BizrethinkInstanceSigningConfig` row first.
// If absent, falls back to the upstream env-driven path. Allows admins to
// rotate the cert via UI without redeploying. Decryption happens inside
// `getInstanceSigningConfig()` so this function only ever sees plaintext.

const loadP12FromEnvOrFile = (): Uint8Array => {
  const localFileContents = env('NEXT_PRIVATE_SIGNING_LOCAL_FILE_CONTENTS');

  if (localFileContents) {
    return Buffer.from(localFileContents, 'base64');
  }

  const localFilePath = env('NEXT_PRIVATE_SIGNING_LOCAL_FILE_PATH');

  if (localFilePath) {
    return fs.readFileSync(localFilePath);
  }

  if (env('NODE_ENV') !== 'production') {
    return fs.readFileSync('./example/cert.p12');
  }

  throw new Error('No certificate found for local signing');
};

export const createLocalSigner = async () => {
  const { getInstanceSigningConfig } = await import('@bizrethink/customizations/server-only/instance-signing-config');
  const dbConfig = await getInstanceSigningConfig();

  const p12 =
    dbConfig?.localCertContents && dbConfig.localCertContents.length > 0
      ? dbConfig.localCertContents
      : loadP12FromEnvOrFile();

  const passphrase = dbConfig?.localPassphrase ?? env('NEXT_PRIVATE_SIGNING_PASSPHRASE') ?? '';

  return await P12Signer.create(p12, passphrase, {
    buildChain: true,
  });
};
