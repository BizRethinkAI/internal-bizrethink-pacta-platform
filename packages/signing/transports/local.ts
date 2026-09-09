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

export type CreateLocalSignerOptions = {
  /**
   * Fetch missing intermediates via AIA. Leave on for sealing.
   * Turn off for health checks so they do not hit the network.
   *
   * @default true
   */
  buildChain?: boolean;
};

// MODIFIED for BizRethink (overlay 011): keeps upstream's `buildChain` option
// -- `getCertificateStatus` passes `{ buildChain: false }` as of #3309 so the
// health check stays offline -- while resolving the cert and passphrase from
// the DB row before falling back to env. Because cert-status now inspects the
// signer this function returns, /api/health reports on the cert we actually
// sign with, DB-sourced one included.
export const createLocalSigner = async ({ buildChain = true }: CreateLocalSignerOptions = {}) => {
  const { getInstanceSigningConfig } = await import(
    '@bizrethink/customizations/server-only/instance-signing-config'
  );
  const dbConfig = await getInstanceSigningConfig();

  const p12 =
    dbConfig?.localCertContents && dbConfig.localCertContents.length > 0
      ? dbConfig.localCertContents
      : loadP12FromEnvOrFile();

  const passphrase = dbConfig?.localPassphrase ?? env('NEXT_PRIVATE_SIGNING_PASSPHRASE') ?? '';

  return await P12Signer.create(p12, passphrase, {
    buildChain,
  });
};
