import { OrganisationMemberInviteStatus } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { addUserToOrganisation } from '@documenso/lib/server-only/organisation/accept-organisation-invitation';
import { prisma } from '@documenso/prisma';

import { autoClaimInvitesOnSignup } from './auto-claim-invites-on-signup';

vi.mock('@documenso/prisma', () => ({
  prisma: {
    organisationMemberInvite: {
      findMany: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock('@documenso/lib/server-only/organisation/accept-organisation-invitation', () => ({
  addUserToOrganisation: vi.fn(),
}));

const mockedFindMany = vi.mocked(prisma.organisationMemberInvite.findMany);
const mockedUpdate = vi.mocked(prisma.organisationMemberInvite.update);
const mockedAddUser = vi.mocked(addUserToOrganisation);

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
  mockedUpdate.mockReset();
  mockedAddUser.mockReset();
  mockedAddUser.mockResolvedValue({} as never);
  mockedUpdate.mockResolvedValue({} as never);
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
      inviteFixture({ id: 'inv-a', organisation: { id: 'org-a', name: 'Org A', groups: [] }, organisationRole: 'ADMIN' }),
      inviteFixture({ id: 'inv-b', organisation: { id: 'org-b', name: 'Org B', groups: [] }, organisationRole: 'MANAGER' }),
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
    mockedUpdate
      .mockRejectedValueOnce(new Error('update failed'))
      .mockResolvedValueOnce({} as never);

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
    await expect(
      autoClaimInvitesOnSignup({ userId: 1, userEmail: 'jane@example.com' }),
    ).rejects.toThrow('DB down');
  });
});
