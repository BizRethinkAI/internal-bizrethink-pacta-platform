import { env } from '@documenso/lib/utils/env';

import { prisma } from '@documenso/prisma';
import type { SiteSettings } from '@prisma/client';
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

const dbRow = (data: SiteSettings['data'], enabled = true): SiteSettings => ({
  id: 'site.signup',
  enabled,
  data,
  lastModifiedByUserId: null,
  lastModifiedAt: new Date('2026-09-11T00:00:00Z'),
});

beforeEach(() => {
  mockedFindFirst.mockReset();
  mockedEnv.mockReset();
  mockedEnv.mockReturnValue(undefined);
});

// Fail-closed (2026-09-10 incident): signup is OPEN only when the site.signup
// row exists, parses, is enabled, and explicitly says signupDisabled=false.
// Every other state — including every failure — means CLOSED. Before this,
// every failure fell through to an env var that prod never set, so signup was
// open for four months while the admin believed it closed.
describe('isSignupDisabled', () => {
  const OPEN = { signupDisabled: false, allowedDomains: [], requireInviteWhenDomainGated: false };

  it('is open only when the row is enabled and signupDisabled=false', async () => {
    mockedFindFirst.mockResolvedValueOnce(dbRow(OPEN));
    expect(await isSignupDisabled()).toBe(false);
  });

  it('is closed when the row is enabled and signupDisabled=true', async () => {
    mockedFindFirst.mockResolvedValueOnce(dbRow({ ...OPEN, signupDisabled: true }));
    expect(await isSignupDisabled()).toBe(true);
  });

  it('is closed when no row exists, even with the env var unset', async () => {
    mockedFindFirst.mockResolvedValueOnce(null);
    mockedEnv.mockReturnValue(undefined);
    expect(await isSignupDisabled()).toBe(true);
  });

  it('is closed when the row exists but is not enabled', async () => {
    mockedFindFirst.mockResolvedValueOnce(dbRow(OPEN, false));
    expect(await isSignupDisabled()).toBe(true);
  });

  it('is closed when the DB read throws, and says why', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    mockedFindFirst.mockRejectedValueOnce(new Error('Prisma connection failed'));
    expect(await isSignupDisabled()).toBe(true);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('closed'), expect.anything());
    warn.mockRestore();
  });

  it('is closed when the row does not parse, and says why', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    mockedFindFirst.mockResolvedValueOnce(dbRow({ ...OPEN, signupDisabled: 'no' }));
    expect(await isSignupDisabled()).toBe(true);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('closed'), expect.anything());
    warn.mockRestore();
  });

  it('is closed when the row omits signupDisabled (no implicit open)', async () => {
    mockedFindFirst.mockResolvedValueOnce(dbRow({ allowedDomains: [] }));
    expect(await isSignupDisabled()).toBe(true);
  });

  it('lets NEXT_PUBLIC_DISABLE_SIGNUP=true close an open row, but never open a closed one', async () => {
    mockedFindFirst.mockResolvedValueOnce(dbRow(OPEN));
    mockedEnv.mockReturnValue('true');
    expect(await isSignupDisabled()).toBe(true);

    mockedFindFirst.mockResolvedValueOnce(null);
    mockedEnv.mockReturnValue('false');
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
      }),
    );
    expect(await isInviteRequiredForSignup()).toBe(true);
  });

  it('returns false when flag=true but allowedDomains is empty (no domain gating)', async () => {
    mockedFindFirst.mockResolvedValueOnce(
      dbRow({
        signupDisabled: false,
        allowedDomains: [],
        requireInviteWhenDomainGated: true,
      }),
    );
    expect(await isInviteRequiredForSignup()).toBe(false);
  });

  it('returns false when flag=false even with domain gating', async () => {
    mockedFindFirst.mockResolvedValueOnce(
      dbRow({
        signupDisabled: false,
        allowedDomains: ['example.com'],
        requireInviteWhenDomainGated: false,
      }),
    );
    expect(await isInviteRequiredForSignup()).toBe(false);
  });

  it('refuses an invitation decision when no DB row exists', async () => {
    mockedFindFirst.mockResolvedValueOnce(null);
    await expect(isInviteRequiredForSignup()).rejects.toMatchObject({ code: 'SIGNUP_DISABLED', statusCode: 400 });
  });

  it('refuses an invitation decision when the policy read fails', async () => {
    mockedFindFirst.mockRejectedValueOnce(new Error('Prisma connection failed'));
    await expect(isInviteRequiredForSignup()).rejects.toMatchObject({ code: 'SIGNUP_DISABLED', statusCode: 400 });
  });
});

describe('getAllowedSignupDomains', () => {
  it('returns DB allowedDomains when DB row has them', async () => {
    mockedFindFirst.mockResolvedValueOnce(
      dbRow({
        signupDisabled: false,
        allowedDomains: ['example.com', 'circularpayments.com'],
        requireInviteWhenDomainGated: false,
      }),
    );
    expect(await getAllowedSignupDomains()).toEqual(['example.com', 'circularpayments.com']);
  });

  it('falls back to env CSV when DB allowedDomains is empty', async () => {
    mockedFindFirst.mockResolvedValueOnce(
      dbRow({
        signupDisabled: false,
        allowedDomains: [],
        requireInviteWhenDomainGated: false,
      }),
    );
    mockedEnv.mockReturnValue('foo.com, bar.com,baz.com');
    expect(await getAllowedSignupDomains()).toEqual(['foo.com', 'bar.com', 'baz.com']);
  });

  it('refuses a domain decision when no DB row exists, even with an env fallback', async () => {
    mockedFindFirst.mockResolvedValueOnce(null);
    mockedEnv.mockReturnValue('example.com');
    await expect(getAllowedSignupDomains()).rejects.toMatchObject({ code: 'SIGNUP_DISABLED', statusCode: 400 });
  });

  it('never substitutes an unrestricted domain list for a missing policy', async () => {
    mockedFindFirst.mockResolvedValueOnce(null);
    mockedEnv.mockReturnValue(undefined);
    await expect(getAllowedSignupDomains()).rejects.toMatchObject({ code: 'SIGNUP_DISABLED', statusCode: 400 });
  });

  it('trims whitespace and filters empty entries from env CSV', async () => {
    mockedFindFirst.mockResolvedValueOnce(dbRow({ signupDisabled: false, allowedDomains: [] }));
    mockedEnv.mockReturnValue('  foo.com ,, bar.com ,');
    expect(await getAllowedSignupDomains()).toEqual(['foo.com', 'bar.com']);
  });

  it('refuses a domain decision when the policy read fails, even with an env fallback', async () => {
    mockedFindFirst.mockRejectedValueOnce(new Error('Prisma connection failed'));
    mockedEnv.mockReturnValue('fallback.example.com');
    await expect(getAllowedSignupDomains()).rejects.toMatchObject({ code: 'SIGNUP_DISABLED', statusCode: 400 });
  });
});
