import { bytesToUtf8 } from '@noble/ciphers/utils';

import { DOCUMENSO_ENCRYPTION_KEY } from '@documenso/lib/constants/crypto';
import { AppError, AppErrorCode } from '@documenso/lib/errors/app-error';
import { symmetricDecrypt, symmetricEncrypt } from '@documenso/lib/universal/crypto';
import { env } from '@documenso/lib/utils/env';
import { prisma } from '@documenso/prisma';

// Phase F (overlay 014): DB-backed SSO provider config.
//
// Replaces NEXT_PRIVATE_GOOGLE_*/MICROSOFT_*/OIDC_* env vars. One row per
// provider in BizrethinkSsoProvider. Returns merged config: DB row when
// `enabled=true` and credentials present; falls back to env otherwise.

export type Provider = 'google' | 'microsoft' | 'oidc';

export type ProviderConfig = {
  enabled: boolean;
  clientId: string;
  clientSecret: string;
  // OIDC-only.
  oidcWellKnownUrl: string;
  oidcProviderLabel: string;
  oidcSkipVerify: boolean;
  oidcPrompt: string;
};

const cache = new Map<Provider, ProviderConfig>();
let cacheBuiltForAllProviders = false;

const setCache = (provider: Provider, cfg: ProviderConfig) => {
  cache.set(provider, cfg);
};

const requireKey = () => {
  if (!DOCUMENSO_ENCRYPTION_KEY) {
    throw new AppError(AppErrorCode.UNKNOWN_ERROR, {
      message: 'NEXT_PRIVATE_ENCRYPTION_KEY is not set; cannot decrypt SSO provider secrets',
    });
  }
  return DOCUMENSO_ENCRYPTION_KEY;
};

const decryptString = (cipher: string | null): string => {
  if (!cipher) return '';
  return bytesToUtf8(symmetricDecrypt({ key: requireKey(), data: cipher }));
};

export const encryptSsoString = (plain: string): string =>
  symmetricEncrypt({ key: requireKey(), data: plain });

const envFallback = (provider: Provider): ProviderConfig => {
  if (provider === 'google') {
    const clientId = env('NEXT_PRIVATE_GOOGLE_CLIENT_ID') ?? '';
    const clientSecret = env('NEXT_PRIVATE_GOOGLE_CLIENT_SECRET') ?? '';
    return {
      enabled: !!(clientId && clientSecret),
      clientId,
      clientSecret,
      oidcWellKnownUrl: '',
      oidcProviderLabel: '',
      oidcSkipVerify: false,
      oidcPrompt: '',
    };
  }
  if (provider === 'microsoft') {
    const clientId = env('NEXT_PRIVATE_MICROSOFT_CLIENT_ID') ?? '';
    const clientSecret = env('NEXT_PRIVATE_MICROSOFT_CLIENT_SECRET') ?? '';
    return {
      enabled: !!(clientId && clientSecret),
      clientId,
      clientSecret,
      oidcWellKnownUrl: '',
      oidcProviderLabel: '',
      oidcSkipVerify: false,
      oidcPrompt: '',
    };
  }
  // oidc
  const clientId = env('NEXT_PRIVATE_OIDC_CLIENT_ID') ?? '';
  const clientSecret = env('NEXT_PRIVATE_OIDC_CLIENT_SECRET') ?? '';
  const wellKnown = env('NEXT_PRIVATE_OIDC_WELL_KNOWN') ?? '';
  return {
    enabled: !!(clientId && clientSecret && wellKnown),
    clientId,
    clientSecret,
    oidcWellKnownUrl: wellKnown,
    oidcProviderLabel: env('NEXT_PRIVATE_OIDC_PROVIDER_LABEL') ?? 'OIDC',
    oidcSkipVerify: env('NEXT_PRIVATE_OIDC_SKIP_VERIFY') === 'true',
    oidcPrompt: env('NEXT_PRIVATE_OIDC_PROMPT') ?? '',
  };
};

export const getProviderConfig = async (provider: Provider): Promise<ProviderConfig> => {
  if (cacheBuiltForAllProviders) {
    const cached = cache.get(provider);
    if (cached) return cached;
  }

  // Defensive: if DB is unreachable (Postgres down, network flap, test env),
  // fall back to env-only so SSO sign-in stays available during outages.
  // Throwing here would block every sign-in attempt — env-fallback degrades
  // gracefully to the bootstrap config.
  let row;
  try {
    row = await prisma.bizrethinkSsoProvider.findUnique({
      where: { provider },
    });
  } catch (err) {
    console.warn(
      '[bizrethink/sso-provider-config] DB read failed; falling back to env-only:',
      err instanceof Error ? err.message : err,
    );
    row = null;
  }

  let cfg: ProviderConfig;
  if (!row) {
    cfg = envFallback(provider);
  } else {
    const clientId = decryptString(row.clientId);
    const clientSecret = decryptString(row.clientSecret);
    cfg = {
      enabled: row.enabled && !!clientId && !!clientSecret,
      clientId,
      clientSecret,
      oidcWellKnownUrl: row.oidcWellKnownUrl ?? '',
      oidcProviderLabel: row.oidcProviderLabel ?? 'OIDC',
      oidcSkipVerify: row.oidcSkipVerify,
      oidcPrompt: row.oidcPrompt ?? '',
    };
    // For OIDC, well-known URL is required for "enabled".
    if (provider === 'oidc') {
      cfg.enabled = cfg.enabled && !!cfg.oidcWellKnownUrl;
    }
  }

  setCache(provider, cfg);
  return cfg;
};

export const invalidateProviderConfig = (provider?: Provider) => {
  if (provider) {
    cache.delete(provider);
  } else {
    cache.clear();
    cacheBuiltForAllProviders = false;
  }
};
