/** A-19: real HTTP cookies, recipient bearers, PDFs and PostgreSQL locks. */
import { randomUUID } from 'node:crypto';
import { NEXT_PUBLIC_WEBAPP_URL } from '@documenso/lib/constants/app';
import { mapSecondaryIdToDocumentId } from '@documenso/lib/utils/envelope';
import { prisma } from '@documenso/prisma';
import { seedPendingDocument } from '@documenso/prisma/seed/documents';
import { seedUser } from '@documenso/prisma/seed/users';
import type { APIRequestContext, APIResponse } from '@playwright/test';
import { expect, test } from '@playwright/test';
import {
  DocumentDistributionMethod,
  EnvelopeType,
  FieldType,
  Prisma,
  ReadStatus,
  Role,
  SendStatus,
  SigningStatus,
} from '@prisma/client';

const baseURL = NEXT_PUBLIC_WEBAPP_URL();
const ok = async (response: APIResponse) => expect(response.ok(), await response.text()).toBe(true);
const denied = async (response: APIResponse, code: string) => {
  expect(response.ok(), await response.text()).toBe(false);
  expect((await response.json()).error.json.data.code).toBe(code);
};
const trpc = (client: APIRequestContext, name: string, input: Record<string, unknown>, teamId?: number) =>
  client.post(`${baseURL}/api/trpc/${name}`, {
    headers: { 'content-type': 'application/json', ...(teamId ? { 'x-team-id': String(teamId) } : {}) },
    data: JSON.stringify({ json: input }),
  });
const login = async (client: APIRequestContext, email: string) => {
  const csrf = await client.get(`${baseURL}/api/auth/csrf`);
  await ok(csrf);
  const { csrfToken } = await csrf.json();
  await ok(
    await client.post(`${baseURL}/api/auth/email-password/authorize`, {
      data: { email, password: 'password', csrfToken },
    }),
  );
  expect((await (await client.get(`${baseURL}/api/auth/session`)).json()).user?.email).toBe(email);
};
const fixture = async (version: 1 | 2 = 2, account = false) => {
  const sender = await seedUser();
  const original = await seedUser();
  const replacement = await seedUser();
  const envelope = await seedPendingDocument(sender.user, sender.team.id, [original.user], {
    internalVersion: version,
    createDocumentOptions: { authOptions: { globalAccessAuth: account ? ['ACCOUNT'] : [], globalActionAuth: [] } },
  });
  await prisma.field.updateMany({ where: { envelopeId: envelope.id }, data: { inserted: false, customText: '' } });
  await prisma.documentMeta.update({
    where: { id: envelope.documentMetaId! },
    data: { distributionMethod: DocumentDistributionMethod.NONE },
  });
  const recipient = await prisma.recipient.update({
    where: { id: envelope.recipients[0].id },
    data: {
      signingStatus: SigningStatus.NOT_SIGNED,
      signedAt: null,
      sendStatus: SendStatus.SENT,
      readStatus: ReadStatus.OPENED,
      sentAt: new Date(),
      lastReminderSentAt: new Date(),
      reminderCount: 2,
      expiresAt: new Date('2099-01-01'),
    },
  });
  const field = await prisma.field.findFirstOrThrow({ where: { recipientId: recipient.id } });
  const item = await prisma.envelopeItem.findFirstOrThrow({ where: { envelopeId: envelope.id } });
  return {
    sender,
    original,
    replacement,
    envelope,
    recipient,
    field,
    item,
    documentId: mapSecondaryIdToDocumentId(envelope.secondaryId),
  };
};
type Fixture = Awaited<ReturnType<typeof fixture>>;
const pdf = (client: APIRequestContext, f: Fixture, token: string) =>
  client.get(`${baseURL}/api/files/token/${token}/envelopeItem/${f.item.id}`);
const replace = (client: APIRequestContext, f: Fixture, surface: string, email = f.replacement.user.email) => {
  const data = { id: f.recipient.id, name: f.replacement.user.name ?? 'Replacement', email, role: f.recipient.role };
  if (surface === 'admin') {
    return trpc(client, 'admin.recipient.update', data);
  }
  if (surface === 'update') {
    return trpc(client, 'envelope.recipient.updateMany', { envelopeId: f.envelope.id, data: [data] }, f.sender.team.id);
  }
  return trpc(
    client,
    surface === 'legacy' ? 'recipient.setDocumentRecipients' : 'envelope.recipient.set',
    {
      ...(surface === 'legacy'
        ? { documentId: f.documentId }
        : { envelopeId: f.envelope.id, envelopeType: EnvelopeType.DOCUMENT }),
      recipients: [data],
    },
    f.sender.team.id,
  );
};
for (const surface of ['update', 'legacy', 'replacement', 'admin']) {
  test(`A-19 ${surface} revokes the old signing/PDF link and clears previous identity proof`, async ({
    request,
    playwright,
  }) => {
    const f = await fixture(surface === 'legacy' ? 1 : 2);
    if (surface === 'admin') {
      await prisma.user.update({ where: { id: f.sender.user.id }, data: { roles: [Role.ADMIN] } });
    }
    await login(request, f.sender.user.email);
    const anonymous = await playwright.request.newContext();
    try {
      const before = await pdf(anonymous, f, f.recipient.token);
      await ok(before);
      expect((await before.body()).subarray(0, 5).toString()).toBe('%PDF-');
      await prisma.cscCredential.create({
        data: {
          recipientId: f.recipient.id,
          providerId: 'synthetic',
          credentialId: 'synthetic',
          signatureAlgorithm: 'synthetic',
          keyType: 'RSA',
          digestAlgorithm: 'SHA-256',
          keyLenBits: 2048,
        },
      });
      await prisma.cscSession.create({
        data: { recipientId: f.recipient.id, envelopeId: f.envelope.id, signingTime: new Date(), itemsJson: [] },
      });
      await ok(await replace(request, f, surface));
      const current = await prisma.recipient.findUniqueOrThrow({ where: { id: f.recipient.id } });
      expect(current.token).not.toBe(f.recipient.token);
      expect(current).toMatchObject({
        email: f.replacement.user.email,
        readStatus: ReadStatus.NOT_OPENED,
        signingStatus: SigningStatus.NOT_SIGNED,
        sentAt: null,
        signedAt: null,
        lastReminderSentAt: null,
        nextReminderAt: null,
        reminderCount: 0,
        expiresAt: f.recipient.expiresAt,
        authOptions: f.recipient.authOptions,
      });
      expect(await prisma.cscCredential.count({ where: { recipientId: current.id } })).toBe(0);
      expect(await prisma.cscSession.count({ where: { recipientId: current.id } })).toBe(0);
      expect((await pdf(anonymous, f, f.recipient.token)).status()).toBe(404);
      await denied(
        await trpc(anonymous, 'recipient.completeDocumentWithToken', {
          token: f.recipient.token,
          documentId: f.documentId,
        }),
        'NOT_FOUND',
      );
      const replacementPdf = await pdf(anonymous, f, current.token);
      await ok(replacementPdf);
      expect((await replacementPdf.body()).subarray(0, 5).toString()).toBe('%PDF-');
      await ok(
        await trpc(anonymous, 'field.signFieldWithToken', {
          token: current.token,
          fieldId: f.field.id,
          value: 'Current recipient',
        }),
      );
      await ok(
        await trpc(anonymous, 'recipient.completeDocumentWithToken', {
          token: current.token,
          documentId: f.documentId,
        }),
      );
      expect((await prisma.recipient.findUniqueOrThrow({ where: { id: current.id } })).signingStatus).toBe(
        SigningStatus.SIGNED,
      );
    } finally {
      await anonymous.dispose();
    }
  });
}
test('A-19 reassignment retains ACCOUNT identity checks and does not extend an expired signing deadline', async ({
  request,
  playwright,
}) => {
  const f = await fixture(2, true);
  await login(request, f.sender.user.email);
  const deadline = new Date(Date.now() - 60000);
  await prisma.recipient.update({ where: { id: f.recipient.id }, data: { expiresAt: deadline } });
  await ok(await replace(request, f, 'update'));
  const current = await prisma.recipient.findUniqueOrThrow({ where: { id: f.recipient.id } });
  const previous = await playwright.request.newContext();
  const intended = await playwright.request.newContext();
  try {
    await login(previous, f.original.user.email);
    await login(intended, f.replacement.user.email);
    expect((await pdf(previous, f, current.token)).status()).toBe(403);
    await ok(await pdf(intended, f, current.token));
    await denied(
      await trpc(intended, 'recipient.completeDocumentWithToken', { token: current.token, documentId: f.documentId }),
      'RECIPIENT_EXPIRED',
    );
    expect(current.expiresAt).toEqual(deadline);
    expect(current.signingStatus).toBe(SigningStatus.NOT_SIGNED);
  } finally {
    await previous.dispose();
    await intended.dispose();
  }
});
for (const operation of ['insert', 'complete']) {
  test(`A-19 ${operation} rejects a reassignment committed while the old request waits for its write lock`, async ({
    request,
  }) => {
    const f = await fixture();
    if (operation === 'complete') {
      await prisma.field.updateMany({
        where: { recipientId: f.recipient.id },
        data: { type: FieldType.DATE, fieldMeta: Prisma.DbNull, inserted: false },
      });
    }
    const pending: { response?: Promise<APIResponse> } = {};
    const replacementToken = randomUUID();
    try {
      await prisma.$transaction(
        async (tx) => {
          const [{ pid }] = await tx.$queryRaw<Array<{ pid: number }>>(Prisma.sql`SELECT pg_backend_pid() AS pid`);
          await tx.$queryRaw(Prisma.sql`SELECT id FROM "Envelope" WHERE id = ${f.envelope.id} FOR UPDATE`);
          pending.response =
            operation === 'complete'
              ? trpc(request, 'recipient.completeDocumentWithToken', {
                  token: f.recipient.token,
                  documentId: f.documentId,
                })
              : trpc(request, 'envelope.field.sign', {
                  token: f.recipient.token,
                  fieldId: f.field.id,
                  fieldValue: { type: f.field.type, value: 'Old recipient input' },
                });
          await expect
            .poll(
              async () => {
                const [{ blocked }] = await prisma.$queryRaw<Array<{ blocked: boolean }>>(
                  Prisma.sql`SELECT EXISTS (SELECT 1 FROM pg_stat_activity AS activity WHERE activity.datname = current_database() AND ${pid} = ANY(pg_blocking_pids(activity.pid))) AS blocked`,
                );
                return blocked;
              },
              { timeout: 4000 },
            )
            .toBe(true);
          await tx.recipient.update({
            where: { id: f.recipient.id },
            data: { token: replacementToken, email: f.replacement.user.email, name: 'Replacement' },
          });
        },
        { timeout: 10000 },
      );
      if (!pending.response) {
        throw new Error('Request did not start');
      }
      await denied(await pending.response, 'NOT_FOUND');
      expect(await prisma.field.count({ where: { recipientId: f.recipient.id, inserted: true } })).toBe(0);
      expect((await prisma.recipient.findUniqueOrThrow({ where: { id: f.recipient.id } })).signingStatus).toBe(
        SigningStatus.NOT_SIGNED,
      );
    } finally {
      await pending.response?.catch(() => undefined);
    }
  });
}
