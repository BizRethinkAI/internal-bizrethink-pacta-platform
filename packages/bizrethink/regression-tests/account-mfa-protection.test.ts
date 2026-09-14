import { getBackupCodes } from '@documenso/lib/server-only/2fa/get-backup-code';
import { setupTwoFactorAuthentication } from '@documenso/lib/server-only/2fa/setup-2fa';
import { verifyBackupCode } from '@documenso/lib/server-only/2fa/verify-backup-code';
import { symmetricEncrypt } from '@documenso/lib/universal/crypto';
import { prisma } from '@documenso/prisma';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  key: '0123456789abcdef0123456789abcdef',
  read: vi.fn(),
  update: vi.fn(),
  updateMany: vi.fn(),
}));
vi.mock('@documenso/lib/constants/crypto', () => ({ DOCUMENSO_ENCRYPTION_KEY: mocks.key }));
vi.mock('@documenso/prisma', () => {
  const db = {
    user: { findUnique: mocks.read, findFirst: mocks.read, update: mocks.update, updateMany: mocks.updateMany },
    $queryRaw: vi.fn(),
  };
  return { prisma: { ...db, $transaction: vi.fn(async (fn) => fn(db)) } };
});

type Account = {
  id: number;
  email: string;
  disabled: boolean;
  twoFactorEnabled: boolean;
  twoFactorSecret: string | null;
  twoFactorBackupCodes: string | null;
};
let saved: Account;
const code = 'AAAAA-BBBBB';
const otherCode = 'CCCCC-DDDDD';
const matches = (where: Record<string, unknown>) =>
  Object.entries(where).every(([key, value]) => saved[key as keyof Account] === value);

beforeEach(() => {
  vi.clearAllMocks();
  saved = {
    id: 7,
    email: 'mfa@example.test',
    disabled: false,
    twoFactorEnabled: true,
    twoFactorSecret: symmetricEncrypt({ data: 'JBSWY3DPEHPK3PXP', key: mocks.key }),
    twoFactorBackupCodes: symmetricEncrypt({ data: JSON.stringify([code, otherCode]), key: mocks.key }),
  };
  mocks.read.mockImplementation(async () => ({ ...saved }));
  mocks.update.mockImplementation(async ({ where, data }) => {
    if (!matches(where)) {
      throw new Error('Record not found');
    }
    Object.assign(saved, data);
    return { ...saved };
  });
  mocks.updateMany.mockImplementation(async ({ where, data }) => {
    if (!matches(where)) {
      return { count: 0 };
    }
    Object.assign(saved, data);
    return { count: 1 };
  });
});

describe('MFA setup and recovery lifecycle (A-16)', () => {
  it('cannot replace an enabled factor through session-only setup', async () => {
    const before = { ...saved };
    await expect(setupTwoFactorAuthentication({ user: saved })).rejects.toThrow();
    expect(saved).toEqual(before);
  });

  it('still stages setup for an active account without an enabled factor', async () => {
    saved.twoFactorEnabled = false;
    const result = await setupTwoFactorAuthentication({ user: saved });
    expect(result.secret).toBeTruthy();
    expect(result.uri).toContain('otpauth://');
    expect(saved.twoFactorEnabled).toBe(false);
    expect(saved.twoFactorSecret).toBeTruthy();
  });

  it('accepts a recovery code only once, even with the same stale user snapshot', async () => {
    const stale = { ...saved };
    expect(await verifyBackupCode({ user: stale, backupCode: code })).toBe(true);
    expect(await verifyBackupCode({ user: stale, backupCode: code })).toBe(false);
    expect(getBackupCodes({ user: saved })).toEqual([otherCode]);
  });

  it('rejects an invalid code without consuming other codes', async () => {
    const before = saved.twoFactorBackupCodes;
    expect(await verifyBackupCode({ user: saved, backupCode: 'WRONG-CODE' })).toBe(false);
    expect(saved.twoFactorBackupCodes).toBe(before);
  });

  it('permits only one winner when the same recovery code is submitted concurrently', async () => {
    const stale = { ...saved };
    const results = await Promise.all(
      Array.from({ length: 4 }, () => verifyBackupCode({ user: stale, backupCode: code })),
    );
    expect(results.filter(Boolean)).toHaveLength(1);
  });

  it('rejects a code from an old snapshot after the account is disabled', async () => {
    const stale = { ...saved };
    saved.disabled = true;
    expect(await verifyBackupCode({ user: stale, backupCode: code })).toBe(false);
    expect(prisma.user.updateMany).not.toHaveBeenCalled();
  });
});
