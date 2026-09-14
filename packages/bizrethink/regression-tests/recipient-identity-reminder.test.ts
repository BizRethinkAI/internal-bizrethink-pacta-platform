import { updateRecipientNextReminder } from '@documenso/lib/server-only/recipient/update-recipient-next-reminder';
import { beforeEach, expect, it, vi } from 'vitest';

const db = vi.hoisted(() => ({ recipient: { update: vi.fn(), updateMany: vi.fn() } }));
vi.mock('@documenso/prisma', () => ({ prisma: db }));
let reminderCount: number;
const options = {
  recipientId: 1,
  recipientToken: 'old-delivery-test-token',
  envelopeId: 'envelope_test',
  sentAt: new Date(),
  lastReminderSentAt: null,
  resetReminderCount: true,
  reminderSettings: null,
};
let currentToken: string;
beforeEach(() => {
  vi.resetAllMocks();
  reminderCount = 3;
  currentToken = options.recipientToken;
  const update = async ({ where, data }: { where: { token?: string }; data: { reminderCount?: number } }) => {
    if (where.token && where.token !== currentToken) {
      return { count: 0 };
    }
    reminderCount = data.reminderCount ?? reminderCount;
    return { count: 1 };
  };
  db.recipient.update.mockImplementation(update);
  db.recipient.updateMany.mockImplementation(update);
});
it('A-19 a stale delivery cannot reset replacement recipient reminder bookkeeping', async () => {
  currentToken = 'replacement-delivery-test-token';
  await updateRecipientNextReminder(options);
  expect(reminderCount).toBe(3);
});
it('A-19 a current delivery retains the existing reminder reset behavior', async () => {
  await updateRecipientNextReminder(options);
  expect(reminderCount).toBe(0);
});
