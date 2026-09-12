import type { SessionUser } from '@documenso/auth/server/lib/session/session';
import { completeDocumentWithToken } from '@documenso/lib/server-only/document/complete-document-with-token';
import { getDocumentAndSenderByToken } from '@documenso/lib/server-only/document/get-document-by-token';
import { rejectDocumentWithToken } from '@documenso/lib/server-only/document/reject-document-with-token';
import { getEnvelopeForRecipientSigning } from '@documenso/lib/server-only/envelope/get-envelope-for-recipient-signing';
import { removeSignedFieldWithToken } from '@documenso/lib/server-only/field/remove-signed-field-with-token';
import { signFieldWithToken } from '@documenso/lib/server-only/field/sign-field-with-token';
import { logger } from '@documenso/lib/utils/logger';
import type { TrpcContext } from '@documenso/trpc/server/context';
import { getDocumentByTokenRoute } from '@documenso/trpc/server/document-router/get-document-by-token';
import { getMultiSignDocumentRoute } from '@documenso/trpc/server/embedding-router/get-multi-sign-document';
import { cscSignEnvelopeRoute } from '@documenso/trpc/server/enterprise-router/csc-sign-envelope';
import { findAttachmentsRoute } from '@documenso/trpc/server/envelope-router/attachment/find-attachments';
import { getEnvelopeItemsByTokenRoute } from '@documenso/trpc/server/envelope-router/get-envelope-items-by-token';
import { signEnvelopeFieldRoute } from '@documenso/trpc/server/envelope-router/sign-envelope-field';
import { signingStatusEnvelopeRoute } from '@documenso/trpc/server/envelope-router/signing-status-envelope';
import { router } from '@documenso/trpc/server/trpc';
import { DocumentStatus, FieldType, Role } from '@prisma/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { envelopeFixture, fieldFixture, recipientFixture } from './recipient-auth-fixture';

const { db, job, webhook, executeTspSign } = vi.hoisted(() => ({
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
    signature: { deleteMany: vi.fn(), upsert: vi.fn(), findFirst: vi.fn() },
    documentMeta: { findFirst: vi.fn() },
    documentAuditLog: { create: vi.fn(), createMany: vi.fn() },
    envelopeAttachment: { findMany: vi.fn() },
    $transaction: vi.fn(),
  },
  executeTspSign: vi.fn(),
  job: vi.fn(),
  webhook: vi.fn(),
}));
vi.mock('@documenso/prisma', () => ({ prisma: db }));
vi.mock('@documenso/lib/jobs/client', () => ({ jobs: { triggerJob: job } }));
vi.mock('@documenso/lib/server-only/webhooks/trigger/trigger-webhook', () => ({ triggerWebhook: webhook }));
vi.mock('@documenso/lib/server-only/document/viewed-document', () => ({ viewedDocument: vi.fn() }));

vi.mock('@documenso/ee/server-only/signing/csc/execute-tsp-sign', () => ({ executeTspSign }));
vi.mock('@documenso/lib/server-only/team/get-team-settings', () => ({
  getTeamSettings: async () => ({ includeSenderDetails: true, brandingEnabled: false, brandingLogo: '' }),
}));

const api = router({
  document: getDocumentByTokenRoute,
  csc: cscSignEnvelopeRoute,
  items: getEnvelopeItemsByTokenRoute,
  attachments: findAttachmentsRoute,
  sign: signEnvelopeFieldRoute,
  multi: getMultiSignDocumentRoute,
  status: signingStatusEnvelopeRoute,
});
const accountPolicy = { globalAccessAuth: ['ACCOUNT'], globalActionAuth: [] } as const;
const makeEnvelope = () => ({
  ...envelopeFixture({ status: DocumentStatus.PENDING }),
  authOptions: {
    globalAccessAuth: [...accountPolicy.globalAccessAuth] as Array<'ACCOUNT' | 'TWO_FACTOR_AUTH'>,
    globalActionAuth: [],
  },
  signatureLevel: 'SES',
  qrToken: null,
  useLegacyFieldInsertion: false,
  recipients: [{ ...recipientFixture('envelope_team_a'), fields: [] }],
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
  vi.useFakeTimers();
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
  db.signature.findFirst.mockResolvedValue(null);
  executeTspSign.mockResolvedValue({ outcome: 'signed' });
  db.envelopeAttachment.findMany.mockResolvedValue([
    { id: 'attachment_test', type: 'link', label: 'Private attachment', data: 'https://example.invalid/private' },
  ]);
  db.$transaction.mockImplementation(async (operation: ((tx: typeof db) => unknown) | Promise<unknown>[]) =>
    typeof operation === 'function' ? operation(db) : Promise.all(operation),
  );
  job.mockResolvedValue(undefined);
  webhook.mockResolvedValue(undefined);
});

afterEach(() => {
  vi.clearAllTimers();
  vi.useRealTimers();
});

const token = 'synthetic-recipient-token';
const id = { type: 'documentId', id: 1 } as const;
const mutations = [
  {
    name: 'CSC sign adapter',
    run: (userId?: number) => api.createCaller(context(userId)).csc({ recipientToken: token, sessionId: 'csc_test' }),
  },
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
  { name: 'legacy signing details', run: (userId?: number) => getDocumentAndSenderByToken({ token, userId }) },
  { name: 'v2 signing details', run: (userId?: number) => getEnvelopeForRecipientSigning({ token, userId }) },
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
      expect(executeTspSign).not.toHaveBeenCalled();
    });
    it(`fails closed when ${operation.name} cannot resolve the required account`, async () => {
      db.user.findFirst.mockRejectedValue(new Error('Synthetic database outage'));
      await expect(operation.run(7)).rejects.toBeDefined();
      expect(db.field.update).not.toHaveBeenCalled();
      expect(db.recipient.update).not.toHaveBeenCalled();
      expect(db.recipient.updateMany).not.toHaveBeenCalled();
      expect(db.signature.deleteMany).not.toHaveBeenCalled();
      expect(job).not.toHaveBeenCalled();
      expect(webhook).not.toHaveBeenCalled();
      expect(executeTspSign).not.toHaveBeenCalled();
    });
    it(`keeps ${operation.name} working for the intended account`, async () => {
      await expect(operation.run(7)).resolves.not.toBeNull();
    });
    it(`keeps link-only ${operation.name} working without an account`, async () => {
      envelope.authOptions.globalAccessAuth = [];
      await expect(operation.run()).resolves.not.toBeNull();
    });
  }

  for (const operation of reads) {
    it.each(['deleted', 'draft'] as const)(`refuses ${operation.name} for a %s envelope`, async (state) => {
      if (state === 'deleted') {
        envelope.deletedAt = new Date();
      } else {
        envelope.status = DocumentStatus.DRAFT;
      }
      await expect(
        operation.run(7).catch((error: { cause?: unknown }) => {
          throw error.cause ?? error;
        }),
      ).rejects.toMatchObject({ code: 'NOT_FOUND' });
    });
  }
  for (const operation of mutations.filter(({ name }) =>
    ['completion', 'rejection', 'legacy field removal'].includes(name),
  )) {
    it(`refuses ${operation.name} on a deleted envelope`, async () => {
      envelope.deletedAt = new Date();
      await expect(operation.run(7)).rejects.toMatchObject({ code: 'NOT_FOUND' });
      expect(db.recipient.updateMany).not.toHaveBeenCalled();
      expect(db.field.update).not.toHaveBeenCalled();
      expect(job).not.toHaveBeenCalled();
    });
  }

  it('keeps authenticated document-by-token reads working for the recipient', async () => {
    await expect(api.createCaller(context(7)).document({ token })).resolves.toMatchObject({
      documentData: { id: 'data_test' },
    });
  });
  it.each([
    'deleted',
    'draft',
  ] as const)('refuses the authenticated document-by-token route for a %s envelope', async (state) => {
    envelope.deletedAt = state === 'deleted' ? new Date() : null;
    envelope.status = state === 'draft' ? DocumentStatus.DRAFT : DocumentStatus.PENDING;
    await expect(
      api
        .createCaller(context(7))
        .document({ token })
        .catch((error: { cause?: unknown }) => {
          throw error.cause ?? error;
        }),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });

  it('requires the completion code as well as ACCOUNT when both access settings are present', async () => {
    envelope.authOptions.globalAccessAuth.push('TWO_FACTOR_AUTH');
    await expect(
      completeDocumentWithToken({ token, id, userId: 7, accessAuthOptions: { type: 'ACCOUNT' } }),
    ).rejects.toMatchObject({ code: 'TWO_FACTOR_AUTH_FAILED' });
    expect(db.recipient.updateMany).not.toHaveBeenCalled();
    expect(job).not.toHaveBeenCalled();
  });

  it('enforces a recipient ACCOUNT override even when the document itself is link-only', async () => {
    envelope.authOptions.globalAccessAuth = [];
    envelope.recipients[0].authOptions = { accessAuth: ['ACCOUNT'], actionAuth: [] };
    await expect(completeDocumentWithToken({ token, id })).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
    expect(db.recipient.updateMany).not.toHaveBeenCalled();
    await expect(completeDocumentWithToken({ token, id, userId: 7 })).resolves.toBeUndefined();
  });

  it('rejects an expired signing attempt even for the correct account', async () => {
    envelope.recipients[0].expiresAt = new Date('2000-01-01T00:00:00Z');
    await expect(completeDocumentWithToken({ token, id, userId: 7 })).rejects.toMatchObject({
      code: 'RECIPIENT_EXPIRED',
    });
    expect(db.recipient.updateMany).not.toHaveBeenCalled();
  });
});
