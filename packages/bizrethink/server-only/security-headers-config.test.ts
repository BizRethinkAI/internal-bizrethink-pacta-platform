import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { prisma } from '@documenso/prisma';

import {
  buildHstsValue,
  getSecurityHeadersConfig,
  invalidateSecurityHeadersConfig,
} from './security-headers-config';

vi.mock('@documenso/prisma', () => ({
  prisma: {
    siteSettings: {
      findFirst: vi.fn(),
    },
  },
}));

const mockedFindFirst = vi.mocked(prisma.siteSettings.findFirst);

const DEFAULT_HSTS = {
  enabled: false,
  maxAgeSeconds: 31536000,
  includeSubdomains: false,
  preload: false,
};
const DEFAULT_PERMISSIONS_POLICY = {
  enabled: true,
  value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
};

const dbRow = (data: object, enabled = true) => ({
  id: 'site.security-headers',
  enabled,
  data,
});

beforeEach(() => {
  mockedFindFirst.mockReset();
  invalidateSecurityHeadersConfig();
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-05-25T00:00:00Z'));
});

afterEach(() => {
  vi.useRealTimers();
});

describe('getSecurityHeadersConfig', () => {
  it('returns parsed config when DB row is enabled with valid data', async () => {
    mockedFindFirst.mockResolvedValueOnce(
      dbRow({
        hsts: {
          enabled: true,
          maxAgeSeconds: 63072000,
          includeSubdomains: true,
          preload: true,
        },
        permissionsPolicy: { enabled: true, value: 'camera=()' },
      }) as never,
    );
    const cfg = await getSecurityHeadersConfig();
    expect(cfg.hsts.enabled).toBe(true);
    expect(cfg.hsts.maxAgeSeconds).toBe(63072000);
    expect(cfg.hsts.includeSubdomains).toBe(true);
    expect(cfg.permissionsPolicy.value).toBe('camera=()');
  });

  it('returns DEFAULTS when DB row exists but is disabled', async () => {
    mockedFindFirst.mockResolvedValueOnce(
      dbRow({ hsts: DEFAULT_HSTS, permissionsPolicy: DEFAULT_PERMISSIONS_POLICY }, false) as never,
    );
    const cfg = await getSecurityHeadersConfig();
    expect(cfg.hsts).toEqual(DEFAULT_HSTS);
    expect(cfg.permissionsPolicy).toEqual(DEFAULT_PERMISSIONS_POLICY);
  });

  it('returns DEFAULTS when no DB row exists', async () => {
    mockedFindFirst.mockResolvedValueOnce(null);
    const cfg = await getSecurityHeadersConfig();
    expect(cfg.hsts).toEqual(DEFAULT_HSTS);
    expect(cfg.permissionsPolicy).toEqual(DEFAULT_PERMISSIONS_POLICY);
  });

  it('returns DEFAULTS when DB row data fails schema validation', async () => {
    mockedFindFirst.mockResolvedValueOnce(
      dbRow({ hsts: { maxAgeSeconds: 'not-a-number' } }) as never,
    );
    const cfg = await getSecurityHeadersConfig();
    expect(cfg.hsts).toEqual(DEFAULT_HSTS);
  });

  it('returns DEFAULTS when DB read throws (already defensive)', async () => {
    mockedFindFirst.mockRejectedValueOnce(new Error('Prisma connection failed'));
    const cfg = await getSecurityHeadersConfig();
    expect(cfg.hsts).toEqual(DEFAULT_HSTS);
    expect(cfg.permissionsPolicy).toEqual(DEFAULT_PERMISSIONS_POLICY);
  });

  it('caches the config for 60s', async () => {
    mockedFindFirst.mockResolvedValueOnce(
      dbRow({
        hsts: { enabled: true, maxAgeSeconds: 100, includeSubdomains: false, preload: false },
        permissionsPolicy: { enabled: true, value: 'first' },
      }) as never,
    );
    await getSecurityHeadersConfig();

    // Advance just under 60s — should still hit cache.
    vi.advanceTimersByTime(59_000);
    mockedFindFirst.mockResolvedValueOnce(
      dbRow({
        hsts: DEFAULT_HSTS,
        permissionsPolicy: { enabled: true, value: 'second' },
      }) as never,
    );
    const cfg = await getSecurityHeadersConfig();
    expect(cfg.permissionsPolicy.value).toBe('first');
    expect(mockedFindFirst).toHaveBeenCalledTimes(1);
  });

  it('re-fetches after cache TTL expires (60s+)', async () => {
    mockedFindFirst.mockResolvedValueOnce(
      dbRow({
        hsts: DEFAULT_HSTS,
        permissionsPolicy: { enabled: true, value: 'first' },
      }) as never,
    );
    await getSecurityHeadersConfig();

    vi.advanceTimersByTime(61_000);
    mockedFindFirst.mockResolvedValueOnce(
      dbRow({
        hsts: DEFAULT_HSTS,
        permissionsPolicy: { enabled: true, value: 'second' },
      }) as never,
    );
    const cfg = await getSecurityHeadersConfig();
    expect(cfg.permissionsPolicy.value).toBe('second');
    expect(mockedFindFirst).toHaveBeenCalledTimes(2);
  });
});

describe('invalidateSecurityHeadersConfig', () => {
  it('forces a re-fetch on next call after invalidation', async () => {
    mockedFindFirst.mockResolvedValueOnce(
      dbRow({
        hsts: DEFAULT_HSTS,
        permissionsPolicy: { enabled: true, value: 'first' },
      }) as never,
    );
    await getSecurityHeadersConfig();

    invalidateSecurityHeadersConfig();

    mockedFindFirst.mockResolvedValueOnce(
      dbRow({
        hsts: DEFAULT_HSTS,
        permissionsPolicy: { enabled: true, value: 'second' },
      }) as never,
    );
    const cfg = await getSecurityHeadersConfig();
    expect(cfg.permissionsPolicy.value).toBe('second');
    expect(mockedFindFirst).toHaveBeenCalledTimes(2);
  });
});

describe('buildHstsValue', () => {
  it('emits just max-age when no flags are set', () => {
    expect(buildHstsValue({ enabled: true, maxAgeSeconds: 31536000, includeSubdomains: false, preload: false })).toBe(
      'max-age=31536000',
    );
  });

  it('emits includeSubDomains when flag is set', () => {
    expect(buildHstsValue({ enabled: true, maxAgeSeconds: 100, includeSubdomains: true, preload: false })).toBe(
      'max-age=100; includeSubDomains',
    );
  });

  it('emits preload when flag is set', () => {
    expect(buildHstsValue({ enabled: true, maxAgeSeconds: 100, includeSubdomains: false, preload: true })).toBe(
      'max-age=100; preload',
    );
  });

  it('emits both flags when both are set', () => {
    expect(buildHstsValue({ enabled: true, maxAgeSeconds: 31536000, includeSubdomains: true, preload: true })).toBe(
      'max-age=31536000; includeSubDomains; preload',
    );
  });
});
