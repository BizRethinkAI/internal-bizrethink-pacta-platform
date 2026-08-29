import { env } from '@documenso/lib/utils/env';

import { prisma } from '@documenso/prisma';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getAllowedSignupDomains, isInviteRequiredForSignup, isSignupDisabled } from './signup-config';

vi.mock('@documenso/prisma', () => ({
  prisma: {
    siteSettings: {
      findFirst: vi.fn(),
    },
  },
}));

vi.mock('@documenso/lib/utils/env', () => ({
  env: vi.fn(),
}));

const mockedFindFirst = vi.mocked(prisma.siteSettings.findFirst);
const mockedEnv = vi.mocked(env);

const dbRow = (data: object, enabled = true) => ({
  id: 'site.signup',
  enabled,
  data,
});

beforeEach(() => {
  mockedFindFirst.mockReset();
  mockedEnv.mockReset();
  mockedEnv.mockReturnValue(undefined);
});

describe('isSignupDisabled', () => {
  it('returns true when DB row is enabled and signupDisabled=true', async () => {
    mockedFindFirst.mockResolvedValueOnce(
      dbRow({ signupDisabled: true, allowedDomains: [], requireInviteWhenDomainGated: false }) as never,
    );
    expect(await isSignupDisabled()).toBe(true);
  });

  it('returns false when DB row is enabled and signupDisabled=false', async () => {
    mockedFindFirst.mockResolvedValueOnce(
      dbRow({ signupDisabled: false, allowedDomains: [], requireInviteWhenDomainGated: false }) as never,
    );
    expect(await isSignupDisabled()).toBe(false);
  });

  it('falls back to env when DB row is disabled', async () => {
    mockedFindFirst.mockResolvedValueOnce(
      dbRow({ signupDisabled: true, allowedDomains: [], requireInviteWhenDomainGated: false }, false) as never,
    );
    mockedEnv.mockReturnValue('true');
    expect(await isSignupDisabled()).toBe(true);
  });

  it('falls back to env when no DB row exists', async () => {
    mockedFindFirst.mockResolvedValueOnce(null);
    mockedEnv.mockReturnValue('true');
    expect(await isSignupDisabled()).toBe(true);
  });

  it('returns false when no DB row and env is not "true"', async () => {
    mockedFindFirst.mockResolvedValueOnce(null);
    mockedEnv.mockReturnValue(undefined);
    expect(await isSignupDisabled()).toBe(false);
  });

  it('falls back to env when DB read throws (DB outage)', async () => {
    mockedFindFirst.mockRejectedValueOnce(new Error('Prisma connection failed'));
    mockedEnv.mockReturnValue('true');
    expect(await isSignupDisabled()).toBe(true);
  });
});

describe('isInviteRequiredForSignup', () => {
  it('returns true when flag=true AND allowedDomains is non-empty', async () => {
    mockedFindFirst.mockResolvedValueOnce(
      dbRow({
        signupDisabled: false,
        allowedDomains: ['example.com'],
        requireInviteWhenDomainGated: true,
      }) as never,
    );
    expect(await isInviteRequiredForSignup()).toBe(true);
  });

  it('returns false when flag=true but allowedDomains is empty (no domain gating)', async () => {
    mockedFindFirst.mockResolvedValueOnce(
      dbRow({
        signupDisabled: false,
        allowedDomains: [],
        requireInviteWhenDomainGated: true,
      }) as never,
    );
    expect(await isInviteRequiredForSignup()).toBe(false);
  });

  it('returns false when flag=false even with domain gating', async () => {
    mockedFindFirst.mockResolvedValueOnce(
      dbRow({
        signupDisabled: false,
        allowedDomains: ['example.com'],
        requireInviteWhenDomainGated: false,
      }) as never,
    );
    expect(await isInviteRequiredForSignup()).toBe(false);
  });

  it('returns false when no DB row exists (no env equivalent for this flag)', async () => {
    mockedFindFirst.mockResolvedValueOnce(null);
    expect(await isInviteRequiredForSignup()).toBe(false);
  });

  it('returns false when DB read throws (safe default)', async () => {
    mockedFindFirst.mockRejectedValueOnce(new Error('Prisma connection failed'));
    expect(await isInviteRequiredForSignup()).toBe(false);
  });
});

describe('getAllowedSignupDomains', () => {
  it('returns DB allowedDomains when DB row has them', async () => {
    mockedFindFirst.mockResolvedValueOnce(
      dbRow({
        signupDisabled: false,
        allowedDomains: ['example.com', 'circularpayments.com'],
        requireInviteWhenDomainGated: false,
      }) as never,
    );
    expect(await getAllowedSignupDomains()).toEqual(['example.com', 'circularpayments.com']);
  });

  it('falls back to env CSV when DB allowedDomains is empty', async () => {
    mockedFindFirst.mockResolvedValueOnce(
      dbRow({
        signupDisabled: false,
        allowedDomains: [],
        requireInviteWhenDomainGated: false,
      }) as never,
    );
    mockedEnv.mockReturnValue('foo.com, bar.com,baz.com');
    expect(await getAllowedSignupDomains()).toEqual(['foo.com', 'bar.com', 'baz.com']);
  });

  it('falls back to env CSV when no DB row', async () => {
    mockedFindFirst.mockResolvedValueOnce(null);
    mockedEnv.mockReturnValue('example.com');
    expect(await getAllowedSignupDomains()).toEqual(['example.com']);
  });

  it('returns empty array when no DB row and no env', async () => {
    mockedFindFirst.mockResolvedValueOnce(null);
    mockedEnv.mockReturnValue(undefined);
    expect(await getAllowedSignupDomains()).toEqual([]);
  });

  it('trims whitespace and filters empty entries from env CSV', async () => {
    mockedFindFirst.mockResolvedValueOnce(null);
    mockedEnv.mockReturnValue('  foo.com ,, bar.com ,');
    expect(await getAllowedSignupDomains()).toEqual(['foo.com', 'bar.com']);
  });

  it('falls back to env when DB read throws (DB outage)', async () => {
    mockedFindFirst.mockRejectedValueOnce(new Error('Prisma connection failed'));
    mockedEnv.mockReturnValue('fallback.example.com');
    expect(await getAllowedSignupDomains()).toEqual(['fallback.example.com']);
  });
});
