/** A-07: real HTTP and PostgreSQL in the isolated CI environment. */
import { NEXT_PUBLIC_WEBAPP_URL } from '@documenso/lib/constants/app';
import {
  FIELD_CHECKBOX_META_DEFAULT_VALUES,
  FIELD_SIGNATURE_META_DEFAULT_VALUES,
} from '@documenso/lib/types/field-meta';
import { prisma } from '@documenso/prisma';
import { seedDirectTemplate } from '@documenso/prisma/seed/templates';
import { seedUser } from '@documenso/prisma/seed/users';
import type { TSignFieldWithTokenMutationSchema } from '@documenso/trpc/server/field-router/schema';
import { dataTransformer } from '@documenso/trpc/utils/data-transformer';
import type { APIRequestContext, APIResponse } from '@playwright/test';
import { expect, test } from '@playwright/test';
import type { Field } from '@prisma/client';
import { FieldType, Prisma, RecipientRole, SigningStatus } from '@prisma/client';

const baseURL = NEXT_PUBLIC_WEBAPP_URL();
const png =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl6EFAAAAAASUVORK5CYII=';
const choices = [
  { id: 1, value: 'A', checked: true },
  { id: 2, value: 'B', checked: false },
];
const entry = (fieldId: number, value?: string): TSignFieldWithTokenMutationSchema => ({ token: '', fieldId, value });
const fixture = async (version: 1 | 2) => {
  const [sender, signer] = await Promise.all([seedUser(), seedUser()]);
  const template = await seedDirectTemplate({
    userId: sender.user.id,
    teamId: sender.team.id,
    internalVersion: version,
    title: 'A-07 synthetic template',
  });
  if (!template.directLink || !template.documentMetaId) {
    throw new Error('Synthetic direct template is missing its link or settings');
  }
  const directId = template.directLink.directTemplateRecipientId;
  const signature = await prisma.field.findFirstOrThrow({
    where: { recipientId: directId, type: FieldType.SIGNATURE },
  });
  // Keep the generated envelope pending, so asynchronous sealing cannot race assertions.
  await prisma.recipient.create({
    data: {
      envelopeId: template.id,
      token: `synthetic-next-${template.id}`,
      email: `next-${template.id}@example.invalid`,
      name: 'Synthetic next signer',
      role: RecipientRole.SIGNER,
      signingOrder: 2,
      fields: {
        create: {
          envelopeId: template.id,
          envelopeItemId: signature.envelopeItemId,
          type: FieldType.SIGNATURE,
          page: 1,
          positionX: 5,
          positionY: 30,
          width: 20,
          height: 5,
          customText: '',
          inserted: false,
          fieldMeta: FIELD_SIGNATURE_META_DEFAULT_VALUES,
        },
      },
    },
  });
  const add = (type: FieldType, meta: Field['fieldMeta']) =>
    prisma.field.create({
      data: {
        envelopeId: template.id,
        envelopeItemId: signature.envelopeItemId,
        recipientId: directId,
        type,
        page: 1,
        positionX: 5,
        positionY: 50,
        width: 20,
        height: 5,
        customText: '',
        inserted: false,
        fieldMeta: meta ?? Prisma.DbNull,
      },
    });
  return {
    sender,
    signer,
    template,
    directLink: template.directLink,
    documentMetaId: template.documentMetaId,
    signature,
    directId,
    add,
  };
};
type Fixture = Awaited<ReturnType<typeof fixture>>;
const create = (
  request: APIRequestContext,
  f: Fixture,
  values: TSignFieldWithTokenMutationSchema[] = [],
  signature: TSignFieldWithTokenMutationSchema = entry(f.signature.id, 'Synthetic signature'),
) =>
  request.post(`${baseURL}/api/trpc/template.createDocumentFromDirectTemplate`, {
    headers: { 'content-type': 'application/json' },
    data: JSON.stringify(
      dataTransformer.serialize({
        directTemplateToken: f.directLink.token,
        directRecipientEmail: f.signer.user.email,
        directRecipientName: 'Synthetic signer',
        templateUpdatedAt: f.template.updatedAt,
        directTemplateExternalId: `A07-${f.template.id}`,
        signedFieldValues: [signature, ...values],
      }),
    ),
  });
const expectOk = async (response: APIResponse) => {
  expect(response.ok(), await response.text()).toBe(true);
};
const expectDenied = async (response: APIResponse, code = 'INVALID_BODY') => {
  expect(response.ok()).toBe(false);
  expect((await response.json()).error.json.data.code).toBe(code);
};
const state = (f: Fixture) =>
  Promise.all([
    prisma.envelope.count({ where: { userId: f.sender.user.id } }),
    prisma.recipient.count({ where: { envelope: { userId: f.sender.user.id } } }),
    prisma.field.count({ where: { envelope: { userId: f.sender.user.id } } }),
    prisma.signature.count({ where: { field: { envelope: { userId: f.sender.user.id } } } }),
    prisma.documentAuditLog.count({ where: { envelope: { userId: f.sender.user.id } } }),
  ]);
const createdRecipient = async (f: Fixture) => {
  const envelope = await prisma.envelope.findFirstOrThrow({
    where: { userId: f.sender.user.id, externalId: `A07-${f.template.id}`, type: 'DOCUMENT' },
    include: { recipients: { include: { fields: { include: { signature: true } } } } },
  });
  expect(envelope.teamId).toBe(f.sender.team.id);
  const recipient = envelope.recipients.find((recipient) => recipient.email === f.signer.user.email);
  if (!recipient) {
    throw new Error('Generated document is missing the direct signer');
  }
  expect(recipient.signingStatus).toBe(SigningStatus.SIGNED);
  expect(envelope.recipients.some((recipient) => recipient.signingStatus === SigningStatus.NOT_SIGNED)).toBe(true);
  expect(
    await prisma.documentAuditLog.count({ where: { envelopeId: envelope.id, type: 'DOCUMENT_RECIPIENT_COMPLETED' } }),
  ).toBe(1);
  return recipient;
};
const signIn = async (request: APIRequestContext, email: string) => {
  const response = await request.get(`${baseURL}/api/auth/csrf`);
  await expectOk(response);
  const { csrfToken } = await response.json();
  await expectOk(
    await request.post(`${baseURL}/api/auth/email-password/authorize`, {
      data: { email, password: 'password', csrfToken },
    }),
  );
  const session = await request.get(`${baseURL}/api/auth/session`);
  expect((await session.json()).user?.email).toBe(email);
};

for (const version of [1, 2] as const) {
  test(`A-07 v${version} refuses changed locked values and materializes publisher defaults`, async ({ request }) => {
    const f = await fixture(version);
    const fields = await Promise.all([
      f.add(FieldType.TEXT, { type: 'text', text: '1000', readOnly: true }),
      f.add(FieldType.NUMBER, { type: 'number', value: '1000', readOnly: true }),
      f.add(FieldType.DROPDOWN, {
        type: 'dropdown',
        values: [{ value: 'A' }, { value: 'B' }],
        defaultValue: 'A',
        readOnly: true,
      }),
      f.add(FieldType.RADIO, { type: 'radio', direction: 'vertical', values: choices, readOnly: true }),
      f.add(FieldType.CHECKBOX, { type: 'checkbox', direction: 'vertical', values: choices, readOnly: true }),
    ]);
    const defaults = ['1000', '1000', 'A', version === 1 ? 'A' : '0', version === 1 ? '["A"]' : '[0]'];
    const tampered = ['1', '1', 'B', version === 1 ? 'B' : '1', version === 1 ? '["B"]' : '[1]'];
    const before = await state(f);
    for (let index = 0; index < fields.length; index++) {
      const values = fields.map((field, i) => entry(field.id, i === index ? tampered[i] : defaults[i]));
      await expectDenied(await create(request, f, values));
      expect(await state(f)).toEqual(before);
    }
    // Older clients omit locked fields and send empty placeholders; the server supplies exact defaults.
    await expectOk(await create(request, f, [entry(0), entry(0)]));
    const recipient = await createdRecipient(f);
    for (const [index, field] of fields.entries()) {
      expect(recipient.fields.find((created) => created.type === field.type)).toMatchObject({
        customText: defaults[index],
        inserted: true,
        fieldMeta: field.fieldMeta,
      });
    }
  });

  test(`A-07 v${version} enforces text, exact numeric and choice constraints before creation`, async ({ request }) => {
    const f = await fixture(version);
    const fields = await Promise.all([
      f.add(FieldType.TEXT, { type: 'text', characterLimit: 3, required: true }),
      f.add(FieldType.NUMBER, { type: 'number', minValue: 100, maxValue: 1000 }),
      f.add(FieldType.DROPDOWN, { type: 'dropdown', values: [{ value: 'A' }], required: true }),
      f.add(FieldType.RADIO, { type: 'radio', direction: 'vertical', values: choices, required: true }),
      f.add(FieldType.CHECKBOX, {
        type: 'checkbox',
        direction: 'vertical',
        values: choices,
        validationRule: 'Select exactly',
        validationLength: 1,
        required: true,
      }),
    ]);
    const valid = ['OK', '1000', 'A', version === 1 ? 'A' : '0', version === 1 ? '["A"]' : '[0]'];
    const invalid: [number, string][] = [
      [0, 'TOO LONG'],
      [0, ''],
      [1, '1'],
      [1, '1000.00000000000001'],
      [1, '1.2.3'],
      [2, 'X'],
      [3, version === 1 ? 'X' : '99'],
      [4, version === 1 ? '["X"]' : '[99]'],
      [4, version === 1 ? '["A","A"]' : '[0,0]'],
      [4, '[]'],
    ];
    const before = await state(f);
    for (const [index, value] of invalid) {
      await expectDenied(
        await create(
          request,
          f,
          fields.map((field, i) => entry(field.id, i === index ? value : valid[i])),
        ),
      );
      expect(await state(f)).toEqual(before);
    }
    await expectOk(
      await create(
        request,
        f,
        fields.map((field, i) => entry(field.id, valid[i])),
      ),
    );
    const recipient = await createdRecipient(f);
    for (const [index, field] of fields.entries()) {
      expect(recipient.fields.find((created) => created.type === field.type)).toMatchObject({
        customText: valid[index],
        inserted: true,
      });
    }
  });

  test(`A-07 v${version} preserves account access/action checks while enforcing immutable values`, async ({
    request,
  }) => {
    const f = await fixture(version);
    await prisma.envelope.update({
      where: { id: f.template.id },
      data: { authOptions: { globalAccessAuth: ['ACCOUNT'], globalActionAuth: [] } },
    });
    await prisma.recipient.update({
      where: { id: f.directId },
      data: { authOptions: { accessAuth: [], actionAuth: ['ACCOUNT'] } },
    });
    f.template.updatedAt = (await prisma.envelope.findUniqueOrThrow({ where: { id: f.template.id } })).updatedAt;
    const amount = await f.add(FieldType.NUMBER, { type: 'number', value: '1000', readOnly: true });
    const before = await state(f);
    const signature = { ...entry(f.signature.id, 'Synthetic signature'), authOptions: { type: 'ACCOUNT' as const } };
    await expectDenied(await create(request, f, [], signature), 'UNAUTHORIZED');
    expect(await state(f)).toEqual(before);
    await signIn(request, f.signer.user.email);
    await expectDenied(await create(request, f, [entry(amount.id, '1')], signature));
    expect(await state(f)).toEqual(before);
    await expectOk(await create(request, f, [], signature));
    expect((await createdRecipient(f)).fields.find((field) => field.type === FieldType.NUMBER)?.customText).toBe(
      '1000',
    );
  });

  for (const type of [FieldType.SIGNATURE, FieldType.FREE_SIGNATURE]) {
    test(`A-07 v${version} enforces typed-signature settings for ${type}`, async ({ request }) => {
      const f = await fixture(version);
      await prisma.documentMeta.update({
        where: { id: f.documentMetaId },
        data: { typedSignatureEnabled: false },
      });
      await prisma.field.update({
        where: { id: f.signature.id },
        data: {
          type,
          fieldMeta: type === FieldType.FREE_SIGNATURE ? Prisma.DbNull : FIELD_SIGNATURE_META_DEFAULT_VALUES,
        },
      });
      const before = await state(f);
      for (const isBase64 of [false, true]) {
        await expectDenied(
          await create(request, f, [], { ...entry(f.signature.id, 'Synthetic typed signature'), isBase64 }),
        );
        expect(await state(f)).toEqual(before);
      }
      await expectOk(await create(request, f, [], { ...entry(f.signature.id, png), isBase64: true }));
      const recipient = await createdRecipient(f);
      expect(recipient.fields.find((field) => field.type === type)?.signature).toMatchObject({
        recipientId: recipient.id,
        typedSignature: null,
        signatureImageAsBase64: png,
      });
    });
  }

  test(`A-07 v${version} preserves editable prefills and optional omissions`, async ({ request }) => {
    const f = await fixture(version);
    const text = await f.add(FieldType.TEXT, { type: 'text', text: 'Default', characterLimit: 30 });
    await f.add(FieldType.NUMBER, { type: 'number', minValue: 1000 });
    const fraction = await f.add(FieldType.NUMBER, { type: 'number', minValue: 0.1, maxValue: 0.9 });
    const checkbox = await f.add(FieldType.CHECKBOX, FIELD_CHECKBOX_META_DEFAULT_VALUES);
    const date = await f.add(FieldType.DATE, null);
    const checked = version === 1 ? '["empty-value-1"]' : '[0]';
    await expectOk(
      await create(request, f, [
        entry(text.id, 'Signer choice'),
        entry(fraction.id, '.5'),
        entry(checkbox.id, checked),
        entry(date.id),
        entry(0),
      ]),
    );
    const fields = (await createdRecipient(f)).fields;
    expect(fields.find((field) => field.type === FieldType.TEXT)?.customText).toBe('Signer choice');
    // v1 omits the untouched optional number; v2 retains it as an empty field.
    expect(fields.filter((field) => field.type === FieldType.NUMBER).map((field) => field.customText)).toEqual(
      version === 1 ? ['.5'] : expect.arrayContaining(['', '.5']),
    );
    expect(fields.find((field) => field.type === FieldType.CHECKBOX)?.customText).toBe(checked);
    expect(fields.find((field) => field.type === FieldType.DATE)?.customText).toMatch(/\d/);
  });
}
