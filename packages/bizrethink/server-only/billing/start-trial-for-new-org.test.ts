import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { prisma } from '@documenso/prisma';

import { startTrialForNewOrg } from './start-trial-for-new-org';

vi.mock('@documenso/prisma', () => ({
  prisma: {
    bizrethinkOrganisationBilling: {
      upsert: vi.fn(),
    },
  },
}));

const mockedUpsert = vi.mocked(prisma.bizrethinkOrganisationBilling.upsert);

const FIXED_NOW = new Date('2026-05-25T12:00:00.000Z');
const FIXED_TRIAL_END = new Date('2026-06-08T12:00:00.000Z'); // +14d

beforeEach(() => {
  mockedUpsert.mockReset();
  mockedUpsert.mockResolvedValue({} as never);
  vi.useFakeTimers();
  vi.setSystemTime(FIXED_NOW);
});

afterEach(() => {
  vi.useRealTimers();
});

describe('startTrialForNewOrg', () => {
  it('creates external-org row with 14-day trial window', async () => {
    await startTrialForNewOrg({ organisationId: 'org-ext-1' });

    expect(mockedUpsert).toHaveBeenCalledOnce();
    const args = mockedUpsert.mock.calls[0][0];
    expect(args.where).toEqual({ organisationId: 'org-ext-1' });
    expect(args.create).toEqual({
      organisationId: 'org-ext-1',
      bizrethinkInternal: false,
      trialStartedAt: FIXED_NOW,
      trialEndsAt: FIXED_TRIAL_END,
    });
  });

  it('creates internal-org row WITHOUT trial dates', async () => {
    await startTrialForNewOrg({ organisationId: 'org-int-1', internal: true });

    expect(mockedUpsert).toHaveBeenCalledOnce();
    const args = mockedUpsert.mock.calls[0][0];
    expect(args.create).toEqual({
      organisationId: 'org-int-1',
      bizrethinkInternal: true,
      trialStartedAt: null,
      trialEndsAt: null,
    });
  });

  it('defaults internal to false when not supplied', async () => {
    await startTrialForNewOrg({ organisationId: 'org-default' });
    const args = mockedUpsert.mock.calls[0][0];
    expect(args.create.bizrethinkInternal).toBe(false);
    expect(args.create.trialStartedAt).toEqual(FIXED_NOW);
  });

  it('upsert update block only sets bizrethinkInternal (preserves trial dates on retry)', async () => {
    await startTrialForNewOrg({ organisationId: 'org-retry' });
    const args = mockedUpsert.mock.calls[0][0];
    // The `update` block must NOT include trialStartedAt or trialEndsAt —
    // re-running this for an existing org would otherwise reset the trial
    // window every time and effectively give unlimited trial.
    expect(args.update).toEqual({ bizrethinkInternal: false });
    expect(args.update).not.toHaveProperty('trialStartedAt');
    expect(args.update).not.toHaveProperty('trialEndsAt');
  });

  it('trial window is exactly 14 days (336 hours, 14 * 24 * 60 * 60 * 1000 ms)', async () => {
    await startTrialForNewOrg({ organisationId: 'org-14d' });
    const args = mockedUpsert.mock.calls[0][0];
    const startMs = (args.create.trialStartedAt as Date).getTime();
    const endMs = (args.create.trialEndsAt as Date).getTime();
    expect(endMs - startMs).toBe(14 * 24 * 60 * 60 * 1000);
  });

  it('uses a fresh "now" timestamp on each call', async () => {
    await startTrialForNewOrg({ organisationId: 'org-call-1' });

    vi.advanceTimersByTime(1000); // 1 second later
    await startTrialForNewOrg({ organisationId: 'org-call-2' });

    const args1 = mockedUpsert.mock.calls[0][0];
    const args2 = mockedUpsert.mock.calls[1][0];
    expect((args2.create.trialStartedAt as Date).getTime()).toBe(
      (args1.create.trialStartedAt as Date).getTime() + 1000,
    );
  });
});
