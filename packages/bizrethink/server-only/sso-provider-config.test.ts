import { beforeEach, describe, expect, it, vi } from 'vitest';

import { prisma } from '@documenso/prisma';
import { env } from '@documenso/lib/utils/env';

import {
  encryptSsoString,
  getProviderConfig,
  invalidateProviderConfig,
} from './sso-provider-config';

vi.mock('@documenso/prisma', () => ({
  prisma: {
    bizrethinkSsoProvider: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock('@documenso/lib/utils/env', () => ({
  env: vi.fn(),
}));

vi.mock('@documenso/lib/constants/crypto', () => ({
  DOCUMENSO_ENCRYPTION_KEY: 'test-encryption-key',
}));

// Identity-ish mock: encrypt prefixes "enc:", decrypt strips it and returns bytes.
// Real crypto correctness is upstream's concern; we just need the round-trip
// shape so the helper's wiring is exercised.
vi.mock('@documenso/lib/universal/crypto', () => ({
  symmetricEncrypt: vi.fn(({ data }: { data: string }) => `enc:${data}`),
  symmetricDecrypt: vi.fn(({ data }: { data: string }) =>
    new TextEncoder().encode(data.startsWith('enc:') ? data.slice(4) : data),
  ),
}));

const mockedFindUnique = vi.mocked(prisma.bizrethinkSsoProvider.findUnique);
const mockedEnv = vi.mocked(env);

const dbRow = (overrides: Record<string, unknown> = {}) => ({
  provider: 'google',
  enabled: true,
  clientId: 'enc:db-client-id',
  clientSecret: 'enc:db-client-secret',
  oidcWellKnownUrl: null,
  oidcProviderLabel: null,
  oidcSkipVerify: false,
  oidcPrompt: null,
  ...overrides,
});

beforeEach(() => {
  mockedFindUnique.mockReset();
  mockedEnv.mockReset();
  mockedEnv.mockReturnValue(undefined);
  invalidateProviderConfig();
});

describe('getProviderConfig — google', () => {
  it('returns enabled config from DB row when row enabled and creds present', async () => {
    mockedFindUnique.mockResolvedValueOnce(dbRow() as never);
    const cfg = await getProviderConfig('google');
    expect(cfg.enabled).toBe(true);
    expect(cfg.clientId).toBe('db-client-id');
    expect(cfg.clientSecret).toBe('db-client-secret');
  });

  it('returns enabled=false when DB row.enabled is false even with creds', async () => {
    mockedFindUnique.mockResolvedValueOnce(dbRow({ enabled: false }) as never);
    const cfg = await getProviderConfig('google');
    expect(cfg.enabled).toBe(false);
    expect(cfg.clientId).toBe('db-client-id');
  });

  it('returns enabled=false when DB row has empty creds', async () => {
    mockedFindUnique.mockResolvedValueOnce(
      dbRow({ clientId: null, clientSecret: null }) as never,
    );
    const cfg = await getProviderConfig('google');
    expect(cfg.enabled).toBe(false);
  });

  it('falls back to env when no DB row exists', async () => {
    mockedFindUnique.mockResolvedValueOnce(null);
    mockedEnv.mockImplementation((key: string) => {
      if (key === 'NEXT_PRIVATE_GOOGLE_CLIENT_ID') return 'env-id';
      if (key === 'NEXT_PRIVATE_GOOGLE_CLIENT_SECRET') return 'env-secret';
      return undefined;
    });
    const cfg = await getProviderConfig('google');
    expect(cfg.enabled).toBe(true);
    expect(cfg.clientId).toBe('env-id');
    expect(cfg.clientSecret).toBe('env-secret');
  });

  it('returns enabled=false from env fallback when env is unset', async () => {
    mockedFindUnique.mockResolvedValueOnce(null);
    mockedEnv.mockReturnValue(undefined);
    const cfg = await getProviderConfig('google');
    expect(cfg.enabled).toBe(false);
    expect(cfg.clientId).toBe('');
  });
});

describe('getProviderConfig — microsoft', () => {
  it('returns enabled config from DB row', async () => {
    mockedFindUnique.mockResolvedValueOnce(dbRow({ provider: 'microsoft' }) as never);
    const cfg = await getProviderConfig('microsoft');
    expect(cfg.enabled).toBe(true);
    expect(cfg.clientId).toBe('db-client-id');
  });

  it('falls back to env when no DB row', async () => {
    mockedFindUnique.mockResolvedValueOnce(null);
    mockedEnv.mockImplementation((key: string) => {
      if (key === 'NEXT_PRIVATE_MICROSOFT_CLIENT_ID') return 'ms-id';
      if (key === 'NEXT_PRIVATE_MICROSOFT_CLIENT_SECRET') return 'ms-secret';
      return undefined;
    });
    const cfg = await getProviderConfig('microsoft');
    expect(cfg.enabled).toBe(true);
    expect(cfg.clientId).toBe('ms-id');
  });
});

describe('getProviderConfig — oidc', () => {
  it('requires oidcWellKnownUrl for enabled=true (DB path)', async () => {
    mockedFindUnique.mockResolvedValueOnce(
      dbRow({ provider: 'oidc', oidcWellKnownUrl: '' }) as never,
    );
    const cfg = await getProviderConfig('oidc');
    expect(cfg.enabled).toBe(false);
  });

  it('returns enabled=true when DB row has wellKnown + creds', async () => {
    mockedFindUnique.mockResolvedValueOnce(
      dbRow({
        provider: 'oidc',
        oidcWellKnownUrl: 'https://idp.example.com/.well-known/openid-configuration',
        oidcProviderLabel: 'Example IDP',
        oidcSkipVerify: true,
        oidcPrompt: 'select_account',
      }) as never,
    );
    const cfg = await getProviderConfig('oidc');
    expect(cfg.enabled).toBe(true);
    expect(cfg.oidcWellKnownUrl).toBe('https://idp.example.com/.well-known/openid-configuration');
    expect(cfg.oidcProviderLabel).toBe('Example IDP');
    expect(cfg.oidcSkipVerify).toBe(true);
    expect(cfg.oidcPrompt).toBe('select_account');
  });

  it('defaults oidcProviderLabel to "OIDC" when null in DB row', async () => {
    mockedFindUnique.mockResolvedValueOnce(
      dbRow({
        provider: 'oidc',
        oidcWellKnownUrl: 'https://idp.example.com/.well-known/openid-configuration',
        oidcProviderLabel: null,
      }) as never,
    );
    const cfg = await getProviderConfig('oidc');
    expect(cfg.oidcProviderLabel).toBe('OIDC');
  });

  it('falls back to env (requires wellKnown there too)', async () => {
    mockedFindUnique.mockResolvedValueOnce(null);
    mockedEnv.mockImplementation((key: string) => {
      if (key === 'NEXT_PRIVATE_OIDC_CLIENT_ID') return 'oidc-id';
      if (key === 'NEXT_PRIVATE_OIDC_CLIENT_SECRET') return 'oidc-secret';
      if (key === 'NEXT_PRIVATE_OIDC_WELL_KNOWN') return 'https://idp.test/.well-known/openid-configuration';
      if (key === 'NEXT_PRIVATE_OIDC_PROVIDER_LABEL') return 'Env IDP';
      if (key === 'NEXT_PRIVATE_OIDC_SKIP_VERIFY') return 'true';
      return undefined;
    });
    const cfg = await getProviderConfig('oidc');
    expect(cfg.enabled).toBe(true);
    expect(cfg.oidcProviderLabel).toBe('Env IDP');
    expect(cfg.oidcSkipVerify).toBe(true);
  });

  it('env-fallback OIDC label defaults to "OIDC" when env not set', async () => {
    mockedFindUnique.mockResolvedValueOnce(null);
    mockedEnv.mockImplementation((key: string) => {
      if (key === 'NEXT_PRIVATE_OIDC_CLIENT_ID') return 'id';
      if (key === 'NEXT_PRIVATE_OIDC_CLIENT_SECRET') return 'sec';
      if (key === 'NEXT_PRIVATE_OIDC_WELL_KNOWN') return 'https://idp.test/.well-known';
      return undefined;
    });
    const cfg = await getProviderConfig('oidc');
    expect(cfg.oidcProviderLabel).toBe('OIDC');
  });
});

describe('DB-failure fallback (defensive)', () => {
  it('falls back to env when DB read throws', async () => {
    mockedFindUnique.mockRejectedValueOnce(new Error('Prisma connection failed'));
    mockedEnv.mockImplementation((key: string) => {
      if (key === 'NEXT_PRIVATE_GOOGLE_CLIENT_ID') return 'fallback-id';
      if (key === 'NEXT_PRIVATE_GOOGLE_CLIENT_SECRET') return 'fallback-secret';
      return undefined;
    });
    const cfg = await getProviderConfig('google');
    expect(cfg.enabled).toBe(true);
    expect(cfg.clientId).toBe('fallback-id');
  });
});

describe('encryptSsoString', () => {
  it('round-trips with mocked symmetric decrypt', async () => {
    // Encrypt a plain value, then read it back via the DB path.
    const encrypted = encryptSsoString('plain-secret');
    expect(encrypted).toBe('enc:plain-secret');

    mockedFindUnique.mockResolvedValueOnce(
      dbRow({ clientSecret: encrypted }) as never,
    );
    const cfg = await getProviderConfig('google');
    expect(cfg.clientSecret).toBe('plain-secret');
  });
});

describe('invalidateProviderConfig', () => {
  it('cache check is currently a no-op (cacheBuiltForAllProviders never set true)', async () => {
    // KNOWN LATENT BUG: setCache() does not flip cacheBuiltForAllProviders,
    // so the cache check at line 95 always skips. Document current behavior
    // here so a fix is detected as a behavior change. When the cache wiring
    // is fixed, update this test to assert the cached value is reused.
    mockedFindUnique.mockResolvedValueOnce(dbRow() as never);
    await getProviderConfig('google');
    mockedFindUnique.mockResolvedValueOnce(dbRow({ clientId: 'enc:second-call' }) as never);
    const cfg = await getProviderConfig('google');
    expect(cfg.clientId).toBe('second-call'); // would be 'db-client-id' if cache worked
  });

  it('clearing single provider does not throw', () => {
    expect(() => invalidateProviderConfig('google')).not.toThrow();
  });

  it('clearing all providers does not throw', () => {
    expect(() => invalidateProviderConfig()).not.toThrow();
  });
});
