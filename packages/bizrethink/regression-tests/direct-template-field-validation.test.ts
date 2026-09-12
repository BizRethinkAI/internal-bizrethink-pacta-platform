import { AppError, AppErrorCode } from '@documenso/lib/errors/app-error';
import * as fieldAuth from '@documenso/lib/server-only/document/validate-field-auth';
import { createDocumentFromDirectTemplate } from '@documenso/lib/server-only/template/create-document-from-direct-template';
import type { TSignFieldWithTokenMutationSchema } from '@documenso/trpc/server/field-router/schema';
import type { Field, Prisma, Recipient } from '@prisma/client';
import { EnvelopeType, FieldType, SendStatus, SigningStatus } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { envelopeFixture, fieldFixture, recipientFixture } from './recipient-auth-fixture';

const { db, readFile, putFile, quota, send, jobs, nextId } = vi.hoisted(() => ({
  db: {
    envelope: { findFirst: vi.fn(), create: vi.fn() },
    recipient: { create: vi.fn() },
    user: { findFirst: vi.fn() },
    field: { createMany: vi.fn(), create: vi.fn() },
    documentMeta: { create: vi.fn() },
    documentAuditLog: { createMany: vi.fn() },
    envelopeAttachment: { findMany: vi.fn(), createMany: vi.fn() },
    $transaction: vi.fn(),
  },
  readFile: vi.fn(),
  putFile: vi.fn(),
  quota: vi.fn(),
  send: vi.fn(),
  jobs: { triggerJob: vi.fn() },
  nextId: vi.fn(),
}));
vi.mock('@documenso/prisma', () => ({ prisma: db }));
vi.mock('@documenso/lib/server-only/team/get-team-settings', () => ({
  getTeamSettings: async () => ({
    documentVisibility: 'EVERYONE',
    documentLanguage: 'en',
    typedSignatureEnabled: true,
  }),
}));
vi.mock('@documenso/lib/universal/upload/get-file.server', () => ({ getFileServerSide: readFile }));
vi.mock('@documenso/lib/universal/upload/put-file.server', () => ({ putPdfFileServerSide: putFile }));
vi.mock('@documenso/lib/server-only/envelope/increment-id', () => ({ incrementDocumentId: nextId }));
vi.mock('@documenso/lib/server-only/rate-limit/assert-organisation-rates-and-limits', () => ({
  assertOrganisationRatesAndLimits: quota,
}));
vi.mock('@documenso/lib/server-only/document/send-document', () => ({ sendDocument: send }));
vi.mock('@documenso/lib/jobs/client', () => ({ jobs }));
vi.mock('@documenso/lib/server-only/webhooks/trigger/trigger-webhook', () => ({ triggerWebhook: vi.fn() }));

const auth = vi.spyOn(fieldAuth, 'validateFieldAuth');
// Materialization must be correct even when subsequent delivery is unavailable.
vi.spyOn(console, 'error').mockImplementation(() => {});
const png =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl6EFAAAAAASUVORK5CYII=';
const options = [
  { id: 1, value: 'A', checked: true },
  { id: 2, value: 'B', checked: false },
];
const makeTemplate = () => {
  const envelope = envelopeFixture({ type: EnvelopeType.TEMPLATE, secondaryId: 'template_1' });
  const signature = { ...fieldFixture(FieldType.SIGNATURE), id: 5 };
  const direct = { ...recipientFixture(envelope.id), fields: [signature] };
  return {
    ...envelope,
    signatureLevel: 'SES',
    recipients: [direct],
    directLink: { enabled: true, token: 'synthetic-direct-link', directTemplateRecipientId: direct.id },
    team: {
      id: 10,
      url: 'team-a',
      organisationId: 'org-a',
      organisation: { organisationClaim: { recipientCount: 0 } },
    },
    envelopeItems: [{ id: 'item_test', title: 'Synthetic PDF', order: 0, documentData: { id: 'source' } }],
  };
};
let template: ReturnType<typeof makeTemplate>;
const addField = (type: FieldType, fieldMeta: Field['fieldMeta']) => {
  const field = { ...fieldFixture(type), id: 6, fieldMeta };
  template.recipients[0].fields.push(field);
  return field;
};
const entry = (fieldId: number, value?: string): TSignFieldWithTokenMutationSchema => ({ token: '', fieldId, value });
const use = (values: TSignFieldWithTokenMutationSchema[] = []) =>
  createDocumentFromDirectTemplate({
    directTemplateToken: template.directLink.token,
    directRecipientEmail: 'signer@example.invalid',
    directRecipientName: 'Synthetic signer',
    templateUpdatedAt: template.updatedAt,
    signedFieldValues: [entry(5, 'Synthetic signature'), ...values],
    requestMetadata: { source: 'app', auth: null, requestMetadata: {} },
  });
const noEffects = () => {
  for (const fn of [
    readFile,
    putFile,
    quota,
    nextId,
    db.documentMeta.create,
    db.$transaction,
    db.envelope.create,
    db.recipient.create,
    db.field.create,
    db.field.createMany,
    db.documentAuditLog.createMany,
    send,
    jobs.triggerJob,
  ]) {
    expect(fn).not.toHaveBeenCalled();
  }
};
type RecipientCreate = {
  data: Pick<Recipient, 'signingStatus' | 'sendStatus'> & {
    fields: { createMany: { data: Prisma.FieldCreateManyInput[] } };
  };
};
const savedFields = () => {
  const call = db.recipient.create.mock.calls[0][0] as RecipientCreate;
  expect(call.data).toMatchObject({ signingStatus: SigningStatus.SIGNED, sendStatus: SendStatus.SENT });
  return call.data.fields.createMany.data;
};
beforeEach(() => {
  vi.clearAllMocks();
  template = makeTemplate();
  db.envelope.findFirst.mockImplementation(async ({ where }: { where: { directLink: { token: string } } }) =>
    where.directLink.token === template.directLink.token ? template : null,
  );
  db.envelope.create.mockResolvedValue({ id: 'created', userId: 7, teamId: 10, recipients: [] });
  db.recipient.create.mockImplementation(async ({ data }: RecipientCreate) => ({
    ...recipientFixture('created'),
    ...data,
    id: 100,
    fields: data.fields.createMany.data.map((field, i) => ({
      ...fieldFixture(field.type),
      ...field,
      id: 100 + i,
      secondaryId: `field_${i}`,
    })),
  }));
  db.field.create.mockImplementation(
    async ({
      data,
    }: {
      data: Pick<Field, 'type' | 'recipientId'> & {
        signature: { create: { typedSignature?: string; signatureImageAsBase64?: string } };
      };
    }) => ({ ...fieldFixture(data.type), ...data, signature: { ...data.signature.create } }),
  );
  db.field.createMany.mockResolvedValue({ count: 0 });
  db.documentMeta.create.mockImplementation(async ({ data }: { data: object }) => ({ ...data, id: 'created-meta' }));
  db.documentAuditLog.createMany.mockResolvedValue({ count: 1 });
  db.envelopeAttachment.findMany.mockResolvedValue([]);
  db.$transaction.mockImplementation(async (operation: (tx: typeof db) => unknown) => operation(db));
  readFile.mockResolvedValue(Buffer.from('synthetic PDF'));
  putFile.mockResolvedValue({ documentData: { id: 'copied' } });
  nextId.mockResolvedValue({ formattedDocumentId: 'document_100', documentId: 100 });
  send.mockRejectedValue(new AppError(AppErrorCode.UNKNOWN_ERROR, { message: 'Synthetic delivery unavailable' }));
});

type Case = { name: string; type: FieldType; meta: Field['fieldMeta']; value: string | ((version: 1 | 2) => string) };
const rejected: Case[] = [
  {
    name: 'changed locked text',
    type: FieldType.TEXT,
    meta: { type: 'text', readOnly: true, text: '1000' },
    value: '1',
  },
  {
    name: 'changed locked number',
    type: FieldType.NUMBER,
    meta: { type: 'number', readOnly: true, value: '1000' },
    value: '1',
  },
  {
    name: 'changed locked dropdown',
    type: FieldType.DROPDOWN,
    meta: { type: 'dropdown', readOnly: true, values: [{ value: 'A' }, { value: 'B' }], defaultValue: 'A' },
    value: 'B',
  },
  {
    name: 'changed locked radio',
    type: FieldType.RADIO,
    meta: { type: 'radio', direction: 'vertical', readOnly: true, values: options },
    value: (v) => (v === 1 ? 'B' : '1'),
  },
  {
    name: 'changed locked checkbox',
    type: FieldType.CHECKBOX,
    meta: { type: 'checkbox', direction: 'vertical', readOnly: true, values: options },
    value: (v) => (v === 1 ? '["B"]' : '[1]'),
  },
  {
    name: 'text beyond character limit',
    type: FieldType.TEXT,
    meta: { type: 'text', characterLimit: 3 },
    value: '1234',
  },
  { name: 'blank required text', type: FieldType.TEXT, meta: { type: 'text', required: true }, value: '' },
  { name: 'number below minimum', type: FieldType.NUMBER, meta: { type: 'number', minValue: 100 }, value: '1' },
  { name: 'number above maximum', type: FieldType.NUMBER, meta: { type: 'number', maxValue: 100 }, value: '101' },
  { name: 'malformed number', type: FieldType.NUMBER, meta: { type: 'number' }, value: '1.2.3' },
  { name: 'number beyond a zero maximum', type: FieldType.NUMBER, meta: { type: 'number', maxValue: 0 }, value: '1' },
  {
    name: 'unknown dropdown choice',
    type: FieldType.DROPDOWN,
    meta: { type: 'dropdown', values: [{ value: 'A' }] },
    value: 'X',
  },
  {
    name: 'unknown radio choice',
    type: FieldType.RADIO,
    meta: { type: 'radio', direction: 'vertical', values: options },
    value: (v) => (v === 1 ? 'X' : '99'),
  },
  {
    name: 'unknown checkbox choice',
    type: FieldType.CHECKBOX,
    meta: { type: 'checkbox', direction: 'vertical', values: options },
    value: (v) => (v === 1 ? '["X"]' : '[99]'),
  },
  {
    name: 'too many checked choices',
    type: FieldType.CHECKBOX,
    meta: {
      type: 'checkbox',
      direction: 'vertical',
      values: options,
      validationRule: 'Select exactly',
      validationLength: 1,
    },
    value: (v) => (v === 1 ? '["A","B"]' : '[0,1]'),
  },
  {
    name: 'duplicate checked choice',
    type: FieldType.CHECKBOX,
    meta: {
      type: 'checkbox',
      direction: 'vertical',
      values: options,
      validationRule: 'Select exactly',
      validationLength: 2,
    },
    value: (v) => (v === 1 ? '["A","A"]' : '[0,0]'),
  },
  { name: 'mismatched stored metadata', type: FieldType.NUMBER, meta: { type: 'text', text: '1000' }, value: '1' },
];
for (const version of [1, 2] as const) {
  describe(`A-07 real direct-template materialization v${version}`, () => {
    beforeEach(() => {
      template.internalVersion = version;
    });
    for (const c of rejected) {
      it(`rejects ${c.name} before auth factors, file copies or writes`, async () => {
        addField(c.type, c.meta);
        await expect(use([entry(6, typeof c.value === 'function' ? c.value(version) : c.value)])).rejects.toMatchObject(
          { code: 'INVALID_BODY' },
        );
        noEffects();
        expect(auth).not.toHaveBeenCalled();
      });
    }
    for (const type of [FieldType.SIGNATURE, FieldType.FREE_SIGNATURE]) {
      for (const isBase64 of [false, true]) {
        it(`rejects typed ${type} when disabled, even with isBase64=${isBase64}`, async () => {
          template.recipients[0].fields[0].type = type;
          template.documentMeta.typedSignatureEnabled = false;
          const input = { ...entry(5, 'Synthetic typed signature'), isBase64 };
          await expect(
            createDocumentFromDirectTemplate({
              directTemplateToken: template.directLink.token,
              directRecipientEmail: 'signer@example.invalid',
              templateUpdatedAt: template.updatedAt,
              signedFieldValues: [input],
              requestMetadata: { source: 'app', auth: null, requestMetadata: {} },
            }),
          ).rejects.toMatchObject({ code: 'INVALID_BODY' });
          noEffects();
        });
      }
    }
    it('rejects missing required input', async () => {
      addField(FieldType.TEXT, { type: 'text', required: true });
      await expect(use()).rejects.toMatchObject({ code: 'INVALID_BODY' });
      noEffects();
    });
    it('rejects duplicate actual field entries', async () => {
      addField(FieldType.TEXT, { type: 'text' });
      await expect(use([entry(6, 'A'), entry(6, 'B')])).rejects.toMatchObject({ code: 'INVALID_BODY' });
      noEffects();
    });
    it('rejects values for fields outside the direct recipient', async () => {
      await expect(use([entry(999, 'Foreign field')])).rejects.toMatchObject({ code: 'INVALID_BODY' });
      noEffects();
    });
    for (const [numberFormat, value] of [
      ['123,456,789.00', '1,500.00'],
      ['123.456.789,00', '1.500,00'],
    ]) {
      it(`preserves valid formatted numbers and their limits: ${numberFormat}`, async () => {
        addField(FieldType.NUMBER, { type: 'number', numberFormat, minValue: 1000, maxValue: 2000 });
        await use([entry(6, value)]);
        expect(savedFields()[0]).toMatchObject({ customText: value, inserted: true });
      });
    }
    it('preserves a legacy radio choice with an empty display label', async () => {
      addField(FieldType.RADIO, {
        type: 'radio',
        direction: 'vertical',
        values: [{ id: 9, value: '', checked: false }],
      });
      const value = version === 1 ? 'empty-value-9' : '0';
      await use([entry(6, value)]);
      expect(savedFields()[0]).toMatchObject({ customText: value, inserted: true });
    });
    it('preserves a valid editable field and signed-recipient creation', async () => {
      addField(FieldType.TEXT, { type: 'text', text: 'Default', characterLimit: 20 });
      await expect(use([entry(6, 'Changed by signer')])).resolves.toMatchObject({ documentId: 100 });
      expect(savedFields()).toEqual([expect.objectContaining({ customText: 'Changed by signer', inserted: true })]);
      expect(send).toHaveBeenCalled();
    });
    for (const c of rejected.slice(0, 5)) {
      it(`preserves the configured default when ${c.name.replace('changed ', '')} is omitted`, async () => {
        addField(c.type, c.meta);
        await use([entry(0), entry(0)]); // The v1 UI sends empty placeholders for unsigned optional fields.
        const expected =
          c.type === FieldType.TEXT || c.type === FieldType.NUMBER
            ? '1000'
            : c.type === FieldType.DROPDOWN
              ? 'A'
              : c.type === FieldType.RADIO
                ? version === 1
                  ? 'A'
                  : '0'
                : version === 1
                  ? '["A"]'
                  : '[0]';
        expect(savedFields()).toEqual([
          expect.objectContaining({ customText: expected, inserted: true, fieldMeta: c.meta }),
        ]);
      });
    }
    it('preserves valid choices in this version’s representation', async () => {
      addField(FieldType.CHECKBOX, {
        type: 'checkbox',
        direction: 'vertical',
        values: options,
        validationRule: 'Select exactly',
        validationLength: 1,
      });
      const value = version === 1 ? '["B"]' : '[1]';
      await use([entry(6, value)]);
      expect(savedFields()).toEqual([expect.objectContaining({ customText: value, inserted: true })]);
    });
    it('preserves optional empty fields', async () => {
      addField(FieldType.NUMBER, { type: 'number', minValue: 100 });
      await expect(use([entry(6, '')])).resolves.toMatchObject({ documentId: 100 });
      expect(savedFields()[0].customText).toBe('');
    });
    it('preserves drawn signatures when typed signatures are disabled', async () => {
      template.documentMeta.typedSignatureEnabled = false;
      await expect(
        createDocumentFromDirectTemplate({
          directTemplateToken: template.directLink.token,
          directRecipientEmail: 'signer@example.invalid',
          templateUpdatedAt: template.updatedAt,
          signedFieldValues: [{ ...entry(5, png), isBase64: true }],
          requestMetadata: { source: 'app', auth: null, requestMetadata: {} },
        }),
      ).resolves.toMatchObject({ documentId: 100 });
      expect(db.field.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            signature: { create: { recipientId: 100, signatureImageAsBase64: png, typedSignature: undefined } },
          }),
        }),
      );
    });
    it('retains access verification', async () => {
      template.authOptions = { globalAccessAuth: ['ACCOUNT'], globalActionAuth: [] };
      await expect(use()).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
      noEffects();
    });
    it('retains the template timestamp check', async () => {
      const original = template.updatedAt;
      template.updatedAt = new Date(original.getTime() + 1);
      await expect(
        createDocumentFromDirectTemplate({
          directTemplateToken: template.directLink.token,
          directRecipientEmail: 'signer@example.invalid',
          templateUpdatedAt: original,
          signedFieldValues: [entry(5, 'Signature')],
          requestMetadata: { source: 'app', auth: null, requestMetadata: {} },
        }),
      ).rejects.toMatchObject({ code: 'INVALID_REQUEST' });
      noEffects();
    });
  });
}
