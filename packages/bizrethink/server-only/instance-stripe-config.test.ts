import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { prisma } from '@documenso/prisma';

import {
  encryptStripeCredential,
  getInstanceStripeConfig,
  invalidateStripeConfig,
  isBillingEnabled,
} from './instance-stripe-config';

vi.mock('@documenso/prisma', () => ({
  prisma: {
    bizrethinkInstanceStripeConfig: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock('@documenso/lib/constants/crypto', () => ({
  DOCUMENSO_ENCRYPTION_KEY: 'test-key',
}));

vi.mock('@documenso/lib/universal/crypto', () => ({
  symmetricEncrypt: vi.fn(({ data }: { data: string }) => `enc:${data}`),
  symmetricDecrypt: vi.fn(({ data }: { data: string }) =>
    new TextEncoder().encode(data.startsWith('enc:') ? data.slice(4) : data),
  ),
}));

const mockedFindUnique = vi.mocked(prisma.bizrethinkInstanceStripeConfig.findUnique);

const dbRow = (overrides: Record<string, unknown> = {}) => ({
  id: 'singleton',
  mode: 'sandbox',
  billingEnabled: true,
  sandboxApiKey: 'enc:sk_test_sandbox',
  sandboxWebhookSecret: 'enc:whsec_sandbox',
  sandboxPublishableKey: 'pk_test_sandbox',
  liveApiKey: 'enc:sk_live_real',
  liveWebhookSecret: 'enc:whsec_live',
  livePublishableKey: 'pk_live_real',
  statementDescriptor: 'PACTA*BIZRETHINK',
  ...overrides,
});

const ORIGINAL_ENV = process.env;

beforeEach(() => {
  mockedFindUnique.mockReset();
  invalidateStripeConfig();
  process.env = { ...ORIGINAL_ENV };
  delete process.env.NEXT_PUBLIC_FEATURE_BILLING_ENABLED;
});

afterEach(() => {
  process.env = ORIGINAL_ENV;
});

describe('getInstanceStripeConfig', () => {
  it('returns null when no DB row exists', async () => {
    mockedFindUnique.mockResolvedValueOnce(null);
    expect(await getInstanceStripeConfig()).toBeNull();
  });

  it('returns sandbox credentials when row.mode is sandbox', async () => {
    mockedFindUnique.mockResolvedValueOnce(dbRow({ mode: 'sandbox' }) as never);
    const cfg = await getInstanceStripeConfig();
    expect(cfg!.mode).toBe('sandbox');
    expect(cfg!.apiKey).toBe('sk_test_sandbox');
    expect(cfg!.webhookSecret).toBe('whsec_sandbox');
    expect(cfg!.publishableKey).toBe('pk_test_sandbox');
  });

  it('returns live credentials when row.mode is live', async () => {
    mockedFindUnique.mockResolvedValueOnce(dbRow({ mode: 'live' }) as never);
    const cfg = await getInstanceStripeConfig();
    expect(cfg!.mode).toBe('live');
    expect(cfg!.apiKey).toBe('sk_live_real');
    expect(cfg!.webhookSecret).toBe('whsec_live');
    expect(cfg!.publishableKey).toBe('pk_live_real');
  });

  it('defaults mode to sandbox when DB value is not "live"', async () => {
    mockedFindUnique.mockResolvedValueOnce(dbRow({ mode: 'something-unexpected' }) as never);
    const cfg = await getInstanceStripeConfig();
    expect(cfg!.mode).toBe('sandbox');
    expect(cfg!.apiKey).toBe('sk_test_sandbox');
  });

  it('passes statementDescriptor through unchanged', async () => {
    mockedFindUnique.mockResolvedValueOnce(dbRow() as never);
    const cfg = await getInstanceStripeConfig();
    expect(cfg!.statementDescriptor).toBe('PACTA*BIZRETHINK');
  });

  it('handles null credential fields without throwing', async () => {
    mockedFindUnique.mockResolvedValueOnce(
      dbRow({
        sandboxApiKey: null,
        sandboxWebhookSecret: null,
        sandboxPublishableKey: null,
      }) as never,
    );
    const cfg = await getInstanceStripeConfig();
    expect(cfg!.apiKey).toBeNull();
    expect(cfg!.webhookSecret).toBeNull();
    expect(cfg!.publishableKey).toBeNull();
  });

  it('caches non-null result', async () => {
    mockedFindUnique.mockResolvedValueOnce(dbRow() as never);
    await getInstanceStripeConfig();
    await getInstanceStripeConfig();
    expect(mockedFindUnique).toHaveBeenCalledTimes(1);
  });

  it('caches null result', async () => {
    mockedFindUnique.mockResolvedValueOnce(null);
    await getInstanceStripeConfig();
    await getInstanceStripeConfig();
    expect(mockedFindUnique).toHaveBeenCalledTimes(1);
  });
});

describe('DB-failure fallback (defensive)', () => {
  it('returns null when DB read throws', async () => {
    mockedFindUnique.mockRejectedValueOnce(new Error('Prisma connection failed'));
    expect(await getInstanceStripeConfig()).toBeNull();
  });
});

describe('invalidateStripeConfig', () => {
  it('clears non-null cache so next call re-fetches', async () => {
    mockedFindUnique.mockResolvedValueOnce(dbRow() as never);
    await getInstanceStripeConfig();
    invalidateStripeConfig();
    mockedFindUnique.mockResolvedValueOnce(dbRow({ statementDescriptor: 'CHANGED' }) as never);
    const cfg = await getInstanceStripeConfig();
    expect(cfg!.statementDescriptor).toBe('CHANGED');
  });

  it('clears null-probed cache', async () => {
    mockedFindUnique.mockResolvedValueOnce(null);
    await getInstanceStripeConfig();
    invalidateStripeConfig();
    mockedFindUnique.mockResolvedValueOnce(dbRow() as never);
    const cfg = await getInstanceStripeConfig();
    expect(cfg).not.toBeNull();
  });
});

describe('isBillingEnabled', () => {
  it('returns true when DB row.billingEnabled is true', async () => {
    mockedFindUnique.mockResolvedValueOnce({ billingEnabled: true } as never);
    expect(await isBillingEnabled()).toBe(true);
  });

  it('returns false when DB row.billingEnabled is false', async () => {
    mockedFindUnique.mockResolvedValueOnce({ billingEnabled: false } as never);
    expect(await isBillingEnabled()).toBe(false);
  });

  it('falls back to env when no DB row', async () => {
    mockedFindUnique.mockResolvedValueOnce(null);
    process.env.NEXT_PUBLIC_FEATURE_BILLING_ENABLED = 'true';
    expect(await isBillingEnabled()).toBe(true);
  });

  it('falls back to env (false) when no DB row and env unset', async () => {
    mockedFindUnique.mockResolvedValueOnce(null);
    expect(await isBillingEnabled()).toBe(false);
  });

  it('uses cached full config when available (skips DB)', async () => {
    mockedFindUnique.mockResolvedValueOnce(dbRow({ billingEnabled: true }) as never);
    await getInstanceStripeConfig(); // populates cache
    mockedFindUnique.mockClear();
    expect(await isBillingEnabled()).toBe(true);
    expect(mockedFindUnique).not.toHaveBeenCalled();
  });

  it('uses cachedNullRowProbed to skip DB when previously null', async () => {
    mockedFindUnique.mockResolvedValueOnce(null);
    await getInstanceStripeConfig(); // sets null-probed
    mockedFindUnique.mockClear();
    process.env.NEXT_PUBLIC_FEATURE_BILLING_ENABLED = 'true';
    expect(await isBillingEnabled()).toBe(true);
    expect(mockedFindUnique).not.toHaveBeenCalled();
  });

  it('falls back to env when DB read throws (defensive)', async () => {
    mockedFindUnique.mockRejectedValueOnce(new Error('Prisma connection failed'));
    process.env.NEXT_PUBLIC_FEATURE_BILLING_ENABLED = 'true';
    expect(await isBillingEnabled()).toBe(true);
  });
});

describe('encryptStripeCredential', () => {
  it('wraps symmetricEncrypt', () => {
    expect(encryptStripeCredential('sk_live_secret')).toBe('enc:sk_live_secret');
  });
});
