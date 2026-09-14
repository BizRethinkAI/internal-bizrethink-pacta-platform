import { prisma } from '@documenso/prisma';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  autoClaimInvitesOnSignup,
  claimInvitesOnVerification,
  hasPendingInvites,
  recoverOnboardingOnLogin,
} from './auto-claim-invites-on-signup';

type Invite = {
  createdAt: Date;
  id: string;
  email: string;
  organisationId: string;
  organisationRole: 'MEMBER' | 'ADMIN';
  status: string;
  organisation: { id: string; name: string; groups: { id: string }[] };
};
const mocks = vi.hoisted(() => ({
  job: vi.fn(),
  add: vi.fn(),
  personal: vi.fn(),
  userRead: vi.fn(),
  inviteRead: vi.fn(),
  update: vi.fn(),
  memberRead: vi.fn(),
  count: vi.fn(),
  query: vi.fn(),
  tx: vi.fn(),
}));
vi.mock('@documenso/lib/jobs/client', () => ({ jobs: { triggerJob: mocks.job } }));
vi.mock('@documenso/lib/server-only/organisation/accept-organisation-invitation', () => ({
  addUserToOrganisation: mocks.add,
}));
vi.mock('@documenso/lib/server-only/organisation/create-organisation', () => ({
  createPersonalOrganisation: mocks.personal,
}));
vi.mock('@documenso/prisma', () => ({
  prisma: {
    user: { findUnique: mocks.userRead },
    organisationMemberInvite: { findMany: mocks.inviteRead, findFirst: vi.fn(), update: mocks.update },
    organisationMember: { findUnique: mocks.memberRead, count: mocks.count },
    $queryRaw: mocks.query,
    $transaction: mocks.tx,
  },
}));
let user: { id: number; email: string; emailVerified: Date | null; disabled: boolean };
let invites: Invite[];
let members: string[];
let workspaces: number;
let tail: Promise<unknown>;
const invite = (id: string): Invite => ({
  id,
  createdAt: new Date('2026-09-01T00:00:00Z'),
  email: 'jane@example.test',
  organisationId: `org-${id}`,
  organisationRole: 'MEMBER',
  status: 'PENDING',
  organisation: { id: `org-${id}`, name: `Organisation ${id}`, groups: [{ id: `group-${id}` }] },
});
const options = { userId: 7, email: 'Jane@Example.test' };
const signupOptions = { userId: 7, userEmail: options.email };

beforeEach(() => {
  vi.resetAllMocks();
  user = { id: 7, email: options.email, emailVerified: new Date(), disabled: false };
  invites = [invite('a')];
  members = [];
  workspaces = 0;
  tail = Promise.resolve();
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
  mocks.job.mockResolvedValue(undefined);
  mocks.userRead.mockImplementation(async () => ({ ...user }));
  mocks.inviteRead.mockImplementation(async ({ where }) =>
    invites
      .filter((row) => row.status === 'PENDING' && (!where.createdAt?.lte || row.createdAt <= where.createdAt.lte))
      .map((row) => structuredClone(row)),
  );
  mocks.update.mockImplementation(async ({ where, data }) => {
    const row = invites.find((row) => row.id === where.id);
    if (!row) {
      throw new Error('Missing invite');
    }
    Object.assign(row, data);
    return row;
  });
  mocks.memberRead.mockImplementation(async ({ where }) =>
    members.includes(where.userId_organisationId.organisationId) ? { id: 'existing' } : null,
  );
  mocks.count.mockImplementation(async () => members.length);
  mocks.add.mockImplementation(async ({ organisationId }) => {
    if (members.includes(organisationId)) {
      throw new Error('Duplicate membership');
    }
    members.push(organisationId);
  });
  mocks.personal.mockImplementation(async () => {
    members.push('personal');
    workspaces++;
  });
  mocks.tx.mockImplementation((work) => {
    const execution = tail.then(async () => {
      const before = structuredClone({ invites, members, workspaces });
      try {
        return await work(prisma);
      } catch (error) {
        ({ invites, members, workspaces } = before);
        throw error;
      }
    });
    tail = execution.catch(() => undefined);
    return execution;
  });
});
afterEach(() => vi.restoreAllMocks());

describe('verified onboarding transaction and recovery (R-03)', () => {
  it('commits membership and acceptance together, then notifies', async () => {
    expect((await claimInvitesOnVerification(options)).map((row) => row.inviteId)).toEqual(['a']);
    expect(members).toEqual(['org-a']);
    expect(invites[0].status).toBe('ACCEPTED');
    expect(mocks.add).toHaveBeenCalledWith(expect.objectContaining({ transaction: prisma, bypassEmail: true }));
    expect(mocks.job).toHaveBeenCalledOnce();
    expect(mocks.personal).not.toHaveBeenCalled();
  });
  it('claims all matching invitations across organisations, preserving assigned roles', async () => {
    invites.push({ ...invite('b'), organisationRole: 'ADMIN' });
    expect((await autoClaimInvitesOnSignup(signupOptions)).map((row) => row.organisationRole)).toEqual([
      'MEMBER',
      'ADMIN',
    ]);
    expect(members).toEqual(['org-a', 'org-b']);
  });
  it.each([
    'unverified',
    'disabled',
    'wrong-email',
  ] as const)('rejects a %s identity before any onboarding write', async (kind) => {
    if (kind === 'unverified') {
      user.emailVerified = null;
    }
    if (kind === 'disabled') {
      user.disabled = true;
    }
    if (kind === 'wrong-email') {
      user.email = 'elsewhere@example.test';
    }
    expect(await claimInvitesOnVerification(options)).toEqual([]);
    expect(members).toEqual([]);
    expect(workspaces).toBe(0);
    expect(mocks.inviteRead).not.toHaveBeenCalled();
  });
  it('rolls back membership if acceptance fails, then succeeds on retry', async () => {
    mocks.update.mockRejectedValueOnce(new Error('Write unavailable'));
    expect(await claimInvitesOnVerification(options)).toEqual([]);
    expect(members).toEqual([]);
    expect(invites[0].status).toBe('PENDING');
    expect(mocks.job).not.toHaveBeenCalled();
    expect(await claimInvitesOnVerification(options)).toHaveLength(1);
    expect(members).toEqual(['org-a']);
    expect(invites[0].status).toBe('ACCEPTED');
  });
  it('rolls back earlier invitations if a later membership write fails', async () => {
    invites.push(invite('b'));
    mocks.add.mockImplementation(async ({ organisationId }) => {
      if (organisationId === 'org-b') {
        throw new Error('Missing group');
      }
      members.push(organisationId);
    });
    expect(await claimInvitesOnVerification(options)).toEqual([]);
    expect(members).toEqual([]);
    expect(invites.map((row) => row.status)).toEqual(['PENDING', 'PENDING']);
    expect(mocks.personal).not.toHaveBeenCalled();
    expect(mocks.job).not.toHaveBeenCalled();
  });
  it('repairs historical partial membership without inserting or changing roles', async () => {
    members.push('org-a');
    expect(await claimInvitesOnVerification(options)).toHaveLength(1);
    expect(invites[0].status).toBe('ACCEPTED');
    expect(members).toEqual(['org-a']);
    expect(mocks.add).not.toHaveBeenCalled();
    expect(mocks.job).not.toHaveBeenCalled();
  });
  it('serializes repeated claims to one membership and notification', async () => {
    const results = await Promise.all(Array.from({ length: 4 }, () => claimInvitesOnVerification(options)));
    expect(results.flat()).toHaveLength(1);
    expect(members).toEqual(['org-a']);
    expect(mocks.job).toHaveBeenCalledOnce();
  });
  it('queries the current database email case-insensitively and pending only', async () => {
    await autoClaimInvitesOnSignup(signupOptions);
    expect(mocks.inviteRead).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          email: { equals: user.email, mode: 'insensitive' },
          status: 'PENDING',
          createdAt: { lte: user.emailVerified },
        },
      }),
    );
  });
  it('the signup-only helper does not create a fallback', async () => {
    invites = [];
    expect(await autoClaimInvitesOnSignup(signupOptions)).toEqual([]);
    expect(mocks.personal).not.toHaveBeenCalled();
  });
  it('creates a single complete fallback under concurrent retries', async () => {
    invites = [];
    await Promise.all(Array.from({ length: 4 }, () => claimInvitesOnVerification(options)));
    expect(workspaces).toBe(1);
    expect(mocks.personal).toHaveBeenCalledWith({
      userId: 7,
      transaction: prisma,
      throwErrorOnOrganisationCreationFailure: true,
    });
  });
  it('never creates a fallback on invite read failure; login retries', async () => {
    mocks.inviteRead.mockRejectedValueOnce(new Error('Read unavailable'));
    expect(await claimInvitesOnVerification(options)).toEqual([]);
    expect(mocks.personal).not.toHaveBeenCalled();
    expect(members).toEqual([]);
    await recoverOnboardingOnLogin(7);
    expect(members).toEqual(['org-a']);
  });
  it('rolls back a partial fallback and retries on login', async () => {
    invites = [];
    mocks.personal.mockImplementationOnce(async () => {
      members.push('partial');
      workspaces++;
      throw new Error('Team failed');
    });
    expect(await claimInvitesOnVerification(options)).toEqual([]);
    expect(workspaces).toBe(0);
    expect(members).toEqual([]);
    await recoverOnboardingOnLogin(7);
    expect(workspaces).toBe(1);
    expect(members).toEqual(['personal']);
  });
  it('preserves existing memberships without another personal organisation', async () => {
    invites = [];
    members.push('existing');
    await claimInvitesOnVerification(options);
    expect(members).toEqual(['existing']);
    expect(mocks.personal).not.toHaveBeenCalled();
  });
  it('notification failure cannot roll back or duplicate committed membership', async () => {
    mocks.job.mockRejectedValueOnce(new Error('Queue unavailable'));
    expect(await claimInvitesOnVerification(options)).toHaveLength(1);
    expect(await claimInvitesOnVerification(options)).toEqual([]);
    expect(members).toEqual(['org-a']);
    expect(mocks.job).toHaveBeenCalledOnce();
  });
  it('leaves invitations created after email verification for the normal acceptance flow', async () => {
    user.emailVerified = new Date('2026-09-10T00:00:00Z');
    invites = [{ ...invite('later'), createdAt: new Date('2026-09-11T00:00:00Z') }];
    members.push('existing-workspace');
    await recoverOnboardingOnLogin(7);
    expect(invites[0].status).toBe('PENDING');
    expect(members).toEqual(['existing-workspace']);
    expect(mocks.add).not.toHaveBeenCalled();
  });
  it('propagates signup claim failure and leaves no writes', async () => {
    mocks.inviteRead.mockRejectedValueOnce(new Error('DB unavailable'));
    await expect(autoClaimInvitesOnSignup(signupOptions)).rejects.toThrow('DB unavailable');
    expect(members).toEqual([]);
  });
});
describe('pending invitation detection', () => {
  it.each([true, false])('reports %s and retains email/status scope', async (found) => {
    vi.mocked(prisma.organisationMemberInvite.findFirst).mockResolvedValue(found ? ({ id: 'a' } as never) : null);
    expect(await hasPendingInvites(options.email)).toBe(found);
    expect(prisma.organisationMemberInvite.findFirst).toHaveBeenCalledWith({
      where: { email: { equals: options.email, mode: 'insensitive' }, status: 'PENDING' },
      select: { id: true },
    });
  });
});
