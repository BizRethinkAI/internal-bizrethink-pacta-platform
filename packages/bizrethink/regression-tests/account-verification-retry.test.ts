import { EMAIL_VERIFICATION_STATE, USER_SIGNUP_VERIFICATION_TOKEN_IDENTIFIER } from '@documenso/lib/constants/email';
import { verifyEmail } from '@documenso/lib/server-only/user/verify-email';
import { prisma } from '@documenso/prisma';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ claim: vi.fn(), job: vi.fn(), receipt: vi.fn() }));
vi.mock('@bizrethink/customizations/server-only/auto-claim-invites-on-signup', () => ({
  claimInvitesOnVerification: mocks.claim,
}));
vi.mock('@documenso/lib/jobs/client', () => ({ jobsClient: { triggerJob: mocks.job } }));
vi.mock('@documenso/lib/server-only/user/get-most-recent-email-verification-token', () => ({
  getMostRecentEmailVerificationToken: vi.fn(),
}));
vi.mock('@documenso/prisma', () => ({
  prisma: {
    user: { update: vi.fn() },
    verificationToken: { findFirst: vi.fn(), updateMany: vi.fn(), deleteMany: vi.fn() },
    bizrethinkVerifiedOnboarding: { upsert: mocks.receipt },
    $transaction: vi.fn(),
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(prisma.verificationToken.findFirst).mockResolvedValue({
    id: 1,
    token: 'synthetic-verification-token',
    identifier: USER_SIGNUP_VERIFICATION_TOKEN_IDENTIFIER,
    userId: 7,
    completed: true,
    expires: new Date(Date.now() + 86400000),
    createdAt: new Date(),
    user: { id: 7, email: 'verified@example.test', name: 'Verified', emailVerified: new Date(), disabled: false },
  } as never);
});

describe('retry verified onboarding (R-03)', () => {
  it('persists the pending onboarding receipt in the email-proof transaction before reconciliation', async () => {
    const token = await prisma.verificationToken.findFirst();
    vi.mocked(prisma.verificationToken.findFirst).mockResolvedValue({ ...token, completed: false } as never);
    const receiptWrite = Promise.resolve({ userId: 7, completedAt: null });
    mocks.receipt.mockReturnValue(receiptWrite);
    vi.mocked(prisma.$transaction).mockResolvedValue([{ id: 7, email: 'verified@example.test' }] as never);
    expect((await verifyEmail({ token: 'synthetic-verification-token' })).state).toBe(
      EMAIL_VERIFICATION_STATE.VERIFIED,
    );
    expect(mocks.receipt).toHaveBeenCalledWith({ where: { userId: 7 }, create: { userId: 7 }, update: {} });
    expect(prisma.$transaction).toHaveBeenCalledWith(expect.arrayContaining([receiptWrite]));
    expect(vi.mocked(prisma.$transaction).mock.invocationCallOrder[0]).toBeLessThan(
      mocks.claim.mock.invocationCallOrder[0],
    );
  });

  it('reconciles onboarding on a valid completed verification token without verifying the user again', async () => {
    expect((await verifyEmail({ token: 'synthetic-verification-token' })).state).toBe(
      EMAIL_VERIFICATION_STATE.ALREADY_VERIFIED,
    );
    expect(mocks.claim).toHaveBeenCalledWith({ userId: 7, email: 'verified@example.test' });
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('does not recover onboarding from an unknown token', async () => {
    vi.mocked(prisma.verificationToken.findFirst).mockResolvedValue(null);
    expect((await verifyEmail({ token: 'unknown-token' })).state).toBe(EMAIL_VERIFICATION_STATE.NOT_FOUND);
    expect(mocks.claim).not.toHaveBeenCalled();
  });
});
