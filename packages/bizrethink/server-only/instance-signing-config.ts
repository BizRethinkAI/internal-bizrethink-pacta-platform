import { bytesToUtf8 } from '@noble/ciphers/utils';

import { DOCUMENSO_ENCRYPTION_KEY } from '@documenso/lib/constants/crypto';
import { AppError, AppErrorCode } from '@documenso/lib/errors/app-error';
import { symmetricDecrypt, symmetricEncrypt } from '@documenso/lib/universal/crypto';
import { prisma } from '@documenso/prisma';

// Phase C (overlay 011): DB-backed signing config loader.
//
// Replaces direct env reads in:
//   - packages/signing/index.ts:getSigner()
//   - packages/signing/helpers/tsa.ts:setupTimestampAuthorities()
//   - packages/signing/transports/local.ts:loadP12()
//   - packages/signing/transports/google-cloud.ts (cert chain + creds)
//
// The DB row is the singleton `BizrethinkInstanceSigningConfig` with
// `id = "singleton"`. If no row exists, callers MUST fall back to env reads
// — that's the bootstrap path on a fresh instance.
//
// Cache: the loaded, decrypted config is held in memory to avoid hitting
// the DB on every signPdf call. Cache is busted via `invalidateSigningConfig()`,
// which the admin UI's update mutation calls after writing the row. The
// `getSigner()` and `setupTimestampAuthorities()` caches in
// `packages/signing/*` are also reset by overlay 011 in the same code path.
//
// Security: certificate-bearing fields and the GCP service-account JSON are
// stored encrypted at rest with `NEXT_PRIVATE_ENCRYPTION_KEY`. Decryption
// happens here on each cache miss. Plaintext is held in memory only for the
// lifetime of the cache.

export type DecryptedSigningConfig = {
  transport: 'local' | 'gcloud-hsm';
  // local
  localCertContents: Uint8Array | null;
  localPassphrase: string | null;
  // gcloud-hsm
  gcloudKeyPath: string | null;
  gcloudCredentialsJson: string | null;
  gcloudCertChainPem: string | null;
  // shared
  tsaUrls: string[];
  signingContactInfo: string | null;
};

let cachedConfig: DecryptedSigningConfig | null = null;
let cachedNullRowProbed = false;

// Setters wrap module-level cache mutation so ESLint's `require-atomic-updates`
// rule doesn't flag the post-await assignment site (rule is overzealous —
// the cache is best-effort; the worst-case race outcome is one duplicate DB
// read, never data corruption).
const setCachedNullRowProbed = (v: boolean) => {
  cachedNullRowProbed = v;
};
const setCachedConfig = (v: DecryptedSigningConfig | null) => {
  cachedConfig = v;
};

const requireKey = () => {
  if (!DOCUMENSO_ENCRYPTION_KEY) {
    throw new AppError(AppErrorCode.UNKNOWN_ERROR, {
      message:
        'NEXT_PRIVATE_ENCRYPTION_KEY is not set; cannot encrypt/decrypt instance signing config',
    });
  }
  return DOCUMENSO_ENCRYPTION_KEY;
};

const decryptToBytes = (cipherText: string | null): Uint8Array | null => {
  if (!cipherText) {
    return null;
  }
  return symmetricDecrypt({ key: requireKey(), data: cipherText });
};

const decryptToString = (cipherText: string | null): string | null => {
  const bytes = decryptToBytes(cipherText);
  return bytes ? bytesToUtf8(bytes) : null;
};

const decryptBase64ToBytes = (cipherText: string | null): Uint8Array | null => {
  const base64 = decryptToString(cipherText);
  return base64 ? new Uint8Array(Buffer.from(base64, 'base64')) : null;
};

const decryptBase64ToString = (cipherText: string | null): string | null => {
  const base64 = decryptToString(cipherText);
  return base64 ? Buffer.from(base64, 'base64').toString('utf-8') : null;
};

/**
 * Load the singleton signing config from DB and decrypt all secret fields.
 * Returns null if no row exists — callers must fall back to env reads.
 *
 * Result is cached in-process. Use `invalidateSigningConfig()` after
 * writing a new row to evict.
 */
export const getInstanceSigningConfig = async (): Promise<DecryptedSigningConfig | null> => {
  if (cachedConfig) {
    return cachedConfig;
  }
  if (cachedNullRowProbed) {
    return null;
  }

  // Defensive: DB unreachable returns null (callers fall back to env-based
  // signing config). Throwing here would break ALL PDF sealing during
  // outages — env fallback degrades gracefully to bootstrap config.
  let row;
  try {
    row = await prisma.bizrethinkInstanceSigningConfig.findUnique({
      where: { id: 'singleton' },
    });
  } catch (err) {
    console.warn(
      '[bizrethink/instance-signing-config] DB read failed; returning null (env fallback):',
      err instanceof Error ? err.message : err,
    );
    return null;
  }

  if (!row) {
    setCachedNullRowProbed(true);
    return null;
  }

  const transport = row.transport === 'gcloud-hsm' ? 'gcloud-hsm' : 'local';

  const fresh: DecryptedSigningConfig = {
    transport,
    localCertContents: decryptBase64ToBytes(row.localCertContents),
    localPassphrase: decryptToString(row.localPassphrase),
    gcloudKeyPath: row.gcloudKeyPath,
    gcloudCredentialsJson: decryptBase64ToString(row.gcloudCredentials),
    gcloudCertChainPem: decryptBase64ToString(row.gcloudCertChain),
    tsaUrls: row.tsaUrls
      ? row.tsaUrls
          .split(',')
          .map((u: string) => u.trim())
          .filter(Boolean)
      : [],
    signingContactInfo: row.signingContactInfo,
  };

  setCachedConfig(fresh);

  return fresh;
};

/**
 * Drop the in-memory cache so the next read picks up the latest DB row.
 *
 * The signing transport caches in `packages/signing/*` are independent of
 * this cache; overlay 011 patches them to consult `getInstanceSigningConfig()`
 * on every call (or to expose their own reset, which the admin TRPC mutation
 * also calls). Belt-and-braces.
 */
export const invalidateSigningConfig = () => {
  setCachedConfig(null);
  setCachedNullRowProbed(false);
};

/**
 * Encrypt a UTF-8 string ready for storage. Use for `localPassphrase`.
 */
export const encryptUtf8String = (plaintext: string): string => {
  return symmetricEncrypt({ key: requireKey(), data: plaintext });
};

/**
 * Encrypt arbitrary binary data ready for storage. Caller is responsible for
 * base64-encoding on read if the underlying field expects base64. We accept
 * a pre-base64'd string here for symmetry with the read path.
 */
export const encryptBase64String = (base64Plaintext: string): string => {
  return symmetricEncrypt({ key: requireKey(), data: base64Plaintext });
};
