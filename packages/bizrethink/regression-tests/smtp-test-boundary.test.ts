import type { SessionUser } from '@documenso/auth/server/lib/session/session';
import { logger } from '@documenso/lib/utils/logger';
import type { TrpcContext } from '@documenso/trpc/server/context';
import { Role } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { orgSmtpRouter } from '../server-only/trpc/org-smtp-router';

const { db, testSmtp } = vi.hoisted(() => ({
  db: { organisation: { findFirst: vi.fn() }, rateLimit: { upsert: vi.fn() }, $transaction: vi.fn() },
  testSmtp: vi.fn(),
}));
vi.mock('@documenso/prisma', () => ({ prisma: db }));
vi.mock('../server-only/test-org-smtp', () => ({ testOrgSmtp: testSmtp }));
vi.mock('../server-only/per-org-mailer', () => ({ encryptOrgSmtpPassword: vi.fn(), invalidateOrgMailer: vi.fn() }));

const user: SessionUser = {
  id: 501,
  name: 'Synthetic SMTP manager',
  email: 'manager@example.invalid',
  disabled: false,
  roles: [Role.USER],
  emailVerified: new Date(),
  avatarImageId: null,
  signature: null,
  twoFactorEnabled: false,
};
const context = (): TrpcContext => ({
  user,
  session: {
    id: 'synthetic-session',
    sessionToken: 'synthetic-session',
    userId: user.id,
    createdAt: new Date(),
    updatedAt: new Date(),
    ipAddress: null,
    userAgent: null,
    expiresAt: new Date(Date.now() + 60_000),
  },
  teamId: undefined,
  req: new Request('http://fixture.invalid/api/trpc'),
  res: new Response(),
  metadata: { auth: null, source: 'app', requestMetadata: {} },
  logger,
});
const input = {
  organisationId: 'org_smtp_a',
  host: 'smtp.example.invalid',
  port: 587,
  secure: false,
  username: 'synthetic',
  password: 'synthetic-test-password',
};

beforeEach(() => {
  vi.clearAllMocks();
  logger.level = 'silent';
  db.organisation.findFirst.mockResolvedValue({ id: input.organisationId });
  db.rateLimit.upsert.mockResolvedValue({ count: 1 });
  db.$transaction.mockImplementation(async (operations: Promise<unknown>[]) => Promise.all(operations));
  testSmtp.mockResolvedValue({ ok: true });
});

describe('SMTP tests through the real authenticated router', () => {
  it('denies callers without manage access before any network operation', async () => {
    db.organisation.findFirst.mockResolvedValue(null);
    await expect(orgSmtpRouter.createCaller(context()).test(input)).rejects.toThrow();
    expect(testSmtp).not.toHaveBeenCalled();
    expect(db.rateLimit.upsert).not.toHaveBeenCalled();
  });

  it('checks the requested organisation and manager roles', async () => {
    await expect(orgSmtpRouter.createCaller(context()).test(input)).resolves.toEqual({ ok: true });
    expect(db.organisation.findFirst).toHaveBeenCalledWith({
      where: {
        id: input.organisationId,
        members: {
          some: {
            userId: user.id,
            organisationGroupMembers: { some: { group: { organisationRole: { in: ['ADMIN', 'MANAGER'] } } } },
          },
        },
      },
    });
  });

  it('requires an organisation instead of inferring authority from a session', async () => {
    const { organisationId: _omitted, ...unscoped } = input;
    // Exercise malformed runtime input through the real Zod schema.
    await expect(orgSmtpRouter.createCaller(context()).test(unscoped as typeof input)).rejects.toThrow();
    expect(testSmtp).not.toHaveBeenCalled();
  });

  it('denies unauthenticated callers', async () => {
    await expect(orgSmtpRouter.createCaller({ ...context(), session: null, user: null }).test(input)).rejects.toThrow();
    expect(testSmtp).not.toHaveBeenCalled();
  });

  it('fails closed when its durable rate counter cannot be checked', async () => {
    db.rateLimit.upsert.mockRejectedValue(new Error('synthetic counter failure'));
    await expect(orgSmtpRouter.createCaller(context()).test(input)).rejects.toThrow();
    expect(testSmtp).not.toHaveBeenCalled();
  });

  it.each([0, 1])('denies when the %s counter is over budget', async (limitedCounter) => {
    db.rateLimit.upsert
      .mockResolvedValueOnce({ count: limitedCounter === 0 ? 100 : 1 })
      .mockResolvedValueOnce({ count: limitedCounter === 1 ? 100 : 1 });
    await expect(orgSmtpRouter.createCaller(context()).test(input)).rejects.toThrow();
    expect(testSmtp).not.toHaveBeenCalled();
  });
});
