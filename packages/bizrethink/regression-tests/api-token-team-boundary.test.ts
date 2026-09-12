import { authenticatedMiddleware as authenticateV1 } from '@documenso/api/v1/middleware/authenticated';
import type { SessionUser } from '@documenso/auth/server/lib/session/session';
import { AppError, AppErrorCode } from '@documenso/lib/errors/app-error';
import { hashString } from '@documenso/lib/server-only/auth/hash';
import { getEnvelopeById } from '@documenso/lib/server-only/envelope/get-envelope-by-id';
import type { TEnvelope } from '@documenso/lib/types/envelope';
import { logger } from '@documenso/lib/utils/logger';
import type { TrpcContext } from '@documenso/trpc/server/context';
import { deleteDocumentRoute } from '@documenso/trpc/server/document-router/delete-document';
import { getEnvelopeRoute } from '@documenso/trpc/server/envelope-router/get-envelope';
import { getEnvelopesByIdsRoute } from '@documenso/trpc/server/envelope-router/get-envelopes-by-ids';
import { maybeAuthenticatedProcedure, router } from '@documenso/trpc/server/trpc';
import { DocumentVisibility, Role, TeamMemberRole } from '@prisma/client';
import { TsRestRequest } from '@ts-rest/serverless';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { envelopeFixture, matchesQuery, recipientFixture } from './api-token-team-fixture';

const { db, getTeam, webhook } = vi.hoisted(() => ({
  db: {
    apiToken: { findFirst: vi.fn(), updateMany: vi.fn() },
    envelope: { findFirst: vi.fn(), findMany: vi.fn(), findUnique: vi.fn(), delete: vi.fn() },
    user: { findUnique: vi.fn() },
    recipient: { update: vi.fn() },
    documentAuditLog: { create: vi.fn() },
    $transaction: vi.fn(),
  },
  getTeam: vi.fn(),
  webhook: vi.fn(),
}));

vi.mock('@documenso/prisma', () => ({ prisma: db }));
vi.mock('@documenso/lib/server-only/team/get-team', () => ({ getTeamById: getTeam }));
vi.mock('@documenso/lib/server-only/rate-limit/assert-organisation-rates-and-limits', () => ({
  assertOrganisationRatesAndLimits: vi.fn(),
}));
vi.mock('@documenso/lib/server-only/webhooks/trigger/trigger-webhook', () => ({ triggerWebhook: webhook }));
vi.mock('@documenso/lib/server-only/email/get-email-context', () => ({
  getEmailContext: vi.fn().mockResolvedValue({ emailLanguage: 'en', emailsDisabled: true }),
}));
vi.mock('@documenso/lib/jobs/client', () => ({ jobs: { triggerJob: vi.fn() } }));

// Real v2 routes, authentication, token validation, ID conversion, query builders
// and response schemas. Only DB/team lookup and external side effects are doubled.
const api = router({
  get: getEnvelopeRoute,
  getMany: getEnvelopesByIdsRoute,
  delete: deleteDocumentRoute,
  optionalAuth: maybeAuthenticatedProcedure
    .meta({ openapi: { method: 'GET', path: '/boundary-test' } })
    .query(async ({ ctx }) => {
      if (!ctx.user || !ctx.teamId) {
        throw new AppError(AppErrorCode.UNAUTHORIZED);
      }
      return await getEnvelopeById({
        id: { type: 'envelopeId', id: 'envelope_team_b' },
        userId: ctx.user.id,
        teamId: ctx.teamId,
        type: null,
      });
    }),
});

const user: SessionUser = {
  id: 7,
  name: 'Synthetic owner',
  email: 'owner@example.invalid',
  disabled: false,
  roles: [Role.USER],
  emailVerified: new Date('2026-09-12T00:00:00Z'),
  avatarImageId: null,
  signature: null,
  twoFactorEnabled: false,
};

const makeTokenRow = (teamId: number, legacy = false) => ({
  id: teamId,
  teamId,
  userId: legacy ? null : user.id,
  user: legacy ? null : user,
  expires: null as Date | null,
  lastUsedAt: new Date(),
  team: {
    id: teamId,
    name: `Synthetic team ${teamId}`,
    organisationId: `org_${teamId}`,
    organisation: {
      owner: user,
      organisationClaim: {},
    },
  },
});

const makeContext = (token: string | null = 'api_test_team_a'): TrpcContext => ({
  session: null,
  user: null,
  // A client-supplied team must not replace the credential's team.
  teamId: 20,
  req: new Request('http://audit.invalid/api/v2/envelope/envelope_team_b', {
    headers: token ? { authorization: `Bearer ${token}`, 'x-team-id': '20' } : {},
  }),
  res: new Response(),
  metadata: { auth: null, source: 'apiV2', requestMetadata: {} },
  logger,
});

const sessionContext = (): TrpcContext => ({
  ...makeContext(null),
  teamId: 10,
  user,
  session: {
    id: 'synthetic-session',
    sessionToken: 'synthetic-session',
    userId: user.id,
    createdAt: new Date(),
    updatedAt: new Date(),
    expiresAt: new Date(Date.now() + 60_000),
    ipAddress: null,
    userAgent: null,
  },
});

let rows: TEnvelope[];
let tokenA: ReturnType<typeof makeTokenRow>;
let teamEmail: { email: string } | null;
let teamRole: TeamMemberRole;

const findEnvelope = ({ where }: { where: Record<string, unknown> }) =>
  rows.find((row) => matchesQuery(row, where)) ?? null;

beforeEach(() => {
  vi.clearAllMocks();
  logger.level = 'silent';
  tokenA = makeTokenRow(10);
  teamEmail = null;
  teamRole = TeamMemberRole.ADMIN;
  rows = [
    envelopeFixture(),
    envelopeFixture({
      id: 'envelope_team_b',
      secondaryId: 'document_2',
      teamId: 20,
      title: 'Synthetic foreign document',
      team: { id: 20, url: 'team-b' },
    }),
  ];
  db.apiToken.findFirst.mockImplementation(async ({ where }: { where: { token: string } }) => {
    if (where.token === hashString('api_test_team_a')) {
      return structuredClone(tokenA);
    }
    if (where.token === hashString('api_test_team_b')) {
      return makeTokenRow(20);
    }
    return null;
  });
  db.apiToken.updateMany.mockResolvedValue({ count: 1 });
  getTeam.mockImplementation(async ({ teamId }: { teamId: number }) => {
    await Promise.resolve();
    return { id: teamId, teamEmail, currentTeamRole: teamRole };
  });
  db.envelope.findFirst.mockImplementation(findEnvelope);
  db.envelope.findUnique.mockImplementation(findEnvelope);
  db.envelope.findMany.mockImplementation(async ({ where }: { where: Record<string, unknown> }) =>
    rows.filter((row) => matchesQuery(row, where)),
  );
  db.envelope.delete.mockImplementation(async (args: Parameters<typeof findEnvelope>[0]) => {
    const found = findEnvelope(args);
    if (!found) {
      throw new Error('Missing synthetic envelope');
    }
    rows = rows.filter((row) => row.id !== found.id);
    return found;
  });
  db.user.findUnique.mockResolvedValue(user);
  db.recipient.update.mockResolvedValue({});
  db.documentAuditLog.create.mockResolvedValue({});
  db.$transaction.mockImplementation(async (callback: (transaction: typeof db) => Promise<unknown>) => callback(db));
  webhook.mockResolvedValue(undefined);
});

describe('A-02: authenticated API keys retain their issuing team', () => {
  it.each([false, true])('rejects foreign creator-owned envelopes (legacy token: %s)', async (legacy) => {
    tokenA = makeTokenRow(10, legacy);
    await expect(api.createCaller(makeContext()).get({ envelopeId: 'envelope_team_b' })).rejects.toMatchObject({
      cause: { code: AppErrorCode.NOT_FOUND },
    });
  });

  it('does not let team-email ownership widen the key to another team', async () => {
    teamEmail = { email: 'shared@example.invalid' };
    rows[1] = envelopeFixture({
      ...rows[1],
      userId: 8,
      user: { id: 8, name: 'Shared sender', email: teamEmail.email },
    });
    await expect(api.createCaller(makeContext()).get({ envelopeId: 'envelope_team_b' })).rejects.toMatchObject({
      cause: { code: AppErrorCode.NOT_FOUND },
    });
  });

  it('filters a mixed-team bulk request, preserving its authorized document', async () => {
    const result = await api.createCaller(makeContext()).getMany({
      ids: { type: 'envelopeId', ids: ['envelope_team_a', 'envelope_team_b'] },
    });
    expect(result.data.map((row) => row.id)).toEqual(['envelope_team_a']);
  });

  it('applies the same boundary to legacy numeric IDs in bulk requests', async () => {
    const result = await api.createCaller(makeContext()).getMany({ ids: { type: 'documentId', ids: [1, 2] } });
    expect(result.data.map((row) => row.secondaryId)).toEqual(['document_1']);
  });

  it('refuses a foreign delete before audit, webhook or destructive writes', async () => {
    await expect(api.createCaller(makeContext()).delete({ documentId: 2 })).rejects.toMatchObject({
      cause: { code: AppErrorCode.NOT_FOUND },
    });
    expect(db.envelope.delete).not.toHaveBeenCalled();
    expect(db.documentAuditLog.create).not.toHaveBeenCalled();
    expect(webhook).not.toHaveBeenCalled();
    expect(rows.some((row) => row.secondaryId === 'document_2')).toBe(true);
  });

  it('also refuses foreign recipient self-hide, even without ownership access', async () => {
    rows[1] = envelopeFixture({ ...rows[1], userId: 8, recipients: [recipientFixture(rows[1].id)] });
    await expect(api.createCaller(makeContext()).delete({ documentId: 2 })).rejects.toMatchObject({
      cause: { code: AppErrorCode.NOT_FOUND },
    });
    expect(db.recipient.update).not.toHaveBeenCalled();
    expect(db.envelope.delete).not.toHaveBeenCalled();
    expect(db.documentAuditLog.create).not.toHaveBeenCalled();
    expect(webhook).not.toHaveBeenCalled();
  });

  it('preserves a same-team recipient self-hide without granting document deletion', async () => {
    teamRole = TeamMemberRole.MEMBER;
    rows[0] = envelopeFixture({
      userId: 8,
      visibility: DocumentVisibility.ADMIN,
      recipients: [recipientFixture(rows[0].id)],
    });
    await expect(api.createCaller(makeContext()).delete({ documentId: 1 })).resolves.toEqual({ success: true });
    expect(db.recipient.update).toHaveBeenCalledTimes(1);
    expect(db.envelope.delete).not.toHaveBeenCalled();
    expect(db.documentAuditLog.create).not.toHaveBeenCalled();
  });

  it('preserves a human recipient self-hide across teams', async () => {
    rows[1] = envelopeFixture({ ...rows[1], userId: 8, recipients: [recipientFixture(rows[1].id)] });
    await expect(api.createCaller(sessionContext()).delete({ documentId: 2 })).resolves.toEqual({ success: true });
    expect(db.recipient.update).toHaveBeenCalledTimes(1);
    expect(db.envelope.delete).not.toHaveBeenCalled();
  });

  it('also scopes API authentication through the optional-auth middleware', async () => {
    await expect(api.createCaller(makeContext()).optionalAuth()).rejects.toMatchObject({
      cause: { code: AppErrorCode.NOT_FOUND },
    });
  });

  it.each([false, true])('keeps authorized same-team reads working (legacy token: %s)', async (legacy) => {
    tokenA = makeTokenRow(10, legacy);
    const result = await api.createCaller(makeContext()).get({ envelopeId: 'envelope_team_a' });
    expect(result.id).toBe('envelope_team_a');
    expect(result.teamId).toBe(10);
  });

  it('keeps an authorized same-team document delete working', async () => {
    await expect(api.createCaller(makeContext()).delete({ documentId: 1 })).resolves.toEqual({ success: true });
    expect(db.envelope.delete).toHaveBeenCalledTimes(1);
    expect(rows.map((row) => row.secondaryId)).toEqual(['document_2']);
  });

  it("retains role-based access to a colleague's document within the issuing team", async () => {
    rows[0] = envelopeFixture({ userId: 8, user: { id: 8, name: 'Colleague', email: 'colleague@example.invalid' } });
    const result = await api.createCaller(makeContext()).get({ envelopeId: 'envelope_team_a' });
    expect(result.userId).toBe(8);
  });

  it('still refuses documents hidden from a member in the issuing team', async () => {
    teamRole = TeamMemberRole.MEMBER;
    rows[0] = envelopeFixture({ userId: 8, visibility: DocumentVisibility.ADMIN });
    await expect(api.createCaller(makeContext()).get({ envelopeId: 'envelope_team_a' })).rejects.toMatchObject({
      cause: { code: AppErrorCode.NOT_FOUND },
    });
  });

  it("does not change a human session's existing ownership permissions", async () => {
    const result = await api.createCaller(sessionContext()).get({ envelopeId: 'envelope_team_b' });
    expect(result.teamId).toBe(20);
  });

  it('keeps simultaneous keys and a human session isolated across awaits', async () => {
    const [fromA, fromB, fromSession] = await Promise.all([
      api.createCaller(makeContext()).getMany({ ids: { type: 'documentId', ids: [1, 2] } }),
      api.createCaller(makeContext('api_test_team_b')).getMany({ ids: { type: 'documentId', ids: [1, 2] } }),
      api.createCaller(sessionContext()).getMany({ ids: { type: 'documentId', ids: [1, 2] } }),
    ]);
    expect(fromA.data.map((row) => row.teamId)).toEqual([10]);
    expect(fromB.data.map((row) => row.teamId)).toEqual([20]);
    expect(fromSession.data.map((row) => row.teamId)).toEqual([10, 20]);
  });

  it('still rejects invalid and expired credentials before querying envelopes', async () => {
    await expect(api.createCaller(makeContext('api_unknown')).get({ envelopeId: 'envelope_team_a' })).rejects.toThrow();
    tokenA.expires = new Date('2000-01-01T00:00:00Z');
    await expect(api.createCaller(makeContext()).get({ envelopeId: 'envelope_team_a' })).rejects.toMatchObject({
      cause: { code: AppErrorCode.EXPIRED_CODE },
    });
    expect(db.envelope.findFirst).not.toHaveBeenCalled();
  });
});

describe('A-02: v1 authentication reaches the shared boundary', () => {
  // Exercise the shipped v1 middleware and shared lookup. Full v1 HTTP routing
  // is covered separately by the Playwright spec using the real server and DB.
  const handler = authenticateV1(async (_args, apiUser, team) => {
    try {
      const envelope = await getEnvelopeById({
        id: { type: 'documentId', id: 2 },
        userId: apiUser.id,
        teamId: team.id,
        type: null,
      });
      return { status: 200, body: { id: envelope.id } };
    } catch (error) {
      return AppError.toRestAPIError(error);
    }
  });

  const requestV1 = (token: string) =>
    handler(
      { headers: { authorization: token } },
      { request: new TsRestRequest('http://audit.invalid/api/v1/documents/2'), responseHeaders: new Headers() },
    );

  it.each(['api_test_team_a', 'Bearer api_test_team_a'])('rejects foreign ownership with header %s', async (header) => {
    const response = await requestV1(header);
    expect(response.status).toBe(404);
    expect(response.body).toEqual({ message: 'Envelope could not be found' });
  });

  it("keeps the same document accessible through its own team's key", async () => {
    const response = await requestV1('Bearer api_test_team_b');
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ id: 'envelope_team_b' });
  });
});
