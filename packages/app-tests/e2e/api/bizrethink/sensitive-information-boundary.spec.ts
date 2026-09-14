/** A-21: real HTTP, PostgreSQL fixtures and the actual server log transport in CI. */
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { NEXT_PUBLIC_WEBAPP_URL } from '@documenso/lib/constants/app';
import { prisma } from '@documenso/prisma';
import { seedPendingDocument } from '@documenso/prisma/seed/documents';
import { seedUser } from '@documenso/prisma/seed/users';
import { dataTransformer } from '@documenso/trpc/utils/data-transformer';
import { expect, test } from '@playwright/test';

const baseURL = NEXT_PUBLIC_WEBAPP_URL();
// The repository's test:e2e script starts Remix in its workspace with
// NEXT_PRIVATE_LOGGER_FILE_PATH=./logs.json. No production log is read here.
const logFile = new URL('../../../../../apps/remix/logs.json', import.meta.url);
const readLogs = () => readFile(logFile, 'utf8');
const assertSafeRequestLog = async (requestId: string, canary: string) => {
  expect(requestId).toMatch(/^[a-f\d]{8}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{12}$/i);
  await expect.poll(async () => (await readLogs()).includes(requestId)).toBe(true);
  const text = await readLogs();
  expect(text).not.toContain(canary);
  const records = text
    .split('\n')
    .filter((line) => line.includes(requestId))
    .map((line) => JSON.parse(line));
  expect(records.some((record) => record.event === 'document.access.attempt')).toBe(true);
  expect(
    records.every((record) => !record.input && !record.requestPath && !record.ipAddress && !record.userAgent),
  ).toBe(true);
};

test('A-21 a permitted recipient read works without logging its bearer or caller-supplied request ID', async ({
  request,
}) => {
  const sender = await seedUser();
  const envelope = await seedPendingDocument(sender.user, sender.team.id, [sender.user], {
    internalVersion: 2,
    createDocumentOptions: { authOptions: { globalAccessAuth: [], globalActionAuth: [] } },
  });
  const canary = `synthetic-recipient-log-${randomUUID()}`;
  await prisma.recipient.update({ where: { id: envelope.recipients[0].id }, data: { token: canary } });
  const input = encodeURIComponent(
    JSON.stringify({ json: { envelopeId: envelope.id, access: { type: 'recipient', token: canary } } }),
  );
  const response = await request.get(`${baseURL}/api/trpc/envelope.item.getManyByToken?input=${input}`, {
    headers: { 'x-request-id': canary, cookie: `synthetic-log-cookie=${canary}`, 'user-agent': canary },
  });
  expect(response.status(), await response.text()).toBe(200);
  expect((await response.json()).result.data.json.data.length).toBeGreaterThan(0);
  await assertSafeRequestLog(response.headers()['x-request-id'], canary);
});

test('A-21 a rejected direct-template request keeps its bearer and recipient email out of real logs', async ({
  request,
}) => {
  const canary = `synthetic-template-log-${randomUUID()}`;
  const response = await request.post(`${baseURL}/api/trpc/template.createDocumentFromDirectTemplate`, {
    data: dataTransformer.serialize({
      directTemplateToken: canary,
      directRecipientName: canary,
      directRecipientEmail: `${canary}@example.invalid`,
      signedFieldValues: [],
      templateUpdatedAt: new Date(0),
    }),
    headers: { 'content-type': 'application/json', 'x-request-id': canary },
  });
  expect(response.status(), await response.text()).toBe(404);
  await assertSafeRequestLog(response.headers()['x-request-id'], canary);
});
