import { beforeEach, describe, expect, it, vi } from 'vitest';

import { upsertSiteSetting } from './upsert-site-setting';

const mockedInvalidate = vi.fn();

vi.mock('@documenso/prisma', () => ({
  prisma: {
    siteSettings: {
      upsert: vi.fn().mockResolvedValue({}),
    },
  },
}));

vi.mock('@bizrethink/customizations/server-only/security-headers-config', () => ({
  invalidateSecurityHeadersConfig: mockedInvalidate,
}));

import { prisma } from '@documenso/prisma';
const mockedUpsert = vi.mocked(prisma.siteSettings.upsert);

beforeEach(() => {
  mockedInvalidate.mockClear();
  mockedUpsert.mockClear();
  mockedUpsert.mockResolvedValue({} as never);
});

describe('upsertSiteSetting', () => {
  it('upserts a site-setting row with create + update shapes', async () => {
    await upsertSiteSetting({
      id: 'site.banner' as never,
      enabled: true,
      data: { content: 'hello' } as never,
      userId: 42,
    });

    expect(mockedUpsert).toHaveBeenCalledOnce();
    const args = mockedUpsert.mock.calls[0][0];
    expect(args.where).toEqual({ id: 'site.banner' });
    expect(args.create.id).toBe('site.banner');
    expect(args.create.lastModifiedByUserId).toBe(42);
    expect(args.update.lastModifiedByUserId).toBe(42);
  });

  it('does NOT invalidate security-headers cache for unrelated site-setting ids', async () => {
    await upsertSiteSetting({
      id: 'site.banner' as never,
      enabled: true,
      data: { content: '' } as never,
    });
    expect(mockedInvalidate).not.toHaveBeenCalled();
  });

  it('invalidates security-headers cache when id === site.security-headers (overlay 032)', async () => {
    await upsertSiteSetting({
      id: 'site.security-headers' as never,
      enabled: true,
      data: {} as never,
    });
    expect(mockedInvalidate).toHaveBeenCalledOnce();
  });

  it('returns the upsert result', async () => {
    mockedUpsert.mockResolvedValueOnce({ id: 'site.banner' } as never);
    const result = await upsertSiteSetting({
      id: 'site.banner' as never,
      enabled: false,
      data: {} as never,
    });
    expect(result).toEqual({ id: 'site.banner' });
  });
});
