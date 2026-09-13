import type { SessionUser } from '@documenso/auth/server/lib/session/session';
import { logger } from '@documenso/lib/utils/logger';
import type { TrpcContext } from '@documenso/trpc/server/context';
import { Role, TeamMemberRole } from '@prisma/client';

export const permissionUser: SessionUser = {
  id: 7,
  name: 'Synthetic member',
  email: 'member@example.invalid',
  disabled: false,
  roles: [Role.USER],
  emailVerified: new Date('2026-09-12'),
  avatarImageId: null,
  signature: null,
  twoFactorEnabled: false,
};

export const permissionContext = (teamId = 10): TrpcContext => ({
  user: permissionUser,
  session: {
    id: 'permission-session',
    sessionToken: 'synthetic-only',
    userId: permissionUser.id,
    createdAt: new Date(),
    updatedAt: new Date(),
    expiresAt: new Date(Date.now() + 60_000),
    ipAddress: null,
    userAgent: null,
  },
  teamId,
  req: new Request('http://audit.invalid/api/trpc', { headers: { 'x-team-id': String(teamId) } }),
  res: new Response(),
  logger,
  metadata: { auth: null, source: 'app', requestMetadata: {} },
});

export const permissionTeam = (id = 10, role: TeamMemberRole = TeamMemberRole.MEMBER, userId = 7) => ({
  id,
  url: `team-${id}`,
  organisationId: 'org_a',
  teamEmail: null as { email: string } | null,
  currentTeamRole: role,
  teamGroups: [
    {
      teamRole: role,
      organisationGroup: { organisationGroupMembers: [{ organisationMember: { userId } }] },
    },
  ],
});

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** A strict database predicate double, with no knowledge of permission policy.
 * Real HTTP/PostgreSQL tests independently exercise the database semantics. */
export const matchesPermissionQuery = (record: Record<string, unknown>, query: Record<string, unknown>): boolean =>
  Object.entries(query).every(([key, expected]) => {
    if (expected === undefined) {
      return true;
    }
    if (key === 'AND' || key === 'OR' || key === 'NOT') {
      const operands = Array.isArray(expected) ? expected : [expected];
      const results = operands.map((operand) => {
        if (!isRecord(operand)) {
          throw new Error('Unsupported predicate operand');
        }
        return matchesPermissionQuery(record, operand);
      });
      return key === 'OR'
        ? results.some(Boolean)
        : key === 'NOT'
          ? results.every((value) => !value)
          : results.every(Boolean);
    }
    if (!(key in record)) {
      throw new Error(`Unsupported fixture column: ${key}`);
    }
    const actual = record[key];
    if (!isRecord(expected)) {
      return actual === expected;
    }
    if ('in' in expected && Array.isArray(expected.in)) {
      return expected.in.includes(actual);
    }
    if ('notIn' in expected && Array.isArray(expected.notIn)) {
      return !expected.notIn.includes(actual);
    }
    if ('not' in expected && !isRecord(expected.not)) {
      return actual !== expected.not;
    }
    if ('some' in expected && isRecord(expected.some) && Array.isArray(actual)) {
      const operand = expected.some;
      return actual.some((item: unknown) => isRecord(item) && matchesPermissionQuery(item, operand));
    }
    if ('contains' in expected && typeof actual === 'string' && typeof expected.contains === 'string') {
      return expected.mode === 'insensitive'
        ? actual.toLowerCase().includes(expected.contains.toLowerCase())
        : actual.includes(expected.contains);
    }
    if (actual === null) {
      return false;
    }
    if (!isRecord(actual)) {
      throw new Error(`Unsupported filter: ${key}`);
    }
    return matchesPermissionQuery(actual, expected);
  });
