import { addUserToOrganisation } from '@documenso/lib/server-only/organisation/accept-organisation-invitation';
import { createPersonalOrganisation } from '@documenso/lib/server-only/organisation/create-organisation';
import { prisma } from '@documenso/prisma';
import { OrganisationMemberInviteStatus } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  autoClaimInvitesOnSignup,
  claimInvitesOnVerification,
  hasPendingInvites,
} from './auto-claim-invites-on-signup';

vi.mock('@documenso/prisma', () => ({
  prisma: {
    organisationMemberInvite: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    organisationMember: {
      count: vi.fn(),
    },
  },
}));

vi.mock('@documenso/lib/server-only/organisation/accept-organisation-invitation', () => ({
  addUserToOrganisation: vi.fn(),
}));

vi.mock('@documenso/lib/server-only/organisation/create-organisation', () => ({
  createPersonalOrganisation: vi.fn(),
}));

const mockedFindMany = vi.mocked(prisma.organisationMemberInvite.findMany);
const mockedFindFirst = vi.mocked(prisma.organisationMemberInvite.findFirst);
const mockedUpdate = vi.mocked(prisma.organisationMemberInvite.update);
const mockedMemberCount = vi.mocked(prisma.organisationMember.count);
const mockedAddUser = vi.mocked(addUserToOrganisation);
const mockedCreatePersonalOrg = vi.mocked(createPersonalOrganisation);

const inviteFixture = (overrides: Record<string, unknown> = {}) => ({
  id: 'invite-1',
  email: 'jane@example.com',
  organisationRole: 'MEMBER',
  status: OrganisationMemberInviteStatus.PENDING,
  organisation: {
    id: 'org-1',
    name: 'Acme Org',
    groups: [{ id: 'group-1', type: 'INTERNAL_ORGANISATION' }],
  },
  ...overrides,
});

beforeEach(() => {
  mockedFindMany.mockReset();
  mockedFindFirst.mockReset();
  mockedUpdate.mockReset();
  mockedMemberCount.mockReset();
  mockedAddUser.mockReset();
  mockedCreatePersonalOrg.mockReset();
  mockedAddUser.mockResolvedValue({} as never);
  mockedUpdate.mockResolvedValue({} as never);
  mockedCreatePersonalOrg.mockResolvedValue(undefined);
});

describe('autoClaimInvitesOnSignup', () => {
  it('returns empty array when no PENDING invites match the user email', async () => {
    mockedFindMany.mockResolvedValueOnce([]);
    const result = await autoClaimInvitesOnSignup({ userId: 1, userEmail: 'nobody@example.com' });
    expect(result).toEqual([]);
    expect(mockedAddUser).not.toHaveBeenCalled();
    expect(mockedUpdate).not.toHaveBeenCalled();
  });

  it('queries with case-insensitive email + PENDING status filter', async () => {
    mockedFindMany.mockResolvedValueOnce([]);
    await autoClaimInvitesOnSignup({ userId: 1, userEmail: 'Jane@Example.COM' });
    expect(mockedFindMany).toHaveBeenCalledOnce();
    const query = mockedFindMany.mock.calls[0][0] as {
      where: { email: { equals: string; mode: string }; status: string };
    };
    expect(query.where.email.equals).toBe('Jane@Example.COM');
    expect(query.where.email.mode).toBe('insensitive');
    expect(query.where.status).toBe(OrganisationMemberInviteStatus.PENDING);
  });

  it('accepts a single PENDING invite via addUserToOrganisation', async () => {
    mockedFindMany.mockResolvedValueOnce([inviteFixture()] as never);
    const result = await autoClaimInvitesOnSignup({ userId: 42, userEmail: 'jane@example.com' });

    expect(mockedAddUser).toHaveBeenCalledWith({
      userId: 42,
      organisationId: 'org-1',
      organisationGroups: [{ id: 'group-1', type: 'INTERNAL_ORGANISATION' }],
      organisationMemberRole: 'MEMBER',
    });
    expect(mockedUpdate).toHaveBeenCalledWith({
      where: { id: 'invite-1' },
      data: { status: OrganisationMemberInviteStatus.ACCEPTED },
    });
    expect(result).toEqual([
      {
        organisationId: 'org-1',
        organisationName: 'Acme Org',
        organisationRole: 'MEMBER',
        inviteId: 'invite-1',
      },
    ]);
  });

  it('accepts multiple PENDING invites across different orgs', async () => {
    mockedFindMany.mockResolvedValueOnce([
      inviteFixture({
        id: 'inv-a',
        organisation: { id: 'org-a', name: 'Org A', groups: [] },
        organisationRole: 'ADMIN',
      }),
      inviteFixture({
        id: 'inv-b',
        organisation: { id: 'org-b', name: 'Org B', groups: [] },
        organisationRole: 'MANAGER',
      }),
    ] as never);
    const result = await autoClaimInvitesOnSignup({ userId: 1, userEmail: 'jane@example.com' });

    expect(mockedAddUser).toHaveBeenCalledTimes(2);
    expect(mockedUpdate).toHaveBeenCalledTimes(2);
    expect(result.map((r) => r.organisationId)).toEqual(['org-a', 'org-b']);
    expect(result.map((r) => r.organisationRole)).toEqual(['ADMIN', 'MANAGER']);
  });

  it('continues processing other invites when one addUserToOrganisation fails', async () => {
    mockedFindMany.mockResolvedValueOnce([
      inviteFixture({ id: 'inv-a', organisation: { id: 'org-a', name: 'A', groups: [] } }),
      inviteFixture({ id: 'inv-b', organisation: { id: 'org-b', name: 'B', groups: [] } }),
      inviteFixture({ id: 'inv-c', organisation: { id: 'org-c', name: 'C', groups: [] } }),
    ] as never);

    // Make inv-b fail
    mockedAddUser
      .mockResolvedValueOnce({} as never)
      .mockRejectedValueOnce(new Error('addUser failed'))
      .mockResolvedValueOnce({} as never);

    const consoleErrSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const result = await autoClaimInvitesOnSignup({ userId: 1, userEmail: 'jane@example.com' });

    expect(mockedAddUser).toHaveBeenCalledTimes(3);
    // Only 2 updates (the failing one was skipped before update)
    expect(mockedUpdate).toHaveBeenCalledTimes(2);
    expect(result.map((r) => r.inviteId)).toEqual(['inv-a', 'inv-c']);
    expect(consoleErrSpy).toHaveBeenCalledWith(
      expect.stringContaining('[auto-claim-invites] Failed to accept invite inv-b'),
      expect.any(Error),
    );

    consoleErrSpy.mockRestore();
  });

  it('continues when update to ACCEPTED fails (logs but does NOT include in result)', async () => {
    mockedFindMany.mockResolvedValueOnce([
      inviteFixture({ id: 'inv-a', organisation: { id: 'org-a', name: 'A', groups: [] } }),
      inviteFixture({ id: 'inv-b', organisation: { id: 'org-b', name: 'B', groups: [] } }),
    ] as never);
    mockedUpdate.mockRejectedValueOnce(new Error('update failed')).mockResolvedValueOnce({} as never);

    const consoleErrSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const result = await autoClaimInvitesOnSignup({ userId: 1, userEmail: 'jane@example.com' });

    expect(mockedAddUser).toHaveBeenCalledTimes(2);
    // Both inv-a (failed update) and inv-b were attempted; only inv-b succeeded fully
    expect(result.map((r) => r.inviteId)).toEqual(['inv-b']);
    expect(consoleErrSpy).toHaveBeenCalled();

    consoleErrSpy.mockRestore();
  });

  it('propagates findMany errors (catastrophic — caller decides)', async () => {
    mockedFindMany.mockRejectedValueOnce(new Error('DB down'));
    // The helper does NOT catch the findMany error — caller (onCreateUserHook
    // in create-user.ts) has its own catch that falls back to Personal Org.
    await expect(autoClaimInvitesOnSignup({ userId: 1, userEmail: 'jane@example.com' })).rejects.toThrow('DB down');
  });
});

describe('hasPendingInvites (overlay 071)', () => {
  it('returns true when a PENDING invite matches the email', async () => {
    mockedFindFirst.mockResolvedValueOnce({ id: 'invite-1' } as never);
    await expect(hasPendingInvites('jane@example.com')).resolves.toBe(true);
  });

  it('returns false when no PENDING invite matches the email', async () => {
    mockedFindFirst.mockResolvedValueOnce(null);
    await expect(hasPendingInvites('nobody@example.com')).resolves.toBe(false);
  });

  it('queries case-insensitively and for PENDING only', async () => {
    mockedFindFirst.mockResolvedValueOnce(null);
    await hasPendingInvites('Jane@Example.COM');
    const query = mockedFindFirst.mock.calls[0][0] as {
      where: { email: { equals: string; mode: string }; status: string };
    };
    expect(query.where.email.equals).toBe('Jane@Example.COM');
    expect(query.where.email.mode).toBe('insensitive');
    expect(query.where.status).toBe(OrganisationMemberInviteStatus.PENDING);
  });
});

describe('claimInvitesOnVerification (overlay 071)', () => {
  it('claims pending invites for the verified user and skips the Personal Org', async () => {
    mockedFindMany.mockResolvedValueOnce([inviteFixture()] as never);

    const result = await claimInvitesOnVerification({ userId: 42, email: 'jane@example.com' });

    expect(mockedAddUser).toHaveBeenCalledOnce();
    expect(result.map((r) => r.inviteId)).toEqual(['invite-1']);
    expect(mockedCreatePersonalOrg).not.toHaveBeenCalled();
  });

  it('creates the Personal Org fallback when nothing was accepted and the user has zero memberships', async () => {
    mockedFindMany.mockResolvedValueOnce([]);
    mockedMemberCount.mockResolvedValueOnce(0);

    await claimInvitesOnVerification({ userId: 42, email: 'jane@example.com' });

    expect(mockedMemberCount).toHaveBeenCalledWith({ where: { userId: 42 } });
    expect(mockedCreatePersonalOrg).toHaveBeenCalledWith({ userId: 42 });
  });

  it('does NOT create a Personal Org when nothing was accepted but the user already has a membership', async () => {
    mockedFindMany.mockResolvedValueOnce([]);
    mockedMemberCount.mockResolvedValueOnce(1);

    await claimInvitesOnVerification({ userId: 42, email: 'jane@example.com' });

    expect(mockedCreatePersonalOrg).not.toHaveBeenCalled();
  });

  it('creates the Personal Org fallback when every invite failed to claim and there are zero memberships', async () => {
    mockedFindMany.mockResolvedValueOnce([inviteFixture()] as never);
    mockedAddUser.mockRejectedValueOnce(new Error('addUser failed'));
    mockedMemberCount.mockResolvedValueOnce(0);
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    await claimInvitesOnVerification({ userId: 42, email: 'jane@example.com' });

    expect(mockedCreatePersonalOrg).toHaveBeenCalledWith({ userId: 42 });
    errorSpy.mockRestore();
  });

  it('swallows and logs errors so email verification never fails', async () => {
    mockedFindMany.mockRejectedValueOnce(new Error('DB down'));
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    await expect(claimInvitesOnVerification({ userId: 42, email: 'jane@example.com' })).resolves.toEqual([]);
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining('[claim-invites-on-verification]'),
      expect.any(Error),
    );
    errorSpy.mockRestore();
  });

  it('swallows a Personal Org fallback failure too', async () => {
    mockedFindMany.mockResolvedValueOnce([]);
    mockedMemberCount.mockResolvedValueOnce(0);
    mockedCreatePersonalOrg.mockRejectedValueOnce(new Error('org create failed'));
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    await expect(claimInvitesOnVerification({ userId: 42, email: 'jane@example.com' })).resolves.toEqual([]);
    expect(errorSpy).toHaveBeenCalled();
    errorSpy.mockRestore();
  });
});
