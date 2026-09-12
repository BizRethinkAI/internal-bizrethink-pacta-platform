import type { SessionUser } from '@documenso/auth/server/lib/session/session';
import { completeDocumentWithToken } from '@documenso/lib/server-only/document/complete-document-with-token';
import { rejectDocumentWithToken } from '@documenso/lib/server-only/document/reject-document-with-token';
import { removeSignedFieldWithToken } from '@documenso/lib/server-only/field/remove-signed-field-with-token';
import { signFieldWithToken } from '@documenso/lib/server-only/field/sign-field-with-token';
import { logger } from '@documenso/lib/utils/logger';
import type { TrpcContext } from '@documenso/trpc/server/context';
import { getMultiSignDocumentRoute } from '@documenso/trpc/server/embedding-router/get-multi-sign-document';
import { findAttachmentsRoute } from '@documenso/trpc/server/envelope-router/attachment/find-attachments';
import { getEnvelopeItemsByTokenRoute } from '@documenso/trpc/server/envelope-router/get-envelope-items-by-token';
import { signEnvelopeFieldRoute } from '@documenso/trpc/server/envelope-router/sign-envelope-field';
import { signingStatusEnvelopeRoute } from '@documenso/trpc/server/envelope-router/signing-status-envelope';
import { router } from '@documenso/trpc/server/trpc';
import { DocumentStatus, FieldType, Role } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { envelopeFixture, fieldFixture, recipientFixture } from './recipient-auth-fixture';

const { db, job, webhook } = vi.hoisted(() => ({
  db: {
    user: { findFirst: vi.fn() },
    recipient: {
      findFirst: vi.fn(),
      findFirstOrThrow: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    envelope: { findFirst: vi.fn(), findFirstOrThrow: vi.fn(), findUniqueOrThrow: vi.fn() },
    field: { findFirst: vi.fn(), findFirstOrThrow: vi.fn(), findMany: vi.fn(), update: vi.fn(), updateMany: vi.fn() },
    signature: { deleteMany: vi.fn(), upsert: vi.fn() },
    documentMeta: { findFirst: vi.fn() },
    documentAuditLog: { create: vi.fn(), createMany: vi.fn() },
    envelopeAttachment: { findMany: vi.fn() },
    $transaction: vi.fn(),
  },
  job: vi.fn(),
  webhook: vi.fn(),
}));
vi.mock('@documenso/prisma', () => ({ prisma: db }));
vi.mock('@documenso/lib/jobs/client', () => ({ jobs: { triggerJob: job } }));
vi.mock('@documenso/lib/server-only/webhooks/trigger/trigger-webhook', () => ({ triggerWebhook: webhook }));
vi.mock('@documenso/lib/server-only/document/viewed-document', () => ({ viewedDocument: vi.fn() }));

const api = router({
  items: getEnvelopeItemsByTokenRoute,
  attachments: findAttachmentsRoute,
  sign: signEnvelopeFieldRoute,
  multi: getMultiSignDocumentRoute,
  status: signingStatusEnvelopeRoute,
});
const accountPolicy = { globalAccessAuth: ['ACCOUNT'], globalActionAuth: [] } as const;
const makeEnvelope = () => ({
  ...envelopeFixture({ status: DocumentStatus.PENDING }),
  authOptions: { globalAccessAuth: [...accountPolicy.globalAccessAuth], globalActionAuth: [] },
  signatureLevel: 'SES',
  qrToken: null,
  useLegacyFieldInsertion: false,
  recipients: [recipientFixture('envelope_team_a')],
  envelopeItems: [
    {
      id: 'item_test',
      envelopeId: 'envelope_team_a',
      documentDataId: 'data_test',
      title: 'Test PDF',
      order: 0,
      documentData: { id: 'data_test', type: 'BYTES', data: 'test', initialData: 'test' },
    },
  ],
  team: { id: 10, url: 'team-a', name: 'Test team', teamEmail: null, teamGlobalSettings: null },
});
let envelope: ReturnType<typeof makeEnvelope>;
let field: ReturnType<typeof fieldFixture>;

const context = (userId?: number): TrpcContext => {
  const common = {
    teamId: 10,
    req: new Request('http://audit.invalid/api/trpc'),
    res: new Response(),
    logger,
    metadata: { auth: null, source: 'app', requestMetadata: {} } as const,
  };
  if (!userId) {
    return { ...common, user: null, session: null };
  }
  const user: SessionUser = {
    id: userId,
    email: userId === 7 ? 'owner@example.invalid' : 'other@example.invalid',
    name: 'Test user',
    roles: [Role.USER],
    disabled: false,
    twoFactorEnabled: false,
    signature: null,
    avatarImageId: null,
    emailVerified: new Date(),
  };
  return {
    ...common,
    user,
    session: {
      id: 'test_session',
      sessionToken: 'test_session',
      userId,
      createdAt: new Date(),
      updatedAt: new Date(),
      expiresAt: new Date(Date.now() + 60_000),
      ipAddress: null,
      userAgent: null,
    },
  };
};

beforeEach(() => {
  vi.clearAllMocks();
  logger.level = 'silent';
  envelope = makeEnvelope();
  field = fieldFixture();
  db.user.findFirst.mockResolvedValue({ id: 7, email: 'owner@example.invalid', disabled: false });
  db.recipient.findFirst.mockImplementation(async () => ({ ...envelope.recipients[0], envelope }));
  db.recipient.findFirstOrThrow.mockImplementation(async () => ({ ...envelope.recipients[0], envelope }));
  db.recipient.findMany.mockResolvedValue([]);
  db.recipient.update.mockImplementation(async () => envelope.recipients[0]);
  db.recipient.updateMany.mockResolvedValue({ count: 1 });
  for (const method of ['findFirst', 'findFirstOrThrow', 'findUniqueOrThrow'] as const) {
    db.envelope[method].mockImplementation(async () => envelope);
  }
  db.field.findFirst.mockImplementation(async () => ({ ...field, envelope, recipient: envelope.recipients[0] }));
  db.field.findFirstOrThrow.mockImplementation(async () => ({ ...field, envelope, recipient: envelope.recipients[0] }));
  db.field.findMany.mockResolvedValue([]);
  db.field.update.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => ({ ...field, ...data }));
  db.field.updateMany.mockResolvedValue({ count: 1 });
  db.documentMeta.findFirst.mockImplementation(async () => envelope.documentMeta);
  db.documentAuditLog.create.mockResolvedValue({});
  db.documentAuditLog.createMany.mockResolvedValue({ count: 0 });
  db.signature.deleteMany.mockResolvedValue({ count: 1 });
  db.envelopeAttachment.findMany.mockResolvedValue([
    { id: 'attachment_test', type: 'link', label: 'Private attachment', data: 'https://example.invalid/private' },
  ]);
  db.$transaction.mockImplementation(async (operation: ((tx: typeof db) => unknown) | Promise<unknown>[]) =>
    typeof operation === 'function' ? operation(db) : Promise.all(operation),
  );
  job.mockResolvedValue(undefined);
  webhook.mockResolvedValue(undefined);
});

const token = 'synthetic-recipient-token';
const id = { type: 'documentId', id: 1 } as const;
const mutations = [
  {
    name: 'legacy field insertion',
    run: (userId?: number) => signFieldWithToken({ token, fieldId: 5, value: 'Test value', userId }),
  },
  {
    name: 'legacy field removal',
    run: (userId?: number) => {
      const options = { token, fieldId: 5, userId };
      return removeSignedFieldWithToken(options);
    },
  },
  { name: 'completion', run: (userId?: number) => completeDocumentWithToken({ token, id, userId }) },
  {
    name: 'rejection',
    run: (userId?: number) => {
      const options = { token, id, reason: 'Test rejection', userId };
      return rejectDocumentWithToken(options);
    },
  },
  {
    name: 'v2 field insertion',
    run: (userId?: number) =>
      api
        .createCaller(context(userId))
        .sign({ token, fieldId: 5, fieldValue: { type: FieldType.TEXT, value: 'Test value' } }),
  },
  {
    name: 'v2 early field removal',
    run: (userId?: number) =>
      api.createCaller(context(userId)).sign({ token, fieldId: 5, fieldValue: { type: FieldType.TEXT, value: null } }),
  },
];

const reads = [
  {
    name: 'item metadata',
    run: (userId?: number) =>
      api.createCaller(context(userId)).items({ envelopeId: envelope.id, access: { type: 'recipient', token } }),
  },
  {
    name: 'attachment links',
    run: (userId?: number) => api.createCaller(context(userId)).attachments({ envelopeId: envelope.id, token }),
  },
  { name: 'multi-sign document', run: (userId?: number) => api.createCaller(context(userId)).multi({ token }) },
  { name: 'signing status', run: (userId?: number) => api.createCaller(context(userId)).status({ token }) },
];

describe('A-05 public recipient operations', () => {
  for (const operation of [...mutations, ...reads]) {
    it.each([undefined, 8])(`refuses ${operation.name} without the intended account (caller: %s)`, async (userId) => {
      await expect(
        operation.run(userId).catch((error: { cause?: unknown }) => {
          throw error.cause ?? error;
        }),
      ).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
      expect(db.field.update).not.toHaveBeenCalled();
      expect(db.recipient.update).not.toHaveBeenCalled();
      expect(db.recipient.updateMany).not.toHaveBeenCalled();
      expect(db.signature.deleteMany).not.toHaveBeenCalled();
      expect(db.documentAuditLog.create).not.toHaveBeenCalled();
      expect(job).not.toHaveBeenCalled();
      expect(webhook).not.toHaveBeenCalled();
    });
    it(`keeps ${operation.name} working for the intended account`, async () => {
      await expect(operation.run(7)).resolves.not.toBeNull();
    });
    it(`keeps link-only ${operation.name} working without an account`, async () => {
      envelope.authOptions.globalAccessAuth = [];
      await expect(operation.run()).resolves.not.toBeNull();
    });
  }

  it('rejects an expired signing attempt even for the correct account', async () => {
    envelope.recipients[0].expiresAt = new Date('2000-01-01T00:00:00Z');
    await expect(completeDocumentWithToken({ token, id, userId: 7 })).rejects.toMatchObject({
      code: 'RECIPIENT_EXPIRED',
    });
    expect(db.recipient.updateMany).not.toHaveBeenCalled();
  });
});
