import type { JobRunIO } from '@documenso/lib/jobs/client/_internal/job';
import { run } from '@documenso/lib/jobs/definitions/emails/send-document-deleted-emails.handler';
import { beforeEach, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ reserve: vi.fn(), send: vi.fn() }));
vi.mock('@bizrethink/customizations/server-only/resources/trial-policy', () => ({
  reserveTrialRecipientEmail: mocks.reserve,
}));
vi.mock('@documenso/lib/server-only/email/get-email-context', () => ({
  getEmailContext: vi.fn(async () => ({
    emailLanguage: 'en',
    emailsDisabled: false,
    emailTransport: { sendMail: mocks.send },
  })),
}));
vi.mock('@documenso/lib/client-only/providers/i18n-server', () => ({
  getI18nInstance: vi.fn(async () => ({ _: () => 'synthetic' })),
}));
vi.mock('@documenso/lib/utils/render-email-with-i18n', () => ({ renderEmailWithI18N: vi.fn(async () => 'synthetic') }));
const io: JobRunIO = {
  runTask: async (_key, work) => work(),
  triggerJob: vi.fn(),
  wait: vi.fn(),
  logger: { info: vi.fn(), error: vi.fn(), debug: vi.fn(), warn: vi.fn(), log: vi.fn() },
};
const execute = () =>
  run({
    io,
    payload: {
      teamId: 12,
      documentName: 'Synthetic',
      inviterEmail: 'owner@example.invalid',
      meta: null,
      recipients: [{ email: 'recipient@example.invalid', name: 'Recipient' }],
    },
  });
beforeEach(() => vi.resetAllMocks());
it('A-11 cancellation after deletion still enforces the recipient-email trial cap', async () => {
  mocks.reserve.mockRejectedValue(new Error('Trial cap reached'));
  await expect(execute()).rejects.toThrow('Trial cap reached');
  expect(mocks.send).not.toHaveBeenCalled();
});
it('preserves permitted cancellation mail and charges only once per delivery attempt', async () => {
  await execute();
  expect(mocks.send).toHaveBeenCalledOnce();
  expect(mocks.reserve).toHaveBeenCalledExactlyOnceWith(12);
});
