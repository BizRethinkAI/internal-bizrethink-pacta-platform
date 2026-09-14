import { completeDocumentWithToken } from '@documenso/lib/server-only/document/complete-document-with-token';
import { rejectDocumentWithToken } from '@documenso/lib/server-only/document/reject-document-with-token';
import { removeSignedFieldWithToken } from '@documenso/lib/server-only/field/remove-signed-field-with-token';
import { signFieldWithToken } from '@documenso/lib/server-only/field/sign-field-with-token';
import { logger } from '@documenso/lib/utils/logger';
import type { TrpcContext } from '@documenso/trpc/server/context';
import { signEnvelopeFieldRoute } from '@documenso/trpc/server/envelope-router/sign-envelope-field';
import { router } from '@documenso/trpc/server/trpc';
import type { Recipient } from '@prisma/client';
import { DocumentSigningOrder, DocumentStatus, FieldType, SigningStatus } from '@prisma/client';
import { beforeEach, expect, it, vi } from 'vitest';

import { envelopeFixture, fieldFixture, recipientFixture } from './recipient-auth-fixture';

const { db, job, webhook } = vi.hoisted(() => ({
  db: {
    recipient: {
      findFirst: vi.fn(),
      findFirstOrThrow: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    envelope: { findFirst: vi.fn(), findFirstOrThrow: vi.fn(), findUnique: vi.fn(), findUniqueOrThrow: vi.fn() },
    field: { findFirst: vi.fn(), findFirstOrThrow: vi.fn(), findMany: vi.fn(), update: vi.fn(), updateMany: vi.fn() },
    documentMeta: { findFirst: vi.fn() },
    documentAuditLog: { create: vi.fn(), createMany: vi.fn() },
    signature: { upsert: vi.fn(), deleteMany: vi.fn() },
    cscCredential: { deleteMany: vi.fn() },
    cscSession: { deleteMany: vi.fn() },
    $queryRaw: vi.fn(),
    $transaction: vi.fn(),
  },
  job: vi.fn(),
  webhook: vi.fn(),
}));
vi.mock('@documenso/prisma', () => ({ prisma: db }));
vi.mock('@documenso/lib/jobs/client', () => ({ jobs: { triggerJob: job } }));
vi.mock('@documenso/lib/server-only/webhooks/trigger/trigger-webhook', () => ({ triggerWebhook: webhook }));
let recipient: Recipient;
let field: ReturnType<typeof fieldFixture>;
let envelope: ReturnType<typeof envelopeFixture> & {
  signatureLevel: string;
  qrToken: null;
  useLegacyFieldInsertion: boolean;
};
let reassignBeforeWrite: boolean;
let nextRecipient: Recipient | null;
const token = 'original-test-bearer';
const snapshot = () => ({
  ...envelope,
  recipients: [{ ...recipient }, ...(nextRecipient ? [{ ...nextRecipient }] : [])],
  fields: [{ ...field }],
});
const api = router({ sign: signEnvelopeFieldRoute });
const context = (): TrpcContext => ({
  user: null,
  session: null,
  teamId: undefined,
  req: new Request('http://audit.invalid/api/trpc'),
  res: new Response(),
  logger,
  metadata: { auth: null, source: 'app', requestMetadata: {} },
});
const id = { type: 'documentId', id: 1 } as const;
const operations = [
  {
    name: 'legacy field insertion',
    type: FieldType.TEXT,
    inserted: false,
    run: () => signFieldWithToken({ token, fieldId: field.id, value: 'Original input' }),
  },
  {
    name: 'legacy field removal',
    type: FieldType.TEXT,
    inserted: true,
    run: () => removeSignedFieldWithToken({ token, fieldId: field.id }),
  },
  {
    name: 'v2 field insertion',
    type: FieldType.TEXT,
    inserted: false,
    run: () =>
      api
        .createCaller(context())
        .sign({ token, fieldId: field.id, fieldValue: { type: FieldType.TEXT, value: 'Original input' } }),
  },
  {
    name: 'v2 field removal',
    type: FieldType.TEXT,
    inserted: true,
    run: () =>
      api.createCaller(context()).sign({ token, fieldId: field.id, fieldValue: { type: FieldType.TEXT, value: null } }),
  },
  {
    name: 'completion including automatic date insertion',
    type: FieldType.DATE,
    inserted: false,
    run: () => completeDocumentWithToken({ token, id }),
  },
  {
    name: 'rejection',
    type: FieldType.TEXT,
    inserted: false,
    run: () => rejectDocumentWithToken({ token, id, reason: 'Original reason' }),
  },
];
beforeEach(() => {
  vi.resetAllMocks();
  logger.level = 'silent';
  recipient = { ...recipientFixture('envelope_team_a'), token };
  field = fieldFixture();
  envelope = {
    ...envelopeFixture({ status: DocumentStatus.PENDING }),
    signatureLevel: 'SES',
    qrToken: null,
    useLegacyFieldInsertion: false,
  };
  nextRecipient = null;
  reassignBeforeWrite = false;
  const readRecipient = async ({ where }: { where: { token?: string } }) =>
    where.token && where.token !== recipient.token ? null : { ...recipient, envelope: snapshot() };
  db.recipient.findFirst.mockImplementation(readRecipient);
  db.recipient.findUnique.mockImplementation(readRecipient);
  db.recipient.findFirstOrThrow.mockImplementation(async (query) => {
    const row = await readRecipient(query);
    if (!row) {
      throw new Error('Missing fixture recipient');
    }
    return row;
  });
  db.recipient.findMany.mockResolvedValue([]);
  db.recipient.update.mockImplementation(async ({ data }: { data: Partial<Recipient> }) => {
    // Prisma array transactions defer writes until the transaction starts too.
    await Promise.resolve();
    recipient = { ...recipient, ...data };
    return { ...recipient };
  });
  db.recipient.updateMany.mockImplementation(async ({ data }: { data: Partial<Recipient> }) => {
    recipient = { ...recipient, ...data };
    return { count: 1 };
  });
  for (const read of Object.values(db.envelope)) {
    read.mockImplementation(async () => snapshot());
  }
  for (const read of [db.field.findFirst, db.field.findFirstOrThrow]) {
    read.mockImplementation(async () => ({ ...field, recipient: { ...recipient }, envelope: snapshot() }));
  }
  db.field.findMany.mockImplementation(async () => [{ ...field }]);
  db.field.update.mockImplementation(async ({ data }) => {
    field = { ...field, ...data };
    return { ...field };
  });
  db.field.updateMany.mockImplementation(async ({ data }) => {
    field = { ...field, ...data };
    return { count: 1 };
  });
  db.documentMeta.findFirst.mockImplementation(async () => envelope.documentMeta);
  db.documentAuditLog.create.mockResolvedValue({});
  db.documentAuditLog.createMany.mockResolvedValue({ count: 1 });
  db.signature.deleteMany.mockResolvedValue({ count: 1 });
  db.signature.upsert.mockResolvedValue({});
  db.$queryRaw.mockResolvedValue([]);
  db.$transaction.mockImplementation(async (operation: ((tx: typeof db) => Promise<unknown>) | Promise<unknown>[]) => {
    if (reassignBeforeWrite) {
      recipient = {
        ...recipient,
        token: 'replacement-test-bearer',
        name: 'Replacement',
        email: 'replacement@example.invalid',
      };
      reassignBeforeWrite = false;
    }
    const before = { ...recipient };
    try {
      return typeof operation === 'function' ? await operation(db) : await Promise.all(operation);
    } catch (error) {
      recipient = before;
      throw error;
    }
  });
});
for (const operation of operations) {
  it(`A-19 refuses superseded authority in ${operation.name}`, async () => {
    field = { ...fieldFixture(operation.type), inserted: operation.inserted };
    reassignBeforeWrite = true;
    await expect(
      operation.run().catch((error: { cause?: unknown }) => {
        throw error.cause ?? error;
      }),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
    expect(recipient).toMatchObject({
      token: 'replacement-test-bearer',
      email: 'replacement@example.invalid',
      signingStatus: SigningStatus.NOT_SIGNED,
    });
    expect(db.field.update).not.toHaveBeenCalled();
    expect(db.field.updateMany).not.toHaveBeenCalled();
    expect(db.recipient.update).not.toHaveBeenCalled();
    expect(db.recipient.updateMany).not.toHaveBeenCalled();
    expect(db.signature.deleteMany).not.toHaveBeenCalled();
    expect(db.signature.upsert).not.toHaveBeenCalled();
    expect(db.documentAuditLog.create).not.toHaveBeenCalled();
    expect(db.documentAuditLog.createMany).not.toHaveBeenCalled();
    expect(job).not.toHaveBeenCalled();
    expect(webhook).not.toHaveBeenCalled();
  });
  it(`preserves current bearer authority in ${operation.name}`, async () => {
    field = { ...fieldFixture(operation.type), inserted: operation.inserted };
    await operation.run();
    expect(recipient.token).toBe(token);
    expect(db.documentAuditLog.create).toHaveBeenCalled();
  });
}

it('A-19 rotates the next signer link when a completing signer dictates a replacement identity', async () => {
  if (!envelope.documentMeta) {
    throw new Error('Missing fixture metadata');
  }
  envelope.documentMeta.signingOrder = DocumentSigningOrder.SEQUENTIAL;
  envelope.documentMeta.allowDictateNextSigner = true;
  field = { ...fieldFixture(FieldType.DATE), inserted: false };
  nextRecipient = { ...recipientFixture(envelope.id), id: 2, signingOrder: 2, token: 'previous-next-signer-token' };
  const oldToken = nextRecipient.token;
  db.recipient.findMany.mockImplementation(async () => (nextRecipient ? [{ ...nextRecipient }] : []));
  db.recipient.update.mockImplementation(async ({ data }) => {
    if (!nextRecipient) {
      throw new Error('Missing next recipient fixture');
    }
    nextRecipient = { ...nextRecipient, ...data };
    return { ...nextRecipient };
  });
  await completeDocumentWithToken({
    token,
    id,
    nextSigner: { name: 'Replacement', email: 'replacement@example.invalid' },
  });
  expect(nextRecipient).toMatchObject({ name: 'Replacement', email: 'replacement@example.invalid' });
  expect(nextRecipient?.token).not.toBe(oldToken);
  expect(db.cscCredential.deleteMany).toHaveBeenCalledWith({ where: { recipientId: 2 } });
});
