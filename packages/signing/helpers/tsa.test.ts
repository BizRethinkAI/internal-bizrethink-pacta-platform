import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  getTimestampAuthority,
  resetTimestampAuthorities,
  seedTsaFromConfig,
} from './tsa';

// Capture URLs passed to the HttpTimestampAuthority constructor so we can
// assert the seed→cache→read chain works correctly.
const constructorCalls: string[] = [];
vi.mock('@libpdf/core', () => ({
  HttpTimestampAuthority: vi.fn().mockImplementation(function (this: { url: string }, url: string) {
    this.url = url;
    constructorCalls.push(url);
  }),
}));

// Mock the env-var getter so we control the env-fallback path.
let envValue: string | null = null;
vi.mock('@documenso/lib/constants/app', () => ({
  NEXT_PRIVATE_SIGNING_TIMESTAMP_AUTHORITY: vi.fn(() => envValue),
}));

beforeEach(() => {
  constructorCalls.length = 0;
  envValue = null;
  resetTimestampAuthorities();
});

afterEach(() => {
  resetTimestampAuthorities();
});

describe('seedTsaFromConfig — overlay 011b DB seed', () => {
  it('seeds the cache from a single-URL list', () => {
    seedTsaFromConfig(['https://tsa.example.com']);
    const result = getTimestampAuthority() as { url: string } | null;
    expect(result).not.toBeNull();
    expect(result!.url).toBe('https://tsa.example.com');
  });

  it('seeds multiple URLs and getTimestampAuthority picks one at random', () => {
    seedTsaFromConfig(['https://tsa1.example.com', 'https://tsa2.example.com']);
    const result = getTimestampAuthority() as { url: string };
    expect(['https://tsa1.example.com', 'https://tsa2.example.com']).toContain(result.url);
  });

  it('ignores empty array (no seed)', () => {
    seedTsaFromConfig([]);
    // Cache not seeded; next get triggers env fallback (env is null → returns null)
    expect(getTimestampAuthority()).toBeNull();
  });

  it('ignores null input (no seed)', () => {
    seedTsaFromConfig(null);
    expect(getTimestampAuthority()).toBeNull();
  });

  it('ignores undefined input', () => {
    seedTsaFromConfig(undefined);
    expect(getTimestampAuthority()).toBeNull();
  });

  it('subsequent seed call REPLACES the cache (not appends)', () => {
    seedTsaFromConfig(['https://first.example.com']);
    seedTsaFromConfig(['https://second.example.com']);
    const result = getTimestampAuthority() as { url: string };
    expect(result.url).toBe('https://second.example.com');
  });
});

describe('env fallback (no seed called)', () => {
  it('returns null when env is empty AND no seed was made', () => {
    envValue = null;
    expect(getTimestampAuthority()).toBeNull();
  });

  it('builds authorities from env CSV when no seed', () => {
    envValue = 'https://env-tsa.example.com';
    const result = getTimestampAuthority() as { url: string };
    expect(result.url).toBe('https://env-tsa.example.com');
  });

  it('trims whitespace + filters empty entries from env CSV', () => {
    envValue = '  https://a.example.com  , , https://b.example.com  ,';
    // First call probes and caches the env list; subsequent calls return one of them
    getTimestampAuthority();
    expect(constructorCalls).toEqual(['https://a.example.com', 'https://b.example.com']);
  });

  it('seed BEFORE env probe wins over env', () => {
    envValue = 'https://env-tsa.example.com';
    seedTsaFromConfig(['https://db-tsa.example.com']);
    const result = getTimestampAuthority() as { url: string };
    expect(result.url).toBe('https://db-tsa.example.com');
  });

  it('env probe runs only once (cache flag set)', () => {
    envValue = 'https://once.example.com';
    getTimestampAuthority();
    getTimestampAuthority();
    getTimestampAuthority();
    expect(constructorCalls).toEqual(['https://once.example.com']);
  });
});

describe('resetTimestampAuthorities', () => {
  it('clears seeded cache so next read re-evaluates from env', () => {
    seedTsaFromConfig(['https://seeded.example.com']);
    expect((getTimestampAuthority() as { url: string }).url).toBe('https://seeded.example.com');

    resetTimestampAuthorities();
    envValue = 'https://env-after-reset.example.com';
    const result = getTimestampAuthority() as { url: string };
    expect(result.url).toBe('https://env-after-reset.example.com');
  });

  it('clears env-probed cache so next read re-probes env', () => {
    envValue = 'https://first.example.com';
    getTimestampAuthority(); // probe

    resetTimestampAuthorities();
    envValue = 'https://second.example.com';
    expect((getTimestampAuthority() as { url: string }).url).toBe('https://second.example.com');
  });
});
