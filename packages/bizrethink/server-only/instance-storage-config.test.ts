import { prisma } from '@documenso/prisma';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { encryptStorageString, getInstanceStorageConfig, invalidateStorageConfig } from './instance-storage-config';

vi.mock('@documenso/prisma', () => ({
  prisma: {
    bizrethinkInstanceStorageConfig: {
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

const mockedFindUnique = vi.mocked(prisma.bizrethinkInstanceStorageConfig.findUnique);

const dbRow = (overrides: Record<string, unknown> = {}) => ({
  id: 'singleton',
  transport: 's3',
  s3Endpoint: 'https://s3.example.com',
  s3ForcePathStyle: false,
  s3Region: 'us-east-1',
  s3Bucket: 'pacta-docs',
  s3AccessKeyId: 'enc:AKIAEXAMPLE',
  s3SecretAccessKey: 'enc:secret-value',
  s3DistributionDomain: 'cdn.example.com',
  s3DistributionKeyId: 'enc:KEYID',
  s3DistributionKeyPem: 'enc:-----BEGIN PRIVATE KEY-----',
  ...overrides,
});

beforeEach(() => {
  mockedFindUnique.mockReset();
  invalidateStorageConfig();
});

describe('getInstanceStorageConfig', () => {
  it('returns null when no DB row exists', async () => {
    mockedFindUnique.mockResolvedValueOnce(null);
    expect(await getInstanceStorageConfig()).toBeNull();
  });

  it('parses and decrypts a fully-populated DB row', async () => {
    mockedFindUnique.mockResolvedValueOnce(dbRow() as never);
    const cfg = await getInstanceStorageConfig();
    expect(cfg).not.toBeNull();
    expect(cfg!.transport).toBe('s3');
    expect(cfg!.s3Bucket).toBe('pacta-docs');
    expect(cfg!.s3AccessKeyId).toBe('AKIAEXAMPLE'); // decrypted
    expect(cfg!.s3SecretAccessKey).toBe('secret-value'); // decrypted
    expect(cfg!.s3DistributionKeyId).toBe('KEYID'); // decrypted
  });

  it('defaults transport to "database" when DB row.transport is not "s3"', async () => {
    mockedFindUnique.mockResolvedValueOnce(dbRow({ transport: 'database' }) as never);
    const cfg = await getInstanceStorageConfig();
    expect(cfg!.transport).toBe('database');
  });

  it('handles null encrypted fields without throwing', async () => {
    mockedFindUnique.mockResolvedValueOnce(
      dbRow({
        s3AccessKeyId: null,
        s3SecretAccessKey: null,
        s3DistributionKeyId: null,
        s3DistributionKeyPem: null,
      }) as never,
    );
    const cfg = await getInstanceStorageConfig();
    expect(cfg!.s3AccessKeyId).toBeNull();
    expect(cfg!.s3SecretAccessKey).toBeNull();
    expect(cfg!.s3DistributionKeyId).toBeNull();
    expect(cfg!.s3DistributionKeyPem).toBeNull();
  });

  it('caches non-null result (second call does not hit DB)', async () => {
    mockedFindUnique.mockResolvedValueOnce(dbRow() as never);
    await getInstanceStorageConfig();
    await getInstanceStorageConfig();
    expect(mockedFindUnique).toHaveBeenCalledTimes(1);
  });

  it('caches null result (second call does not hit DB)', async () => {
    mockedFindUnique.mockResolvedValueOnce(null);
    await getInstanceStorageConfig();
    await getInstanceStorageConfig();
    expect(mockedFindUnique).toHaveBeenCalledTimes(1);
  });
});

describe('DB-failure fallback (defensive)', () => {
  it('returns null when DB read throws (caller falls back to env-based config)', async () => {
    mockedFindUnique.mockRejectedValueOnce(new Error('Prisma connection failed'));
    expect(await getInstanceStorageConfig()).toBeNull();
  });
});

describe('invalidateStorageConfig', () => {
  it('clears cache so next call re-fetches', async () => {
    mockedFindUnique.mockResolvedValueOnce(dbRow() as never);
    await getInstanceStorageConfig();

    invalidateStorageConfig();

    mockedFindUnique.mockResolvedValueOnce(dbRow({ s3Bucket: 'changed-bucket' }) as never);
    const cfg = await getInstanceStorageConfig();
    expect(cfg!.s3Bucket).toBe('changed-bucket');
    expect(mockedFindUnique).toHaveBeenCalledTimes(2);
  });

  it('clears null-probed cache too', async () => {
    mockedFindUnique.mockResolvedValueOnce(null);
    await getInstanceStorageConfig();

    invalidateStorageConfig();

    mockedFindUnique.mockResolvedValueOnce(dbRow() as never);
    const cfg = await getInstanceStorageConfig();
    expect(cfg).not.toBeNull();
    expect(mockedFindUnique).toHaveBeenCalledTimes(2);
  });
});

describe('encryptStorageString', () => {
  it('wraps symmetricEncrypt with the configured key', () => {
    expect(encryptStorageString('plain-text')).toBe('enc:plain-text');
  });
});
