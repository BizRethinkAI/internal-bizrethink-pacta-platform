import type { JobRunIO } from '@documenso/lib/jobs/client/_internal/job';
import { run } from '@documenso/lib/jobs/definitions/emails/send-signing-email.handler';
import { SendStatus } from '@prisma/client';
import { beforeEach, expect, it, vi } from 'vitest';
import { envelopeFixture, recipientFixture } from './recipient-auth-fixture';

const mocks = vi.hoisted(() => ({
  db: {
    user: { findFirstOrThrow: vi.fn() },
    envelope: { findFirstOrThrow: vi.fn(), findFirst: vi.fn() },
    recipient: { findFirstOrThrow: vi.fn(), update: vi.fn(), updateMany: vi.fn() },
    documentAuditLog: { create: vi.fn() },
  },
  send: vi.fn(),
}));
vi.mock('@lingui/core/macro', () => ({
  msg: (value: unknown) => (Array.isArray(value) ? { id: value.join(''), message: value.join('') } : value),
}));
vi.mock('@documenso/prisma', () => ({ prisma: mocks.db }));
vi.mock('@documenso/email/templates/document-invite', () => ({ default: () => null }));
vi.mock('@documenso/lib/utils/render-email-with-i18n', () => ({ renderEmailWithI18N: async () => 'synthetic email' }));
vi.mock('@documenso/lib/client-only/providers/i18n-server', () => ({
  getI18nInstance: async () => ({ _: () => 'synthetic translation' }),
}));
vi.mock('@documenso/lib/server-only/email/get-email-context', () => ({
  getEmailContext: async () => ({
    branding: {},
    emailLanguage: 'en',
    settings: { includeSenderDetails: true },
    organisationType: 'PERSONAL',
    senderEmail: 'sender@example.invalid',
    organisationId: 'org_test',
    claims: {},
    emailsDisabled: false,
    emailTransport: { sendMail: mocks.send },
  }),
}));
vi.mock('@documenso/lib/server-only/rate-limit/assert-organisation-rates-and-limits', () => ({
  assertOrganisationRatesAndLimits: async () => undefined,
}));
let current = recipientFixture('envelope_team_a');
let reassignDuringDelivery: boolean;
const io = {
  runTask: async (_name: string, action: () => Promise<unknown>) => action(),
  logger: { warn: vi.fn() },
} as unknown as JobRunIO;
beforeEach(() => {
  vi.resetAllMocks();
  reassignDuringDelivery = false;
  current = {
    ...recipientFixture('envelope_team_a'),
    token: 'original-delivery-token',
    sendStatus: SendStatus.NOT_SENT,
  };
  const envelope = {
    ...envelopeFixture(),
    user: { disabled: false },
    team: { name: 'Synthetic team', teamEmail: null },
  };
  mocks.db.envelope.findFirstOrThrow.mockResolvedValue(envelope);
  mocks.db.envelope.findFirst.mockResolvedValue(envelope);
  mocks.db.user.findFirstOrThrow.mockResolvedValue({
    id: 7,
    name: 'Synthetic sender',
    email: 'sender@example.invalid',
  });
  mocks.db.recipient.findFirstOrThrow.mockImplementation(async () => ({ ...current }));
  const update = async ({ where, data }: { where: { token?: string }; data: Partial<typeof current> }) => {
    if (where.token && where.token !== current.token) {
      return { count: 0 };
    }
    current = { ...current, ...data };
    return { count: 1 };
  };
  mocks.db.recipient.update.mockImplementation(update);
  mocks.db.recipient.updateMany.mockImplementation(update);
  mocks.send.mockImplementation(async () => {
    if (reassignDuringDelivery) {
      current = {
        ...current,
        token: 'replacement-delivery-token',
        email: 'replacement@example.invalid',
        sendStatus: SendStatus.NOT_SENT,
        sentAt: null,
      };
    }
  });
});
it('A-19 finishing delivery of an old link does not mark the replacement as sent', async () => {
  reassignDuringDelivery = true;
  await run({ payload: { userId: 7, documentId: 1, recipientId: 1 }, io });
  expect(mocks.send).toHaveBeenCalledOnce();
  expect(current).toMatchObject({ token: 'replacement-delivery-token', sendStatus: SendStatus.NOT_SENT, sentAt: null });
  expect(mocks.db.documentAuditLog.create).not.toHaveBeenCalled();
});
it('A-19 current delivery still records sent status and schedules reminders', async () => {
  await run({ payload: { userId: 7, documentId: 1, recipientId: 1 }, io });
  expect(mocks.send).toHaveBeenCalledOnce();
  expect(current.sendStatus).toBe(SendStatus.SENT);
  expect(current.sentAt).toBeInstanceOf(Date);
  expect(mocks.db.documentAuditLog.create).toHaveBeenCalledOnce();
});
