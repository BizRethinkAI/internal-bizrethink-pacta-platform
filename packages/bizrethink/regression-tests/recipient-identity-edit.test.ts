import { updateRecipient } from '@documenso/lib/server-only/admin/update-recipient';
import { setDocumentRecipients } from '@documenso/lib/server-only/recipient/set-document-recipients';
import { setTemplateRecipients } from '@documenso/lib/server-only/recipient/set-template-recipients';
import { updateEnvelopeRecipients } from '@documenso/lib/server-only/recipient/update-envelope-recipients';
import { createTemplateDirectLink } from '@documenso/lib/server-only/template/create-template-direct-link';
import { deleteTemplateDirectLink } from '@documenso/lib/server-only/template/delete-template-direct-link';
import type { Recipient } from '@prisma/client';
import {
  DocumentDistributionMethod,
  DocumentStatus,
  EnvelopeType,
  ReadStatus,
  RecipientRole,
  SendStatus,
  SigningStatus,
} from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { envelopeFixture, type fieldFixture, recipientFixture } from './recipient-auth-fixture';

const { db, job } = vi.hoisted(() => ({
  db: {
    envelope: { findFirst: vi.fn(), findUnique: vi.fn(), findFirstOrThrow: vi.fn() },
    user: { findFirstOrThrow: vi.fn() },
    recipient: { findFirst: vi.fn(), findFirstOrThrow: vi.fn(), update: vi.fn(), upsert: vi.fn(), deleteMany: vi.fn() },
    field: { deleteMany: vi.fn() },
    documentAuditLog: { create: vi.fn(), createMany: vi.fn() },
    templateDirectLink: { create: vi.fn(), delete: vi.fn() },
    cscCredential: { deleteMany: vi.fn() },
    cscSession: { deleteMany: vi.fn() },
    $queryRaw: vi.fn(),
    $transaction: vi.fn(),
  },
  job: vi.fn(),
}));
vi.mock('@documenso/prisma', () => ({ prisma: db }));
vi.mock('@documenso/lib/jobs/client', () => ({ jobs: { triggerJob: job } }));
// Actual parent membership/role predicates are exercised by HTTP/PostgreSQL tests.
vi.mock('@documenso/lib/server-only/envelope/get-envelope-by-id', () => ({
  getEnvelopeWhereInput: async () => ({ envelopeWhereInput: { id: 'envelope_team_a' } }),
}));
const deadline = new Date('2099-01-01T00:00:00Z');
const makeRecipient = (): Recipient => ({
  ...recipientFixture('envelope_team_a'),
  name: 'Original recipient',
  email: 'original@example.invalid',
  token: 'original-test-bearer',
  sendStatus: SendStatus.SENT,
  readStatus: ReadStatus.OPENED,
  sentAt: new Date('2026-09-10T00:00:00Z'),
  expiresAt: deadline,
  lastReminderSentAt: new Date('2026-09-11T00:00:00Z'),
  nextReminderAt: new Date('2098-12-31T00:00:00Z'),
  reminderCount: 2,
  authOptions: { accessAuth: ['ACCOUNT'], actionAuth: ['PASSWORD'] },
});
let recipient: Recipient;
let envelope: ReturnType<typeof envelopeFixture> & { signatureLevel: string };
let fields: ReturnType<typeof fieldFixture>[];
let directLink: {
  id: string;
  directTemplateRecipientId: number;
  token: string;
  createdAt: Date;
  enabled: boolean;
} | null;
const snapshot = () => ({
  ...envelope,
  directLink,
  fields: fields.map((row) => ({ ...row })),
  recipients: [{ ...recipient }],
  team: { organisation: { organisationClaim: { flags: { cfr21: true } } } },
});
const options = () => ({
  userId: 7,
  teamId: 10,
  id: { type: 'envelopeId' as const, id: envelope.id },
  requestMetadata: { source: 'app' as const, auth: null, requestMetadata: {} },
});
const input = (change: Partial<Recipient>) => ({
  id: recipient.id,
  email: recipient.email,
  name: recipient.name,
  role: recipient.role,
  signingOrder: recipient.signingOrder,
  ...change,
});
const adapters = [
  {
    name: 'v2 update',
    run: (change: Partial<Recipient>) => updateEnvelopeRecipients({ ...options(), recipients: [input(change)] }),
  },
  {
    name: 'document replacement',
    run: (change: Partial<Recipient>) => setDocumentRecipients({ ...options(), recipients: [input(change)] }),
  },
  { name: 'admin correction', run: (change: Partial<Recipient>) => updateRecipient(input(change)) },
  {
    name: 'template replacement',
    run: (change: Partial<Recipient>) => {
      envelope.type = EnvelopeType.TEMPLATE;
      envelope.secondaryId = 'template_1';
      envelope.status = DocumentStatus.DRAFT;
      return setTemplateRecipients({ ...options(), recipients: [input(change)] });
    },
  },
];
beforeEach(() => {
  vi.resetAllMocks();
  recipient = makeRecipient();
  envelope = { ...envelopeFixture({ status: DocumentStatus.PENDING }), signatureLevel: 'SES' };
  fields = [];
  directLink = null;
  for (const read of Object.values(db.envelope)) {
    read.mockImplementation(async () => snapshot());
  }
  db.recipient.findFirst.mockImplementation(async () => ({ ...recipient }));
  db.recipient.findFirstOrThrow.mockImplementation(async () => ({ ...recipient }));
  const update = async (data: Partial<Recipient>) => {
    recipient = {
      ...recipient,
      ...Object.fromEntries(Object.entries(data).filter(([, value]) => value !== undefined)),
    };
    return { ...recipient, fields };
  };
  db.recipient.update.mockImplementation(async ({ data }: { data: Partial<Recipient> }) => update(data));
  db.recipient.upsert.mockImplementation(async ({ update: data }: { update: Partial<Recipient> }) => update(data));
  db.user.findFirstOrThrow.mockResolvedValue({ id: 7, name: 'Synthetic sender', email: 'sender@example.invalid' });
  db.$queryRaw.mockResolvedValue([]);
  db.$transaction.mockImplementation(async (operation: (tx: typeof db) => Promise<unknown>) => {
    const saved = { ...recipient };
    try {
      return await operation(db);
    } catch (error) {
      recipient = saved;
      throw error;
    }
  });
  db.templateDirectLink.create.mockImplementation(async ({ data }) => ({
    id: 'direct_test',
    createdAt: new Date(),
    ...data,
  }));
  db.templateDirectLink.delete.mockResolvedValue({});
  job.mockResolvedValue(undefined);
});
for (const adapter of adapters) {
  describe(`A-19 ${adapter.name}`, () => {
    it.each([
      { email: 'replacement@example.invalid' },
      { name: 'Replacement recipient' },
      { role: RecipientRole.VIEWER },
    ])('revokes delivered bearer authority when identity or role changes: %j', async (change) => {
      const before = { ...recipient };
      await adapter.run(change);
      expect(recipient).toMatchObject(change);
      expect(recipient.token).not.toBe(before.token);
      expect(recipient.token.length).toBeGreaterThanOrEqual(20);
      expect(recipient).toMatchObject({
        readStatus: ReadStatus.NOT_OPENED,
        sentAt: null,
        signedAt: null,
        lastReminderSentAt: null,
        nextReminderAt: null,
        reminderCount: 0,
        expiresAt: deadline,
        authOptions: before.authOptions,
      });
      expect(db.cscCredential.deleteMany).toHaveBeenCalledWith({ where: { recipientId: recipient.id } });
      expect(db.cscSession.deleteMany).toHaveBeenCalledWith({ where: { recipientId: recipient.id } });
    });
    it('retains the bearer and signing proof for an unchanged identity', async () => {
      const before = { ...recipient };
      await adapter.run({});
      expect(recipient.token).toBe(before.token);
      expect(db.cscCredential.deleteMany).not.toHaveBeenCalled();
      expect(db.cscSession.deleteMany).not.toHaveBeenCalled();
    });
  });
}
it.each(
  adapters.filter(({ name }) => name !== 'template replacement'),
)('preserves signed-recipient immutability in $name', async (adapter) => {
  recipient.signingStatus = SigningStatus.SIGNED;
  const before = { ...recipient };
  await expect(adapter.run({ email: 'replacement@example.invalid' })).rejects.toBeDefined();
  expect(recipient).toEqual(before);
  expect(job).not.toHaveBeenCalled();
});
it('admin correction cannot bypass the AES/QES distribution lock', async () => {
  envelope.signatureLevel = 'AES';
  const before = { ...recipient };
  await expect(adapters[2].run({ email: 'replacement@example.invalid' })).rejects.toMatchObject({
    code: 'ENVELOPE_TSP_LOCKED',
  });
  expect(recipient).toEqual(before);
});
it('revokes a named template recipient bearer when converting it into the public direct placeholder', async () => {
  envelope.type = EnvelopeType.TEMPLATE;
  envelope.secondaryId = 'template_1';
  envelope.status = DocumentStatus.DRAFT;
  const oldToken = recipient.token;
  await createTemplateDirectLink({ ...options(), directRecipientId: recipient.id });
  expect(recipient.token).not.toBe(oldToken);
  expect(db.cscCredential.deleteMany).toHaveBeenCalledWith({ where: { recipientId: recipient.id } });
});
it('revokes direct preview bearer authority when the direct link is removed', async () => {
  envelope.type = EnvelopeType.TEMPLATE;
  envelope.secondaryId = 'template_1';
  envelope.status = DocumentStatus.DRAFT;
  directLink = {
    id: 'direct_test',
    directTemplateRecipientId: recipient.id,
    token: 'public-direct-test',
    createdAt: new Date(),
    enabled: true,
  };
  const oldToken = recipient.token;
  await deleteTemplateDirectLink({ userId: 7, teamId: 10, templateId: 1 });
  expect(recipient.token).not.toBe(oldToken);
  expect(db.cscSession.deleteMany).toHaveBeenCalledWith({ where: { recipientId: recipient.id } });
});

it('queues a replacement signing link after a delivered recipient changes', async () => {
  await adapters[0].run({ email: 'replacement@example.invalid' });
  expect(job).toHaveBeenCalledWith(
    expect.objectContaining({
      name: 'send.signing.requested.email',
      payload: expect.objectContaining({ recipientId: recipient.id, documentId: 1, userId: 7 }),
    }),
  );
});
it('keeps manual distribution manual when identity changes', async () => {
  if (!envelope.documentMeta) {
    throw new Error('Missing fixture metadata');
  }
  envelope.documentMeta.distributionMethod = DocumentDistributionMethod.NONE;
  await adapters[0].run({ email: 'replacement@example.invalid' });
  expect(job).not.toHaveBeenCalled();
});
