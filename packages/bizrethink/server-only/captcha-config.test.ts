import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { prisma } from '@documenso/prisma';

import { getTurnstileSecretKey, getTurnstileSiteKey } from './captcha-config';

vi.mock('@documenso/prisma', () => ({
  prisma: {
    siteSettings: {
      findFirst: vi.fn(),
    },
  },
}));

const mockedFindFirst = vi.mocked(prisma.siteSettings.findFirst);

const dbRow = (data: object, enabled = true) => ({
  id: 'site.captcha',
  enabled,
  data,
});

const ORIGINAL_ENV = process.env;

beforeEach(() => {
  mockedFindFirst.mockReset();
  process.env = { ...ORIGINAL_ENV };
  delete process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  delete process.env.NEXT_PRIVATE_TURNSTILE_SECRET_KEY;
});

afterEach(() => {
  process.env = ORIGINAL_ENV;
});

describe('getTurnstileSiteKey', () => {
  it('returns DB siteKey when row is enabled and siteKey is set', async () => {
    mockedFindFirst.mockResolvedValueOnce(
      dbRow({ siteKey: 'db-site-key', secretKey: 'db-secret' }) as never,
    );
    expect(await getTurnstileSiteKey()).toBe('db-site-key');
  });

  it('falls back to env when DB siteKey is empty string', async () => {
    mockedFindFirst.mockResolvedValueOnce(
      dbRow({ siteKey: '', secretKey: 'db-secret' }) as never,
    );
    process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY = 'env-site-key';
    expect(await getTurnstileSiteKey()).toBe('env-site-key');
  });

  it('falls back to env when no DB row', async () => {
    mockedFindFirst.mockResolvedValueOnce(null);
    process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY = 'env-site-key';
    expect(await getTurnstileSiteKey()).toBe('env-site-key');
  });

  it('falls back to env when DB row is disabled', async () => {
    mockedFindFirst.mockResolvedValueOnce(
      dbRow({ siteKey: 'db-key', secretKey: 'db-secret' }, false) as never,
    );
    process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY = 'env-site-key';
    expect(await getTurnstileSiteKey()).toBe('env-site-key');
  });

  it('returns empty string when neither DB nor env have a value', async () => {
    mockedFindFirst.mockResolvedValueOnce(null);
    expect(await getTurnstileSiteKey()).toBe('');
  });

  it('falls back to env when DB read throws (defensive)', async () => {
    mockedFindFirst.mockRejectedValueOnce(new Error('Prisma connection failed'));
    process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY = 'fallback-key';
    expect(await getTurnstileSiteKey()).toBe('fallback-key');
  });
});

describe('getTurnstileSecretKey', () => {
  it('returns DB secretKey when row is enabled and secretKey is set', async () => {
    mockedFindFirst.mockResolvedValueOnce(
      dbRow({ siteKey: 'db-site', secretKey: 'db-secret-key' }) as never,
    );
    expect(await getTurnstileSecretKey()).toBe('db-secret-key');
  });

  it('falls back to env when DB secretKey is empty string', async () => {
    mockedFindFirst.mockResolvedValueOnce(
      dbRow({ siteKey: 'db-site', secretKey: '' }) as never,
    );
    process.env.NEXT_PRIVATE_TURNSTILE_SECRET_KEY = 'env-secret-key';
    expect(await getTurnstileSecretKey()).toBe('env-secret-key');
  });

  it('falls back to env when no DB row', async () => {
    mockedFindFirst.mockResolvedValueOnce(null);
    process.env.NEXT_PRIVATE_TURNSTILE_SECRET_KEY = 'env-secret-key';
    expect(await getTurnstileSecretKey()).toBe('env-secret-key');
  });

  it('returns empty string when neither DB nor env have a value', async () => {
    mockedFindFirst.mockResolvedValueOnce(null);
    expect(await getTurnstileSecretKey()).toBe('');
  });

  it('falls back to env when DB read throws (defensive)', async () => {
    mockedFindFirst.mockRejectedValueOnce(new Error('Prisma connection failed'));
    process.env.NEXT_PRIVATE_TURNSTILE_SECRET_KEY = 'fallback-secret';
    expect(await getTurnstileSecretKey()).toBe('fallback-secret');
  });
});
