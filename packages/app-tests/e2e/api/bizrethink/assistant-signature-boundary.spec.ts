/** A-06: real HTTP, PostgreSQL, signature rows and audit records in CI only. */
import { NEXT_PUBLIC_WEBAPP_URL } from '@documenso/lib/constants/app';
import { FIELD_SIGNATURE_META_DEFAULT_VALUES, FIELD_TEXT_META_DEFAULT_VALUES } from '@documenso/lib/types/field-meta';
import { prisma } from '@documenso/prisma';
import { seedPendingDocument } from '@documenso/prisma/seed/documents';
import { seedUser } from '@documenso/prisma/seed/users';
import type { APIRequestContext, APIResponse } from '@playwright/test';
import { expect, test } from '@playwright/test';
import { FieldType, Prisma, RecipientRole, SigningStatus } from '@prisma/client';

const baseURL = NEXT_PUBLIC_WEBAPP_URL();
const fixture = async (version: 1 | 2, type: FieldType) => {
  const [sender, signer] = await Promise.all([seedUser(), seedUser()]);
  const assistantEmail = `assistant-${sender.user.id}@example.invalid`;
  const envelope = await seedPendingDocument(sender.user, sender.team.id, [assistantEmail, signer.user], {
    internalVersion: version,
  });
  const assistantRow = await prisma.recipient.findFirstOrThrow({
    where: { envelopeId: envelope.id, email: assistantEmail },
  });
  const signerRow = await prisma.recipient.findFirstOrThrow({
    where: { envelopeId: envelope.id, email: signer.user.email },
  });
  const assistant = await prisma.recipient.update({
    where: { id: assistantRow.id },
    data: { role: RecipientRole.ASSISTANT, signingOrder: 1, signedAt: null },
  });
  const recipient = await prisma.recipient.update({
    where: { id: signerRow.id },
    data: { signingOrder: 2, signedAt: null, authOptions: { accessAuth: [], actionAuth: ['ACCOUNT'] } },
  });
  const initialField = await prisma.field.findFirstOrThrow({ where: { recipientId: recipient.id } });
  const field = await prisma.field.update({
    where: { id: initialField.id },
    data: {
      type,
      inserted: false,
      customText: '',
      fieldMeta:
        type === FieldType.TEXT
          ? FIELD_TEXT_META_DEFAULT_VALUES
          : type === FieldType.SIGNATURE
            ? FIELD_SIGNATURE_META_DEFAULT_VALUES
            : Prisma.DbNull,
    },
  });
  return { envelope, signer, assistant, recipient, field };
};
type Fixture = Awaited<ReturnType<typeof fixture>>;
const trpc = (request: APIRequestContext, name: string, input: Record<string, unknown>) =>
  request.post(`${baseURL}/api/trpc/${name}`, {
    headers: { 'content-type': 'application/json' },
    data: JSON.stringify({ json: input }),
  });
const expectOk = async (response: APIResponse) => {
  expect(response.ok(), await response.text()).toBe(true);
};
const expectDenied = async (response: APIResponse) => {
  expect(response.ok()).toBe(false);
  expect((await response.json()).error.json.data.code).toBe('INVALID_REQUEST');
};
const signIn = async (request: APIRequestContext, email: string) => {
  const csrf = await request.get(`${baseURL}/api/auth/csrf`);
  await expectOk(csrf);
  const { csrfToken } = await csrf.json();
  await expectOk(
    await request.post(`${baseURL}/api/auth/email-password/authorize`, {
      data: { email, password: 'password', csrfToken },
    }),
  );
  const session = await request.get(`${baseURL}/api/auth/session`);
  expect((await session.json()).user?.email).toBe(email);
};
const storedField = (f: Fixture) =>
  prisma.field.findUniqueOrThrow({ where: { id: f.field.id }, include: { signature: true } });
const auditCount = (f: Fixture) => prisma.documentAuditLog.count({ where: { envelopeId: f.envelope.id } });
const legacyInsert = (request: APIRequestContext, f: Fixture, token: string, withAccount = false) =>
  trpc(request, 'field.signFieldWithToken', {
    token,
    fieldId: f.field.id,
    value: 'A-06 synthetic value',
    ...(withAccount ? { authOptions: { type: 'ACCOUNT' } } : {}),
  });
const legacyRemove = (request: APIRequestContext, f: Fixture, token: string) =>
  trpc(request, 'field.removeSignedFieldWithToken', { token, fieldId: f.field.id });
const current = (request: APIRequestContext, f: Fixture, token: string, value: string | null) =>
  trpc(request, 'envelope.field.sign', {
    token,
    fieldId: f.field.id,
    fieldValue: { type: f.field.type, value },
    authOptions: { type: 'ACCOUNT' },
  });

for (const version of [1, 2] as const) {
  for (const type of [FieldType.SIGNATURE, FieldType.FREE_SIGNATURE]) {
    test(`A-06 assistant cannot insert or remove another recipient's ${type} via legacy API on v${version}`, async ({
      request,
    }) => {
      const f = await fixture(version, type);
      const untouched = await storedField(f);
      const initialAudits = await auditCount(f);
      await expectDenied(await legacyInsert(request, f, f.assistant.token));
      expect(await storedField(f)).toEqual(untouched);
      expect(await auditCount(f)).toBe(initialAudits);

      // Even the signer's valid account session cannot expand an assistant token.
      await signIn(request, f.signer.user.email);
      await expectDenied(await legacyInsert(request, f, f.assistant.token, true));
      expect(await storedField(f)).toEqual(untouched);
      expect(await auditCount(f)).toBe(initialAudits);
      if (version === 2 && type === FieldType.SIGNATURE) {
        await expectDenied(await current(request, f, f.assistant.token, 'A-06 forbidden signature'));
      }

      await expectOk(await legacyInsert(request, f, f.recipient.token, true));
      const inserted = await storedField(f);
      expect(inserted.inserted).toBe(true);
      expect(inserted.signature).toMatchObject({ recipientId: f.recipient.id, typedSignature: 'A-06 synthetic value' });
      const afterInsertAudits = await auditCount(f);
      expect(afterInsertAudits).toBeGreaterThan(initialAudits);
      // Field insertion is not recipient completion; the old assistant query
      // still selects this NOT_SIGNED recipient, making removal a real check.
      expect(await prisma.recipient.findUnique({ where: { id: f.recipient.id } })).toMatchObject({
        signingStatus: SigningStatus.NOT_SIGNED,
      });
      await expectDenied(await legacyRemove(request, f, f.assistant.token));
      if (version === 2 && type === FieldType.SIGNATURE) {
        await expectDenied(await current(request, f, f.assistant.token, null));
      }
      expect(await storedField(f)).toEqual(inserted);
      expect(await auditCount(f)).toBe(afterInsertAudits);

      await expectOk(await legacyRemove(request, f, f.recipient.token));
      expect(await storedField(f)).toMatchObject({ inserted: false, signature: null });
      if (version === 2 && type === FieldType.SIGNATURE) {
        await expectOk(await current(request, f, f.recipient.token, 'A-06 current signature'));
        expect((await storedField(f)).signature).toMatchObject({
          recipientId: f.recipient.id,
          typedSignature: 'A-06 current signature',
        });
        await expectOk(await current(request, f, f.recipient.token, null));
        expect(await storedField(f)).toMatchObject({ inserted: false, signature: null });
      }
    });
  }

  test(`A-06 preserves permitted assistant prefilling and removal on v${version}`, async ({ request }) => {
    const f = await fixture(version, FieldType.TEXT);
    await expectOk(await legacyInsert(request, f, f.assistant.token));
    expect(await storedField(f)).toMatchObject({ inserted: true, customText: 'A-06 synthetic value', signature: null });
    expect(
      await prisma.documentAuditLog.count({ where: { envelopeId: f.envelope.id, type: 'DOCUMENT_FIELD_PREFILLED' } }),
    ).toBe(1);
    await expectOk(await legacyRemove(request, f, f.assistant.token));
    expect(await storedField(f)).toMatchObject({ inserted: false, customText: '', signature: null });
    if (version === 2) {
      await expectOk(await current(request, f, f.assistant.token, 'A-06 current prefill'));
      expect(await storedField(f)).toMatchObject({
        inserted: true,
        customText: 'A-06 current prefill',
        signature: null,
      });
      await expectOk(await current(request, f, f.assistant.token, null));
      expect(await storedField(f)).toMatchObject({ inserted: false, customText: '', signature: null });
    }
  });
}
