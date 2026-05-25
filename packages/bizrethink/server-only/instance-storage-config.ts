import { bytesToUtf8 } from '@noble/ciphers/utils';

import { DOCUMENSO_ENCRYPTION_KEY } from '@documenso/lib/constants/crypto';
import { AppError, AppErrorCode } from '@documenso/lib/errors/app-error';
import { symmetricDecrypt, symmetricEncrypt } from '@documenso/lib/universal/crypto';
import { prisma } from '@documenso/prisma';

// Phase E (overlay 013): DB-backed storage config loader.
//
// Replaces direct env reads in:
//   - packages/lib/universal/upload/put-file.server.ts (transport selector)
//   - packages/lib/universal/upload/server-actions.ts (S3Client config + bucket
//     name + distribution settings)
//
// Cache + invalidate semantics mirror instance-signing-config.ts.

export type DecryptedStorageConfig = {
  transport: 'database' | 's3';
  s3Endpoint: string | null;
  s3ForcePathStyle: boolean;
  s3Region: string | null;
  s3Bucket: string | null;
  s3AccessKeyId: string | null;
  s3SecretAccessKey: string | null;
  s3DistributionDomain: string | null;
  s3DistributionKeyId: string | null;
  s3DistributionKeyPem: string | null;
};

let cachedConfig: DecryptedStorageConfig | null = null;
let cachedNullProbed = false;

const setCachedConfig = (v: DecryptedStorageConfig | null) => {
  cachedConfig = v;
};
const setCachedNullProbed = (v: boolean) => {
  cachedNullProbed = v;
};

const requireKey = () => {
  if (!DOCUMENSO_ENCRYPTION_KEY) {
    throw new AppError(AppErrorCode.UNKNOWN_ERROR, {
      message: 'NEXT_PRIVATE_ENCRYPTION_KEY is not set; cannot encrypt/decrypt storage config',
    });
  }
  return DOCUMENSO_ENCRYPTION_KEY;
};

const decryptString = (cipher: string | null): string | null => {
  if (!cipher) return null;
  return bytesToUtf8(symmetricDecrypt({ key: requireKey(), data: cipher }));
};

export const encryptStorageString = (plain: string): string =>
  symmetricEncrypt({ key: requireKey(), data: plain });

export const getInstanceStorageConfig = async (): Promise<DecryptedStorageConfig | null> => {
  if (cachedConfig) return cachedConfig;
  if (cachedNullProbed) return null;

  // Defensive: DB unreachable returns null (callers fall back to env-based
  // S3 config). Throwing here would break uploads entirely during outages.
  let row;
  try {
    row = await prisma.bizrethinkInstanceStorageConfig.findUnique({
      where: { id: 'singleton' },
    });
  } catch (err) {
    console.warn(
      '[bizrethink/instance-storage-config] DB read failed; returning null (env fallback):',
      err instanceof Error ? err.message : err,
    );
    return null;
  }

  if (!row) {
    setCachedNullProbed(true);
    return null;
  }

  const fresh: DecryptedStorageConfig = {
    transport: row.transport === 's3' ? 's3' : 'database',
    s3Endpoint: row.s3Endpoint,
    s3ForcePathStyle: row.s3ForcePathStyle,
    s3Region: row.s3Region,
    s3Bucket: row.s3Bucket,
    s3AccessKeyId: decryptString(row.s3AccessKeyId),
    s3SecretAccessKey: decryptString(row.s3SecretAccessKey),
    s3DistributionDomain: row.s3DistributionDomain,
    s3DistributionKeyId: decryptString(row.s3DistributionKeyId),
    s3DistributionKeyPem: decryptString(row.s3DistributionKeyPem),
  };

  setCachedConfig(fresh);
  return fresh;
};

export const invalidateStorageConfig = () => {
  setCachedConfig(null);
  setCachedNullProbed(false);
};
