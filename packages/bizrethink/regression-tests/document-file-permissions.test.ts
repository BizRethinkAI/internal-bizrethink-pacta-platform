import { AppError, AppErrorCode } from '@documenso/lib/errors/app-error';
import { logger } from '@documenso/lib/utils/logger';
import { DocumentVisibility, EnvelopeType, TeamMemberRole, TemplateType } from '@prisma/client';
import { Hono } from 'hono';
import { SignJWT } from 'jose';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { filesRoute } from '../../../apps/remix/server/api/files/files';
import type { HonoEnv } from '../../../apps/remix/server/router';
import { envelopeFixture } from './api-token-team-fixture';
import { matchesPermissionQuery, permissionTeam, permissionUser } from './document-permission-fixture';

const { db, getTeam, session, readFile } = vi.hoisted(() => ({
  db: {
    apiToken: { findFirst: vi.fn() },
    envelope: { findFirst: vi.fn(), findUnique: vi.fn() },
    envelopeItem: { findFirst: vi.fn() },
    team: { findFirst: vi.fn() },
  },
  getTeam: vi.fn(),
  session: vi.fn(),
  readFile: vi.fn(),
}));
vi.mock('@documenso/prisma', () => ({ prisma: db }));
vi.mock('@documenso/lib/server-only/team/get-team', () => ({ getTeamById: getTeam }));
vi.mock('@documenso/auth/server/lib/utils/get-session', () => ({ getOptionalSession: session }));
vi.mock('@documenso/lib/universal/upload/get-file.server', () => ({ getFileServerSide: readFile }));
vi.mock('@documenso/lib/universal/upload/put-file.server', () => ({ putNormalizedPdfFileServerSide: vi.fn() }));
const makeEnvelope = () => ({
  ...envelopeFixture({ userId: 8, visibility: DocumentVisibility.ADMIN }),
  team: { ...permissionTeam(), organisation: { teams: [permissionTeam()] } },
  envelopeItems: [
    {
      id: 'item_test',
      envelopeId: 'envelope_team_a',
      title: 'Synthetic PDF',
      order: 0,
      documentDataId: 'data_test',
      documentData: { id: 'data_test', type: 'BYTES' as const, data: 'pdf', initialData: 'pdf' },
    },
  ],
});
let envelope: ReturnType<typeof makeEnvelope> | null;
let role: TeamMemberRole;
const app = new Hono<HonoEnv>()
  .use('*', async (c, next) => {
    c.set('logger', logger);
    await next();
  })
  .route('/', filesRoute);
const paths = [
  '/envelope/envelope_team_a/envelopeItem/item_test',
  '/envelope/envelope_team_a/envelopeItem/item_test/download/original',
  '/envelope/envelope_team_a/envelopeItem/item_test/dataId/data_test/current/item.pdf',
];
beforeEach(() => {
  vi.clearAllMocks();
  logger.level = 'silent';
  envelope = makeEnvelope();
  role = TeamMemberRole.MEMBER;
  db.apiToken.findFirst.mockResolvedValue(null);
  session.mockResolvedValue({ user: permissionUser, session: { id: 'synthetic' }, isAuthenticated: true });
  getTeam.mockImplementation(async ({ teamId }: { teamId: number }) => {
    if (teamId !== 10) {
      throw new AppError(AppErrorCode.NOT_FOUND, { message: 'Team not found' });
    }
    return permissionTeam(teamId, role);
  });
  const findEnvelope = async ({ where }: { where: Record<string, unknown> }) =>
    envelope && matchesPermissionQuery(envelope, where) ? envelope : null;
  db.envelope.findFirst.mockImplementation(findEnvelope);
  db.envelope.findUnique.mockImplementation(findEnvelope);
  db.envelopeItem.findFirst.mockImplementation(async ({ where }: { where: Record<string, unknown> }) => {
    const item = envelope && { ...envelope.envelopeItems[0], envelope };
    return item && matchesPermissionQuery(item, where) ? item : null;
  });
  db.team.findFirst.mockResolvedValue(null);
  readFile.mockResolvedValue(new TextEncoder().encode('%PDF-test'));
});

describe('A-13 and A-23 actual PDF HTTP routes', () => {
  it.each([
    undefined,
    'envelopeId:envelope_team_a',
  ])('does not let delegated scope %s borrow a sibling team role for an organisation template', async (scope) => {
    if (!envelope) {
      throw new Error('Fixture missing');
    }
    envelope.type = EnvelopeType.TEMPLATE;
    envelope.templateType = TemplateType.ORGANISATION;
    envelope.team.organisation.teams = [permissionTeam(), permissionTeam(20, TeamMemberRole.ADMIN)];
    const secret = 'synthetic-a13-presign-test-material-only';
    db.apiToken.findFirst.mockResolvedValue({
      id: 42,
      token: secret,
      userId: permissionUser.id,
      teamId: 10,
      expires: null,
      user: permissionUser,
      team: { organisation: { owner: { disabled: false } } },
    });
    const token = await new SignJWT({
      sub: '42',
      aud: '10',
      exp: Math.floor(Date.now() / 1000) + 600,
      ...(scope ? { scope } : {}),
    })
      .setProtectedHeader({ alg: 'HS256' })
      .sign(new TextEncoder().encode(secret));
    for (const [path, parameter] of [
      [paths[0], 'token'],
      [paths[2], 'presignToken'],
    ]) {
      envelope.visibility = DocumentVisibility.ADMIN;
      // The human can select their admin team; this delegated key cannot.
      expect((await app.request(path)).status).toBe(200);
      readFile.mockClear();
      expect((await app.request(`${path}?${parameter}=${encodeURIComponent(token)}`)).status).toBe(404);
      expect(readFile).not.toHaveBeenCalled();
      envelope.visibility = DocumentVisibility.EVERYONE;
      expect((await app.request(`${path}?${parameter}=${encodeURIComponent(token)}`)).status).toBe(200);
    }
  });
  for (const path of paths) {
    it(`denies a member the admin-only PDF before storage: ${path}`, async () => {
      const response = await app.request(path, { headers: { 'If-None-Match': 'known-etag' } });
      expect(response.status).toBe(404);
      expect(await response.json()).toEqual({ error: 'Not found' });
      expect(readFile).not.toHaveBeenCalled();
    });
    it(`keeps owner, admin and visible-member access: ${path}`, async () => {
      role = TeamMemberRole.ADMIN;
      expect((await app.request(path)).status).toBe(200);
      role = TeamMemberRole.MEMBER;
      if (!envelope) {
        throw new Error('Fixture missing');
      }
      envelope.userId = permissionUser.id;
      expect((await app.request(path)).status).toBe(200);
      envelope.userId = 8;
      envelope.visibility = DocumentVisibility.EVERYONE;
      const response = await app.request(path);
      expect(response.status).toBe(200);
      expect(await response.text()).toBe('%PDF-test');
      expect(response.headers.get('cache-control')).toContain('private');
      expect(response.headers.get('cache-control')).toContain('no-store');
    });
    it(`returns the identical body/status for absent and foreign objects: ${path}`, async () => {
      if (!envelope) {
        throw new Error('Fixture missing');
      }
      envelope.teamId = 20;
      envelope.team = { ...permissionTeam(20, TeamMemberRole.ADMIN, 8), organisation: { teams: [] } };
      const foreign = await app.request(path);
      envelope = null;
      const absent = await app.request(path);
      expect(foreign.status).toBe(404);
      expect(absent.status).toBe(404);
      expect(await foreign.json()).toEqual(await absent.json());
      expect(readFile).not.toHaveBeenCalled();
    });
    it(`does not borrow the old team's role if the document moves during authorization: ${path}`, async () => {
      getTeam.mockImplementationOnce(async () => {
        if (!envelope) {
          throw new Error('Fixture missing');
        }
        envelope.teamId = 20;
        return await Promise.resolve(permissionTeam(10, TeamMemberRole.ADMIN));
      });
      const response = await app.request(path);
      expect(response.status).toBe(404);
      expect(readFile).not.toHaveBeenCalled();
    });
    it(`does not turn a membership database failure into file access: ${path}`, async () => {
      getTeam.mockRejectedValue(new Error('Synthetic membership database failure'));
      const response = await app.request(path);
      expect(response.status).toBe(500);
      expect(readFile).not.toHaveBeenCalled();
    });
  }
  it('preserves visible organisation-shared templates, but refuses hidden ones', async () => {
    if (!envelope) {
      throw new Error('Fixture missing');
    }
    envelope.type = EnvelopeType.TEMPLATE;
    envelope.templateType = TemplateType.ORGANISATION;
    envelope.teamId = 20;
    envelope.team = { ...permissionTeam(20, TeamMemberRole.ADMIN, 8), organisation: { teams: [permissionTeam()] } };
    db.team.findFirst.mockResolvedValue({ id: 20 });
    envelope.visibility = DocumentVisibility.EVERYONE;
    expect((await app.request(paths[0])).status).toBe(200);
    envelope.visibility = DocumentVisibility.ADMIN;
    readFile.mockClear();
    expect((await app.request(paths[0])).status).toBe(404);
    expect(readFile).not.toHaveBeenCalled();
  });
});
