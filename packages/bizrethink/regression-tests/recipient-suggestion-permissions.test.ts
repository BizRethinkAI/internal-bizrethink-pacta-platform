import { AppError, AppErrorCode } from '@documenso/lib/errors/app-error';
import { logger } from '@documenso/lib/utils/logger';
import { findRecipientSuggestionsRoute } from '@documenso/trpc/server/recipient-router/find-recipient-suggestions';
import { router } from '@documenso/trpc/server/trpc';
import { DocumentVisibility, TeamMemberRole } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { envelopeFixture } from './api-token-team-fixture';
import { matchesPermissionQuery, permissionContext, permissionTeam } from './document-permission-fixture';

const { db, getTeam } = vi.hoisted(() => ({
  db: { recipient: { findMany: vi.fn() }, organisationMember: { findMany: vi.fn() } },
  getTeam: vi.fn(),
}));
vi.mock('@documenso/prisma', () => ({ prisma: db }));
vi.mock('@documenso/lib/server-only/team/get-team', () => ({ getTeamById: getTeam }));
const api = router({ suggestions: findRecipientSuggestionsRoute });
let role: TeamMemberRole;
const rows = () => [
  {
    name: 'Visible recipient',
    email: 'visible@example.invalid',
    envelope: { ...envelopeFixture({ userId: 8 }), team: permissionTeam() },
  },
  {
    name: 'Restricted recipient',
    email: 'restricted@example.invalid',
    envelope: { ...envelopeFixture({ userId: 8, visibility: DocumentVisibility.ADMIN }), team: permissionTeam() },
  },
  {
    name: 'Own recipient',
    email: 'own@example.invalid',
    envelope: { ...envelopeFixture({ visibility: DocumentVisibility.ADMIN }), team: permissionTeam() },
  },
];

beforeEach(() => {
  vi.clearAllMocks();
  logger.level = 'silent';
  role = TeamMemberRole.MEMBER;
  getTeam.mockImplementation(async ({ teamId }: { teamId: number }) => {
    if (teamId !== 10) {
      throw new AppError(AppErrorCode.NOT_FOUND, { message: 'Team not found' });
    }
    return permissionTeam(10, role);
  });
  db.recipient.findMany.mockImplementation(async ({ where }: { where: Record<string, unknown> }) =>
    rows().filter((row) => matchesPermissionQuery(row, where)),
  );
  db.organisationMember.findMany.mockImplementation(async ({ where }: { where: Record<string, unknown> }) =>
    [10, 20]
      .map((teamId) => ({
        user: { id: teamId, name: `Team ${teamId} member`, email: `team${teamId}@example.invalid` },
        organisationGroupMembers: [{ group: { teamGroups: [{ teamId }] } }],
      }))
      .filter((row) => matchesPermissionQuery(row, where)),
  );
});

describe('A-12 recipient suggestions use current team and document permissions', () => {
  it.each(['', 'team20'])('denies a foreign team with query %j before either directory lookup', async (query) => {
    await expect(api.createCaller(permissionContext(20)).suggestions({ query })).rejects.toMatchObject({
      cause: { code: AppErrorCode.NOT_FOUND },
    });
    expect(db.recipient.findMany).not.toHaveBeenCalled();
    expect(db.organisationMember.findMany).not.toHaveBeenCalled();
  });
  it('does not suggest recipients from documents hidden from the caller role', async () => {
    const { results } = await api.createCaller(permissionContext()).suggestions({ query: '' });
    expect(results.map((row) => row.email)).not.toContain('restricted@example.invalid');
    expect(results.map((row) => row.email)).toEqual(
      expect.arrayContaining(['visible@example.invalid', 'own@example.invalid', 'team10@example.invalid']),
    );
  });
  it('keeps admin-visible history and normal matching suggestions', async () => {
    role = TeamMemberRole.ADMIN;
    const { results } = await api.createCaller(permissionContext()).suggestions({ query: 'restricted' });
    expect(results.map((row) => row.email)).toEqual(['restricted@example.invalid']);
  });
  it('fails before directory reads when membership lookup is unavailable', async () => {
    getTeam.mockRejectedValue(new Error('Synthetic membership read failure'));
    await expect(api.createCaller(permissionContext()).suggestions({ query: '' })).rejects.toThrow(
      'Synthetic membership read failure',
    );
    expect(db.recipient.findMany).not.toHaveBeenCalled();
    expect(db.organisationMember.findMany).not.toHaveBeenCalled();
  });
});
