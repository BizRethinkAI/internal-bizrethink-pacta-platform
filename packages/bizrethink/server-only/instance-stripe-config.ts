import { bytesToUtf8 } from '@noble/ciphers/utils';

import { DOCUMENSO_ENCRYPTION_KEY } from '@documenso/lib/constants/crypto';
import { AppError, AppErrorCode } from '@documenso/lib/errors/app-error';
import { symmetricDecrypt, symmetricEncrypt } from '@documenso/lib/universal/crypto';
import { prisma } from '@documenso/prisma';

// Phase K (overlay 045): DB-backed Stripe billing config loader.
//
// Replaces three upstream env reads:
//   - NEXT_PRIVATE_STRIPE_API_KEY          → activeApiKey
//   - NEXT_PRIVATE_STRIPE_WEBHOOK_SECRET   → activeWebhookSecret
//   - NEXT_PUBLIC_FEATURE_BILLING_ENABLED  → billingEnabled
//
// Touched by overlay 045 (packages/lib/server-only/stripe/index.ts late-
// binding), overlay 045b (webhook handler), overlay 045c
// (isBillingEnabledFromConfig in packages/lib/constants/app.ts).
//
// The DB row is the singleton `BizrethinkInstanceStripeConfig` with
// `id = "singleton"`. The model carries BOTH sandbox + live credential
// sets; `mode` flips which set is active. If no row exists, callers MUST
// fall back to env reads — that's the bootstrap path on a fresh instance.
//
// Cache: the loaded, decrypted config is held in memory. Cache is busted
// via `invalidateStripeConfig()`, which the admin UI's `update` and
// `switchMode` TRPC mutations call after writing the row. The Stripe SDK
// singleton in `packages/lib/server-only/stripe/index.ts` ALSO calls
// `invalidateStripeClient()` to rebuild its underlying `new Stripe(...)`
// instance with the freshly-decrypted API key.
//
// Security: sandboxApiKey, sandboxWebhookSecret, liveApiKey,
// liveWebhookSecret are stored encrypted at rest with
// `NEXT_PRIVATE_ENCRYPTION_KEY`. Publishable keys (sandbox/live) are
// public-by-design and stored plaintext.

export type StripeMode = 'sandbox' | 'live';

/**
 * Active credentials view — the getter returns the credentials matching
 * the current `mode`, decrypted. Consumers don't need to know which mode
 * is active; they just use the returned `apiKey` / `webhookSecret` /
 * `publishableKey`.
 */
export type DecryptedStripeConfig = {
  mode: StripeMode;
  billingEnabled: boolean;
  apiKey: string | null;
  webhookSecret: string | null;
  publishableKey: string | null;
  statementDescriptor: string | null;
};

let cachedConfig: DecryptedStripeConfig | null = null;
let cachedNullRowProbed = false;

const setCachedNullRowProbed = (v: boolean) => {
  cachedNullRowProbed = v;
};
const setCachedConfig = (v: DecryptedStripeConfig | null) => {
  cachedConfig = v;
};

const requireKey = () => {
  if (!DOCUMENSO_ENCRYPTION_KEY) {
    throw new AppError(AppErrorCode.UNKNOWN_ERROR, {
      message:
        'NEXT_PRIVATE_ENCRYPTION_KEY is not set; cannot encrypt/decrypt instance Stripe config',
    });
  }
  return DOCUMENSO_ENCRYPTION_KEY;
};

const decryptToString = (cipherText: string | null): string | null => {
  if (!cipherText) {
    return null;
  }
  const bytes = symmetricDecrypt({ key: requireKey(), data: cipherText });
  return bytes ? bytesToUtf8(bytes) : null;
};

/**
 * Load the singleton Stripe config from DB and decrypt the active mode's
 * credentials. Returns null if no row exists — callers must fall back to
 * env reads (`NEXT_PRIVATE_STRIPE_API_KEY`,
 * `NEXT_PRIVATE_STRIPE_WEBHOOK_SECRET`,
 * `NEXT_PUBLIC_FEATURE_BILLING_ENABLED`).
 *
 * Result is cached in-process. Use `invalidateStripeConfig()` after
 * writing a new row (or switching modes) to evict.
 */
export const getInstanceStripeConfig = async (): Promise<DecryptedStripeConfig | null> => {
  if (cachedConfig) {
    return cachedConfig;
  }
  if (cachedNullRowProbed) {
    return null;
  }

  const row = await prisma.bizrethinkInstanceStripeConfig.findUnique({
    where: { id: 'singleton' },
  });

  if (!row) {
    setCachedNullRowProbed(true);
    return null;
  }

  const mode: StripeMode = row.mode === 'live' ? 'live' : 'sandbox';

  // Pick the active mode's credentials. The inactive set stays encrypted in
  // the DB and is loaded only when admin switches modes.
  const apiKeyCipher = mode === 'live' ? row.liveApiKey : row.sandboxApiKey;
  const webhookSecretCipher = mode === 'live' ? row.liveWebhookSecret : row.sandboxWebhookSecret;
  const publishableKey = mode === 'live' ? row.livePublishableKey : row.sandboxPublishableKey;

  const fresh: DecryptedStripeConfig = {
    mode,
    billingEnabled: row.billingEnabled,
    apiKey: decryptToString(apiKeyCipher),
    webhookSecret: decryptToString(webhookSecretCipher),
    publishableKey,
    statementDescriptor: row.statementDescriptor,
  };

  setCachedConfig(fresh);

  return fresh;
};

/**
 * Drop the in-memory cache so the next read picks up the latest DB row.
 *
 * Called by:
 *   - The TRPC `update` mutation after upserting the singleton row
 *   - The TRPC `switchMode` mutation after toggling the active mode
 *   - The Stripe SDK invalidation path (overlay 045's
 *     `invalidateStripeClient()` — that one ALSO rebuilds the SDK).
 */
export const invalidateStripeConfig = () => {
  setCachedConfig(null);
  setCachedNullRowProbed(false);
};

/**
 * Encrypt a UTF-8 string ready for storage in the encrypted credential
 * columns (sandboxApiKey, sandboxWebhookSecret, liveApiKey,
 * liveWebhookSecret). Used by the TRPC `update` mutation.
 */
export const encryptStripeCredential = (plaintext: string): string => {
  return symmetricEncrypt({ key: requireKey(), data: plaintext });
};

/**
 * Convenience: read just the billing-enabled flag without forcing
 * credential decryption. Used by `isBillingEnabledFromConfig()` in
 * overlay 045c — that function is in the hot path for many requests
 * and shouldn't pay the cost of full credential decrypt every call.
 *
 * Falls back to env var when no row exists.
 */
export const isBillingEnabled = async (): Promise<boolean> => {
  if (cachedConfig) {
    return cachedConfig.billingEnabled;
  }

  if (cachedNullRowProbed) {
    return process.env.NEXT_PUBLIC_FEATURE_BILLING_ENABLED === 'true';
  }

  const row = await prisma.bizrethinkInstanceStripeConfig.findUnique({
    where: { id: 'singleton' },
    select: { billingEnabled: true },
  });

  if (!row) {
    setCachedNullRowProbed(true);
    return process.env.NEXT_PUBLIC_FEATURE_BILLING_ENABLED === 'true';
  }

  return row.billingEnabled;
};
