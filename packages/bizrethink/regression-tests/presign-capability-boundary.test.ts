import { verifyEmbeddingPresignToken } from '@documenso/lib/server-only/embedding-presign/verify-embedding-presign-token';
import { logger } from '@documenso/lib/utils/logger';
import type { TrpcContext } from '@documenso/trpc/server/context';
import { createEmbeddingDocumentRoute } from '@documenso/trpc/server/embedding-router/create-embedding-document';
import { createEmbeddingEnvelopeRoute } from '@documenso/trpc/server/embedding-router/create-embedding-envelope';
import { createEmbeddingTemplateRoute } from '@documenso/trpc/server/embedding-router/create-embedding-template';
import { router } from '@documenso/trpc/server/trpc';
import { Hono } from 'hono';
import type { JWTPayload } from 'jose';
import { SignJWT } from 'jose';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { filesRoute } from '../../../apps/remix/server/api/files/files';
import type { HonoEnv } from '../../../apps/remix/server/router';
import { getApiTokenEnvelopeScope } from '../server-only/api-token-team-scope';
import { envelopeFixture, matchesQuery } from './api-token-team-fixture';

const { db, team, session, readFile, uploadFile, createEnvelope, createEnvelopeCaller } = vi.hoisted(() => ({
  db: {
    apiToken: { findFirst: vi.fn() },
    envelope: { findFirst: vi.fn() },
    envelopeItem: { findFirst: vi.fn() },
    recipient: { create: vi.fn() },
    field: { createMany: vi.fn() },
  },
  team: vi.fn(),
  session: vi.fn(),
  readFile: vi.fn(),
  uploadFile: vi.fn(),
  createEnvelope: vi.fn(),
  createEnvelopeCaller: vi.fn(),
}));
vi.mock('@documenso/prisma', () => ({ prisma: db }));
vi.mock('@documenso/lib/server-only/team/get-team', () => ({ getTeamById: team }));
vi.mock('@documenso/auth/server/lib/utils/get-session', () => ({ getOptionalSession: session }));
vi.mock('@documenso/lib/universal/upload/get-file.server', () => ({ getFileServerSide: readFile }));
vi.mock('@documenso/lib/universal/upload/put-file.server', () => ({ putNormalizedPdfFileServerSide: uploadFile }));
vi.mock('@documenso/lib/server-only/envelope/create-envelope', () => ({ createEnvelope }));
vi.mock('@documenso/trpc/server/envelope-router/create-envelope', () => ({
  createEnvelopeRouteCaller: createEnvelopeCaller,
}));

// Synthetic signing material, never an application credential.
const key = 'a03-unit-fixture-only-not-a-real-api-token-hash';
const now = new Date('2026-09-12T09:00:00Z');
const parentFixture = () => ({
  id: 42,
  token: key,
  userId: 7,
  teamId: 10,
  expires: null as Date | null,
  user: { id: 7, name: 'Synthetic issuer', email: 'issuer@example.invalid', disabled: false },
  team: { id: 10, organisation: { owner: { id: 7, disabled: false } } },
});
let parent: ReturnType<typeof parentFixture>;
let mutationTeams: Array<{ teamId?: number }>;
const token = async (scope?: unknown, claims: JWTPayload = {}, alg = 'HS256', secret = key) =>
  new SignJWT({
    sub: '42',
    aud: '10',
    exp: Math.floor(now.getTime() / 1000) + 3600,
    ...(scope === undefined ? {} : { scope }),
    ...claims,
  })
    .setProtectedHeader({ alg })
    .sign(new TextEncoder().encode(secret));
const fixture = (id: string, secondaryId: string, teamId: number) => {
  const dataId = `data_${id}`;
  const envelope = { ...envelopeFixture({ id, secondaryId, teamId }), signatureLevel: 'SES' };
  const item = {
    id: `item_${id}`,
    envelopeId: id,
    documentDataId: dataId,
    title: 'Synthetic PDF',
    order: 0,
    documentData: { id: dataId, type: 'BYTES' as const, data: '%PDF-test', initialData: '%PDF-test' },
  };
  return { ...envelope, envelopeItems: [item] };
};
const local = fixture('envelope_local', 'document_1', 10);
const sibling = fixture('envelope_sibling', 'document_2', 10);
const foreign = fixture('envelope_foreign', 'document_3', 20);
const envelopes = [local, sibling, foreign];
const app = new Hono<HonoEnv>()
  .use('*', async (c, next) => {
    c.set('logger', logger);
    await next();
  })
  .route('/', filesRoute);
const paths = [
  (envelope: typeof local, jwt: string) =>
    `/envelope/${envelope.id}/envelopeItem/${envelope.envelopeItems[0].id}?token=${jwt}`,
  (envelope: typeof local, jwt: string) =>
    `/envelope/${envelope.id}/envelopeItem/${envelope.envelopeItems[0].id}/dataId/${envelope.envelopeItems[0].documentDataId}/current/item.pdf?presignToken=${jwt}`,
];
const api = router({
  createDocument: createEmbeddingDocumentRoute,
  createTemplate: createEmbeddingTemplateRoute,
  createEnvelope: createEmbeddingEnvelopeRoute,
});
const context = (jwt: string): TrpcContext => ({
  user: null,
  session: null,
  teamId: undefined,
  req: new Request('http://audit.invalid/api/trpc', { headers: { authorization: `Bearer ${jwt}` } }),
  res: new Response(),
  logger,
  metadata: { auth: null, source: 'app', requestMetadata: {} },
});

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(now);
  logger.level = 'silent';
  parent = parentFixture();
  mutationTeams = [];
  db.apiToken.findFirst.mockImplementation(async ({ where }: { where: { id: number } }) =>
    where.id === parent.id ? parent : null,
  );
  team.mockImplementation(async ({ teamId }: { teamId: number }) => ({
    id: teamId,
    organisationId: 'org_test',
    currentTeamRole: 'ADMIN',
    teamEmail: null,
  }));
  session.mockResolvedValue({ user: null, session: null });
  readFile.mockResolvedValue(new TextEncoder().encode('%PDF-test'));
  db.envelope.findFirst.mockImplementation(
    async ({ where }: { where: Record<string, unknown> }) => envelopes.find((row) => matchesQuery(row, where)) ?? null,
  );
  db.envelopeItem.findFirst.mockImplementation(async ({ where }: { where: Record<string, unknown> }) => {
    const items = envelopes.flatMap((envelope) => envelope.envelopeItems.map((item) => ({ ...item, envelope })));
    return items.find((row) => matchesQuery(row, where)) ?? null;
  });
  createEnvelope.mockImplementation(async ({ data }: { data: { type: string } }) => {
    mutationTeams.push(getApiTokenEnvelopeScope(10));
    return {
      id: 'envelope_created',
      secondaryId: data.type === 'TEMPLATE' ? 'template_5' : 'document_5',
      envelopeItems: [{ id: 'item_created' }],
    };
  });
  createEnvelopeCaller.mockImplementation(async () => {
    mutationTeams.push(getApiTokenEnvelopeScope(10));
    return { id: 'envelope_created', recipients: [] };
  });
});
afterEach(() => vi.useRealTimers());

describe('A-03 real presign verifier', () => {
  it('enforces the parent team when authorizing a resource operation, even for a team-wide pass', async () => {
    const options = { token: await token(), scope: 'documentId:3', operation: 'update' as const };
    await expect(verifyEmbeddingPresignToken(options)).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
  });
  it('preserves a permitted resource operation for scoped and team-wide passes', async () => {
    for (const scope of [undefined, 'documentId:1']) {
      const options = { token: await token(scope), scope: 'documentId:1', operation: 'update' as const };
      await expect(verifyEmbeddingPresignToken(options)).resolves.toMatchObject({ teamId: 10 });
    }
  });
  it('preserves a valid team-wide token and the legacy user audience', async () => {
    for (const aud of ['10', '7']) {
      await expect(verifyEmbeddingPresignToken({ token: await token(undefined, { aud }) })).resolves.toMatchObject({
        userId: 7,
        teamId: 10,
      });
    }
  });
  it.each([
    'expired',
    'expires now',
    'disabled issuer',
    'disabled organisation owner',
    'membership removed',
  ])('rejects an unusable parent: %s', async (reason) => {
    if (reason === 'expired' || reason === 'expires now') {
      parent.expires = new Date(now.getTime() - (reason === 'expired' ? 1000 : 0));
    } else if (reason === 'disabled issuer') {
      parent.user.disabled = true;
    } else if (reason === 'disabled organisation owner') {
      parent.team.organisation.owner.disabled = true;
    } else {
      team.mockRejectedValue(new Error('Synthetic membership removed'));
    }
    await expect(verifyEmbeddingPresignToken({ token: await token() })).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
  });
  it.each(['deleted', 'DB outage'])('does not fall back when parent lookup fails: %s', async (reason) => {
    if (reason === 'deleted') {
      db.apiToken.findFirst.mockResolvedValue(null);
    } else {
      db.apiToken.findFirst.mockRejectedValue(new Error('Synthetic DB outage'));
    }
    await expect(verifyEmbeddingPresignToken({ token: await token() })).rejects.toBeDefined();
  });
  it('preserves signature, expiry and audience checks', async () => {
    const invalid = [
      await token(undefined, {}, 'HS256', 'wrong-synthetic-key'),
      await token(undefined, { exp: 1 }),
      await token(undefined, { aud: '999' }),
    ];
    for (const jwt of invalid) {
      await expect(verifyEmbeddingPresignToken({ token: jwt })).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
    }
  });
  it.each([
    '',
    'documentId:0',
    'documentId:1x',
    'other:1',
    'envelopeId:',
    { resource: 1 },
  ])('rejects malformed scope %j', async (scope) => {
    await expect(verifyEmbeddingPresignToken({ token: await token(scope) })).rejects.toMatchObject({
      code: 'UNAUTHORIZED',
    });
  });
  it('requires a JWT expiry and the issuance algorithm', async () => {
    for (const jwt of [await token(undefined, { exp: undefined }), await token(undefined, {}, 'HS384')]) {
      await expect(verifyEmbeddingPresignToken({ token: jwt })).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
    }
  });
  it('preserves scoped matching and team-wide verification while rejecting a conflicting resource', async () => {
    const jwt = await token('documentId:1');
    await expect(verifyEmbeddingPresignToken({ token: jwt, scope: 'documentId:1' })).resolves.toMatchObject({
      teamId: 10,
    });
    await expect(verifyEmbeddingPresignToken({ token: jwt, scope: 'documentId:2' })).rejects.toMatchObject({
      code: 'UNAUTHORIZED',
    });
    await expect(verifyEmbeddingPresignToken({ token: await token(), scope: 'documentId:1' })).resolves.toMatchObject({
      teamId: 10,
    });
  });
});

describe('A-03 actual file routes', () => {
  for (const path of paths) {
    it.each(['team', 'resource'])('keeps %s authorization in the query that loads PDF data', async (changed) => {
      const moved = { ...local, ...(changed === 'team' ? { teamId: 20 } : { secondaryId: 'document_2' }) };
      db.envelope.findFirst.mockImplementation(
        async ({ where, include }: { where: Record<string, unknown>; include?: unknown }) => {
          const row = include ? moved : local;
          return matchesQuery(row, where) ? row : null;
        },
      );
      db.envelopeItem.findFirst.mockImplementation(async ({ where }: { where: Record<string, unknown> }) => {
        const row = { ...moved.envelopeItems[0], envelope: moved };
        return matchesQuery(row, where) ? row : null;
      });
      const response = await app.request(path(local, await token('documentId:1')));
      expect(response.status).toBe(404);
      expect(readFile).not.toHaveBeenCalled();
    });
    it(`rejects another team before storage or conditional response: ${path(foreign, 'JWT')}`, async () => {
      const response = await app.request(path(foreign, await token()), { headers: { 'If-None-Match': 'cached' } });
      expect(response.status).toBe(404);
      expect(readFile).not.toHaveBeenCalled();
    });
    it(`rejects a different document within the same team: ${path(sibling, 'JWT')}`, async () => {
      const response = await app.request(path(sibling, await token('documentId:1')));
      expect(response.status).toBe(404);
      expect(readFile).not.toHaveBeenCalled();
    });
    it(`preserves permitted team/resource reads without reusable caching: ${path(local, 'JWT')}`, async () => {
      for (const scope of [undefined, 'documentId:1', 'envelopeId:envelope_local']) {
        const response = await app.request(path(local, await token(scope)));
        expect(response.status).toBe(200);
        expect(await response.text()).toBe('%PDF-test');
        expect(response.headers.get('cache-control')).toContain('no-store');
      }
    });
    it(`rejects expired parent keys at the real PDF adapter: ${path(local, 'JWT')}`, async () => {
      parent.expires = new Date(0);
      const response = await app.request(path(local, await token()));
      expect(response.status).toBe(404);
      expect(readFile).not.toHaveBeenCalled();
    });
  }
});

describe('A-03 actual create adapters', () => {
  const cases = [
    {
      name: 'document',
      run: (jwt: string) =>
        api
          .createCaller(context(jwt))
          .createDocument({ title: 'Synthetic', documentDataId: 'new_data', recipients: [] }),
    },
    {
      name: 'template',
      run: (jwt: string) =>
        api
          .createCaller(context(jwt))
          .createTemplate({ title: 'Synthetic', documentDataId: 'new_data', recipients: [] }),
    },
    {
      name: 'envelope',
      run: (jwt: string) =>
        api.createCaller(context(jwt)).createEnvelope({ payload: { title: 'Synthetic', type: 'DOCUMENT' }, files: [] }),
    },
  ];
  for (const entry of cases) {
    it(`does not turn a document-restricted pass into create authority: ${entry.name}`, async () => {
      // createCaller bypasses the HTTP error formatter, which maps this AppError cause.
      await expect(entry.run(await token('documentId:1'))).rejects.toMatchObject({ cause: { code: 'UNAUTHORIZED' } });
      expect(createEnvelope).not.toHaveBeenCalled();
      expect(createEnvelopeCaller).not.toHaveBeenCalled();
      expect(db.recipient.create).not.toHaveBeenCalled();
      expect(db.field.createMany).not.toHaveBeenCalled();
    });
    it(`preserves explicitly team-wide creation: ${entry.name}`, async () => {
      await expect(entry.run(await token())).resolves.toBeDefined();
      expect(createEnvelope.mock.calls.length + createEnvelopeCaller.mock.calls.length).toBe(1);
      expect(mutationTeams).toEqual([{ teamId: 10 }]);
      expect(getApiTokenEnvelopeScope(10)).toEqual({});
    });
  }
});
