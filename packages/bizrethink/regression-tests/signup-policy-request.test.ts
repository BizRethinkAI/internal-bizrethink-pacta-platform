import { AuthenticationErrorCode } from '@documenso/auth/server/lib/errors/error-codes';
import { emailPasswordRoute } from '@documenso/auth/server/routes/email-password';
import type { HonoAuthContext } from '@documenso/auth/server/types/context';
import { AppError } from '@documenso/lib/errors/app-error';
import { jobsClient } from '@documenso/lib/jobs/client';
import { prisma } from '@documenso/prisma';
import type { SiteSettings } from '@prisma/client';
import { Hono } from 'hono';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  createUser: vi.fn(),
  env: vi.fn(),
}));

// Exercise the real HTTP route, validator and signup policy. Replace I/O and
// unrelated endpoint dependencies; no real database, mail or network is used.
vi.mock('@documenso/prisma', () => ({
  prisma: {
    siteSettings: { findFirst: vi.fn() },
    organisationMemberInvite: { findFirst: vi.fn() },
  },
}));
vi.mock('@documenso/lib/utils/env', () => ({ env: mocks.env }));
vi.mock('@documenso/lib/jobs/client', () => ({ jobsClient: { triggerJob: vi.fn() } }));
vi.mock('@documenso/lib/server-only/user/create-user', () => ({ createUser: mocks.createUser }));
vi.mock('@documenso/lib/server-only/captcha/verify-captcha', () => ({ verifyCaptchaToken: vi.fn() }));
vi.mock('@documenso/lib/server-only/site-settings/get-email-blocklist-domains', () => ({
  getEmailBlocklistDomains: vi.fn().mockResolvedValue([]),
}));
vi.mock('@documenso/lib/server-only/rate-limit/rate-limit-middleware', () => ({
  rateLimitResponse: vi.fn().mockReturnValue(null),
}));
vi.mock('@documenso/lib/server-only/rate-limit/rate-limits', () => ({
  signupRateLimit: { check: vi.fn() },
  forgotPasswordRateLimit: { check: vi.fn() },
  loginRateLimit: { check: vi.fn() },
  resendVerifyEmailRateLimit: { check: vi.fn() },
  resetPasswordRateLimit: { check: vi.fn() },
  verifyEmailRateLimit: { check: vi.fn() },
}));
vi.mock('@documenso/lib/server-only/2fa/disable-2fa', () => ({ disableTwoFactorAuthentication: vi.fn() }));
vi.mock('@documenso/lib/server-only/2fa/enable-2fa', () => ({ enableTwoFactorAuthentication: vi.fn() }));
vi.mock('@documenso/lib/server-only/2fa/is-2fa-availble', () => ({ isTwoFactorAuthenticationEnabled: vi.fn() }));
vi.mock('@documenso/lib/server-only/2fa/setup-2fa', () => ({ setupTwoFactorAuthentication: vi.fn() }));
vi.mock('@documenso/lib/server-only/2fa/validate-2fa', () => ({ validateTwoFactorAuthentication: vi.fn() }));
vi.mock('@documenso/lib/server-only/2fa/view-backup-codes', () => ({ viewBackupCodes: vi.fn() }));
vi.mock('@documenso/lib/server-only/user/forgot-password', () => ({ forgotPassword: vi.fn() }));
vi.mock('@documenso/lib/server-only/user/get-most-recent-email-verification-token', () => ({
  getMostRecentEmailVerificationToken: vi.fn(),
}));
vi.mock('@documenso/lib/server-only/user/get-user-by-reset-token', () => ({ getUserByResetToken: vi.fn() }));
vi.mock('@documenso/lib/server-only/user/reset-password', () => ({ resetPassword: vi.fn() }));
vi.mock('@documenso/lib/server-only/user/update-password', () => ({ updatePassword: vi.fn() }));
vi.mock('@documenso/lib/server-only/user/verify-email', () => ({ verifyEmail: vi.fn() }));
vi.mock('@documenso/auth/server/lib/session/session', () => ({ invalidateSessions: vi.fn() }));
vi.mock('@documenso/auth/server/lib/session/session-cookies', () => ({ getCsrfCookie: vi.fn() }));
vi.mock('@documenso/auth/server/lib/utils/authorizer', () => ({ onAuthorize: vi.fn() }));
vi.mock('@documenso/auth/server/lib/utils/get-session', () => ({ getSession: vi.fn() }));

const settingsRead = vi.mocked(prisma.siteSettings.findFirst);
const inviteRead = vi.mocked(prisma.organisationMemberInvite.findFirst);
const openRestrictedRow: SiteSettings = {
  id: 'site.signup',
  enabled: true,
  data: {
    signupDisabled: false,
    allowedDomains: ['example.com'],
    requireInviteWhenDomainGated: true,
  },
};
const closedRow: SiteSettings = {
  ...openRestrictedRow,
  data: { signupDisabled: true },
};

const app = new Hono<HonoAuthContext>();
app.use('*', async (c, next) => {
  c.set('requestMetadata', { ipAddress: '127.0.0.1', userAgent: 'signup-policy-test' });
  await next();
});
app.onError((error) => {
  if (error instanceof AppError) {
    return new Response(JSON.stringify({ code: error.code }), { status: error.statusCode ?? 500 });
  }
  return new Response('Internal Server Error', { status: 500 });
});
app.route('/', emailPasswordRoute);

const signup = (email = 'new-user@example.com') =>
  app.request('/signup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Test User', email, password: 'Signup-test-Password1!' }),
  });

const expectDenied = async (response: Response) => {
  expect(response.status).toBe(400);
  expect(await response.json()).toEqual({ code: AuthenticationErrorCode.SignupDisabled });
  expect(mocks.createUser).not.toHaveBeenCalled();
  expect(jobsClient.triggerJob).not.toHaveBeenCalled();
};

beforeEach(() => {
  vi.clearAllMocks();
  settingsRead.mockReset().mockResolvedValue(openRestrictedRow);
  inviteRead.mockReset().mockResolvedValue(null);
  mocks.env.mockReset().mockReturnValue(undefined);
  mocks.createUser.mockReset().mockImplementation(async ({ email }: { email: string }) => ({ email }));
  vi.spyOn(console, 'warn').mockImplementation(() => undefined);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('POST /signup uses one validated signup policy (R-01)', () => {
  it('keeps the domain restriction when later settings reads would fail', async () => {
    settingsRead
      .mockRejectedValue(new Error('Transient settings read failure'))
      .mockResolvedValueOnce(openRestrictedRow);
    await expectDenied(await signup('outsider@example.org'));
    expect(settingsRead).toHaveBeenCalledTimes(1);
    expect(inviteRead).not.toHaveBeenCalled();
  });

  it('keeps the invitation restriction when later settings reads would fail', async () => {
    settingsRead
      .mockRejectedValue(new Error('Transient settings read failure'))
      .mockResolvedValueOnce(openRestrictedRow);
    await expectDenied(await signup());
    expect(settingsRead).toHaveBeenCalledTimes(1);
    expect(inviteRead).toHaveBeenCalledWith({
      where: { email: { equals: 'new-user@example.com', mode: 'insensitive' }, status: 'PENDING' },
      select: { id: true },
    });
  });

  it('does not substitute a later unrestricted policy into a restricted request', async () => {
    settingsRead
      .mockResolvedValue({ ...openRestrictedRow, data: { signupDisabled: false } })
      .mockResolvedValueOnce(openRestrictedRow);
    await expectDenied(await signup('outsider@example.org'));
  });

  it.each([
    ['closed', closedRow],
    ['missing', null],
    ['disabled', { ...openRestrictedRow, enabled: false }],
    ['malformed', { ...openRestrictedRow, data: { signupDisabled: 'false' } }],
    ['implicit open', { ...openRestrictedRow, data: {} }],
  ] satisfies [string, SiteSettings | null][])('refuses signup with an initially %s policy', async (_label, row) => {
    settingsRead.mockResolvedValue(row);
    await expectDenied(await signup());
    expect(inviteRead).not.toHaveBeenCalled();
  });

  it('refuses signup when the initial policy read fails, even with permissive env fallback', async () => {
    settingsRead.mockRejectedValue(new Error('Settings unavailable'));
    mocks.env.mockImplementation((key: string) =>
      key === 'NEXT_PRIVATE_ALLOWED_SIGNUP_DOMAINS' ? 'example.com' : 'false',
    );
    await expectDenied(await signup());
  });

  it('permits a matching pending invitation using the one successfully read policy', async () => {
    settingsRead.mockRejectedValue(new Error('Later reads unavailable')).mockResolvedValueOnce(openRestrictedRow);
    inviteRead.mockResolvedValue({ id: 'test-invite' } as never);
    const response = await signup('New-User@EXAMPLE.COM');
    expect(response.status).toBe(201);
    expect(mocks.createUser).toHaveBeenCalledTimes(1);
    expect(jobsClient.triggerJob).toHaveBeenCalledTimes(1);
    expect(settingsRead).toHaveBeenCalledTimes(1);
    expect(inviteRead).toHaveBeenCalledTimes(1);
  });

  it('refuses account creation when the required invitation lookup fails', async () => {
    inviteRead.mockRejectedValue(new Error('Invitations unavailable'));
    const response = await signup();
    expect(response.status).toBe(500);
    expect(mocks.createUser).not.toHaveBeenCalled();
    expect(jobsClient.triggerJob).not.toHaveBeenCalled();
  });

  it('permits explicitly open signup with no restrictions', async () => {
    settingsRead.mockResolvedValue({ ...openRestrictedRow, data: { signupDisabled: false } });
    expect((await signup()).status).toBe(201);
    expect(mocks.createUser).toHaveBeenCalledTimes(1);
    expect(settingsRead).toHaveBeenCalledTimes(1);
    expect(inviteRead).not.toHaveBeenCalled();
  });

  it('reads a fresh policy for the next request after an administrator closes signup', async () => {
    settingsRead.mockResolvedValue({ ...openRestrictedRow, data: { signupDisabled: false } });
    expect((await signup()).status).toBe(201);
    vi.clearAllMocks();
    settingsRead.mockResolvedValue(closedRow);
    await expectDenied(await signup());
    expect(settingsRead).toHaveBeenCalledTimes(1);
  });

  it.each([
    'NEXT_PUBLIC_DISABLE_SIGNUP',
    'NEXT_PUBLIC_DISABLE_EMAIL_PASSWORD_SIGNUP',
  ])('retains the %s kill switch', async (key) => {
    settingsRead.mockResolvedValue({ ...openRestrictedRow, data: { signupDisabled: false } });
    mocks.env.mockImplementation((name: string) => (name === key ? 'true' : undefined));
    await expectDenied(await signup());
  });
});
