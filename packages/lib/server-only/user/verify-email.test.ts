import { beforeEach, describe, expect, it, vi } from 'vitest';

import { EMAIL_VERIFICATION_STATE } from '../../constants/email';
import { verifyEmail } from './verify-email';

// Overlay 071: pending organisation invites are claimed at verify-email time
// (not at signup), so only an address the user proved they own can join the
// inviting org. These tests pin that the claim runs on a successful
// verification and on no other outcome.

const mockedClaim = vi.fn();
const mockedTriggerJob = vi.fn();
const mockedGetMostRecentToken = vi.fn();

vi.mock('@documenso/prisma', () => ({
  prisma: {
    verificationToken: {
      findFirst: vi.fn(),
      updateMany: vi.fn(),
      deleteMany: vi.fn(),
    },
    user: {
      update: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

vi.mock('@bizrethink/customizations/server-only/auto-claim-invites-on-signup', () => ({
  claimInvitesOnVerification: (...args: unknown[]) => mockedClaim(...args),
}));

vi.mock('../../jobs/client', () => ({
  jobsClient: { triggerJob: (...args: unknown[]) => mockedTriggerJob(...args) },
}));

vi.mock('./get-most-recent-email-verification-token', () => ({
  getMostRecentEmailVerificationToken: (...args: unknown[]) => mockedGetMostRecentToken(...args),
}));

import { prisma } from '@documenso/prisma';

const mockedFindFirst = vi.mocked(prisma.verificationToken.findFirst);
const mockedTransaction = vi.mocked(prisma.$transaction);

const tokenFixture = (overrides: Record<string, unknown> = {}) => ({
  id: 1,
  token: 'tok',
  userId: 7,
  completed: false,
  expires: new Date(Date.now() + 60 * 60 * 1000),
  createdAt: new Date(),
  user: { id: 7, email: 'jane@example.com', name: 'Jane' },
  ...overrides,
});

beforeEach(() => {
  mockedClaim.mockReset();
  mockedTriggerJob.mockReset();
  mockedGetMostRecentToken.mockReset();
  mockedFindFirst.mockReset();
  mockedTransaction.mockReset();
  mockedClaim.mockResolvedValue(undefined);
});

describe('verifyEmail — overlay 071 invite claim', () => {
  it('claims invites once the user is marked VERIFIED', async () => {
    mockedFindFirst.mockResolvedValueOnce(tokenFixture() as never);
    mockedTransaction.mockResolvedValueOnce([{ id: 7, email: 'jane@example.com' }, {}, {}] as never);

    const result = await verifyEmail({ token: 'tok' });

    expect(result).toEqual({ state: EMAIL_VERIFICATION_STATE.VERIFIED, userId: 7 });
    expect(mockedClaim).toHaveBeenCalledOnce();
    expect(mockedClaim).toHaveBeenCalledWith({ userId: 7, email: 'jane@example.com' });
  });

  it('does NOT claim when the token is not found', async () => {
    mockedFindFirst.mockResolvedValueOnce(null);

    const result = await verifyEmail({ token: 'nope' });

    expect(result.state).toBe(EMAIL_VERIFICATION_STATE.NOT_FOUND);
    expect(mockedClaim).not.toHaveBeenCalled();
  });

  it('does NOT claim when the token has expired', async () => {
    mockedFindFirst.mockResolvedValueOnce(tokenFixture({ expires: new Date(Date.now() - 1000) }) as never);
    mockedGetMostRecentToken.mockResolvedValueOnce({ createdAt: new Date() });

    const result = await verifyEmail({ token: 'tok' });

    expect(result.state).toBe(EMAIL_VERIFICATION_STATE.EXPIRED);
    expect(mockedClaim).not.toHaveBeenCalled();
    expect(mockedTransaction).not.toHaveBeenCalled();
  });

  it('does NOT claim on a second click (ALREADY_VERIFIED)', async () => {
    mockedFindFirst.mockResolvedValueOnce(tokenFixture({ completed: true }) as never);

    const result = await verifyEmail({ token: 'tok' });

    expect(result.state).toBe(EMAIL_VERIFICATION_STATE.ALREADY_VERIFIED);
    expect(mockedClaim).not.toHaveBeenCalled();
    expect(mockedTransaction).not.toHaveBeenCalled();
  });

  it('does NOT claim when the user update returns nothing (throws first)', async () => {
    mockedFindFirst.mockResolvedValueOnce(tokenFixture() as never);
    mockedTransaction.mockResolvedValueOnce([null, {}, {}] as never);

    await expect(verifyEmail({ token: 'tok' })).rejects.toThrow();
    expect(mockedClaim).not.toHaveBeenCalled();
  });
});
