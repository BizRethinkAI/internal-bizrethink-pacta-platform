import { AppErrorCode } from '@documenso/lib/errors/app-error';
import { setFieldsForDocument } from '@documenso/lib/server-only/field/set-fields-for-document';
import { setDocumentRecipients } from '@documenso/lib/server-only/recipient/set-document-recipients';
import type { Field, Recipient } from '@prisma/client';
import { DocumentStatus, FieldType, Prisma, SendStatus, SigningStatus } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { envelopeFixture, fieldFixture, recipientFixture } from './recipient-auth-fixture';

const { db, jobs } = vi.hoisted(() => ({
  db: {
    envelope: { findFirst: vi.fn(), findFirstOrThrow: vi.fn() },
    user: { findFirstOrThrow: vi.fn() },
    recipient: { upsert: vi.fn(), deleteMany: vi.fn() },
    field: { upsert: vi.fn(), deleteMany: vi.fn() },
    documentAuditLog: { create: vi.fn(), createMany: vi.fn() },
    $queryRaw: vi.fn(),
    $transaction: vi.fn(),
  },
  jobs: { triggerJob: vi.fn() },
}));
vi.mock('@documenso/prisma', () => ({ prisma: db }));
vi.mock('@documenso/lib/jobs/client', () => ({ jobs }));
// These tests exercise the real replacement helpers. Parent access is covered
// through authenticated HTTP/PostgreSQL fixtures, rather than this DB double.
vi.mock('@documenso/lib/server-only/envelope/get-envelope-by-id', () => ({
  getEnvelopeWhereInput: async () => ({ envelopeWhereInput: { id: 'envelope_team_a' } }),
}));

type FieldInput = Parameters<typeof setFieldsForDocument>[0]['fields'][number];
type RecipientInput = Parameters<typeof setDocumentRecipients>[0]['recipients'][number];
const makeState = () => {
  const envelope = { ...envelopeFixture({ status: DocumentStatus.PENDING }), signatureLevel: 'SES' };
  const alice = { ...recipientFixture(envelope.id), id: 1, name: 'Alice' };
  const bob = { ...recipientFixture(envelope.id), id: 2, name: 'Bob', email: 'bob@example.invalid' };
  return {
    envelope,
    recipients: [alice, bob],
    fields: [
      { ...fieldFixture(), id: 5, recipientId: alice.id },
      { ...fieldFixture(), id: 6, secondaryId: 'field_bob', recipientId: bob.id },
    ],
    audits: 0,
  };
};
let state: ReturnType<typeof makeState>;
const cloneState = () => ({
  ...state,
  envelope: { ...state.envelope },
  recipients: state.recipients.map((recipient) => ({ ...recipient })),
  fields: state.fields.map((field) => ({ ...field })),
});
const snapshot = () => ({
  ...state.envelope,
  recipients: state.recipients.map((recipient) => ({ ...recipient })),
  fields: state.fields.map((field) => ({
    ...field,
    recipient: state.recipients.find((recipient) => recipient.id === field.recipientId),
  })),
  envelopeItems: [{ id: 'item_test' }],
  team: { organisation: { organisationClaim: { flags: { cfr21: true } } } },
});
const fieldInput = (field: Field): FieldInput => ({
  id: field.id,
  envelopeItemId: field.envelopeItemId,
  recipientId: field.recipientId,
  type: field.type,
  pageNumber: field.page,
  pageX: field.positionX.toNumber(),
  pageY: field.positionY.toNumber(),
  pageWidth: field.width.toNumber(),
  pageHeight: field.height.toNumber(),
  fieldMeta: field.fieldMeta as FieldInput['fieldMeta'],
});
const recipientInput = (recipient: Recipient): RecipientInput => ({
  id: recipient.id,
  name: recipient.name,
  email: recipient.email,
  role: recipient.role,
  signingOrder: recipient.signingOrder,
});
const options = () => ({
  userId: 7,
  teamId: 10,
  id: { type: 'envelopeId' as const, id: state.envelope.id },
  requestMetadata: { source: 'app' as const, auth: null, requestMetadata: {} },
});
const replaceFields = (fields = state.fields.map(fieldInput)) => setFieldsForDocument({ ...options(), fields });
const replaceRecipients = (recipients = state.recipients.map(recipientInput)) =>
  setDocumentRecipients({ ...options(), recipients });
const protectAlice = (signed = true) => {
  state.recipients[0].signingStatus = signed ? SigningStatus.SIGNED : SigningStatus.NOT_SIGNED;
  state.fields[0].inserted = true;
  state.fields[0].customText = 'Previously entered value';
};
const noWrites = () => {
  for (const delegate of [db.field, db.recipient]) {
    expect(delegate.upsert).not.toHaveBeenCalled();
    expect(delegate.deleteMany).not.toHaveBeenCalled();
  }
  expect(db.documentAuditLog.create).not.toHaveBeenCalled();
  expect(db.documentAuditLog.createMany).not.toHaveBeenCalled();
  expect(jobs.triggerJob).not.toHaveBeenCalled();
};
const transaction = async (operation: (tx: typeof db) => Promise<unknown>) => {
  const before = cloneState();
  try {
    return await operation(db);
  } catch (error) {
    state = before;
    throw error;
  }
};

beforeEach(() => {
  vi.resetAllMocks();
  state = makeState();
  db.envelope.findFirst.mockImplementation(async () => snapshot());
  db.envelope.findFirstOrThrow.mockImplementation(async () => snapshot());
  db.user.findFirstOrThrow.mockResolvedValue({ id: 7, name: 'Sender', email: 'sender@example.invalid' });
  db.$queryRaw.mockResolvedValue([]);
  db.$transaction.mockImplementation(transaction);
  db.documentAuditLog.create.mockImplementation(async () => {
    state.audits += 1;
    return {};
  });
  db.documentAuditLog.createMany.mockImplementation(async ({ data }: { data: unknown[] }) => {
    state.audits += data.length;
    return { count: data.length };
  });
  db.field.upsert.mockImplementation(async ({ where, update }: { where: { id: number }; update: Partial<Field> }) => {
    const old = state.fields.find((field) => field.id === where.id);
    if (!old) {
      throw new Error('This fixture requires an existing field');
    }
    const next = {
      ...old,
      ...update,
      positionX: new Prisma.Decimal(update.positionX ?? old.positionX),
      positionY: new Prisma.Decimal(update.positionY ?? old.positionY),
      width: new Prisma.Decimal(update.width ?? old.width),
      height: new Prisma.Decimal(update.height ?? old.height),
    };
    state.fields = state.fields.map((field) => (field.id === next.id ? next : field));
    return next;
  });
  db.recipient.upsert.mockImplementation(
    async ({ where, update }: { where: { id: number }; update: Partial<Recipient> }) => {
      const old = state.recipients.find((recipient) => recipient.id === where.id);
      if (!old) {
        throw new Error('This fixture requires an existing recipient');
      }
      const next = { ...old, ...update };
      state.recipients = state.recipients.map((recipient) => (recipient.id === next.id ? next : recipient));
      return next;
    },
  );
  db.field.deleteMany.mockImplementation(async ({ where }: { where: { id: { in: number[] } } }) => {
    state.fields = state.fields.filter((field) => !where.id.in.includes(field.id));
    return { count: where.id.in.length };
  });
  db.recipient.deleteMany.mockImplementation(async ({ where }: { where: { id: { in: number[] } } }) => {
    state.recipients = state.recipients.filter((recipient) => !where.id.in.includes(recipient.id));
    state.fields = state.fields.filter((field) => !where.id.in.includes(field.recipientId));
    return { count: where.id.in.length };
  });
});

for (const kind of ['fields', 'recipients'] as const) {
  const omitAlice = () =>
    kind === 'fields'
      ? replaceFields([{ ...fieldInput(state.fields[1]), pageX: 25 }])
      : replaceRecipients([{ ...recipientInput(state.recipients[1]), name: 'Updated Bob' }]);
  describe(`A-08 replacement ${kind}`, () => {
    for (const signed of [true, false]) {
      it(`rejects removal after Alice ${signed ? 'signed' : 'inserted a field'}, before any write`, async () => {
        protectAlice(signed);
        if (signed) {
          // Independently exercise SIGNED, without relying on inserted-field protection.
          state.fields[0].inserted = false;
        }
        const before = cloneState();
        await expect(omitAlice()).rejects.toMatchObject({ code: AppErrorCode.INVALID_REQUEST });
        expect(state).toEqual(before);
        noWrites();
      });
    }
    it('preserves normal editing/removal of untouched recipients and fields', async () => {
      await omitAlice();
      expect(state.fields.map((field) => field.recipientId)).toEqual([2]);
      expect(state.audits).toBeGreaterThan(0);
      if (kind === 'fields') {
        expect(state.fields[0].positionX.toNumber()).toBe(25);
        expect(db.documentAuditLog.createMany).toHaveBeenCalledWith({
          data: [
            expect.objectContaining({
              data: expect.objectContaining({ fieldRecipientId: 1, fieldRecipientEmail: 'owner@example.invalid' }),
            }),
          ],
        });
      } else {
        expect(state.recipients.map((recipient) => recipient.name)).toEqual(['Updated Bob']);
      }
    });
    it('rechecks protection after signing state changes before the transaction', async () => {
      db.$transaction.mockImplementationOnce(async (operation: Parameters<typeof transaction>[0]) => {
        protectAlice();
        return transaction(operation);
      });
      await expect(omitAlice()).rejects.toMatchObject({ code: AppErrorCode.INVALID_REQUEST });
      expect(state.recipients[0].signingStatus).toBe(SigningStatus.SIGNED);
      expect(state.fields[0].inserted).toBe(true);
      noWrites();
    });
    it('uses signing state committed while waiting for a database lock', async () => {
      db.$queryRaw.mockImplementationOnce(async () => {
        protectAlice();
        return [];
      });
      await expect(omitAlice()).rejects.toMatchObject({ code: AppErrorCode.INVALID_REQUEST });
      noWrites();
    });
    it('rejects completed documents before writes', async () => {
      state.envelope.completedAt = new Date('2026-09-12T00:00:00Z');
      state.envelope.status = DocumentStatus.COMPLETED;
      await expect(omitAlice()).rejects.toMatchObject({ code: AppErrorCode.INVALID_REQUEST });
      noWrites();
    });
    it('rolls back updates as well as removals when the removal audit write fails', async () => {
      const before = cloneState();
      db.documentAuditLog.createMany.mockRejectedValueOnce(new Error('Synthetic audit failure'));
      await expect(omitAlice()).rejects.toThrow('Synthetic audit failure');
      expect(state).toEqual(before);
      expect(jobs.triggerJob).not.toHaveBeenCalled();
    });
    it('retains protected entries unchanged while editing another untouched recipient', async () => {
      protectAlice();
      const aliceField = { ...state.fields[0] };
      const alice = { ...state.recipients[0] };
      if (kind === 'fields') {
        await replaceFields([fieldInput(state.fields[0]), { ...fieldInput(state.fields[1]), pageX: 25 }]);
      } else {
        await replaceRecipients([
          recipientInput(alice),
          { ...recipientInput(state.recipients[1]), name: 'Updated Bob' },
        ]);
      }
      expect(state.fields.find((field) => field.id === aliceField.id)).toEqual(aliceField);
      expect(state.recipients.find((recipient) => recipient.id === alice.id)).toEqual(alice);
    });
  });
}

it('binds an existing field to its persisted signer instead of the supplied untouched signer', async () => {
  protectAlice();
  const before = cloneState();
  await expect(
    replaceFields([{ ...fieldInput(state.fields[0]), recipientId: 2, pageX: 25 }, fieldInput(state.fields[1])]),
  ).rejects.toMatchObject({ code: AppErrorCode.INVALID_REQUEST });
  expect(state).toEqual(before);
  noWrites();
});

it('sends removal notifications only after a successful commit', async () => {
  state.recipients[0].sendStatus = SendStatus.SENT;
  db.$transaction.mockImplementationOnce(async (operation: Parameters<typeof transaction>[0]) => {
    const result = await transaction(operation);
    expect(jobs.triggerJob).not.toHaveBeenCalled();
    return result;
  });
  await replaceRecipients([recipientInput(state.recipients[1])]);
  expect(jobs.triggerJob).toHaveBeenCalledOnce();
  expect(jobs.triggerJob).toHaveBeenCalledWith({
    name: 'send.recipient.removed.email',
    payload: {
      envelopeId: state.envelope.id,
      recipientEmail: 'owner@example.invalid',
      recipientName: 'Alice',
      inviterName: 'Sender',
    },
  });
});

it('does not send a removal notification when the commit fails', async () => {
  state.recipients[0].sendStatus = SendStatus.SENT;
  const before = cloneState();
  db.$transaction.mockImplementationOnce((operation: Parameters<typeof transaction>[0]) =>
    transaction(async (tx) => {
      await operation(tx);
      throw new Error('Synthetic commit failure');
    }),
  );
  await expect(replaceRecipients([recipientInput(state.recipients[1])])).rejects.toThrow('Synthetic commit failure');
  expect(state).toEqual(before);
  expect(jobs.triggerJob).not.toHaveBeenCalled();
});

it('enforces the advanced-signature document lock for field replacement', async () => {
  state.envelope.signatureLevel = 'AES';
  await expect(replaceFields()).rejects.toMatchObject({ code: AppErrorCode.ENVELOPE_TSP_LOCKED });
  noWrites();
});

it('does not allow changing the type or owner of an inserted signature field', async () => {
  protectAlice(false);
  state.fields[0].type = FieldType.SIGNATURE;
  state.fields[0].fieldMeta = null;
  await expect(
    replaceFields([
      { ...fieldInput(state.fields[0]), type: FieldType.TEXT, recipientId: 2, fieldMeta: { type: 'text' } },
      fieldInput(state.fields[1]),
    ]),
  ).rejects.toMatchObject({ code: AppErrorCode.INVALID_REQUEST });
  noWrites();
});
