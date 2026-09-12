import { removeSignedFieldWithToken } from '@documenso/lib/server-only/field/remove-signed-field-with-token';
import { signFieldWithToken } from '@documenso/lib/server-only/field/sign-field-with-token';
import { logger } from '@documenso/lib/utils/logger';
import type { TrpcContext } from '@documenso/trpc/server/context';
import { signEnvelopeFieldRoute } from '@documenso/trpc/server/envelope-router/sign-envelope-field';
import { router } from '@documenso/trpc/server/trpc';
import type { Recipient } from '@prisma/client';
import { DocumentStatus, FieldType, RecipientRole, SigningStatus } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { matchesQuery } from './api-token-team-fixture';
import { envelopeFixture, fieldFixture, recipientFixture } from './recipient-auth-fixture';

const { db } = vi.hoisted(() => ({
  db: {
    user: { findFirst: vi.fn() },
    recipient: { findFirst: vi.fn(), findFirstOrThrow: vi.fn() },
    field: { findFirst: vi.fn(), findFirstOrThrow: vi.fn(), update: vi.fn() },
    documentMeta: { findFirst: vi.fn() },
    signature: { upsert: vi.fn(), deleteMany: vi.fn() },
    documentAuditLog: { create: vi.fn() },
    $transaction: vi.fn(),
  },
}));
vi.mock('@documenso/prisma', () => ({ prisma: db }));

let envelope: ReturnType<typeof envelopeFixture>;
let actor: Recipient;
let target: Recipient;
let field: ReturnType<typeof fieldFixture>;

type Query = { where: Record<string, unknown> };
const findField = ({ where }: Query) => {
  const recipientQuery = where.recipient as Record<string, unknown>;
  const signingOrder = recipientQuery.signingOrder as { gte: number } | undefined;
  // The shared predicate double supports equality/not; implement only this
  // SQL numeric comparison here. A null order does not satisfy SQL >=.
  if (signingOrder && (target.signingOrder === null || target.signingOrder < signingOrder.gte)) {
    return null;
  }
  const row = { ...field, recipient: target, envelope: { ...envelope, recipients: [actor, target] } };
  return matchesQuery(row, { ...where, recipient: { ...recipientQuery, signingOrder: undefined } }) ? row : null;
};
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
const current = (value: string | null) =>
  api.createCaller(context()).sign({
    token: actor.token,
    fieldId: field.id,
    fieldValue: { type: field.type === FieldType.TEXT ? FieldType.TEXT : FieldType.SIGNATURE, value },
  });
const legacyInsert = () => signFieldWithToken({ token: actor.token, fieldId: field.id, value: 'Synthetic value' });
const legacyRemove = () => removeSignedFieldWithToken({ token: actor.token, fieldId: field.id });
const noWrites = () => {
  expect(db.$transaction).not.toHaveBeenCalled();
  expect(db.field.update).not.toHaveBeenCalled();
  expect(db.signature.upsert).not.toHaveBeenCalled();
  expect(db.signature.deleteMany).not.toHaveBeenCalled();
  expect(db.documentAuditLog.create).not.toHaveBeenCalled();
};

beforeEach(() => {
  vi.clearAllMocks();
  logger.level = 'silent';
  envelope = envelopeFixture({ status: DocumentStatus.PENDING, internalVersion: 2 });
  actor = {
    ...recipientFixture(envelope.id),
    role: RecipientRole.ASSISTANT,
    signingOrder: 1,
    email: 'assistant@example.invalid',
  };
  target = {
    ...recipientFixture(envelope.id),
    id: 2,
    token: 'synthetic-target-token',
    signingOrder: 2,
    email: 'signer@example.invalid',
    authOptions: { accessAuth: [], actionAuth: ['ACCOUNT'] },
  };
  field = { ...fieldFixture(FieldType.SIGNATURE), recipientId: target.id };
  db.recipient.findFirst.mockImplementation(async ({ where }: { where: { token: string } }) =>
    where.token === actor.token ? actor : null,
  );
  db.recipient.findFirstOrThrow.mockImplementation(async (query) => {
    const row = await db.recipient.findFirst(query);
    if (!row) {
      throw new Error('Synthetic recipient not found');
    }
    return row;
  });
  db.field.findFirst.mockImplementation(async (query: Query) => findField(query));
  db.field.findFirstOrThrow.mockImplementation(async (query: Query) => {
    const row = findField(query);
    if (!row) {
      throw new Error('Synthetic field not found');
    }
    return row;
  });
  db.field.update.mockImplementation(async ({ data }: { data: Partial<typeof field> }) => {
    field = { ...field, ...data };
    return { ...field, signature: null };
  });
  db.signature.upsert.mockImplementation(async ({ create }: { create: Record<string, unknown> }) => ({
    id: 1,
    created: new Date(),
    signatureImageAsBase64: null,
    typedSignature: null,
    ...create,
  }));
  db.signature.deleteMany.mockResolvedValue({ count: 1 });
  db.documentMeta.findFirst.mockImplementation(async () => envelope.documentMeta);
  db.documentAuditLog.create.mockResolvedValue({});
  db.$transaction.mockImplementation(async (operation: (tx: typeof db) => unknown) => operation(db));
});

describe('A-06 legacy signing helpers on both envelope versions', () => {
  for (const version of [1, 2] as const) {
    for (const type of [FieldType.SIGNATURE, FieldType.FREE_SIGNATURE]) {
      for (const operation of ['insert', 'remove'] as const) {
        it(`rejects assistant ${operation} of another recipient's ${type} in v${version}`, async () => {
          envelope.internalVersion = version;
          field.type = type;
          field.inserted = operation === 'remove';
          // The target requires ACCOUNT, the assistant does not; authorizing
          // the assistant is not permission to write the target's signature.
          await expect(operation === 'insert' ? legacyInsert() : legacyRemove()).rejects.toMatchObject({
            code: 'INVALID_REQUEST',
          });
          noWrites();
        });
      }
      it(`preserves rightful-recipient ${type} insertion and removal in v${version}`, async () => {
        envelope.internalVersion = version;
        field.type = type;
        target.authOptions = null;
        actor = { ...target };
        await legacyInsert();
        expect(db.signature.upsert).toHaveBeenCalledWith(
          expect.objectContaining({ create: expect.objectContaining({ recipientId: target.id }) }),
        );
        expect(field.inserted).toBe(true);
        await legacyRemove();
        expect(db.signature.deleteMany).toHaveBeenCalledWith({ where: { fieldId: field.id } });
        expect(field.inserted).toBe(false);
      });
    }
    it(`preserves assistant text prefill and removal in v${version}`, async () => {
      envelope.internalVersion = version;
      field = { ...fieldFixture(), recipientId: target.id };
      await legacyInsert();
      expect(field).toMatchObject({ inserted: true, customText: 'Synthetic value' });
      expect(db.documentAuditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ type: 'DOCUMENT_FIELD_PREFILLED' }) }),
      );
      expect(db.signature.upsert).not.toHaveBeenCalled();
      await legacyRemove();
      expect(field).toMatchObject({ inserted: false, customText: '' });
    });
  }
});

describe('A-06 current adapter and compatibility controls', () => {
  for (const operation of ['insert', 'remove'] as const) {
    it(`keeps the v2 assistant signature ${operation} restriction before any transaction`, async () => {
      field.inserted = operation === 'remove';
      await expect(current(operation === 'insert' ? 'Synthetic value' : null)).rejects.toMatchObject({
        cause: { code: 'INVALID_REQUEST' },
      });
      noWrites();
    });
  }
  it('preserves current assistant text prefill and removal', async () => {
    field = { ...fieldFixture(), recipientId: target.id };
    await current('Synthetic value');
    expect(field).toMatchObject({ inserted: true, customText: 'Synthetic value' });
    expect(db.signature.upsert).not.toHaveBeenCalled();
    await current(null);
    expect(field).toMatchObject({ inserted: false, customText: '' });
  });
  it('preserves current rightful-recipient signature insertion and removal', async () => {
    target.authOptions = null;
    actor = { ...target };
    await current('Synthetic signature');
    expect(db.signature.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ create: expect.objectContaining({ recipientId: target.id }) }),
    );
    await current(null);
    expect(field.inserted).toBe(false);
  });
  for (const adapter of ['legacy', 'current'] as const) {
    it(`preserves an assistant's own assigned signature field in the ${adapter} adapter`, async () => {
      target = { ...actor };
      field.recipientId = actor.id;
      await (adapter === 'legacy' ? legacyInsert() : current('Synthetic signature'));
      expect(field.inserted).toBe(true);
      expect(db.signature.upsert).toHaveBeenCalled();
    });
  }
  for (const operation of [legacyInsert, legacyRemove, () => current('Synthetic value')]) {
    for (const reason of ['other envelope', 'earlier signing order', 'already signed'] as const) {
      it(`preserves ordinary field selection restrictions: ${operation.name || 'current'} / ${reason}`, async () => {
        field = { ...fieldFixture(), recipientId: target.id };
        if (reason === 'other envelope') {
          target.envelopeId = 'envelope_other';
        } else if (reason === 'earlier signing order') {
          target.signingOrder = 0;
        } else {
          target.signingStatus = SigningStatus.SIGNED;
        }
        await expect(operation()).rejects.toBeDefined();
        noWrites();
      });
    }
  }
});
