import { validateSessionToken } from '@documenso/auth/server/lib/session/session';
import { disableUser } from '@documenso/lib/server-only/user/disable-user';
import { prisma } from '@documenso/prisma';
import type { Session, User } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@documenso/prisma', () => {
  const db = {
    session: { findUnique: vi.fn(), delete: vi.fn(), deleteMany: vi.fn(), update: vi.fn() },
    user: { findFirst: vi.fn(), update: vi.fn() },
    apiToken: { updateMany: vi.fn() },
    webhook: { updateMany: vi.fn() },
    verificationToken: { updateMany: vi.fn() },
    passwordResetToken: { updateMany: vi.fn() },
    passkey: { deleteMany: vi.fn() },
  };
  return { prisma: { ...db, $transaction: vi.fn(async (fn) => fn(db)) } };
});

const session = {
  id: 'session-id',
  sessionToken: 'hashed-token',
  userId: 7,
  createdAt: new Date(),
  updatedAt: new Date(),
  expiresAt: new Date(Date.now() + 5 * 86400000),
  ipAddress: null,
  userAgent: null,
} satisfies Session;
const user = {
  id: 7,
  name: 'Account test',
  email: 'account@example.test',
  emailVerified: new Date(),
  avatarImageId: null,
  twoFactorEnabled: false,
  roles: ['USER'],
  signature: null,
  disabled: false,
} satisfies Pick<
  User,
  'id' | 'name' | 'email' | 'emailVerified' | 'avatarImageId' | 'twoFactorEnabled' | 'roles' | 'signature' | 'disabled'
>;

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(prisma.session.findUnique).mockResolvedValue({ ...session, user } as never);
  vi.mocked(prisma.user.findFirst).mockResolvedValue(user as never);
});

describe('disabled account session authority (A-15)', () => {
  it('rejects an unexpired disabled session before renewal or returning the user', async () => {
    vi.mocked(prisma.session.findUnique).mockResolvedValue({ ...session, user: { ...user, disabled: true } } as never);
    await expect(validateSessionToken('synthetic-token')).resolves.toEqual({
      session: null,
      user: null,
      isAuthenticated: false,
    });
    expect(prisma.session.update).not.toHaveBeenCalled();
  });

  it('preserves active sessions and expiry enforcement', async () => {
    expect((await validateSessionToken('synthetic-token')).isAuthenticated).toBe(true);
    vi.mocked(prisma.session.findUnique).mockResolvedValue({ ...session, expiresAt: new Date(0), user } as never);
    expect((await validateSessionToken('synthetic-token')).isAuthenticated).toBe(false);
  });

  it('revokes all sessions in the same transaction as disable and existing credential revocation', async () => {
    await disableUser({ id: 7 });
    expect(prisma.session.deleteMany).toHaveBeenCalledWith({ where: { userId: 7 } });
    expect(prisma.user.update).toHaveBeenCalledWith({ where: { id: 7 }, data: { disabled: true } });
    expect(prisma.apiToken.updateMany).toHaveBeenCalled();
    expect(prisma.passkey.deleteMany).toHaveBeenCalled();
    expect(prisma.$transaction).toHaveBeenCalledOnce();
  });
});
