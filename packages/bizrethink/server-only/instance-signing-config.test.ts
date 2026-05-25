import { beforeEach, describe, expect, it, vi } from 'vitest';

import { prisma } from '@documenso/prisma';

import {
  encryptBase64String,
  encryptUtf8String,
  getInstanceSigningConfig,
  invalidateSigningConfig,
} from './instance-signing-config';

vi.mock('@documenso/prisma', () => ({
  prisma: {
    bizrethinkInstanceSigningConfig: {
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

const mockedFindUnique = vi.mocked(prisma.bizrethinkInstanceSigningConfig.findUnique);

// Use 'YWJj' (base64 for 'abc') so the base64 decryptors can round-trip.
const dbRow = (overrides: Record<string, unknown> = {}) => ({
  id: 'singleton',
  transport: 'local',
  localCertContents: 'enc:YWJj',
  localPassphrase: 'enc:my-passphrase',
  gcloudKeyPath: null,
  gcloudCredentials: null,
  gcloudCertChain: null,
  tsaUrls: 'https://tsa.example.com, https://tsa2.example.com ,',
  signingContactInfo: 'compliance@bizrethink.ai',
  ...overrides,
});

beforeEach(() => {
  mockedFindUnique.mockReset();
  invalidateSigningConfig();
});

describe('getInstanceSigningConfig', () => {
  it('returns null when no DB row (env-fallback path)', async () => {
    mockedFindUnique.mockResolvedValueOnce(null);
    expect(await getInstanceSigningConfig()).toBeNull();
  });

  it('parses local-transport DB row with decrypted fields', async () => {
    mockedFindUnique.mockResolvedValueOnce(dbRow() as never);
    const cfg = await getInstanceSigningConfig();
    expect(cfg).not.toBeNull();
    expect(cfg!.transport).toBe('local');
    expect(cfg!.localPassphrase).toBe('my-passphrase');
    expect(cfg!.localCertContents).toBeInstanceOf(Uint8Array);
    // 'abc' base64-decoded is bytes [97, 98, 99]
    expect(Array.from(cfg!.localCertContents!)).toEqual([97, 98, 99]);
    expect(cfg!.signingContactInfo).toBe('compliance@bizrethink.ai');
  });

  it('parses tsaUrls CSV with whitespace trim and empty-entry filter', async () => {
    mockedFindUnique.mockResolvedValueOnce(dbRow() as never);
    const cfg = await getInstanceSigningConfig();
    expect(cfg!.tsaUrls).toEqual(['https://tsa.example.com', 'https://tsa2.example.com']);
  });

  it('returns empty tsaUrls array when DB field is null', async () => {
    mockedFindUnique.mockResolvedValueOnce(dbRow({ tsaUrls: null }) as never);
    const cfg = await getInstanceSigningConfig();
    expect(cfg!.tsaUrls).toEqual([]);
  });

  it('defaults transport to "local" when DB transport is not "gcloud-hsm"', async () => {
    mockedFindUnique.mockResolvedValueOnce(dbRow({ transport: 'unknown-future-type' }) as never);
    const cfg = await getInstanceSigningConfig();
    expect(cfg!.transport).toBe('local');
  });

  it('recognises "gcloud-hsm" transport', async () => {
    mockedFindUnique.mockResolvedValueOnce(
      dbRow({
        transport: 'gcloud-hsm',
        gcloudKeyPath: 'projects/p/locations/l/keyRings/r/cryptoKeys/k/cryptoKeyVersions/1',
        gcloudCredentials: 'enc:eyJrZXkiOiJ2In0=', // base64 of {"key":"v"}
        gcloudCertChain: 'enc:LS0tLS1CRUdJTi0tLS0t', // base64 of "-----BEGIN-----"
      }) as never,
    );
    const cfg = await getInstanceSigningConfig();
    expect(cfg!.transport).toBe('gcloud-hsm');
    expect(cfg!.gcloudKeyPath).toContain('projects/p/');
    expect(cfg!.gcloudCredentialsJson).toBe('{"key":"v"}');
    expect(cfg!.gcloudCertChainPem).toBe('-----BEGIN-----');
  });

  it('handles null encrypted fields without throwing', async () => {
    mockedFindUnique.mockResolvedValueOnce(
      dbRow({
        localCertContents: null,
        localPassphrase: null,
      }) as never,
    );
    const cfg = await getInstanceSigningConfig();
    expect(cfg!.localCertContents).toBeNull();
    expect(cfg!.localPassphrase).toBeNull();
  });

  it('caches non-null result', async () => {
    mockedFindUnique.mockResolvedValueOnce(dbRow() as never);
    await getInstanceSigningConfig();
    await getInstanceSigningConfig();
    expect(mockedFindUnique).toHaveBeenCalledTimes(1);
  });

  it('caches null result (no DB row)', async () => {
    mockedFindUnique.mockResolvedValueOnce(null);
    await getInstanceSigningConfig();
    await getInstanceSigningConfig();
    expect(mockedFindUnique).toHaveBeenCalledTimes(1);
  });
});

describe('DB-failure fallback (defensive)', () => {
  it('returns null when DB read throws (caller falls back to env config)', async () => {
    mockedFindUnique.mockRejectedValueOnce(new Error('Prisma connection failed'));
    expect(await getInstanceSigningConfig()).toBeNull();
  });
});

describe('invalidateSigningConfig', () => {
  it('clears non-null cache and forces re-fetch', async () => {
    mockedFindUnique.mockResolvedValueOnce(dbRow() as never);
    await getInstanceSigningConfig();

    invalidateSigningConfig();

    mockedFindUnique.mockResolvedValueOnce(
      dbRow({ signingContactInfo: 'new-contact@bizrethink.ai' }) as never,
    );
    const cfg = await getInstanceSigningConfig();
    expect(cfg!.signingContactInfo).toBe('new-contact@bizrethink.ai');
    expect(mockedFindUnique).toHaveBeenCalledTimes(2);
  });

  it('clears null-probed cache', async () => {
    mockedFindUnique.mockResolvedValueOnce(null);
    await getInstanceSigningConfig();

    invalidateSigningConfig();

    mockedFindUnique.mockResolvedValueOnce(dbRow() as never);
    const cfg = await getInstanceSigningConfig();
    expect(cfg).not.toBeNull();
    expect(mockedFindUnique).toHaveBeenCalledTimes(2);
  });
});

describe('encryptUtf8String', () => {
  it('wraps symmetricEncrypt for plaintext strings', () => {
    expect(encryptUtf8String('passphrase')).toBe('enc:passphrase');
  });
});

describe('encryptBase64String', () => {
  it('wraps symmetricEncrypt for already-base64-encoded payloads', () => {
    expect(encryptBase64String('YWJj')).toBe('enc:YWJj');
  });
});
