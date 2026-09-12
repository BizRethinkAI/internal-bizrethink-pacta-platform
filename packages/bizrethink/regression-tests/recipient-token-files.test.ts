import { logger } from '@documenso/lib/utils/logger';
import { DocumentStatus, EnvelopeType } from '@prisma/client';
import { Hono } from 'hono';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { filesRoute } from '../../../apps/remix/server/api/files/files';
import type { HonoEnv } from '../../../apps/remix/server/router';
import { envelopeFixture, recipientFixture } from './recipient-auth-fixture';

const { db, getSession, getFile } = vi.hoisted(() => ({
  db: {
    recipient: { findFirst: vi.fn() },
    user: { findFirst: vi.fn() },
    envelopeItem: { findFirst: vi.fn(), findUnique: vi.fn() },
  },
  getSession: vi.fn(),
  getFile: vi.fn(),
}));
vi.mock('@documenso/prisma', () => ({ prisma: db }));
vi.mock('@documenso/auth/server/lib/utils/get-session', () => ({ getOptionalSession: getSession }));
vi.mock('@documenso/lib/universal/upload/get-file.server', () => ({ getFileServerSide: getFile }));
vi.mock('@documenso/lib/universal/upload/put-file.server', () => ({ putNormalizedPdfFileServerSide: vi.fn() }));

const makeEnvelope = () => ({
  ...envelopeFixture({ status: DocumentStatus.COMPLETED }),
  authOptions: { globalAccessAuth: ['ACCOUNT'], globalActionAuth: [] },
  qrToken: 'qr_test',
  directLink: {
    id: 'direct_test',
    envelopeId: 'envelope_team_a',
    token: 'direct_test_token',
    createdAt: new Date(),
    enabled: true,
    directTemplateRecipientId: 1,
  },
});
let envelope: ReturnType<typeof makeEnvelope>;
let recipient: ReturnType<typeof recipientFixture>;
const token = 'synthetic-recipient-token';
const app = new Hono<HonoEnv>()
  .use('*', async (c, next) => {
    c.set('logger', logger);
    await next();
  })
  .route('/', filesRoute);

beforeEach(() => {
  vi.clearAllMocks();
  logger.level = 'silent';
  envelope = makeEnvelope();
  recipient = recipientFixture(envelope.id);
  getSession.mockResolvedValue({ user: null, session: null, isAuthenticated: false });
  db.user.findFirst.mockResolvedValue({ id: 7, email: recipient.email, disabled: false });
  db.recipient.findFirst.mockImplementation(async ({ where }: { where: { token: string } }) =>
    where.token === token ? { ...recipient, envelope } : null,
  );
  const getItem = async ({
    where,
  }: {
    where: { envelope?: { recipients?: { some: { token: string } }; qrToken?: string } };
  }) => {
    if (where.envelope?.recipients?.some.token !== token && where.envelope?.qrToken !== 'qr_test') {
      return null;
    }
    return {
      id: 'item_test',
      title: 'Test PDF',
      order: 0,
      envelopeId: envelope.id,
      documentDataId: 'data_test',
      envelope,
      documentData: { id: 'data_test', type: 'BYTES', data: 'test', initialData: 'test' },
    };
  };
  db.envelopeItem.findFirst.mockImplementation(getItem);
  db.envelopeItem.findUnique.mockImplementation(getItem);
  getFile.mockResolvedValue(new Uint8Array([37, 80, 68, 70]));
});
const asRecipient = () =>
  getSession.mockResolvedValue({
    user: { id: 7, email: recipient.email },
    session: { id: 'test' },
    isAuthenticated: true,
  });
const paths = [
  (key: string) => `/token/${key}/envelopeItem/item_test`,
  (key: string) => `/token/${key}/envelopeItem/item_test/download/signed`,
  (key: string) => `/token/${key}/envelope/envelope_team_a/envelopeItem/item_test/dataId/data_test/current/item.pdf`,
];

describe('A-05 recipient file routes', () => {
  for (const path of paths) {
    it(`refuses anonymous ACCOUNT downloads before storage: ${path(token)}`, async () => {
      const response = await app.request(path(token));
      expect(response.status).toBe(404);
      expect(getFile).not.toHaveBeenCalled();
    });
    it(`refuses another account before storage: ${path(token)}`, async () => {
      getSession.mockResolvedValue({
        user: { id: 8, email: 'other@example.invalid' },
        session: { id: 'other' },
        isAuthenticated: true,
      });
      const response = await app.request(path(token));
      expect(response.status).toBe(404);
      expect(getFile).not.toHaveBeenCalled();
    });
    it(`serves the correct recipient without reusable public caching: ${path(token)}`, async () => {
      asRecipient();
      const response = await app.request(path(token));
      expect(response.status).toBe(200);
      expect(await response.text()).toBe('%PDF');
      expect(response.headers.get('cache-control')).toContain('private');
      expect(response.headers.get('cache-control')).toContain('no-store');
    });
    it(`preserves deliberately link-only access: ${path(token)}`, async () => {
      envelope.authOptions.globalAccessAuth = [];
      const response = await app.request(path(token));
      expect(response.status).toBe(200);
      expect(await response.text()).toBe('%PDF');
    });
    it(`preserves authorized downloads after the signing deadline: ${path(token)}`, async () => {
      asRecipient();
      recipient.expiresAt = new Date('2000-01-01T00:00:00Z');
      const response = await app.request(path(token));
      expect(response.status).toBe(200);
    });
    it.each(['deleted', 'draft'] as const)(`refuses a %s envelope before storage: ${path(token)}`, async (state) => {
      asRecipient();
      if (state === 'deleted') {
        envelope.status = DocumentStatus.PENDING;
        envelope.deletedAt = new Date();
      } else {
        envelope.status = DocumentStatus.DRAFT;
      }
      const response = await app.request(path(token));
      expect(response.status).toBe(404);
      expect(getFile).not.toHaveBeenCalled();
    });
    it.each([
      DocumentStatus.COMPLETED,
      DocumentStatus.REJECTED,
      DocumentStatus.CANCELLED,
    ])(`preserves recipient PDFs after the sender hides a %s document: ${path(token)}`, async (status) => {
      envelope.status = status;
      envelope.deletedAt = new Date();
      asRecipient();
      const response = await app.request(path(token));
      expect(response.status).toBe(200);
      expect(await response.text()).toBe('%PDF');
      getFile.mockClear();
      getSession.mockResolvedValue({ user: null, session: null, isAuthenticated: false });
      expect((await app.request(path(token))).status).toBe(404);
      expect(getFile).not.toHaveBeenCalled();
    });
    it(`preserves an enabled, link-only direct-template preview: ${path(token)}`, async () => {
      envelope.type = EnvelopeType.TEMPLATE;
      envelope.status = DocumentStatus.DRAFT;
      envelope.authOptions.globalAccessAuth = [];
      const response = await app.request(path(token));
      expect(response.status).toBe(200);
      expect(await response.text()).toBe('%PDF');
      expect(response.headers.get('cache-control')).toContain('no-store');
    });
    it(`requires an active login for an ACCOUNT direct-template preview: ${path(token)}`, async () => {
      envelope.type = EnvelopeType.TEMPLATE;
      envelope.status = DocumentStatus.DRAFT;
      recipient.email = 'direct.template@documenso.com';
      expect((await app.request(path(token))).status).toBe(404);
      expect(getFile).not.toHaveBeenCalled();
      asRecipient();
      expect((await app.request(path(token))).status).toBe(200);
      expect(db.user.findFirst).toHaveBeenLastCalledWith({
        where: { id: 7 },
        select: { id: true, disabled: true },
      });
      getFile.mockClear();
      db.user.findFirst.mockResolvedValue({ id: 7, disabled: true });
      expect((await app.request(path(token))).status).toBe(404);
      expect(getFile).not.toHaveBeenCalled();
      db.user.findFirst.mockResolvedValue(null);
      expect((await app.request(path(token))).status).toBe(404);
      expect(getFile).not.toHaveBeenCalled();
      db.user.findFirst.mockRejectedValue(new Error('Synthetic database outage'));
      expect((await app.request(path(token))).status).toBe(500);
      expect(getFile).not.toHaveBeenCalled();
    });
    it(`refuses an unpublished template before storage: ${path(token)}`, async () => {
      db.recipient.findFirst.mockResolvedValue({
        ...recipient,
        envelope: { ...envelope, type: EnvelopeType.TEMPLATE, status: DocumentStatus.DRAFT, directLink: null },
      });
      asRecipient();
      expect((await app.request(path(token))).status).toBe(404);
      expect(getFile).not.toHaveBeenCalled();
    });
    it.each([
      'disabled link',
      'different recipient',
      'deleted template',
    ] as const)(`refuses a direct-template preview with a %s: ${path(token)}`, async (state) => {
      envelope.type = EnvelopeType.TEMPLATE;
      envelope.status = DocumentStatus.DRAFT;
      envelope.authOptions.globalAccessAuth = [];
      if (state === 'disabled link') {
        envelope.directLink.enabled = false;
      } else if (state === 'different recipient') {
        envelope.directLink.directTemplateRecipientId = 99;
      } else {
        envelope.deletedAt = new Date();
      }
      expect((await app.request(path(token))).status).toBe(404);
      expect(getFile).not.toHaveBeenCalled();
    });
    it(`refuses a disabled recipient account before storage: ${path(token)}`, async () => {
      asRecipient();
      db.user.findFirst.mockResolvedValue({ id: 7, email: recipient.email, disabled: true });
      const response = await app.request(path(token));
      expect(response.status).toBe(404);
      expect(getFile).not.toHaveBeenCalled();
    });
    it(`does not serve a protected file when account lookup fails: ${path(token)}`, async () => {
      asRecipient();
      db.user.findFirst.mockRejectedValue(new Error('Synthetic database outage'));
      const response = await app.request(path(token));
      expect(response.status).toBe(500);
      expect(getFile).not.toHaveBeenCalled();
    });
    it(`keeps the separate QR capability unchanged: ${path('qr_test')}`, async () => {
      const response = await app.request(path('qr_test'));
      expect(response.status).toBe(200);
      expect(await response.text()).toBe('%PDF');
    });
    it(`refuses an unknown token: ${path('unknown')}`, async () => {
      const response = await app.request(path('unknown'));
      expect(response.status).toBe(404);
      expect(getFile).not.toHaveBeenCalled();
    });
  }
});
